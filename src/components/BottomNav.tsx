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
    <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none select-none">
      <div className="w-full max-w-2xl mx-auto bg-white border-t-2 md:border-x-2 border-duoGray-border px-2 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around pointer-events-auto">
        {/* Notes tab */}
        <button
          onClick={() => {
            playPopSound();
            onTabChange('notes');
          }}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-all duration-150 active:scale-90 cursor-pointer ${
            activeTab === 'notes' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center transition-transform duration-200 ${activeTab === 'notes' ? 'animate-tab-pop scale-105' : 'hover:scale-105'}`}>
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
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-all duration-150 active:scale-90 cursor-pointer ${
            activeTab === 'practice' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center transition-transform duration-200 ${activeTab === 'practice' ? 'animate-tab-pop scale-105' : 'hover:scale-105'}`}>
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
          className="flex flex-col items-center justify-center py-0.5 px-1.5 cursor-pointer group active:scale-95 transition-transform duration-100"
          title="Odfotit zápisky"
        >
          <div className="w-9 h-9 rounded-full bg-eagerGreen border-b-[3px] border-eagerGreen-dark flex items-center justify-center text-white shadow-xs group-hover:brightness-105 group-hover:-translate-y-0.5 active:translate-y-[1px] active:border-b-[1.5px] transition-all duration-150">
            <Camera size={18} className="stroke-[2.5] transition-transform duration-150 group-hover:scale-110" />
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
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-all duration-150 active:scale-90 cursor-pointer ${
            activeTab === 'leaderboard' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center transition-transform duration-200 ${activeTab === 'leaderboard' ? 'animate-tab-pop scale-105' : 'hover:scale-105'}`}>
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
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-duo transition-all duration-150 active:scale-90 cursor-pointer ${
            activeTab === 'profile' ? 'text-eagerGreen' : 'text-duoGray-pencil hover:text-duoGray-charcoal'
          }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center transition-transform duration-200 ${activeTab === 'profile' ? 'animate-tab-pop scale-105' : 'hover:scale-105'}`}>
            <User size={21} className={activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[2]'} />
          </div>
          <span className="text-[10px] font-feather font-black mt-0.5 tracking-tight">
            Profil
          </span>
        </button>
      </div>
    </div>
  );
};
