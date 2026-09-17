import React from 'react';
import { BookOpen, Camera, Search, User } from 'lucide-react';
import { playPopSound } from '../utils/audio';

export type TabType = 'notes' | 'search' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenScan: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onOpenScan,
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-duoGray-border px-8 py-2 flex items-center justify-around select-none">
      {/* Notes tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('notes');
        }}
        className={`flex flex-col items-center justify-center py-1 px-3 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'notes' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-10 h-10 flex items-center justify-center">
          <BookOpen size={24} className={activeTab === 'notes' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[11px] font-feather font-black mt-0.5 tracking-tight">
          Zápisky
        </span>
      </button>

      {/* Center In-line Camera 3D Button - Symmetrically leveled with other tabs */}
      <button
        onClick={() => {
          playPopSound();
          onOpenScan();
        }}
        className="flex flex-col items-center justify-center py-1 px-3 cursor-pointer group"
        title="Odfotit zápisky"
      >
        <div className="w-10 h-10 rounded-full bg-eagerGreen border-b-[3px] border-eagerGreen-dark flex items-center justify-center text-white shadow-xs group-hover:brightness-105 active:translate-y-[1px] active:border-b-[1.5px] transition-all">
          <Camera size={20} className="stroke-[2.5]" />
        </div>
        <span className="text-[11px] font-feather font-black mt-0.5 text-eagerGreen tracking-tight">
          Odfotit
        </span>
      </button>

      {/* Search tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('search');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'search' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-10 h-10 flex items-center justify-center">
          <Search size={22} className={activeTab === 'search' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[11px] font-feather font-black mt-0.5 tracking-tight">
          Hledat
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
        <div className="w-10 h-10 flex items-center justify-center">
          <User size={22} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[11px] font-feather font-black mt-0.5 tracking-tight">
          Profil
        </span>
      </button>
    </div>
  );
};
