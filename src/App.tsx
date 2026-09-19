import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { MobileFrame } from './components/MobileFrame';
import { TopHeader } from './components/TopHeader';
import { RecentNotesList } from './components/RecentNotesList';
import { ScanModal } from './components/ScanModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { PracticeView } from './components/PracticeView';
import { BottomNav, TabType } from './components/BottomNav';

import { SUBJECTS } from './data/subjects';
import { NoteItem, SubjectType } from './types/notes';
import {
  supabase,
  fetchNotesFromCloud,
  saveNoteToCloud,
  updateNoteInCloud,
  deleteNoteFromCloud,
  subscribeToUserNotes,
  subscribeToUserProfile,
  fetchUserProfile,
  checkCurrentUserVerification,
  signOutUser,
  UserProfile,
  User,
} from './services/supabase';
import { playSuccessChime } from './utils/audio';
import { Toast } from './components/Toast';
import { AuthScreen } from './components/AuthScreen';
import { ConfirmEmailScreen } from './components/ConfirmEmailScreen';
import { ProfileView } from './components/ProfileView';
import { LeaderboardView } from './components/LeaderboardView';
import { StreakModal } from './components/StreakModal';
import { StreakRescueModal } from './components/StreakRescueModal';
import { ExportNotesModal } from './components/ExportNotesModal';
import { useOfflineSync, enqueueOfflineAction } from './services/offlineSync';
import { OfflineBanner } from './components/OfflineBanner';
import { useGamification } from './services/gamification';

const STORAGE_KEY = 'duo_notes_v1_data';

