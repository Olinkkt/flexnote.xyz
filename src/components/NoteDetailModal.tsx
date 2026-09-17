import React, { useState } from 'react';
import { X, Copy, Check, BookOpen, Code2, Trash2 } from 'lucide-react';
import { NoteItem, SubjectMeta } from '../types/notes';
import { playPopSound } from '../utils/audio';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SubjectIcon } from './SubjectIcon';

interface NoteDetailModalProps {
  note: NoteItem;
  subjects: SubjectMeta[];
  onClose: () => void;
  onDeleteNote?: (noteId: string) => void;
}

export const NoteDetailModal: React.FC<NoteDetailModalProps> = ({
  note,
  subjects,
  onClose,
  onDeleteNote,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [copied, setCopied] = useState(false);

  const subjectMeta = subjects.find(s => s.id === note.subject) || subjects[0];

  const handleCopy = () => {
    playPopSound();
    navigator.clipboard.writeText(note.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

        {/* Tab switcher: Formatted vs Raw */}
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 select-text">
          {activeTab === 'preview' ? (
            <div className="text-duoGray-charcoal">
              <div className="bg-storybookGreen/30 rounded-2xl p-3 border-2 border-eagerGreen/40 mb-4">
                <div className="text-[11px] font-feather font-black uppercase text-eagerGreen-dark mb-1">
                  Shrnutí zápisku:
                </div>
                <div className="text-xs text-duoGray-charcoal font-medium leading-normal">
                  <MarkdownRenderer content={note.summary} />
                </div>
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

        {/* Footer with copy button - only in raw format view */}
        {activeTab === 'raw' && (
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
    </div>
  );
};
