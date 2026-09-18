import React from 'react';
import { WifiOff, RefreshCw, Check } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  justCameOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncNow?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isOnline,
  justCameOnline,
  pendingCount,
  isSyncing,
  onSyncNow,
}) => {
  // If online, not just came online, and nothing pending or syncing, do not render
  if (isOnline && !justCameOnline && pendingCount === 0 && !isSyncing) {
    return null;
  }

  // 1. Back online success strip (flat, flush strip - strictly no pill shapes)
  if (isOnline && justCameOnline) {
    return (
      <div className="w-full bg-[#f0fdf4] border-b-2 border-[#86efac] px-4 py-2 flex items-center justify-between text-[#166534] select-none animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2 text-xs font-feather font-extrabold tracking-tight">
          <div className="w-5 h-5 rounded-md bg-[#dcfce7] flex items-center justify-center text-[#16a34a]">
            <Check size={13} className="stroke-[3]" />
          </div>
          <span>Zpět online — Zápisky jsou bezpečně synchronizovány</span>
        </div>
      </div>
    );
  }

  // 2. Currently syncing queue
  if (isSyncing) {
    return (
      <div className="w-full bg-[#eff6ff] border-b-2 border-[#93c5fd] px-4 py-2 flex items-center justify-between text-[#1e40af] select-none animate-in fade-in duration-150">
        <div className="flex items-center gap-2 text-xs font-feather font-extrabold tracking-tight">
          <RefreshCw size={14} className="animate-spin text-[#2563eb]" />
          <span>Synchronizuji změny do cloudu...</span>
        </div>
      </div>
    );
  }

  // 3. Offline strip (flat, subtle alert bar)
  return (
    <div className="w-full bg-[#fffbeb] border-b-2 border-[#fcd34d] px-4 py-2 flex items-center justify-between text-[#92400e] select-none animate-in fade-in duration-150">
      <div className="flex items-center gap-2 text-xs font-feather font-bold tracking-tight">
        <div className="w-5 h-5 rounded-md bg-[#fef3c7] flex items-center justify-center text-[#d97706]">
          <WifiOff size={13} className="stroke-[2.5]" />
        </div>
        <span>
          Režim offline — Zápisky máš u sebe v telefonu
          {pendingCount > 0 && (
            <span className="font-extrabold ml-1.5 text-[#b45309]">
              ({pendingCount} {pendingCount === 1 ? 'změna čeká' : pendingCount < 5 ? 'změny čekají' : 'změn čeká'})
            </span>
          )}
        </span>
      </div>

      {isOnline && pendingCount > 0 && onSyncNow && (
        <button
          onClick={onSyncNow}
          className="text-[11px] font-feather font-black text-[#b45309] hover:underline cursor-pointer uppercase tracking-wider"
        >
          Synchronizovat
        </button>
      )}
    </div>
  );
};
