import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastProps {
  type: ToastType;
  title: string;
  message: string;
  onClose: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  type,
  title,
  message,
  onClose,
  durationMs = 6000,
}) => {
  useEffect(() => {
    if (durationMs > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, durationMs);
      return () => clearTimeout(timer);
    }
  }, [durationMs, onClose]);

  const config = {
    error: {
      bg: 'bg-[#fff0f0]',
      border: 'border-[#ff4b4b]',
      borderBottom: 'border-b-[#d93838]',
      textColor: 'text-[#d93838]',
      icon: <AlertCircle size={20} className="text-[#ff4b4b] shrink-0" />,
    },
    warning: {
      bg: 'bg-[#fff8e6]',
      border: 'border-[#ff9600]',
      borderBottom: 'border-b-[#d97706]',
      textColor: 'text-[#d97706]',
      icon: <AlertTriangle size={20} className="text-[#ff9600] shrink-0" />,
    },
    success: {
      bg: 'bg-storybookGreen',
      border: 'border-eagerGreen',
      borderBottom: 'border-b-eagerGreen-dark',
      textColor: 'text-eagerGreen-dark',
      icon: <CheckCircle2 size={20} className="text-eagerGreen shrink-0" />,
    },
    info: {
      bg: 'bg-sparkBlue-tint',
      border: 'border-sparkBlue',
      borderBottom: 'border-b-[#1899d6]',
      textColor: 'text-sparkBlue',
      icon: <Info size={20} className="text-sparkBlue shrink-0" />,
    },
  }[type];

  return (
    <div
      role="alert"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-[380px] p-3.5 rounded-2xl border-2 border-b-4 ${config.bg} ${config.border} ${config.borderBottom} shadow-xl animate-in slide-in-from-top-4 fade-in duration-200 flex items-start gap-3`}
    >
      <div className="pt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <h4 className={`font-feather font-black text-xs ${config.textColor} leading-tight`}>
          {title}
        </h4>
        <p className="text-[11px] text-duoGray-charcoal font-bold mt-0.5 leading-snug break-words">
          {message}
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Zavřít"
        className="p-1 text-duoGray-pencil hover:text-duoGray-charcoal rounded-lg hover:bg-black/5 transition cursor-pointer"
      >
        <X size={16} />
      </button>
    </div>
  );
};
