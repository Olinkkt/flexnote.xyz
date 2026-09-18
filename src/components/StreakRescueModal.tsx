import React from 'react';
import { Shield, Flame, Sparkles, X, RotateCcw } from 'lucide-react';
import { playPopSound, playSuccessChime, playErrorSound, playStreakCelebrationSound } from '../utils/audio';

interface StreakRescueModalProps {
  type: 'rescued' | 'lost';
  streakDays: number;
  remainingFreezes?: number;
  userDiamonds: number;
  onRestoreWithDiamonds: () => Promise<boolean>;
  onStartNewStreak: () => void;
  onClose: () => void;
}

export const StreakRescueModal: React.FC<StreakRescueModalProps> = ({
  type,
  streakDays,
  remainingFreezes = 0,
  userDiamonds,
  onRestoreWithDiamonds,
  onStartNewStreak,
  onClose,
}) => {
  const [restoring, setRestoring] = React.useState(false);

  const handleRestore = async () => {
    playPopSound();
    setRestoring(true);
    const success = await onRestoreWithDiamonds();
    setRestoring(false);
    if (success) {
      playStreakCelebrationSound();
      onClose();
    } else {
      playErrorSound();
    }
  };

  const handleStartNew = () => {
    playPopSound();
    onStartNewStreak();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-duoGray-charcoal/70 backdrop-blur-xs animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-sm bg-white rounded-3xl border-2 border-duoGray-border border-b-6 shadow-2xl p-6 text-center animate-in zoom-in-95 duration-150">
        
        {type === 'rescued' ? (
          <>
            {/* Auto Rescued Screen */}
            <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border-2 border-blue-400/30 flex items-center justify-center mx-auto mb-4 text-sparkBlue shadow-inner">
              <Shield size={44} className="fill-blue-100 animate-pulse" />
            </div>

            <h3 className="font-feather font-black text-2xl text-duoGray-charcoal mb-1">
              Série zachráněna! 🛡️
            </h3>

            <p className="text-xs font-bold text-duoGray-pencil leading-relaxed mb-4">
              Včera ses nestihl(a) učit, ale tvoje <strong className="text-duoGray-charcoal">Záchrana série</strong> automaticky ochránila tvůj plamen před vyhasnutím!
            </p>

            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl mb-4 flex items-center justify-center gap-2">
              <Flame size={22} className="text-orange-500 fill-orange-400 animate-bounce" />
              <span className="font-feather font-black text-base text-orange-600">
                Série {streakDays} {streakDays === 1 ? 'den' : streakDays < 5 ? 'dny' : 'dní'} pokračuje!
              </span>
            </div>

            <div className="text-[11px] font-bold text-duoGray-pencil mb-5">
              Zbývající záchrany série: <span className="text-sparkBlue font-black">{remainingFreezes} 🛡️</span>
            </div>

            <button
              onClick={() => {
                playSuccessChime();
                onClose();
              }}
              className="w-full duo-btn duo-btn-green text-xs font-feather font-black uppercase tracking-wider py-3 cursor-pointer"
            >
              Pokračovat v učení 🚀
            </button>
          </>
        ) : (
          <>
            {/* Streak Lost Screen */}
            <div className="w-20 h-20 rounded-3xl bg-slate-100 border-2 border-slate-300 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Flame size={44} className="stroke-[1.5]" />
            </div>

            <h3 className="font-feather font-black text-2xl text-duoGray-charcoal mb-1">
              Tvoje série vyhasla! ❄️
            </h3>

            <p className="text-xs font-bold text-duoGray-pencil leading-relaxed mb-4">
              Včera ses neučil(a) a tvoje série <strong className="text-duoGray-charcoal">{streakDays} {streakDays === 1 ? 'dne' : streakDays < 5 ? 'dnů' : 'dní'}</strong> byla přerušena.
            </p>

            {/* Restore with diamonds option if user has >= 50 diamonds */}
            {userDiamonds >= 50 ? (
              <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-sparkBlue/40 rounded-2xl mb-4 text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkles size={16} className="text-sparkBlue fill-sparkBlue shrink-0" />
                  <span className="font-feather font-black text-xs text-duoGray-charcoal">
                    Obnovit sérii za 50 💎
                  </span>
                </div>
                <p className="text-[10.5px] font-bold text-duoGray-pencil mb-2.5">
                  Máš {userDiamonds} 💎. Můžeš použít 50 drahokamů a vrátit sérii {streakDays} dní zpět.
                </p>
                <button
                  onClick={handleRestore}
                  disabled={restoring}
                  className="w-full duo-btn duo-btn-blue text-xs font-feather font-black uppercase tracking-wider py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Shield size={14} />
                  <span>{restoring ? 'Obnovuji...' : 'Obnovit sérii (50 💎)'}</span>
                </button>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border-2 border-duoGray-border rounded-2xl mb-4 text-xs font-bold text-duoGray-pencil">
                Pro obnovení je potřeba 50 💎 (máš {userDiamonds} 💎).
              </div>
            )}

            <button
              onClick={handleStartNew}
              className="w-full duo-btn duo-btn-white text-xs font-feather font-black uppercase tracking-wider py-2.5 cursor-pointer text-duoGray-charcoal"
            >
              Začít novou sérii ode dneška
            </button>
          </>
        )}

      </div>
    </div>
  );
};
