import React, { useState } from 'react';
import { BookOpen, ChevronDown, Check } from 'lucide-react';
import { SubjectMeta, SubjectType } from '../types/notes';
import { playPopSound } from '../utils/audio';
import { SubjectIcon } from './SubjectIcon';

interface TopHeaderProps {
  subjects: SubjectMeta[];
  selectedSubject: SubjectType;
  onSelectSubject: (subject: SubjectType) => void;
  totalNotes: number;
  isRealtimeConnected?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  subjects,
  selectedSubject,
  onSelectSubject,
  totalNotes,
  isRealtimeConnected = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeMeta = subjects.find((s) => s.id === selectedSubject) || subjects[0];

  const handleSelect = (id: SubjectType) => {
    playPopSound();
    onSelectSubject(id);
    setDropdownOpen(false);
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b-2 border-duoGray-border px-4 py-3 shadow-xs select-none">
      <div className="flex items-center justify-between">
        {/* Left: App Title & Note Count & Realtime Badge */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-duo bg-storybookGreen border-2 border-eagerGreen flex items-center justify-center text-eagerGreen shadow-xs">
            <BookOpen size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-feather font-black text-[20px] text-duoGray-charcoal leading-none">
              Flexnote
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-bold text-duoGray-pencil">
                {totalNotes} {totalNotes === 1 ? 'zápisek' : totalNotes < 5 ? 'zápisky' : 'zápisků'}
              </span>
              {isRealtimeConnected && (
                <span
                  title="Živé cloudové propojení (Supabase Realtime aktivní)"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-storybookGreen/70 border border-eagerGreen/40 text-[9px] font-feather font-black text-eagerGreen-dark tracking-wide animate-in fade-in"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-eagerGreen animate-pulse" />
                  Živě
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Class / Subject Dropdown Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              playPopSound();
              setDropdownOpen(!dropdownOpen);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-duo bg-white border-2 border-duoGray-border border-b-4 hover:border-duoGray-faded text-duoGray-charcoal transition active:translate-y-[2px] active:border-b-2 cursor-pointer shadow-xs"
          >
            <SubjectIcon subject={activeMeta.id} size={15} />
            <span className="font-feather font-extrabold text-[13px]">
              {activeMeta.czechName}
            </span>
            <ChevronDown
              size={15}
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
  );
};
