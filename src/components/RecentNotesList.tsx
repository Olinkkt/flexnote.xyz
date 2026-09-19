import React, { useState } from 'react';
import { Clock, ChevronRight, BookOpen, Search, X, Download, Sparkles } from 'lucide-react';
import { NoteItem, SubjectMeta } from '../types/notes';
import { playPopSound } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';

interface RecentNotesListProps {
  notes: NoteItem[];
  subjects: SubjectMeta[];
  selectedSubjectName: string;
  onSelectNote: (note: NoteItem) => void;
  onOpenScan: () => void;
  onOpenExport?: () => void;
  isLoading?: boolean;
}

const PAGE_SIZE = 12;

export const RecentNotesList: React.FC<RecentNotesListProps> = ({
  notes,
  subjects,
  selectedSubjectName,
  onSelectNote,
  onOpenScan,
  onOpenExport,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const getSubjectMeta = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId) || subjects[0];
  };

  const filteredNotes = notes.filter((n) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.summary.toLowerCase().includes(q) ||
      (n.markdown && n.markdown.toLowerCase().includes(q)) ||
      (n.tags && n.tags.some(t => t.toLowerCase().includes(q)))
    );
  });

  const paginatedNotes = filteredNotes.slice(0, visibleCount);
  const hasMore = visibleCount < filteredNotes.length;
  const remainingCount = filteredNotes.length - visibleCount;

  return (
    <div className="px-4 py-3 select-none">
      {/* Section Header */}
      <div className="mb-3">
        <h2 className="font-feather font-black text-[20px] text-duoGray-charcoal leading-tight">
          {searchQuery.trim() ? 'Výsledky hledání' : 'Poslední zápisky'}
        </h2>
        <p className="text-[12px] font-bold text-duoGray-pencil mt-0.5">
          {searchQuery.trim()
            ? `Nalezeno ${filteredNotes.length} ${filteredNotes.length === 1 ? 'zápisek' : filteredNotes.length < 5 ? 'zápisky' : 'zápisků'}`
            : `${selectedSubjectName} • ${notes.length} ${notes.length === 1 ? 'položka' : notes.length < 5 ? 'položky' : 'položek'}`}
        </p>
      </div>

      {/* Search Input Bar & Export Action Button */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-duoGray-faded" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Hledat v zápiscích, vzorcích a tématech..."
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white border-2 border-duoGray-border focus:border-sparkBlue focus:outline-hidden text-xs font-bold text-duoGray-charcoal placeholder:text-duoGray-faded shadow-xs transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => {
                playPopSound();
                setSearchQuery('');
              }}
              title="Vymazat hledání"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-duoGray-faded hover:text-duoGray-charcoal cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {onOpenExport && (
          <button
            onClick={() => {
              playPopSound();
              onOpenExport();
            }}
            title="Exportovat všechny zápisky"
            className="p-2.5 rounded-2xl bg-white border-2 border-duoGray-border hover:border-sparkBlue hover:bg-sparkBlue-tint text-duoGray-charcoal hover:text-sparkBlue active:scale-95 transition shadow-xs shrink-0 cursor-pointer"
          >
            <Download size={18} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="duo-card p-4 bg-white animate-pulse">
              <div className="flex items-center justify-between mb-2.5">
                <div className="h-5 w-24 bg-gray-200 rounded-lg"></div>
                <div className="h-4 w-16 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-2xl bg-gray-200 shrink-0"></div>
                <div className="flex-1">
                  <div className="h-4 w-3/4 bg-gray-200 rounded-md mb-2"></div>
                  <div className="h-3 w-full bg-gray-100 rounded-md mb-1.5"></div>
                  <div className="h-3 w-2/3 bg-gray-100 rounded-md"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
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
      ) : filteredNotes.length === 0 ? (
        <div className="duo-card p-8 text-center bg-white">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 text-duoGray-pencil">
            <Search size={24} />
          </div>
          <h3 className="font-feather font-black text-sm text-duoGray-charcoal mb-1">
            Nenalezen žádný zápisek
          </h3>
          <p className="text-xs text-duoGray-pencil mb-4 max-w-[240px] mx-auto">
            Pro dotaz „{searchQuery}“ jsme nic nenašli. Zkus jiné klíčové slovo nebo vzorec.
          </p>
          <button
            onClick={() => {
              playPopSound();
              setSearchQuery('');
            }}
            className="duo-btn duo-btn-white py-2 px-4 text-xs font-feather font-black text-duoGray-charcoal border-2 border-duoGray-border"
          >
            Zrušit hledání
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {paginatedNotes.map((note) => {
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

                  <div className="flex items-center gap-2 text-[11px] font-bold text-duoGray-pencil">
                    {note.flashcards && note.flashcards.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sparkBlue/10 text-sparkBlue text-[10px] font-feather font-black">
                        <Sparkles size={11} />
                        <span>{note.flashcards.length} kartiček</span>
                      </span>
                    )}
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{note.date}</span>
                    </div>
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

          {/* Load More Pagination Button */}
          {hasMore && (
            <div className="pt-2 pb-4 flex justify-center">
              <button
                onClick={() => {
                  playPopSound();
                  setVisibleCount((prev) => prev + PAGE_SIZE);
                }}
                className="duo-btn duo-btn-white py-2.5 px-5 text-xs font-feather font-black text-duoGray-charcoal border-2 border-duoGray-border hover:bg-gray-50 flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Načíst další zápisky ({remainingCount} zbývá)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
