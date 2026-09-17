import React, { useState } from 'react';
import { Smartphone, Monitor, Volume2, VolumeX, Sparkles } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  activeSubjectName?: string;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children, activeSubjectName }) => {
  const [deviceFrameActive, setDeviceFrameActive] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-[#e5e7eb] flex flex-col items-center justify-center p-0 md:p-6 transition-colors duration-200">
      {/* Top Desktop Controls Toolbar */}
      <aside aria-label="Desktop Controls Toolbar" className="hidden md:flex items-center justify-between w-full max-w-[430px] mb-3 px-3 py-1.5 bg-white/80 backdrop-blur rounded-2xl border border-duoGray-border shadow-sm text-xs font-bold text-duoGray-charcoal">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-eagerGreen inline-block animate-pulse"></span>
          <span className="font-feather tracking-wide text-[13px] text-duoGray-charcoal">iPhone 16 Pro</span>
          <span className="text-[11px] text-duoGray-pencil bg-gray-100 px-2 py-0.5 rounded-full font-mono">402 × 874 (9:16)</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setDeviceFrameActive(!deviceFrameActive)}
            title="Přepnout rámeček telefonu"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-duoGray-charcoal active:scale-95"
          >
            {deviceFrameActive ? <Smartphone size={16} className="text-eagerGreen" /> : <Monitor size={16} />}
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title="Zvukové efekty"
            className="p-1.5 rounded-lg hover:bg-gray-100 transition text-duoGray-charcoal active:scale-95"
          >
            {soundEnabled ? <Volume2 size={16} className="text-sparkBlue" /> : <VolumeX size={16} className="text-duoGray-faded" />}
          </button>
        </div>
      </aside>

      {/* Main Container: Native on mobile, framed on desktop */}
      <div
        className={`w-full transition-all duration-300 relative flex flex-col bg-white overflow-hidden ${
          deviceFrameActive
            ? 'md:w-[402px] md:h-[874px] md:rounded-[50px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_0_12px_#1e1e1e,0_0_0_14px_#3a3a3a] md:border-[3px] md:border-[#525252]'
            : 'max-w-md min-h-screen md:rounded-3xl md:shadow-xl md:border-2 md:border-duoGray-border'
        }`}
        style={{
          aspectRatio: deviceFrameActive ? undefined : undefined,
        }}
      >
        {/* Dynamic Island & iOS Status Bar (Visible on desktop frame) */}
        {deviceFrameActive && (
          <header className="hidden md:flex sticky top-0 z-50 bg-white/95 backdrop-blur-md pt-2.5 pb-1 px-7 items-center justify-between border-b border-gray-100/60 select-none">
            {/* Status Bar Left: Clock */}
            <time dateTime="09:41" className="text-[14px] font-black tracking-tight text-duoGray-charcoal font-feather">
              9:41
            </time>

            {/* Dynamic Island pill */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-[110px] h-[26px] bg-black rounded-full flex items-center justify-between px-2.5 shadow-inner transition-all duration-200">
              <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-[#222]"></div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-eagerGreen animate-ping"></span>
                <Sparkles size={11} className="text-[#a5ed6e]" />
              </div>
            </div>

            {/* Status Bar Right: Signal, 5G, Battery */}
            <div className="flex items-center gap-1.5 text-duoGray-charcoal">
              {/* Cellular Bars */}
              <div className="flex items-end gap-[1.5px] h-3">
                <div className="w-[3px] h-1.5 bg-duoGray-charcoal rounded-sm"></div>
                <div className="w-[3px] h-2 bg-duoGray-charcoal rounded-sm"></div>
                <div className="w-[3px] h-2.5 bg-duoGray-charcoal rounded-sm"></div>
                <div className="w-[3px] h-3 bg-duoGray-charcoal rounded-sm"></div>
              </div>
              <span className="text-[11px] font-extrabold tracking-tighter ml-0.5">5G</span>
              {/* Battery */}
              <div className="w-5 h-2.5 border border-duoGray-charcoal rounded-[4px] p-[1px] flex items-center ml-0.5 relative">
                <div className="h-full w-[85%] bg-eagerGreen rounded-[2px]"></div>
                <div className="w-[1.5px] h-1.5 bg-duoGray-charcoal absolute -right-[2.5px] top-[2px] rounded-r-sm"></div>
              </div>
            </div>
          </header>
        )}

        {/* Dynamic content scrollable viewport */}
        <div className="flex-1 overflow-y-auto overscroll-contain pb-24 relative bg-[#f7f7f7] no-scrollbar">
          {children}
        </div>

        {/* iPhone 16 Pro Home Bar */}
        {deviceFrameActive && (
          <div className="hidden md:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-duoGray-charcoal/40 rounded-full pointer-events-none z-50"></div>
        )}
      </div>
    </div>
  );
};
