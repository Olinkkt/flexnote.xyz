import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { MobileFrame } from './components/MobileFrame';
import { TopHeader } from './components/TopHeader';
import { RecentNotesList } from './components/RecentNotesList';
import { ScanModal } from './components/ScanModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { BottomNav, TabType } from './components/BottomNav';
import { NotesLibraryView } from './components/NotesLibraryView';

import { SUBJECTS, INITIAL_NOTES } from './data/mockNotes';
import { NoteItem, SubjectType } from './types/notes';
import {
  supabase,
  fetchNotesFromCloud,
  saveNoteToCloud,
  deleteNoteFromCloud,
  fetchUserProfile,
  checkCurrentUserVerification,
  signOutUser,
  UserProfile,
  User,
} from './services/supabase';
import { AuthScreen } from './components/AuthScreen';
import { ConfirmEmailScreen } from './components/ConfirmEmailScreen';
import { ProfileView } from './components/ProfileView';

const STORAGE_KEY = 'duo_notes_v1_data';

export const App: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('all');
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback to initial notes
    }
    return INITIAL_NOTES;
  });
  const [activeTab, setActiveTab] = useState<TabType>('notes');

  // Auth & Profile State
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('flexnote_unconfirmed_email');
    } catch {
      return null;
    }
  });

  const isEmailVerified = Boolean(
    user?.email_confirmed_at ||
    (user?.app_metadata?.provider && user.app_metadata.provider !== 'email')
  );

  // Clear unconfirmed email cache once verified user session is active
  useEffect(() => {
    if (user && isEmailVerified && unconfirmedEmail) {
      setUnconfirmedEmail(null);
      try {
        localStorage.removeItem('flexnote_unconfirmed_email');
      } catch {}
    }
  }, [user, isEmailVerified, unconfirmedEmail]);

  // Sync Supabase Auth and Notes on mount & auth changes
  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser && (currentUser.email_confirmed_at || currentUser.app_metadata?.provider !== 'email')) {
        fetchUserProfile(currentUser.id).then(setUserProfile);
        fetchNotesFromCloud(currentUser.id).then((cloudNotes) => {
          if (cloudNotes && cloudNotes.length > 0) setNotes(cloudNotes);
        });
      }
      setAuthLoading(false);
    }).catch(() => {
      setAuthLoading(false);
    });

    // 2. Listen to auth state changes (login, signup, logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      if (currentUser && (currentUser.email_confirmed_at || currentUser.app_metadata?.provider !== 'email')) {
        fetchUserProfile(currentUser.id).then(setUserProfile);
        fetchNotesFromCloud(currentUser.id).then((cloudNotes) => {
          if (cloudNotes && cloudNotes.length > 0) setNotes(cloudNotes);
        });
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // ignore storage quota errors
    }
  }, [notes]);

  // Modals state
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<NoteItem | null>(null);

  // Filter notes by selected class / subject
  const displayNotes = notes.filter((n) => {
    if (selectedSubject === 'all') return true;
    return n.subject === selectedSubject;
  });

  // Handle new note scanned and added
  const handleSaveScannedNote = async (newNote: NoteItem) => {
    // Optimistic local update
    setNotes((prev) => [newNote, ...prev]);

    // Async sync to Supabase with user_id if logged in
    try {
      const saved = await saveNoteToCloud(newNote, user?.id);
      setNotes((prev) => prev.map((n) => (n.id === newNote.id ? saved : n)));
    } catch (err) {
      console.error('Failed to sync new note with Supabase:', err);
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    try {
      await deleteNoteFromCloud(noteId);
    } catch (err) {
      console.error('Failed to delete note from Supabase:', err);
    }
  };

  // Check email verification status on demand
  const handleCheckVerified = async (): Promise<boolean> => {
    try {
      const refreshedUser = await checkCurrentUserVerification();
      if (refreshedUser && (refreshedUser.email_confirmed_at || refreshedUser.app_metadata?.provider !== 'email')) {
        setUser(refreshedUser);
        setUnconfirmedEmail(null);
        try {
          localStorage.removeItem('flexnote_unconfirmed_email');
        } catch {}
        if (refreshedUser.id) {
          fetchUserProfile(refreshedUser.id).then(setUserProfile);
          fetchNotesFromCloud(refreshedUser.id).then((cloudNotes) => {
            if (cloudNotes && cloudNotes.length > 0) setNotes(cloudNotes);
          });
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Sign out user and clean states
  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (err) {
      console.error('Error signing out:', err);
    }
    setUser(null);
    setUserProfile(null);
    setUnconfirmedEmail(null);
    try {
      localStorage.removeItem('flexnote_unconfirmed_email');
    } catch {}
  };

  // Set pending unconfirmed email state
  const handleRequiresConfirmation = (email: string) => {
    setUnconfirmedEmail(email);
    try {
      localStorage.setItem('flexnote_unconfirmed_email', email);
    } catch {}
  };

  const activeMeta = SUBJECTS.find((s) => s.id === selectedSubject) || SUBJECTS[0];

  return (
    <MobileFrame activeSubjectName={activeMeta.czechName}>
      {authLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white text-center select-none animate-in fade-in">
          <div className="w-16 h-16 rounded-2xl bg-eagerGreen border-b-4 border-eagerGreen-dark flex items-center justify-center text-white mb-4 animate-bounce shadow-md">
            <BookOpen size={32} className="stroke-[2.5]" />
          </div>
          <h2 className="font-feather font-black text-xl text-duoGray-charcoal">
            Flexnote
          </h2>
          <p className="text-xs font-bold text-duoGray-pencil mt-1 animate-pulse">
            Načítám tvůj sešit...
          </p>
        </div>
      ) : unconfirmedEmail || (user && !isEmailVerified) ? (
        <ConfirmEmailScreen
          email={user?.email || unconfirmedEmail || ''}
          onCheckVerified={handleCheckVerified}
          onSignOut={handleSignOut}
        />
      ) : !user ? (
        <AuthScreen
          onSuccess={() => {}}
          onRequiresConfirmation={handleRequiresConfirmation}
        />
      ) : (
        <>
          {/* Top Header with App Title on left and Class Switcher Dropdown on right */}
          <TopHeader
            subjects={SUBJECTS}
            selectedSubject={selectedSubject}
            onSelectSubject={(subj) => setSelectedSubject(subj)}
            totalNotes={notes.length}
          />

          {/* Main Content Area */}
          <main className="pb-8 pt-2">
            {activeTab === 'notes' && (
              <div>
                {/* Poslední zápisky Section */}
                <RecentNotesList
                  notes={displayNotes}
                  subjects={SUBJECTS}
                  selectedSubjectName={activeMeta.name}
                  onSelectNote={(note) => setSelectedNote(note)}
                  onOpenScan={() => setScanModalOpen(true)}
                />
              </div>
            )}

            {activeTab === 'search' && (
              <NotesLibraryView
                notes={notes}
                subjects={SUBJECTS}
                selectedSubject={selectedSubject}
                onSelectSubject={setSelectedSubject}
                onSelectNote={(note) => setSelectedNote(note)}
                onOpenScan={() => setScanModalOpen(true)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                user={user}
                profile={userProfile}
                totalNotes={notes.length}
                onSignOut={handleSignOut}
              />
            )}
          </main>

          {/* Bottom Bar */}
          <BottomNav
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onOpenScan={() => setScanModalOpen(true)}
          />

          {/* Camera / Scan Modal */}
          {scanModalOpen && (
            <ScanModal
              onClose={() => setScanModalOpen(false)}
              onSaveNote={handleSaveScannedNote}
              userId={user?.id}
            />
          )}

          {/* Note Detail & Markdown Modal */}
          {selectedNote && (
            <NoteDetailModal
              note={selectedNote}
              subjects={SUBJECTS}
              onClose={() => setSelectedNote(null)}
              onDeleteNote={handleDeleteNote}
            />
          )}
        </>
      )}
    </MobileFrame>
  );
};

export default App;
