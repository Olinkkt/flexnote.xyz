import React from 'react';
import { X, Flame, Shield, Sparkles, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { GamificationState } from '../types/notes';
import { playPopSound, playSuccessChime, playErrorSound } from '../utils/audio';

interface StreakModalProps {
  gamification: GamificationState;
  onClose: () => void;
  onBuyFreeze: () => Promise<{ success: boolean; error?: string }>;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  gamification,
  onClose,
  onBuyFreeze,
}) => {
  const [isBuying, setIsBuying] = React.useState(false);
  const [purchaseMsg, setPurchaseMsg] = React.useState<string | null>(null);

  const handlePurchase = async () => {
    playPopSound();
    setIsBuying(true);
    setPurchaseMsg(null);
    try {
      const res = await onBuyFreeze();
      if (res.success) {
        playSuccessChime();
        setPurchaseMsg('Záchrana série zakoupena! 🛡️');
      } else {
        playErrorSound();
        setPurchaseMsg(res.error || 'Nákup se nezdařil.');
      }
    } catch {
      playErrorSound();
      setPurchaseMsg('Chyba při nákupu.');
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-duoGray-charcoal/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl border-2 border-duoGray-border border-b-6 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Top bar with close button */}
        <div className="p-4 border-b-2 border-duoGray-border flex items-center justify-between">
          <span className="text-xs font-feather font-black uppercase text-duoGray-pencil tracking-wider">
            Denní série & Ochrana
          </span>
          <button
            onClick={() => {
              playPopSound();
              onClose();
            }}
            className="p-1.5 rounded-xl text-duoGray-pencil hover:text-duoGray-charcoal hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Flame */}
        <div className="p-6 text-center">
          <div className="relative w-24 h-24 mx-auto mb-3 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-400 to-amber-300 opacity-20 blur-xl animate-pulse" />
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 border-4 border-white shadow-lg flex items-center justify-center text-white">
              <Flame size={44} className="fill-orange-200 animate-bounce" />
            </div>
          </div>

          <h3 className="font-feather font-black text-2xl text-duoGray-charcoal">
            {gamification.streakDays} {gamification.streakDays === 1 ? 'den v řadě' : gamification.streakDays < 5 ? 'dny v řadě' : 'dní v řadě'}!
          </h3>
          <p className="text-xs font-bold text-duoGray-pencil mt-1 max-w-xs mx-auto">
            Studuj každý den alespoň minutu nebo projdi test, ať tvůj plamen nevyhasne.
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-2.5 my-5">
            <div className="p-3 bg-gray-50 rounded-2xl border-2 border-duoGray-border text-center">
              <span className="text-[10px] font-feather font-black uppercase text-duoGray-pencil block">
                Nejdelší série
              </span>
              <span className="font-feather font-black text-lg text-duoGray-charcoal">
                {gamification.bestStreak} dní 🔥
              </span>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl border-2 border-duoGray-border text-center">
              <span className="text-[10px] font-feather font-black uppercase text-duoGray-pencil block">
                Záchrany série
              </span>
              <span className="font-feather font-black text-lg text-sparkBlue">
                {gamification.streakFreezes} 🛡️
              </span>
            </div>
          </div>

          {/* Streak Freeze (Záchrana série) Card */}
          <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-sparkBlue/30 rounded-2xl text-left mb-4">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-sparkBlue text-white flex items-center justify-center shrink-0 shadow-xs">
                <Shield size={16} />
              </div>
              <div>
                <div className="font-feather font-black text-xs text-duoGray-charcoal">
                  Záchrana série (Streak Freeze)
                </div>
                <div className="text-[10.5px] font-bold text-duoGray-pencil">
                  Ochrání tvou sérii, i když se jeden den nestihneš učit.
                </div>
              </div>
            </div>

            {purchaseMsg && (
              <div className="my-2 p-2 bg-white rounded-xl border border-sparkBlue/40 text-[11px] font-bold text-sparkBlue text-center">
                {purchaseMsg}
              </div>
            )}

            <button
              onClick={handlePurchase}
              disabled={isBuying || gamification.diamonds < 50}
              className="w-full mt-2 duo-btn duo-btn-blue text-xs font-feather font-black uppercase tracking-wider py-2.5 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ShoppingBag size={15} />
              <span>
                {isBuying ? 'Kupuji...' : 'Koupit záchranu za 50 💎'}
              </span>
            </button>
            {gamification.diamonds < 50 && (
              <div className="text-[10px] text-center text-duoGray-pencil mt-1 font-bold">
                Máš {gamification.diamonds} 💎 (potřebuješ 50 💎)
              </div>
            )}
          </div>

          <button
            onClick={() => {
              playPopSound();
              onClose();
            }}
            className="w-full duo-btn duo-btn-green text-xs font-feather font-black uppercase tracking-wider py-3 cursor-pointer"
          >
            Rozumím, jdu studovat! 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