export const App: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState<SubjectType>('all');
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(n => !n.id.startsWith('note-math-') && !n.id.startsWith('note-czech-') && !n.id.startsWith('note-history-'));
        }
      }
    } catch {
      // fallback
    }
    return [];
  });
  const [activeTab, setActiveTab] = useState<TabType>('notes');

  // Auth & Profile State
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [syncToast, setSyncToast] = useState<{ title: string; message: string } | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  // Central Gamification & Dopamine Loop State
  const {
    gamification,
    buyStreakFreeze,
    autoRescueData,
    restoreStreakWithDiamonds,
    confirmStreakReset,
    closeAutoRescueModal,
  } = useGamification(userProfile, user?.id);

  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('flexnote_unconfirmed_email');
    } catch {
      return null;
    }
  });

  const [isGuestMode, setIsGuestMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('flexnote_guest_mode') === 'true';
    } catch {
      return false;
    }
  });

  const {
    isOnline,
    justCameOnline,
    pendingCount,
    isSyncing,
    triggerSync,
  } = useOfflineSync(user?.id, (syncedCount) => {
    playSuccessChime();
    setSyncToast({
      title: 'Změny synchronizovány',
      message: `${syncedCount} ${syncedCount === 1 ? 'změna byla synchronizována' : syncedCount < 5 ? 'změny byly synchronizovány' : 'změn bylo synchronizováno'} do cloudu.`,
    });
    if (user?.id) {
      fetchNotesFromCloud(user.id).then((cloudNotes) => {
        if (cloudNotes && cloudNotes.length > 0) setNotes(cloudNotes);
      });
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

  // 3. Supabase Realtime live sync across devices
  useEffect(() => {
    if (!user || !isEmailVerified) {
      setIsRealtimeConnected(false);
      return;
    }

    const unsubscribeNotes = subscribeToUserNotes(user.id, {
      onInsert: (newNote) => {
        setNotes((prev) => {
          // If note is already present by exact ID, ignore
          if (prev.some((n) => n.id === newNote.id)) {
            return prev;
          }

          // Check if there's a temporary local optimistic note created within the last 25 seconds
          const optimisticIndex = prev.findIndex(
            (n) => n.id.startsWith('note-') && n.title === newNote.title && Math.abs(n.timestamp - newNote.timestamp) < 25000
          );

          if (optimisticIndex !== -1) {
            const updated = [...prev];
            updated[optimisticIndex] = newNote;
            return updated;
          }

          // Note was created on another device (e.g. mobile phone)!
          playSuccessChime();
          setSyncToast({
            title: 'Zápisek synchronizován',
            message: `„${newNote.title}“ byl načten v reálném čase z jiného zařízení.`,
          });
          return [newNote, ...prev];
        });
      },
      onUpdate: (updatedNote) => {
        setNotes((prev) => prev.map((n) => (n.id === updatedNote.id ? updatedNote : n)));
        setSelectedNote((curr) => (curr?.id === updatedNote.id ? updatedNote : curr));
      },
      onDelete: (deletedNoteId) => {
        setNotes((prev) => prev.filter((n) => n.id !== deletedNoteId));
        setSelectedNote((curr) => (curr?.id === deletedNoteId ? null : curr));
      },
      onStatusChange: (status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      },
    });

    const unsubscribeProfile = subscribeToUserProfile(user.id, (updatedProfile) => {
      setUserProfile(updatedProfile);
    });

    return () => {
      unsubscribeNotes();
      unsubscribeProfile();
      setIsRealtimeConnected(false);
    };
  }, [user?.id, isEmailVerified]);

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

    if (!isOnline || !user?.id) {
      if (user?.id) {
        enqueueOfflineAction({ type: 'CREATE_NOTE', note: newNote, userId: user.id });
      }
      return;
    }

    // Async sync to Supabase with user_id if logged in
    try {
      const saved = await saveNoteToCloud(newNote, user.id);
      setNotes((prev) => prev.map((n) => (n.id === newNote.id ? saved : n)));
    } catch (err) {
      console.warn('Failed to sync new note with Supabase, queuing offline:', err);
      enqueueOfflineAction({ type: 'CREATE_NOTE', note: newNote, userId: user.id });
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (!isOnline || !user?.id) {
      if (user?.id) {
        enqueueOfflineAction({ type: 'DELETE_NOTE', noteId });
      }
      return;
    }

    try {
      await deleteNoteFromCloud(noteId);
    } catch (err) {
      console.warn('Failed to delete note from Supabase, queuing offline:', err);
      enqueueOfflineAction({ type: 'DELETE_NOTE', noteId });
    }
  };

  // Handle note updates (e.g. from NoteDetailModal edit mode)
  const handleUpdateNote = async (noteId: string, updates: Partial<NoteItem>) => {
    // Optimistic local update
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n)));
    setSelectedNote((curr) => (curr?.id === noteId ? { ...curr, ...updates } : curr));

    if (!isOnline || !user?.id) {
      if (user?.id) {
        enqueueOfflineAction({ type: 'UPDATE_NOTE', noteId, updates });
      }
      return;
    }

    try {
      await updateNoteInCloud(noteId, updates);
    } catch (err) {
      console.warn('Failed to update note in Supabase, queuing offline:', err);
      enqueueOfflineAction({ type: 'UPDATE_NOTE', noteId, updates });
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
    setIsGuestMode(false);
    try {
      localStorage.removeItem('flexnote_unconfirmed_email');
      localStorage.removeItem('flexnote_guest_mode');
    } catch {}
    setActiveTab('notes');
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
      ) : !user && !isGuestMode ? (
        <AuthScreen
          onSuccess={() => {}}
          onRequiresConfirmation={handleRequiresConfirmation}
          onContinueOffline={() => {
            try {
              localStorage.setItem('flexnote_guest_mode', 'true');
            } catch {}
            setIsGuestMode(true);
          }}
        />
      ) : (
        <>
          {/* Top Header with App Title on left, Streak and Diamonds in center, and Class Switcher Dropdown on right */}
          <TopHeader
            subjects={SUBJECTS}
            selectedSubject={selectedSubject}
            onSelectSubject={(subj) => setSelectedSubject(subj)}
            totalNotes={notes.length}
            streakDays={gamification.streakDays}
            diamonds={gamification.diamonds}
            onOpenStreakModal={() => setStreakModalOpen(true)}
          />

          {/* Clean, flat offline status banner strip (strictly no pill shapes) */}
          <OfflineBanner
            isOnline={isOnline}
            justCameOnline={justCameOnline}
            pendingCount={pendingCount}
            isSyncing={isSyncing}
            onSyncNow={triggerSync}
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
                  onOpenExport={() => setExportModalOpen(true)}
                  isLoading={authLoading}
                />
              </div>
            )}

            {activeTab === 'practice' && (
              <PracticeView
                notes={displayNotes}
                allNotes={notes}
                subjects={SUBJECTS}
                selectedSubject={selectedSubject}
                userId={user?.id}
                onUpdateFlashcards={async (noteId, flashcards) => {
                  await handleUpdateNote(noteId, { flashcards });
                }}
                onUpdateQuiz={async (noteId, quiz) => {
                  await handleUpdateNote(noteId, { quiz });
                }}
                onOpenScan={() => setScanModalOpen(true)}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView
                user={user || { id: 'guest', email: 'Místní offline sešit' }}
                profile={userProfile}
                gamification={gamification}
                onOpenProfile={() => setActiveTab('profile')}
                onShowToast={(title, message) => setSyncToast({ title, message })}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                user={user || { id: 'guest', email: 'Místní offline sešit' }}
                profile={userProfile}
                totalNotes={notes.length}
                gamification={gamification}
                onSignOut={handleSignOut}
                onUpdateProfile={(updated) => setUserProfile(updated)}
                onOpenExport={() => setExportModalOpen(true)}
                isOnline={isOnline}
                pendingSyncCount={pendingCount}
                isSyncing={isSyncing}
                onSyncNow={triggerSync}
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
              existingNotes={notes}
            />
          )}

          {/* Note Detail & Markdown Modal */}
          {selectedNote && (
            <NoteDetailModal
              note={selectedNote}
              subjects={SUBJECTS}
              userId={user?.id}
              onClose={() => setSelectedNote(null)}
              onDeleteNote={handleDeleteNote}
              onUpdateNote={handleUpdateNote}
            />
          )}

          {/* Streak Details & Freeze Protection Modal */}
          {streakModalOpen && (
            <StreakModal
              gamification={gamification}
              onClose={() => setStreakModalOpen(false)}
              onBuyFreeze={buyStreakFreeze}
            />
          )}

          {/* Automatic Streak Rescue / Loss Dialog */}
          {autoRescueData && (
            <StreakRescueModal
              type={autoRescueData.type}
              streakDays={autoRescueData.streakDays}
              remainingFreezes={autoRescueData.remainingFreezes}
              userDiamonds={gamification.diamonds}
              onRestoreWithDiamonds={restoreStreakWithDiamonds}
              onStartNewStreak={confirmStreakReset}
              onClose={closeAutoRescueModal}
            />
          )}

          {/* Export All Notes Modal */}
          {exportModalOpen && (
            <ExportNotesModal
              notes={notes}
              profile={userProfile}
              userEmail={user?.email || ''}
              onClose={() => setExportModalOpen(false)}
              onShowToast={(title, message) => setSyncToast({ title, message })}
            />
          )}
        </>
      )}

      {/* Realtime Multi-device Sync Toast */}
      {syncToast && (
        <Toast
          type="success"
          title={syncToast.title}
          message={syncToast.message}
          onClose={() => setSyncToast(null)}
          durationMs={4500}
        />
      )}
    </MobileFrame>
  );
};

export default App;
