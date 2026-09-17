import React, { useState, useEffect } from 'react';
import { MobileFrame } from './components/MobileFrame';
import { TopHeader } from './components/TopHeader';
import { RecentNotesList } from './components/RecentNotesList';
import { ScanModal } from './components/ScanModal';
import { NoteDetailModal } from './components/NoteDetailModal';
import { BottomNav, TabType } from './components/BottomNav';
import { NotesLibraryView } from './components/NotesLibraryView';

import { SUBJECTS, INITIAL_NOTES } from './data/mockNotes';
import { NoteItem, SubjectType } from './types/notes';
import { fetchNotesFromCloud, saveNoteToCloud, deleteNoteFromCloud } from './services/supabase';

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

  // Load from Supabase on mount
  useEffect(() => {
    async function loadCloudData() {
      try {
        const cloudNotes = await fetchNotesFromCloud();
        if (cloudNotes && cloudNotes.length > 0) {
          setNotes(cloudNotes);
        }
      } catch (err) {
        console.warn('Supabase not yet populated or offline, using local data:', err);
      }
    }
    loadCloudData();
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

    // Async sync to Supabase
    try {
      const saved = await saveNoteToCloud(newNote);
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

  const activeMeta = SUBJECTS.find((s) => s.id === selectedSubject) || SUBJECTS[0];

  return (
    <MobileFrame activeSubjectName={activeMeta.czechName}>
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
    </MobileFrame>
  );
};

export default App;
