import React from 'react';
import { Flame, Sparkles, Zap, Trophy } from 'lucide-react';

interface ComboBadgeProps {
  combo: number;
}

export const ComboBadge: React.FC<ComboBadgeProps> = ({ combo }) => {
  if (combo < 2) return null;

  const isHigh = combo >= 5;
  const isMedium = combo >= 3;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-feather font-black text-xs shadow-md border-2 border-white/60 animate-in zoom-in-75 duration-200">
      {isHigh ? (
        <Zap size={15} className="fill-yellow-300 text-yellow-300 animate-pulse" />
      ) : (
        <Flame size={15} className="fill-orange-200 text-white" />
      )}
      <span>
        {combo} v řadě! {isHigh ? '🔥 NEZASTAVITELNÝ!' : isMedium ? '⚡ SKVĚLE!' : '🔥'}
      </span>
    </div>
  );
};

interface DiamondEarnedToastProps {
  amount: number;
  message?: string;
  onClose?: () => void;
}

export const DiamondEarnedToast: React.FC<DiamondEarnedToastProps> = ({
  amount,
  message = 'Odměna za poctivé studium',
}) => {
  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-duoGray-charcoal text-white rounded-2xl border-2 border-sparkBlue shadow-xl animate-in slide-in-from-top-4 duration-200">
      <div className="w-8 h-8 rounded-xl bg-sparkBlue text-white flex items-center justify-center shrink-0 shadow-xs">
        <Sparkles size={18} className="fill-white" />
      </div>
      <div>
        <div className="text-sm font-feather font-black text-sparkBlue flex items-center gap-1">
          +{amount} Drahokamů 💎
        </div>
        <div className="text-[11px] font-bold text-duoGray-pencil">{message}</div>
      </div>
    </div>
  );
};
