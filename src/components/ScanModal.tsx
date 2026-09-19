import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Sparkles, FileText, ArrowRight, HelpCircle, ChevronRight, Check, WifiOff, RotateCcw, AlertTriangle } from 'lucide-react';
import { NoteItem, SubjectType } from '../types/notes';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';
import { Toast, ToastProps } from './Toast';
import { extractNoteFromImage } from '../services/gemini';
import { uploadNoteImage } from '../services/supabase';
import { generateOfflineFlashcards } from '../services/flashcards';
import { validateFileSize, compressAndPrepareImage } from '../utils/imageCompressor';
import { checkRateLimit, recordRateLimitUsage } from '../services/rateLimiter';

interface ScanModalProps {
  onClose: () => void;
  onSaveNote: (newNote: NoteItem) => void;
  userId?: string;
  existingNotes?: NoteItem[];
}

interface ExtractedData {
  title: string;
  topic?: string;
  summary: string;
  markdown: string;
}

const AVAILABLE_CLASSES: { id: SubjectType; name: string }[] = [
  { id: 'maths', name: 'Matematika' },
  { id: 'czech', name: 'Český jazyk' },
  { id: 'history', name: 'Dějepis' },
  { id: 'science', name: 'Přírodní vědy' },
];

export const ScanModal: React.FC<ScanModalProps> = ({ onClose, onSaveNote, userId, existingNotes }) => {
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');
  const [lastErrorMsg, setLastErrorMsg] = useState<string>('');
  const [processingMessage, setProcessingMessage] = useState('Gemini AI čte text a převádí vzorce do KaTeXu...');
  const [selectedSubject, setSelectedSubject] = useState<SubjectType | null>(null);
  const [topic, setTopic] = useState<string>('');
  const [isAiUncertain, setIsAiUncertain] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [toast, setToast] = useState<Omit<ToastProps, 'onClose'> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const relevantTopics = Array.from(
    new Set(
      (existingNotes || [])
        .filter((n) => !selectedSubject || n.subject === selectedSubject)
        .map((n) => n.topic)
        .filter((t): t is string => Boolean(t && t.trim()))
    )
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. File size limit validation (max 15 MB)
    const validation = validateFileSize(file);
    if (!validation.valid) {
      setToast({
        type: 'error',
        title: 'Příliš velký soubor',
        message: validation.error || 'Maximální povolená velikost souboru je 15 MB.',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    playPopSound();

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // 2. Client-side rate limit & spending guardrail check
    if (isOnline) {
      const rateCheck = checkRateLimit('ocr_scan');
      if (!rateCheck.allowed) {
        setToast({
          type: 'error',
          title: 'Limit digitalizace',
          message: rateCheck.reason || 'Počkej prosím chvíli před dalším skenováním.',
        });
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    setStatus('processing');
    setProcessingMessage('Optimalizuji a komprimuji fotografii...');

    try {
      // 3. Client-side compression & resizing (Canvas JPEG ~0.82, max 1920px)
      const compression = await compressAndPrepareImage(file);
      setSelectedFile(compression.file);
      setPreviewImage(compression.base64);

      if (!isOnline) {
        // Offline: save compressed photo locally and allow immediate saving/naming without AI API
        setIsAiUncertain(true);
        setSelectedSubject(null);
        setExtractedData({
          title: 'Nový zápisek ze sešitu',
          summary: 'Zápisek vyfocený offline v režimu bez internetu.',
          markdown: `# Nový zápisek ze sešitu\n\n*(Vyfoceno offline v režimu bez internetu. Text můžeš upravit v detailu zápisku.)*`,
        });
        setStatus('ready');
        playSuccessChime();
        return;
      }

      setProcessingMessage('Gemini AI čte text a převádí vzorce do KaTeXu...');
      const result = await extractNoteFromImage(compression.base64);
      recordRateLimitUsage('ocr_scan');

      setExtractedData({
        title: result.title,
        topic: result.topic,
        summary: result.summary,
        markdown: result.markdown,
      });

      if (result.topic) {
        setTopic(result.topic);
      }

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
      const msg = err instanceof Error ? err.message : String(err);
      setLastErrorMsg(msg);
      setStatus('error');
      setToast({
        type: 'error',
        title: 'Digitalizace se nezdařila',
        message: msg,
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRetryOcr = async () => {
    if (!previewImage) return;

    playPopSound();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      setToast({
        type: 'warning',
        title: 'Režim offline',
        message: 'Pro opakování digitalizace se připoj k internetu, nebo ulož zápisek ručně bez AI.',
      });
      return;
    }

    const rateCheck = checkRateLimit('ocr_scan');
    if (!rateCheck.allowed) {
      setToast({
        type: 'error',
        title: 'Limit digitalizace',
        message: rateCheck.reason || 'Počkej prosím chvíli před dalším pokusem.',
      });
      return;
    }

    setStatus('processing');
    setProcessingMessage('Zkouším digitalizaci znovu (Gemini AI)...');

    try {
      const result = await extractNoteFromImage(previewImage);
      recordRateLimitUsage('ocr_scan');

      setExtractedData({
        title: result.title,
        topic: result.topic,
        summary: result.summary,
        markdown: result.markdown,
      });

      if (result.topic) {
        setTopic(result.topic);
      }

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
      const msg = err instanceof Error ? err.message : String(err);
      setLastErrorMsg(msg);
      setStatus('error');
      setToast({
        type: 'error',
        title: 'Opakovaný pokus selhal',
        message: msg,
      });
    }
  };

  const handleSaveWithoutAi = () => {
    playPopSound();
    setIsAiUncertain(true);
    setSelectedSubject(null);
    setExtractedData({
      title: 'Nový zápisek ze sešitu',
      summary: 'Zápisek uložený přímo z fotografie bez AI rozpoznání textu.',
      markdown: `# Nový zápisek ze sešitu\n\n*(Text můžeš kdykoliv doplnit v detailu zápisku.)*`,
    });
    setStatus('ready');
  };

  const handleSave = async () => {
    if (!selectedSubject) return;

    let finalThumbnailUrl = previewImage;

    // If student selected or took a real photo and is online, upload to Supabase Storage
    if (selectedFile && (typeof navigator === 'undefined' || navigator.onLine)) {
      setIsUploadingImage(true);
      try {
        const publicUrl = await uploadNoteImage(selectedFile, userId);
        if (publicUrl) {
          finalThumbnailUrl = publicUrl;
        }
      } catch (err) {
        console.warn('Could not upload note image to Supabase Storage, using fallback:', err);
      } finally {
        setIsUploadingImage(false);
      }
    }

    const subjectName = AVAILABLE_CLASSES.find((c) => c.id === selectedSubject)?.name || selectedSubject;
    const defaultTitle = topic.trim()
      ? topic.trim()
      : `Zápisek – ${subjectName}`;

    playSuccessChime();
    const newNote: NoteItem = {
      id: `note-${Date.now()}`,
      title: extractedData?.title || defaultTitle,
      topic: topic.trim() || undefined,
      subject: selectedSubject,
      date: 'Právě teď',
      timestamp: Date.now(),
      thumbnailUrl: finalThumbnailUrl,
      readingTime: '2 min',
      accuracy: 98,
      status: 'new',
      summary: extractedData?.summary || `Převedený zápisek z fotky sešitu do předmětu ${subjectName}.`,
      tags: [selectedSubject, topic.trim() || 'Zápisky', 'Nový'],
      markdown: extractedData?.markdown || `# ${defaultTitle}\n\n- Digitalizovaný text ze sešitu.\n- Předmět: **${subjectName}**`,
    };

    // Automatically generate initial flashcards from formulas and concepts
    newNote.flashcards = generateOfflineFlashcards(newNote);

    onSaveNote(newNote);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full md:max-w-xl max-h-[90vh] bg-white rounded-t-[32px] md:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t-2 md:border-2 border-duoGray-border animate-in slide-in-from-bottom-6 duration-150">
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
              {/* Offline mode informational note */}
              {typeof navigator !== 'undefined' && !navigator.onLine && (
                <div className="w-full bg-[#fffbeb] border-2 border-[#fcd34d] rounded-2xl p-3 mb-3 text-left animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 font-feather font-black text-xs text-[#92400e]">
                    <WifiOff size={14} className="stroke-[2.5]" />
                    <span>Režim offline</span>
                  </div>
                  <p className="text-[11px] text-[#b45309] font-medium mt-0.5 leading-snug">
                    Fotka se uloží přímo do tvého zařízení. Zápisek můžeš pojmenovat a uložit do sešitu i bez internetu.
                  </p>
                </div>
              )}

              {/* Main Fast Import Button */}
              <label className="w-full duo-card p-6 flex flex-col items-center justify-center cursor-pointer hover:border-eagerGreen bg-[#f9fafb] group transition-all">
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
            </div>
          )}

          {status === 'processing' && (
            <div className="py-8 flex flex-col items-center justify-center text-center">
              <Loader2 size={36} className="text-eagerGreen animate-spin mb-3 stroke-[2.5]" />
              <div className="font-feather font-black text-sm text-duoGray-charcoal mb-1">
                {processingMessage}
              </div>
              <span className="text-[11px] text-duoGray-pencil font-medium bg-gray-100 px-2.5 py-0.5 rounded-full mt-1 font-mono">
                Google Gemini 3.8 Flash
              </span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center text-center p-2 animate-in fade-in duration-150">
              <div className="w-full bg-[#fef2f2] border-2 border-[#fca5a5] rounded-2xl p-3.5 mb-3 text-left">
                <div className="flex items-center gap-1.5 font-feather font-black text-xs text-[#b91c1c] mb-1">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>Digitalizace se nezdařila</span>
                </div>
                <p className="text-[11px] text-[#7f1d1d] font-medium leading-relaxed">
                  {lastErrorMsg || 'Nastala chyba při čtení fotografie sešitu. Tvá fotka je však bezpečně uchována v paměti.'}
                </p>
              </div>

              {previewImage && (
                <div className="w-full h-32 rounded-2xl overflow-hidden border-2 border-duoGray-border mb-3 relative bg-gray-50">
                  <img src={previewImage} alt="Náhled sešitu" className="w-full h-full object-cover" />
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    Fotka připravena
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={handleRetryOcr}
                  className="w-full duo-btn duo-btn-green py-2.5 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Zkusit digitalizaci znovu</span>
                </button>

                <button
                  onClick={handleSaveWithoutAi}
                  className="w-full duo-btn duo-btn-white py-2.5 px-4 text-xs font-feather font-black text-duoGray-charcoal border-2 border-duoGray-border flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50"
                >
                  <FileText size={15} />
                  <span>Uložit fotku bez AI (doplnit ručně)</span>
                </button>

                <button
                  onClick={() => {
                    playPopSound();
                    setStatus('idle');
                  }}
                  className="text-xs font-feather font-bold text-duoGray-pencil hover:text-duoGray-charcoal py-1 cursor-pointer"
                >
                  Vybrat nebo vyfotit jinou fotku
                </button>
              </div>
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

              {/* Topic / Chapter Input */}
              <div className="duo-card p-3 mb-3 bg-white">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-feather font-black uppercase tracking-wide text-duoGray-pencil">
                    Téma / Kapitola sešitu
                  </label>
                  <span className="text-[10px] text-duoGray-faded font-bold">Spojí více stránek</span>
                </div>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Např. Kvadratické rovnice, Husitství..."
                  className="w-full px-3 py-2 rounded-xl bg-gray-50 border-2 border-duoGray-border text-xs font-bold text-duoGray-charcoal focus:border-sparkBlue focus:bg-white focus:outline-hidden transition-all"
                />

                {relevantTopics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-bold text-duoGray-pencil">Témata:</span>
                    {relevantTopics.slice(0, 4).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          playPopSound();
                          setTopic(t);
                        }}
                        className={`text-[10px] font-feather font-extrabold px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                          topic.trim().toLowerCase() === t.toLowerCase()
                            ? 'border-sparkBlue bg-sparkBlue/15 text-sparkBlue'
                            : 'border-duoGray-border bg-gray-50 text-duoGray-pencil hover:text-duoGray-charcoal'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Note Preview */}
              <div className="duo-card p-3 mb-4 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-feather font-black text-duoGray-charcoal">
                    <FileText size={14} className="text-sparkBlue" />
                    <span>{extractedData?.title || 'Náhled převedeného zápisku'}</span>
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

              {/* Save Button (disabled until a subject is picked or uploading) */}
              <button
                onClick={handleSave}
                disabled={!selectedSubject || isUploadingImage}
                className={`w-full duo-btn py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all ${
                  selectedSubject && !isUploadingImage
                    ? 'duo-btn-green cursor-pointer'
                    : 'bg-gray-200 text-gray-400 border-b-4 border-gray-300 cursor-not-allowed'
                }`}
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Nahrávám fotografii do cloudu...</span>
                  </>
                ) : (
                  <>
                    <span>{selectedSubject ? 'Uložit do zápisků' : 'Nejdříve zvol předmět'}</span>
                    <ArrowRight size={16} />
                  </>
                )}
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
