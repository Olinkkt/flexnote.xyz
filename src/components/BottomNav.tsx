import React from 'react';
import { BookOpen, Brain, Camera, User } from 'lucide-react';
import { playPopSound } from '../utils/audio';

export type TabType = 'notes' | 'practice' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenScan: () => void;
  dueCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenScan,
  dueCount = 0,
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-duoGray-border px-3 py-1.5 flex items-center justify-around select-none">
      {/* Notes tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('notes');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'notes' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-9 h-9 flex items-center justify-center">
          <BookOpen size={22} className={activeTab === 'notes' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[10.5px] font-feather font-black mt-0.5 tracking-tight">
          Zápisky
        </span>
      </button>

      {/* Practice tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('practice');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'practice' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-9 h-9 flex items-center justify-center relative">
          <Brain size={22} className={activeTab === 'practice' ? 'stroke-[2.5]' : 'stroke-[2]'} />
          {dueCount > 0 && (
            <span className="absolute -top-0.5 -right-1 min-w-[17px] h-[17px] px-1 bg-amber-500 text-white rounded-full text-[10px] font-feather font-black flex items-center justify-center border-2 border-white shadow-xs animate-in zoom-in-50">
              {dueCount > 99 ? '99+' : dueCount}
            </span>
          )}
        </div>
        <span className="text-[10.5px] font-feather font-black mt-0.5 tracking-tight">
          Procvičování
        </span>
      </button>

      {/* Center In-line Camera 3D Button */}
      <button
        onClick={() => {
          playPopSound();
          onOpenScan();
        }}
        className="flex flex-col items-center justify-center py-1 px-2 cursor-pointer group"
        title="Odfotit zápisky"
      >
        <div className="w-9 h-9 rounded-full bg-eagerGreen border-b-[3px] border-eagerGreen-dark flex items-center justify-center text-white shadow-xs group-hover:brightness-105 active:translate-y-[1px] active:border-b-[1.5px] transition-all">
          <Camera size={19} className="stroke-[2.5]" />
        </div>
        <span className="text-[10.5px] font-feather font-black mt-0.5 text-eagerGreen tracking-tight">
          Odfotit
        </span>
      </button>

      {/* Profile tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('profile');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'profile' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-9 h-9 flex items-center justify-center">
          <User size={22} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[10.5px] font-feather font-black mt-0.5 tracking-tight">
          Profil
        </span>
      </button>
    </div>
  );
};
