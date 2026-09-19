import React, { useState } from 'react';
import {
  X,
  Download,
  Mail,
  CheckCircle2,
  FileText,
  Loader2,
  ExternalLink,
  Check,
  Sparkles,
  Info,
  Send,
} from 'lucide-react';
import { NoteItem } from '../types/notes';
import { UserProfile, sendNotesExportEmail } from '../services/supabase';
import { checkRateLimit, recordRateLimitUsage } from '../services/rateLimiter';
import { playPopSound, playSuccessChime } from '../utils/audio';
import {
  generateAllNotesMarkdown,
  downloadMarkdownFile,
  createMailtoExportUrl,
} from '../utils/exportNotes';

interface ExportNotesModalProps {
  notes: NoteItem[];
  profile: UserProfile | null;
  userEmail?: string;
  onClose: () => void;
  onShowToast?: (title: string, message: string) => void;
}

export const ExportNotesModal: React.FC<ExportNotesModalProps> = ({
  notes,
  profile,
  userEmail,
  onClose,
  onShowToast,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [needsConfigNotice, setNeedsConfigNotice] = useState(false);

  const totalNotes = notes.length;
  const targetEmail = userEmail || profile?.email || '';

  const handleDirectDownload = () => {
    playPopSound();
    const markdown = generateAllNotesMarkdown(notes, profile, targetEmail);
    downloadMarkdownFile(markdown);
    playSuccessChime();
    setDownloaded(true);
    onShowToast?.('Soubor stažen', `Všech ${totalNotes} zápisků bylo úspěšně staženo do zařízení.`);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleSendEmail = async () => {
    if (!targetEmail) return;

    const rateCheck = checkRateLimit('export_email');
    if (!rateCheck.allowed) {
      onShowToast?.('Limit odesílání', rateCheck.reason || 'Počkej prosím chvíli před dalším odesláním.');
      return;
    }

    playPopSound();
    setSendingEmail(true);
    setNeedsConfigNotice(false);

    const markdown = generateAllNotesMarkdown(notes, profile, targetEmail);
    const studentName = profile?.full_name || 'Student Flexnote';

    try {
      const result = await sendNotesExportEmail({
        userEmail: targetEmail,
        userName: studentName,
        notesCount: totalNotes,
        markdown,
      });

      if (result.success) {
        recordRateLimitUsage('export_email');
        playSuccessChime();
        setEmailSent(true);
        onShowToast?.('E-mail odeslán', `Zápisky byly úspěšně odeslány na ${targetEmail}.`);
      } else if (result.needsConfig) {
        setNeedsConfigNotice(true);
      } else {
        // Fallback to notice
        setNeedsConfigNotice(true);
      }
    } catch {
      setNeedsConfigNotice(true);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleOpenMailto = () => {
    playPopSound();
    const markdown = generateAllNotesMarkdown(notes, profile, targetEmail);
    const studentName = profile?.full_name || 'Student Flexnote';
    const mailtoUrl = createMailtoExportUrl(targetEmail, studentName, totalNotes, markdown);
    window.location.href = mailtoUrl;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full md:max-w-xl max-h-[92vh] bg-white rounded-t-[32px] md:rounded-3xl flex flex-col overflow-hidden shadow-2xl border-t-2 md:border-2 border-duoGray-border animate-in slide-in-from-bottom-6 duration-150 p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-duoGray-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sparkBlue-tint text-sparkBlue flex items-center justify-center shrink-0 border-2 border-sparkBlue/30">
              <Download size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-feather font-black text-[17px] text-duoGray-charcoal leading-tight">
                Exportovat zápisky
              </h3>
              <p className="text-[11px] font-bold text-duoGray-pencil">
                Všechny tvé zápisky přehledně se vzorci
              </p>
            </div>
          </div>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          {/* Summary Banner */}
          <div className="bg-storybookGreen/30 border-2 border-eagerGreen/40 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-eagerGreen text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileText size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <div className="font-feather font-black text-xs text-eagerGreen-dark uppercase tracking-wide">
                  Připraveno k exportu
                </div>
                <div className="font-feather font-black text-sm text-duoGray-charcoal mt-0.5">
                  {totalNotes} {totalNotes === 1 ? 'zápisek' : totalNotes < 5 ? 'zápisky' : 'zápisků'} celkem
                </div>
              </div>
            </div>
          </div>

          {/* Option 1: Direct Download to Device */}
          <div className="duo-card p-4 bg-white flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-eagerGreen/10 text-eagerGreen flex items-center justify-center shrink-0 mt-0.5">
                <Download size={18} className="stroke-[2.5]" />
              </div>
              <div>
                <h4 className="font-feather font-black text-sm text-duoGray-charcoal">
                  1. Přímé stažení do zařízení
                </h4>
                <p className="text-xs text-duoGray-pencil font-medium leading-normal mt-0.5">
                  Okamžitě stáhne soubor se všemi zápisky a KaTeX vzorci přímo do tvého mobilu nebo počítače.
                </p>
              </div>
            </div>

            <button
              onClick={handleDirectDownload}
              className="w-full duo-btn duo-btn-green py-2.5 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-1"
            >
              {downloaded ? (
                <>
                  <Check size={16} className="stroke-[3]" />
                  <span>Staženo do zařízení!</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Stáhnout do zařízení</span>
                </>
              )}
            </button>
          </div>

          {/* Option 2: Send to Registered Email */}
          <div className="duo-card p-4 bg-white flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sparkBlue-tint text-sparkBlue flex items-center justify-center shrink-0 mt-0.5">
                <Mail size={18} className="stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h4 className="font-feather font-black text-sm text-duoGray-charcoal">
                  2. Odeslání na e-mail
                </h4>
                <p className="text-xs text-duoGray-pencil font-medium leading-normal mt-0.5">
                  Zašle exportované zápisky přímo na tvou registrovanou adresu:
                </p>
                <div className="inline-block mt-1 px-2.5 py-0.5 rounded-md bg-gray-100 border border-gray-200 text-[11px] font-mono font-bold text-duoGray-charcoal truncate max-w-full">
                  {targetEmail || 'Není zadán e-mail'}
                </div>
              </div>
            </div>

            {emailSent ? (
              <div className="p-3 rounded-xl bg-storybookGreen/40 border-2 border-eagerGreen/50 flex items-center gap-2.5 text-eagerGreen-dark text-xs font-feather font-black">
                <CheckCircle2 size={18} className="shrink-0" />
                <span>E-mail byl úspěšně odeslán do tvé schránky!</span>
              </div>
            ) : (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !targetEmail}
                className="w-full duo-btn duo-btn-blue py-2.5 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-1"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Odesílám na e-mail...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Odeslat na můj e-mail</span>
                  </>
                )}
              </button>
            )}

            {/* If server-side SMTP requires config, provide instant 1-click fallback */}
            {needsConfigNotice && (
              <div className="p-3 rounded-xl bg-sparkBlue-tint/60 border border-sparkBlue/30 flex flex-col gap-2 animate-in fade-in">
                <div className="flex items-start gap-2 text-xs text-duoGray-charcoal font-medium leading-snug">
                  <Info size={16} className="text-sparkBlue shrink-0 mt-0.5" />
                  <span>
                    Chceš si export poslat přes svůj e-mailový program? Otevři ho jedním kliknutím s předvyplněným obsahem:
                  </span>
                </div>
                <button
                  onClick={handleOpenMailto}
                  className="w-full py-2 px-3 rounded-xl bg-white border-2 border-sparkBlue text-sparkBlue hover:bg-sparkBlue-tint font-feather font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer shadow-xs"
                >
                  <ExternalLink size={14} />
                  <span>Otevřít v e-mailové aplikaci</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
