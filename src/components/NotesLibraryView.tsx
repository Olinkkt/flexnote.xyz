import React, { useState } from 'react';
import { Search, Filter, BookOpen, Clock, ChevronRight, Plus } from 'lucide-react';
import { NoteItem, SubjectMeta, SubjectType } from '../types/notes';
import { playPopSound } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';

interface NotesLibraryViewProps {
  notes: NoteItem[];
  subjects: SubjectMeta[];
  selectedSubject: SubjectType;
  onSelectSubject: (s: SubjectType) => void;
  onSelectNote: (note: NoteItem) => void;
  onOpenScan: () => void;
}

export const NotesLibraryView: React.FC<NotesLibraryViewProps> = ({
  notes,
  subjects,
  selectedSubject,
  onSelectSubject,
  onSelectNote,
  onOpenScan,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNotes = notes.filter((n) => {
    const matchesSubject = selectedSubject === 'all' || n.subject === selectedSubject;
    const matchesQuery =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSubject && matchesQuery;
  });

  return (
    <div className="p-4 select-none">
      {/* Search Input Bar */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-duoGray-faded" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hledat v zápiscích, vzorcích a tématech..."
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border-2 border-duoGray-border focus:border-sparkBlue focus:outline-none text-xs font-bold text-duoGray-charcoal placeholder:text-duoGray-faded shadow-xs"
        />
      </div>

      {/* Horizontal Subject Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {subjects.map((s) => {
          const isSelected = s.id === selectedSubject;
          return (
            <button
              key={s.id}
              onClick={() => {
                playPopSound();
                onSelectSubject(s.id);
              }}
              className={`px-3 py-1 rounded-full text-xs font-feather font-black flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-eagerGreen text-white shadow-xs'
                  : 'bg-white text-duoGray-pencil border border-duoGray-border hover:border-duoGray-faded'
              }`}
            >
              <SubjectIcon subject={s.id} size={14} />
              <span>{s.czechName}</span>
            </button>
          );
        })}
      </div>

      {/* Notes List */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-extrabold text-duoGray-charcoal">
          Nalezeno {filteredNotes.length} zápisků
        </span>
        <button
          onClick={onOpenScan}
          className="text-xs font-extrabold text-eagerGreen hover:underline flex items-center gap-1"
        >
          <Plus size={14} /> Přidat nový
        </button>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="duo-card p-6 text-center mt-2">
          <BookOpen size={32} className="mx-auto text-duoGray-faded mb-2" />
          <p className="text-xs font-bold text-duoGray-pencil">
            Nenalezen žádný zápisek odpovídající filtru.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredNotes.map((note) => {
            const meta = subjects.find(s => s.id === note.subject) || subjects[0];
            return (
              <div
                key={note.id}
                onClick={() => {
                  playPopSound();
                  onSelectNote(note);
                }}
                className="duo-card duo-card-interactive p-3 hover:border-sparkBlue cursor-pointer transition group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
                    style={{
                      backgroundColor: meta.bgTint,
                      color: meta.color,
                      border: `1px solid ${meta.borderColor}`
                    }}
                  >
                    <SubjectIcon subject={meta.id} size={12} />
                    <span>{meta.czechName}</span>
                  </span>
                  <span className="text-[10px] font-bold text-duoGray-pencil flex items-center gap-1">
                    <Clock size={11} /> {note.date}
                  </span>
                </div>

                <h4 className="font-feather font-extrabold text-xs text-duoGray-charcoal group-hover:text-sparkBlue transition-colors truncate">
                  {note.title}
                </h4>
                <p className="text-[11px] text-duoGray-pencil line-clamp-2 mt-0.5">
                  {note.summary}
                </p>

                <div className="flex items-center justify-end mt-2 pt-1.5 border-t border-gray-100">
                  <div className="flex items-center gap-0.5 text-xs text-sparkBlue font-feather font-black">
                    <span>Otevřít</span>
                    <ChevronRight size={14} className="stroke-[2.5]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
