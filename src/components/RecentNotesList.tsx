import React from 'react';
import { Clock, ChevronRight, BookOpen, Plus } from 'lucide-react';
import { NoteItem, SubjectMeta } from '../types/notes';
import { playPopSound } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';

interface RecentNotesListProps {
  notes: NoteItem[];
  subjects: SubjectMeta[];
  selectedSubjectName: string;
  onSelectNote: (note: NoteItem) => void;
  onOpenScan: () => void;
}

export const RecentNotesList: React.FC<RecentNotesListProps> = ({
  notes,
  subjects,
  selectedSubjectName,
  onSelectNote,
  onOpenScan,
}) => {
  const getSubjectMeta = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId) || subjects[0];
  };

  return (
    <div className="px-4 py-4">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-feather font-black text-[18px] text-duoGray-charcoal leading-tight">
            Poslední zápisky
          </h2>
          <p className="text-[12px] font-bold text-duoGray-pencil">
            {selectedSubjectName} • {notes.length} {notes.length === 1 ? 'položka' : 'položek'}
          </p>
        </div>

        <button
          onClick={() => {
            playPopSound();
            onOpenScan();
          }}
          className="text-xs font-feather font-black text-sparkBlue hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus size={14} className="stroke-[3]" />
          <span>Přidat</span>
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="duo-card p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-duoGray-pencil">
            <BookOpen size={24} />
          </div>
          <h3 className="font-feather font-black text-sm text-duoGray-charcoal mb-1">
            Zatím žádné zápisky
          </h3>
          <p className="text-xs text-duoGray-pencil mb-4 max-w-[240px] mx-auto">
            V této třídě ještě nemáš naskenované žádné poznámky.
          </p>
          <button
            onClick={() => {
              playPopSound();
              onOpenScan();
            }}
            className="duo-btn duo-btn-green py-2.5 px-4 text-xs font-black uppercase tracking-wider"
          >
            Vyfotit první zápisek
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => {
            const meta = getSubjectMeta(note.subject);
            return (
              <div
                key={note.id}
                onClick={() => {
                  playPopSound();
                  onSelectNote(note);
                }}
                className="duo-card duo-card-interactive p-4 cursor-pointer hover:border-sparkBlue group transition-all bg-white"
              >
                {/* Header: Class Badge + Date */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-duo text-[11px] font-feather font-extrabold uppercase tracking-wide"
                    style={{
                      backgroundColor: meta.bgTint,
                      color: meta.color,
                      border: `1.5px solid ${meta.borderColor}`
                    }}
                  >
                    <SubjectIcon subject={meta.id} size={13} />
                    <span>{meta.czechName}</span>
                  </span>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-duoGray-pencil">
                    <Clock size={12} />
                    <span>{note.date}</span>
                  </div>
                </div>

                {/* Card Content: Thumbnail & Summary */}
                <div className="flex items-start gap-3">
                  {/* Photo thumbnail */}
                  <div className="relative w-16 h-16 rounded-duo overflow-hidden flex-shrink-0 border-2 border-duoGray-border bg-gray-100">
                    <img
                      src={note.thumbnailUrl}
                      alt={note.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 right-0 bg-duoGray-charcoal px-1.5 py-0.5 rounded-tl text-[8px] font-feather font-black text-white">
                      .MD
                    </div>
                  </div>

                  {/* Text details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-feather font-black text-[15px] text-duoGray-charcoal group-hover:text-sparkBlue transition-colors leading-snug truncate">
                      {note.title}
                    </h3>
                    <p className="text-[13px] text-duoGray-pencil line-clamp-2 mt-1 leading-snug">
                      {note.summary}
                    </p>
                  </div>

                  {/* Arrow Indicator */}
                  <div className="self-center pl-1 text-duoGray-faded group-hover:text-sparkBlue group-hover:translate-x-0.5 transition">
                    <ChevronRight size={20} />
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
