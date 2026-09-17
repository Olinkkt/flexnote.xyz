import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Sparkles, FileText, ArrowRight, HelpCircle, ChevronRight, Check, Zap } from 'lucide-react';
import { NoteItem, SubjectType } from '../types/notes';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';
import { Toast, ToastProps } from './Toast';
import { fileToBase64, extractNoteFromImage } from '../services/openrouter';

interface ScanModalProps {
  onClose: () => void;
  onSaveNote: (newNote: NoteItem) => void;
}

interface ExtractedData {
  title: string;
  summary: string;
  markdown: string;
  accuracy: number;
}

const AVAILABLE_CLASSES: { id: SubjectType; name: string }[] = [
  { id: 'maths', name: 'Matematika' },
  { id: 'czech', name: 'Český jazyk' },
  { id: 'history', name: 'Dějepis' },
  { id: 'science', name: 'Přírodní vědy' },
];

export const ScanModal: React.FC<ScanModalProps> = ({ onClose, onSaveNote }) => {
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [processingMessage, setProcessingMessage] = useState('Model Dots3-Note čte text a KaTeX vzorce...');
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);
  const [isAiUncertain, setIsAiUncertain] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string>(
    'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=80'
  );
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    setProcessingMessage('Model Dots3-Note analyzuje sešit...');
    playPopSound();

    try {
      const base64 = await fileToBase64(file);
      setPreviewImage(base64);

      setProcessingMessage('Dots3-Note čte text a převádí vzorce do KaTeXu...');
      const result = await extractNoteFromImage(base64);

      setExtractedData({
        title: result.title,
        summary: result.summary,
        markdown: result.markdown,
        accuracy: result.confidence,
      });

      if (result.subject === 'uncertain') {
        setIsAiUncertain(true);
        setSelectedSubject(null);
      } else {
        setIsAiUncertain(false);
        setSelectedSubject(result.subject);
      }

      setStatus('ready');
      playSuccessChime();
    } catch (err: unknown) {
      setStatus('idle');
      const msg = err instanceof Error ? err.message : String(err);
      setToast({
        type: 'error',
        title: 'Chyba při digitalizaci zápisku',
        message: msg,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processDemo = (forceUncertain = false) => {
    setPreviewImage('https://images.unsplash.com/photo-1509228468518-180dd4864904?w=500&auto=format&fit=crop&q=80');
    setStatus('processing');
    setProcessingMessage('Simuluji digitalizaci zápisku...');
    playPopSound();

    setTimeout(() => {
      setStatus('ready');
      if (forceUncertain) {
        setIsAiUncertain(true);
        setSelectedSubject(null);
        setExtractedData(null);
      } else {
        setIsAiUncertain(false);
        setSelectedSubject('maths');
        setExtractedData({
          title: 'Goniometrie a pravoúhlý trojúhelník',
          summary: 'Převedený zápisek z fotky sešitu do předmětu matematika.',
          markdown: `# Goniometrie a pravoúhlý trojúhelník\n\n## 1. Základní vztahy v trojúhelníku\n- $\\sin(\\alpha) = \\frac{a}{c}$\n- $\\cos(\\alpha) = \\frac{b}{c}$\n- $\\text{tg}(\\alpha) = \\frac{a}{b}$\n\n## 2. Pythagorova věta\n$$a^2 + b^2 = c^2$$`,
          accuracy: 99,
        });
      }
      playSuccessChime();
    }, 600);
  };

  const handleSave = () => {
    if (!selectedSubject) return;

    playSuccessChime();
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: extractedData?.title || (selectedSubject === 'maths'
        ? 'Goniometrie a pravoúhlý trojúhelník'
        : selectedSubject === 'czech'
        ? 'Pravopis a větné členy'
        : selectedSubject === 'history'
        ? 'Historický přehled panovníků'
        : 'Obecné zápisky z hodiny'),
      subject: selectedSubject,
      date: 'Právě teď',
      timestamp: Date.now(),
      thumbnailUrl: previewImage,
      readingTime: '2 min',
      accuracy: extractedData?.accuracy ?? (isAiUncertain ? 85 : 99),
      status: 'new',
      summary: extractedData?.summary || `Převedený zápisek z fotky sešitu do předmětu ${selectedSubject}.`,
      tags: [selectedSubject, 'Zápisky', 'Nový'],
      markdown: extractedData?.markdown || `# Zápisky z hodiny\n\n- Digitalizovaný text ze sešitu.\n- Předmět: **${AVAILABLE_CLASSES.find(c => c.id === selectedSubject)?.name || selectedSubject}**`,
    };

    onSaveNote(newNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full md:max-w-[402px] max-h-[90vh] bg-white rounded-t-[32px] md:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t-2 md:border-2 border-duoGray-border animate-in slide-in-from-bottom-6 duration-150">
        {/* Header */}
        <div className="px-4 py-3 border-b-2 border-duoGray-border flex items-center justify-between">
          <h3 className="font-feather font-black text-[16px] text-duoGray-charcoal">
            Importovat soubor z mobilu
          </h3>
          <button
            onClick={() => {
              playPopSound();
              onClose();
            }}
            className="p-1.5 rounded-duo border-2 border-duoGray-border hover:bg-gray-100 text-duoGray-charcoal transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto max-h-[75vh]">
          {status === 'idle' && (
            <div className="flex flex-col items-center text-center">
              {/* Main Fast Import Button */}
              <label className="w-full duo-card p-6 flex flex-col items-center justify-center cursor-pointer hover:border-eagerGreen bg-[#f9fafb] group transition-all mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <div className="w-16 h-16 rounded-full bg-storybookGreen flex items-center justify-center text-eagerGreen mb-3 group-hover:scale-110 transition-transform">
                  <Camera size={32} className="stroke-[2.5]" />
                </div>
                <span className="font-feather font-black text-sm text-duoGray-charcoal uppercase tracking-wider mb-1">
                  Vyfotit nebo vybrat fotku
                </span>
                <span className="text-xs text-duoGray-pencil font-medium">
                  Klikni pro otevření fotoaparátu v mobilu
                </span>
              </label>

              {/* Demo test buttons */}
              <div className="flex flex-col gap-1.5 w-full pt-1">
                <button
                  onClick={() => processDemo(false)}
                  className="text-xs font-feather font-bold text-sparkBlue hover:underline py-1 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap size={13} className="text-sparkBlue fill-sparkBlue" />
                  <span>Zkusit demo s jasným předmětem</span>
                </button>
                <button
                  onClick={() => processDemo(true)}
                  className="text-xs font-feather font-bold text-duoGray-pencil hover:text-duoGray-charcoal hover:underline py-1 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <HelpCircle size={13} />
                  <span>Zkusit demo s nejasným kontextem</span>
                </button>
              </div>
            </div>
          )}

          {status === 'processing' && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 size={36} className="text-eagerGreen animate-spin mb-3 stroke-[2.5]" />
              <div className="font-feather font-black text-sm text-duoGray-charcoal mb-1">
                {processingMessage}
              </div>
              <span className="text-[11px] text-duoGray-pencil font-medium bg-gray-100 px-2.5 py-0.5 rounded-full mt-1 font-mono">
                dots-studio/dots-3-note-preview:free
              </span>
            </div>
          )}

          {status === 'ready' && (
            <div>
              {/* Scenario 1: AI didn't recognize the class with certainty */}
              {isAiUncertain && (
                <div className="mb-4">
                  <div className="bg-[#fff4e5] border-2 border-[#ff9600] rounded-duo p-3 mb-3">
                    <div className="flex items-center gap-1.5 font-feather font-black text-xs text-[#d97706] mb-0.5">
                      <HelpCircle size={15} />
                      <span>AI nerozpoznala předmět z kontextu</span>
                    </div>
                    <p className="text-[11px] text-duoGray-charcoal font-medium">
                      Zápisek nemá jasný kontext. Zvol prosím, do které třídy patří:
                    </p>
                  </div>

                  {/* Class Selection Buttons in Duolingo Style */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {AVAILABLE_CLASSES.map((cls) => {
                      const isSelected = selectedSubject === cls.id;
                      return (
                        <button
                          key={cls.id}
                          onClick={() => {
                            playPopSound();
                            setSelectedSubject(cls.id);
                          }}
                          className={`p-2.5 rounded-duo border-2 flex items-center justify-between text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-storybookGreen border-eagerGreen border-b-4 text-duoGray-charcoal font-black translate-y-[-1px]'
                              : 'bg-white border-duoGray-border border-b-4 hover:border-duoGray-faded text-duoGray-charcoal font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <SubjectIcon subject={cls.id} size={18} />
                            <span className="font-feather text-xs">{cls.name}</span>
                          </div>
                          {isSelected && <Check size={16} className="text-eagerGreen stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Scenario 2: AI recognized the class automatically */}
              {!isAiUncertain && selectedSubject && (
                <div className="flex items-center justify-between mb-3 bg-storybookGreen/40 border-2 border-eagerGreen/40 rounded-duo p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-eagerGreen/30 flex items-center justify-center shadow-xs">
                      <SubjectIcon subject={selectedSubject} size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-feather font-black uppercase text-eagerGreen-dark">
                        Automaticky rozpoznaný předmět
                      </div>
                      <div className="font-feather font-black text-xs text-duoGray-charcoal">
                        {AVAILABLE_CLASSES.find(c => c.id === selectedSubject)?.name || 'Matematika'}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      playPopSound();
                      setIsAiUncertain(true);
                    }}
                    className="text-[11px] font-feather font-black text-sparkBlue hover:underline cursor-pointer"
                  >
                    Změnit
                  </button>
                </div>
              )}

              {/* Note Preview */}
              <div className="duo-card p-3 mb-4 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-feather font-black text-duoGray-charcoal">
                    <FileText size={14} className="text-sparkBlue" />
                    <span>{extractedData?.title || 'Náhled převedeného .md souboru'}</span>
                  </div>
                </div>
                <div className="bg-[#f7f7f7] border-2 border-duoGray-border text-duoGray-charcoal p-2.5 rounded-xl font-mono text-[11px] max-h-36 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">
                    {extractedData?.markdown || `# Zápisky z hodiny\n\n- Automaticky digitalizovaný text ze sešitu.\n- Třída: ${
                      selectedSubject ? AVAILABLE_CLASSES.find(c => c.id === selectedSubject)?.name : '(Zatím nevybráno)'
                    }`}
                  </pre>
                </div>
              </div>

              {/* Save Button (disabled until a subject is picked) */}
              <button
                onClick={handleSave}
                disabled={!selectedSubject}
                className={`w-full duo-btn py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all ${
                  selectedSubject
                    ? 'duo-btn-green cursor-pointer'
                    : 'bg-gray-200 text-gray-400 border-b-4 border-gray-300 cursor-not-allowed'
                }`}
              >
                <span>{selectedSubject ? 'Uložit do zápisků' : 'Nejdříve zvol předmět'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Global Toast for Errors */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};
