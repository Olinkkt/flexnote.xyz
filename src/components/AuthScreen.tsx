import React, { useState } from 'react';
import { Mail, Lock, User, Loader2, ArrowRight, BookOpen, Sparkles, Camera, Cloud, CheckCircle2 } from 'lucide-react';
import { playPopSound, playSuccessChime } from '../utils/audio';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../services/supabase';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    playPopSound();

    if (!email || !password) {
      setErrorMessage('Vyplň prosím e-mail a heslo.');
      return;
    }

    if (mode === 'signup' && !fullName.trim()) {
      setErrorMessage('Zadej své jméno nebo přezdívku.');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUpWithEmail(email, password, fullName);
        playSuccessChime();
        setSignupSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        await signInWithEmail(email, password);
        playSuccessChime();
        onSuccess?.();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('Nesprávný e-mail nebo heslo.');
      } else if (msg.includes('User already registered')) {
        setErrorMessage('Účet s tímto e-mailem již existuje. Zvol přihlášení.');
      } else if (msg.includes('Password should be at least')) {
        setErrorMessage('Heslo musí mít alespoň 6 znaků.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    playPopSound();
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Chyba Google přihlášení: ${msg}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto px-5 py-6 select-none bg-white animate-in fade-in duration-200">
      {/* Top Branding Section */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-3xl bg-eagerGreen border-2 border-b-6 border-eagerGreen-dark flex items-center justify-center text-white shadow-md shadow-eagerGreen/20">
            <BookOpen size={42} className="stroke-[2.5]" />
          </div>
          <div className="absolute -top-1.5 -right-1.5 w-7 h-7 rounded-full bg-lemon border-2 border-b-3 border-lemon-dark flex items-center justify-center text-duoGray-charcoal shadow-xs">
            <Sparkles size={14} className="stroke-[2.5]" />
          </div>
        </div>

        <h1 className="font-feather font-black text-2xl text-duoGray-charcoal tracking-tight">
          Flexnote
        </h1>
        <p className="text-xs text-duoGray-pencil font-bold max-w-[280px] mt-1 leading-relaxed">
          Chytré zápisky ze sešitů v cloudu s AI a KaTeX matematikou
        </p>

        {/* 3 Value Proposition Micro-Cards */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4 mb-3">
          <div className="duo-card p-2 bg-[#f7f9fa] border-duoGray-border flex flex-col items-center text-center">
            <Camera size={16} className="text-sparkBlue stroke-[2.5] mb-1" />
            <span className="text-[10px] font-feather font-black text-duoGray-charcoal leading-tight">
              AI OCR
            </span>
            <span className="text-[8.5px] font-bold text-duoGray-pencil leading-none mt-0.5">
              Ze sešitu
            </span>
          </div>

          <div className="duo-card p-2 bg-[#f7f9fa] border-duoGray-border flex flex-col items-center text-center">
            <span className="font-serif italic font-bold text-xs text-eagerGreen leading-none mb-1">
              fx
            </span>
            <span className="text-[10px] font-feather font-black text-duoGray-charcoal leading-tight">
              KaTeX
            </span>
            <span className="text-[8.5px] font-bold text-duoGray-pencil leading-none mt-0.5">
              Matematika
            </span>
          </div>

          <div className="duo-card p-2 bg-[#f7f9fa] border-duoGray-border flex flex-col items-center text-center">
            <Cloud size={16} className="text-macawBlue stroke-[2.5] mb-1" />
            <span className="text-[10px] font-feather font-black text-duoGray-charcoal leading-tight">
              Cloud
            </span>
            <span className="text-[8.5px] font-bold text-duoGray-pencil leading-none mt-0.5">
              Záloha
            </span>
          </div>
        </div>
      </div>

      {/* Center Auth Card */}
      <div className="w-full my-auto">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl mb-3.5 border border-duoGray-border">
          <button
            type="button"
            onClick={() => {
              playPopSound();
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl text-xs font-feather font-black transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-duoGray-charcoal shadow-xs border border-duoGray-border/40'
                : 'text-duoGray-pencil hover:text-duoGray-charcoal'
            }`}
          >
            Přihlásit se
          </button>
          <button
            type="button"
            onClick={() => {
              playPopSound();
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-xl text-xs font-feather font-black transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-duoGray-charcoal shadow-xs border border-duoGray-border/40'
                : 'text-duoGray-pencil hover:text-duoGray-charcoal'
            }`}
          >
            Registrace
          </button>
        </div>

        {signupSuccess ? (
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95">
            <CheckCircle2 size={48} className="text-eagerGreen mb-2 stroke-[2.5]" />
            <h4 className="font-feather font-black text-sm text-duoGray-charcoal mb-1">
              Účet byl úspěšně vytvořen!
            </h4>
            <p className="text-xs text-duoGray-pencil font-bold">
              Připravuji tvůj studijní prostor...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-[#d93838] text-xs font-bold leading-tight animate-in fade-in">
                {errorMessage}
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil mb-1">
                  Jméno a příjmení / Přezdívka
                </label>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-3 text-duoGray-faded" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Oliver Seidl"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil mb-1">
                E-mailová adresa
              </label>
              <div className="relative flex items-center">
                <Mail size={16} className="absolute left-3 text-duoGray-faded" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@skola.cz"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-feather font-black uppercase text-duoGray-pencil mb-1">
                Heslo
              </label>
              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3 text-duoGray-faded" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Alespoň 6 znaků"
                  required
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-duoGray-border focus:border-eagerGreen focus:outline-none text-xs font-bold text-duoGray-charcoal"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full duo-btn duo-btn-green py-3 px-4 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer mt-1"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Přihlásit se' : 'Vytvořit účet zdarma'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Separator */}
            <div className="flex items-center my-1">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="px-2 text-[10px] font-feather font-bold text-duoGray-faded uppercase">
                nebo
              </span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-3 rounded-2xl border-2 border-duoGray-border border-b-4 hover:border-duoGray-faded bg-white text-duoGray-charcoal text-xs font-feather font-extrabold flex items-center justify-center gap-2 transition cursor-pointer active:translate-y-[1px]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Pokračovat přes Google</span>
            </button>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="text-center pt-2 text-[10px] text-duoGray-faded font-bold">
        Bezpečné přihlášení s cloudem Supabase
      </div>
    </div>
  );
};
