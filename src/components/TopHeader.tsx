import React, { useState } from 'react';
import { BookOpen, ChevronDown, Check, Flame, Sparkles } from 'lucide-react';
import { SubjectMeta, SubjectType } from '../types/notes';
import { playPopSound } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';

interface TopHeaderProps {
  subjects: SubjectMeta[];
  selectedSubject: SubjectType;
  onSelectSubject: (subject: SubjectType) => void;
  totalNotes: number;
  streakDays?: number;
  diamonds?: number;
  onOpenStreakModal?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  subjects,
  selectedSubject,
  onSelectSubject,
  totalNotes,
  streakDays = 0,
  diamonds = 0,
  onOpenStreakModal,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeMeta = subjects.find((s) => s.id === selectedSubject) || subjects[0];

  const handleSelect = (id: SubjectType) => {
    playPopSound();
    onSelectSubject(id);
    setDropdownOpen(false);
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b-2 border-duoGray-border px-3 sm:px-4 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2.5 sm:pb-3 shadow-xs select-none">
      <div className="flex items-center justify-between gap-2">
        {/* Left: App Title & Note Count */}
        <div className="flex items-center gap-2">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-duo bg-storybookGreen border-2 border-eagerGreen flex items-center justify-center text-eagerGreen shadow-xs shrink-0">
            <BookOpen size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-feather font-black text-[18px] sm:text-[20px] text-duoGray-charcoal leading-none">
              Flexnote
            </h1>
            <div className="mt-0.5">
              <span className="text-[10px] sm:text-[11px] font-bold text-duoGray-pencil">
                {totalNotes} {totalNotes === 1 ? 'zápisek' : totalNotes < 5 ? 'zápisky' : 'zápisků'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Streak, Diamonds & Class Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Streak Flame Badge */}
          <button
            onClick={() => {
              playPopSound();
              onOpenStreakModal?.();
            }}
            title="Denní série (klikni pro detail)"
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400/40 border-b-[3px] active:translate-y-[1px] active:border-b-2 text-duoGray-charcoal transition cursor-pointer shrink-0"
          >
            <Flame size={15} className="text-orange-500 fill-orange-400" />
            <span className="font-feather font-black text-xs text-orange-600">
              {streakDays}
            </span>
          </button>

          {/* Diamonds Gem Badge */}
          <div
            title="Drahokamy"
            className="flex items-center gap-1 px-2 py-1 rounded-xl bg-sky-50 border-2 border-sky-400/40 border-b-[3px] text-duoGray-charcoal select-none shrink-0"
          >
            <Sparkles size={14} className="text-sparkBlue fill-sparkBlue" />
            <span className="font-feather font-black text-xs text-sparkBlue">
              {diamonds}
            </span>
          </div>

          {/* Class / Subject Dropdown Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                playPopSound();
                setDropdownOpen(!dropdownOpen);
              }}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-duo bg-white border-2 border-duoGray-border border-b-4 hover:border-duoGray-faded text-duoGray-charcoal transition active:translate-y-[2px] active:border-b-2 cursor-pointer shadow-xs shrink-0"
            >
              <SubjectIcon subject={activeMeta.id} size={14} />
              <span className="font-feather font-extrabold text-xs sm:text-[13px] hidden xs:inline">
                {activeMeta.czechName}
              </span>
              <ChevronDown
                size={14}
                className={`text-duoGray-pencil transition-transform duration-150 ${
                  dropdownOpen ? 'rotate-180 text-sparkBlue' : ''
                }`}
              />
            </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />

              {/* Menu Container */}
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl border-2 border-duoGray-border shadow-xl z-50 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3.5 py-1 text-[11px] font-feather font-black uppercase text-duoGray-pencil tracking-wider">
                  Vybrat předmět
                </div>
                {subjects.map((sub) => {
                  const isSelected = sub.id === selectedSubject;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => handleSelect(sub.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left hover:bg-gray-50 transition cursor-pointer ${
                        isSelected
                          ? 'bg-storybookGreen/30 text-eagerGreen-dark font-extrabold'
                          : 'text-duoGray-charcoal font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <SubjectIcon subject={sub.id} size={16} />
                        <span className="text-xs font-feather font-bold">{sub.name}</span>
                      </div>
                      {isSelected && (
                        <Check size={16} className="text-eagerGreen stroke-[3]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};
