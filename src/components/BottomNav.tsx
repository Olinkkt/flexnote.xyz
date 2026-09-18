import React from 'react';
import { BookOpen, Brain, Camera, Trophy, User } from 'lucide-react';
import { playPopSound } from '../utils/audio';

export type TabType = 'notes' | 'practice' | 'leaderboard' | 'profile';

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
    <div className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-duoGray-border px-2 py-1.5 flex items-center justify-around select-none">
      {/* Notes tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('notes');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'notes' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <BookOpen size={21} className={activeTab === 'notes' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[10px] font-feather font-black mt-0.5 tracking-tight">
          Zápisky
        </span>
      </button>

      {/* Practice tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('practice');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'practice' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <Brain size={21} className={activeTab === 'practice' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[10px] font-feather font-black mt-0.5 tracking-tight">
          Procvičování
        </span>
      </button>

      {/* Center In-line Camera 3D Button */}
      <button
        onClick={() => {
          playPopSound();
          onOpenScan();
        }}
        className="flex flex-col items-center justify-center py-0.5 px-1.5 cursor-pointer group"
        title="Odfotit zápisky"
      >
        <div className="w-9 h-9 rounded-full bg-eagerGreen border-b-[3px] border-eagerGreen-dark flex items-center justify-center text-white shadow-xs group-hover:brightness-105 active:translate-y-[1px] active:border-b-[1.5px] transition-all">
          <Camera size={18} className="stroke-[2.5]" />
        </div>
        <span className="text-[9.5px] font-feather font-black mt-0.5 text-eagerGreen tracking-tight">
          Odfotit
        </span>
      </button>

      {/* Leaderboard tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('leaderboard');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'leaderboard' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <Trophy size={21} className={activeTab === 'leaderboard' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[10px] font-feather font-black mt-0.5 tracking-tight">
          Žebříčky
        </span>
      </button>

      {/* Profile tab */}
      <button
        onClick={() => {
          playPopSound();
          onTabChange('profile');
        }}
        className={`flex flex-col items-center justify-center py-1 px-2 rounded-duo transition-colors cursor-pointer ${
          activeTab === 'profile' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
        }`}
      >
        <div className="w-8 h-8 flex items-center justify-center">
          <User size={21} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[2]'} />
        </div>
        <span className="text-[10px] font-feather font-black mt-0.5 tracking-tight">
          Profil
        </span>
      </button>
    </div>
  );
};
