import React, { useState } from 'react';
import { Mail, RefreshCw, Send, LogOut, Lock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { resendVerificationEmail } from '../services/supabase';

interface ConfirmEmailScreenProps {
  email: string;
  onCheckVerified: () => Promise<boolean>;
  onSignOut: () => void;
}

export const ConfirmEmailScreen: React.FC<ConfirmEmailScreenProps> = ({
  email,
  onCheckVerified,
  onSignOut,
}) => {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Check if email has been verified
  const handleCheck = async () => {
    playPopSound();
    setChecking(true);
    setFeedback(null);
    try {
      const isVerified = await onCheckVerified();
      if (isVerified) {
        playSuccessChime();
        setFeedback({ type: 'success', text: 'E-mail byl úspěšně ověřen! Otevírám Flexnote...' });
      } else {
        setFeedback({
          type: 'error',
          text: 'E-mail ještě nebyl potvrzen. Zkontroluj prosím doručenou poštu (včetně složky Spam).',
        });
      }
    } catch {
      setFeedback({
        type: 'error',
        text: 'Ověření se nezdařilo. Zkus to prosím za chvíli znovu.',
      });
    } finally {
      setChecking(false);
    }
  };

  // Resend verification email with 60s cooldown
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    playPopSound();
    setResending(true);
    setFeedback(null);

    try {
      await resendVerificationEmail(email);
      playSuccessChime();
      setFeedback({
        type: 'success',
        text: 'Potvrzovací e-mail byl znovu odeslán. Zkontroluj schránku!',
      });
      setCooldown(60);
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
        setFeedback({
          type: 'error',
          text: 'Příliš mnoho požadavků. Počkej prosím minutku před dalším odesláním.',
        });
      } else {
        setFeedback({
          type: 'error',
          text: `Nepodařilo se odeslat e-mail: ${msg}`,
        });
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto px-5 py-6 select-none bg-white animate-in fade-in duration-200">
      {/* Top Header & Envelope Graphic */}
      <div className="flex flex-col items-center text-center pt-3">
        <div className="relative mb-4">
          <div className="w-20 h-20 rounded-3xl bg-sparkBlue border-2 border-b-6 border-[#1899d6] flex items-center justify-center text-white shadow-md shadow-sparkBlue/20 animate-pulse">
            <Mail size={40} className="stroke-[2.5]" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#ff9600] border-2 border-b-3 border-[#cc7800] flex items-center justify-center text-white shadow-xs">
            <Lock size={13} className="stroke-[2.5]" />
          </div>
        </div>

        <h1 className="font-feather font-black text-2xl text-duoGray-charcoal tracking-tight">
          Potvrď svůj e-mail
        </h1>

        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-duoGray-border/30 border border-duoGray-border text-duoGray-charcoal text-xs font-bold max-w-full truncate">
          <Mail size={13} className="text-duoGray-pencil shrink-0" />
          <span className="truncate">{email || 'Tvůj e-mail'}</span>
        </div>

        <p className="text-xs text-duoGray-pencil font-bold max-w-[290px] mt-3 leading-relaxed">
          Poslali jsme ti ověřovací odkaz. Pro ochranu tvých zápisků v cloudu a odemčení Flexnote na něj prosím klikni.
        </p>
      </div>

      {/* Locked Features Notice Card */}
      <div className="my-auto py-2">
        <div className="duo-card p-3.5 bg-[#fff8e6] border-[#ffd978] flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[#b36b00]">
            <ShieldAlert size={18} className="shrink-0 stroke-[2.5]" />
            <span className="font-feather font-black text-xs uppercase tracking-wide">
              Aplikace je uzamčena
            </span>
          </div>
          <p className="text-[11px] text-duoGray-charcoal font-bold leading-snug">
            Bez ověření e-mailu není povolen přístup k žádným funkcím (focení, skenování, čtení ani hledání zápisků).
          </p>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mt-3 p-3 rounded-2xl border text-xs font-bold leading-tight flex items-start gap-2 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-storybookGreen border-eagerGreen text-eagerGreen-dark'
                : 'bg-red-50 border-red-200 text-[#d93838]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 stroke-[2.5] mt-0.5" />
            ) : (
              <AlertCircle size={16} className="shrink-0 stroke-[2.5] mt-0.5" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2.5 pt-2">
        {/* Check verified button */}
        <button
          onClick={handleCheck}
          disabled={checking}
          className="w-full duo-btn duo-btn-green py-3.5 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          {checking ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <>
              <CheckCircle2 size={16} className="stroke-[2.5]" />
              <span>Zkontrolovat ověření</span>
            </>
          )}
        </button>

        {/* Resend button */}
        <button
          onClick={handleResend}
          disabled={resending || cooldown > 0}
          className="w-full duo-btn duo-btn-white py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 border-2 border-duoGray-border text-duoGray-charcoal cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {resending ? (
            <RefreshCw size={15} className="animate-spin" />
          ) : (
            <>
              <Send size={15} />
              <span>
                {cooldown > 0 ? `Znovu poslat za ${cooldown}s` : 'Znovu poslat ověřovací e-mail'}
              </span>
            </>
          )}
        </button>

        {/* Sign out button */}
        <button
          onClick={() => {
            playPopSound();
            onSignOut();
          }}
          className="w-full py-2.5 text-[11px] font-feather font-black text-duoGray-pencil hover:text-[#ff4b4b] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <LogOut size={14} />
          <span>Odhlásit se / Použít jiný účet</span>
        </button>
      </div>
    </div>
  );
};
