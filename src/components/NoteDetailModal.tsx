import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, Code2, Trash2, Pencil, Save, RotateCcw, Sparkles } from 'lucide-react';
import { NoteItem, SubjectMeta } from '../types/notes';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SubjectIcon } from './SubjectIcon';
import { FlashcardModal } from './FlashcardModal';

interface NoteDetailModalProps {
  note: NoteItem;
  subjects: SubjectMeta[];
  onClose: () => void;
  onDeleteNote?: (noteId: string) => void;
  onUpdateNote?: (noteId: string, updates: Partial<NoteItem>) => Promise<void> | void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  subjects,
  onClose,
  onDeleteNote,
  onUpdateNote,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editMarkdown, setEditMarkdown] = useState(note.markdown);
  const [isSaving, setIsSaving] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);

  const subjectMeta = subjects.find(s => s.id === note.subject) || subjects[0];

  const handleCopy = () => {
    playPopSound();
    navigator.clipboard.writeText(isEditing ? editMarkdown : note.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    setIsSaving(true);
    playPopSound();
    try {
      if (onUpdateNote) {
        await onUpdateNote(note.id, {
          title: editTitle.trim(),
          markdown: editMarkdown,
        });
      }
      playSuccessChime();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save note changes:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full md:max-w-[402px] max-h-[90vh] bg-white rounded-t-[32px] md:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t-2 md:border-2 border-duoGray-border animate-in slide-in-from-bottom-6 duration-200">
        {/* Top Drag Handle */}
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5"></div>

        {/* Modal Header */}
        <div className="px-4 pb-3 border-b-2 border-duoGray-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-duo text-xs font-feather font-extrabold uppercase tracking-wide"
              style={{
                backgroundColor: subjectMeta.bgTint,
                color: subjectMeta.color,
                border: `1.5px solid ${subjectMeta.borderColor}`
              }}
            >
              <SubjectIcon subject={subjectMeta.id} size={14} />
              <span>{subjectMeta.czechName}</span>
            </span>
            <span className="text-[11px] font-bold text-duoGray-pencil">
              {note.date}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                playPopSound();
                setShowFlashcards(true);
              }}
              title="Procvičit kartičky s 3D flip efektem"
              className="px-2.5 py-1.5 rounded-duo border-2 border-duoGray-border hover:bg-sparkBlue-tint hover:border-sparkBlue text-duoGray-charcoal hover:text-sparkBlue transition active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles size={15} className="text-sparkBlue shrink-0" />
              <span className="text-xs font-feather font-black text-sparkBlue">
                {note.flashcards && note.flashcards.length > 0 ? `${note.flashcards.length}` : 'Kartičky'}
              </span>
            </button>

            {onUpdateNote && (
              <button
                onClick={() => {
                  playPopSound();
                  setIsEditing(!isEditing);
                }}
                title={isEditing ? 'Ukončit úpravy' : 'Upravit zápisek'}
                className={`p-2 rounded-duo border-2 border-duoGray-border transition active:scale-95 cursor-pointer ${
                  isEditing
                    ? 'bg-sparkBlue text-white border-sparkBlue shadow-xs'
                    : 'hover:bg-gray-100 text-duoGray-charcoal'
                }`}
              >
                <Pencil size={16} />
              </button>
            )}
            {onDeleteNote && (
              <button
                onClick={() => {
                  playPopSound();
                  if (window.confirm('Opravdu chceš smazat tento zápisek?')) {
                    onDeleteNote(note.id);
                    onClose();
                  }
                }}
                title="Smazat zápisek"
                className="p-2 rounded-duo border-2 border-duoGray-border hover:bg-red-50 text-[#ff4b4b] transition active:scale-95 cursor-pointer"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button
              onClick={() => {
                playPopSound();
                onClose();
              }}
              className="p-2 rounded-duo border-2 border-duoGray-border hover:bg-gray-100 text-duoGray-charcoal transition active:scale-95 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab switcher or Edit bar */}
        {isEditing ? (
          <div className="px-4 py-2 bg-sparkBlue/10 border-b border-sparkBlue/30 flex items-center justify-between">
            <span className="text-xs font-feather font-black text-sparkBlue uppercase tracking-wider flex items-center gap-1.5">
              <Pencil size={13} />
              Režim úpravy zápisku
            </span>
            <span className="text-[11px] font-bold text-duoGray-pencil">
              Změny se ihned synchronizují
            </span>
          </div>
        ) : (
          <div className="px-4 pt-2.5 pb-2 bg-gray-50 flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  playPopSound();
                  setActiveTab('preview');
                }}
                className={`px-3 py-1 rounded-duo text-xs font-feather font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'preview'
                    ? 'bg-white text-eagerGreen shadow-xs border-2 border-duoGray-border'
                    : 'text-duoGray-pencil hover:text-duoGray-charcoal'
                }`}
              >
                <BookOpen size={13} />
                <span>Přehled</span>
              </button>
              <button
                onClick={() => {
                  playPopSound();
                  setActiveTab('raw');
                }}
                className={`px-3 py-1 rounded-duo text-xs font-feather font-extrabold flex items-center gap-1.5 transition ${
                  activeTab === 'raw'
                    ? 'bg-white text-sparkBlue shadow-xs border-2 border-duoGray-border'
                    : 'text-duoGray-pencil hover:text-duoGray-charcoal'
                }`}
              >
                <Code2 size={13} />
                <span>Zdrojový kód</span>
              </button>
            </div>

            <span className="text-[11px] font-bold text-duoGray-pencil">
              {note.readingTime} čtení
            </span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 select-text">
          {isEditing ? (
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="text-[11px] font-feather font-black uppercase text-duoGray-pencil tracking-wider block mb-1">
                  Název zápisku
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Zadej název tématu..."
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-duoGray-border font-feather font-black text-sm text-duoGray-charcoal focus:border-sparkBlue focus:outline-hidden"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="text-[11px] font-feather font-black uppercase text-duoGray-pencil tracking-wider block mb-1">
                  Obsah zápisku (Markdown & KaTeX)
                </label>
                <textarea
                  value={editMarkdown}
                  onChange={(e) => setEditMarkdown(e.target.value)}
                  rows={10}
                  className="w-full p-3.5 rounded-xl border-2 border-duoGray-border font-mono text-xs text-duoGray-charcoal focus:border-sparkBlue focus:outline-hidden leading-relaxed resize-y min-h-[220px]"
                  placeholder="Piš Markdown nebo KaTeX vzorce ($$...$$)..."
                />
              </div>
            </div>
          ) : activeTab === 'preview' ? (
            <div className="text-duoGray-charcoal">
              <div className="bg-storybookGreen/30 rounded-2xl p-3 border-2 border-eagerGreen/40 mb-3">
                <div className="text-[11px] font-feather font-black uppercase text-eagerGreen-dark mb-1">
                  Shrnutí zápisku:
                </div>
                <div className="text-xs text-duoGray-charcoal font-medium leading-normal">
                  <MarkdownRenderer content={note.summary} />
                </div>
              </div>

              {/* Duolingo 3D Flashcards Banner */}
              <div
                onClick={() => {
                  playPopSound();
                  setShowFlashcards(true);
                }}
                className="duo-card duo-card-interactive p-3.5 mb-4 bg-gradient-to-r from-blue-50/70 via-green-50/50 to-white border-2 border-sparkBlue/35 hover:border-sparkBlue cursor-pointer flex items-center justify-between group transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-sparkBlue text-white flex items-center justify-center border-b-2 border-sparkBlue-dark shadow-xs group-hover:scale-105 transition-transform shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-feather font-black text-xs text-duoGray-charcoal flex items-center gap-1.5 truncate">
                      <span>Chytré kartičky (Flashcards)</span>
                      {note.flashcards && note.flashcards.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-sparkBlue/15 text-sparkBlue text-[10px] font-extrabold shrink-0">
                          {note.flashcards.length} ks
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-bold text-duoGray-pencil mt-0.5 truncate">
                      {note.flashcards && note.flashcards.length > 0
                        ? 'Procvičuj s 3D flip efektem a vzorci'
                        : 'Generování jedním kliknutím pomocí AI'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playPopSound();
                    setShowFlashcards(true);
                  }}
                  className={`duo-btn text-[11px] font-black uppercase tracking-wider py-1.5 px-3 shrink-0 ml-2 ${
                    note.flashcards && note.flashcards.length > 0
                      ? 'duo-btn-blue'
                      : 'duo-btn-green'
                  }`}
                >
                  {note.flashcards && note.flashcards.length > 0 ? 'Procvičit' : 'Vytvořit'}
                </button>
              </div>

              {/* Formatted Markdown with KaTeX math formula rendering */}
              <MarkdownRenderer content={note.markdown} />
            </div>
          ) : (
            <div className="bg-[#1e1e1e] text-gray-200 p-3.5 rounded-2xl font-mono text-xs overflow-x-auto leading-relaxed border-2 border-gray-800">
              <pre className="whitespace-pre-wrap">{note.markdown}</pre>
            </div>
          )}
        </div>

        {/* Footer */}
        {isEditing ? (
          <div className="p-3.5 bg-white border-t-2 border-duoGray-border flex gap-2.5">
            <button
              onClick={() => {
                playPopSound();
                setEditTitle(note.title);
                setEditMarkdown(note.markdown);
                setIsEditing(false);
              }}
              className="flex-1 duo-btn duo-btn-white py-2.5 px-3 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Zrušit</span>
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving || !editTitle.trim()}
              className="flex-1 duo-btn duo-btn-green py-2.5 px-3 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={15} />
              <span>{isSaving ? 'Ukládám...' : 'Uložit změny'}</span>
            </button>
          </div>
        ) : activeTab === 'raw' && (
          <div className="p-3.5 bg-white border-t-2 border-duoGray-border">
            <button
              onClick={handleCopy}
              className="w-full duo-btn duo-btn-white py-2.5 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-eagerGreen stroke-[3]" />
                  <span className="text-eagerGreen">Zkopírováno do schránky!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Kopírovat Markdown text</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 3D Duolingo Flashcard Modal */}
      {showFlashcards && (
        <FlashcardModal
          note={note}
          subjects={subjects}
          onClose={() => setShowFlashcards(false)}
          onUpdateFlashcards={async (noteId, flashcards) => {
            if (onUpdateNote) {
              await onUpdateNote(noteId, { flashcards });
            }
          }}
        />
      )}
    </div>
  );
};
