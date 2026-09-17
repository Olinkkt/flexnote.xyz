import React from 'react';
import { User, LogOut, Sparkles, BookOpen, Clock, School, ShieldCheck } from 'lucide-react';
import { UserProfile, signOutUser } from '../services/supabase';
import { playPopSound } from '../utils/audio';

interface ProfileViewProps {
  user: { id: string; email?: string } | null;
  profile: UserProfile | null;
  totalNotes: number;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  profile,
  totalNotes,
  onOpenAuth,
  onSignOut,
}) => {
  const handleSignOut = async () => {
    playPopSound();
    try {
      await signOutUser();
      onSignOut();
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (!user) {
    return (
      <div className="p-5 flex flex-col items-center text-center animate-in fade-in duration-150">
        <div className="w-20 h-20 rounded-full bg-storybookGreen border-2 border-eagerGreen flex items-center justify-center text-eagerGreen mb-4 shadow-sm">
          <User size={40} className="stroke-[2.5]" />
        </div>

        <h3 className="font-feather font-black text-lg text-duoGray-charcoal mb-1">
          Vytvoř si profil na Flexnote
        </h3>
        <p className="text-xs text-duoGray-pencil font-medium max-w-[280px] mb-6 leading-relaxed">
          Měj své zápisky ze sešitů bezpečně v cloudu na mobilu i počítači a sbírej drahokamy za studium.
        </p>

        <button
          onClick={() => {
            playPopSound();
            onOpenAuth();
          }}
          className="w-full duo-btn duo-btn-green py-3 px-6 text-xs font-feather font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          <span>Přihlásit se nebo vytvořit účet</span>
        </button>
      </div>
    );
  }

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'Student';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="p-4 flex flex-col gap-4 animate-in fade-in duration-150 select-none">
      {/* Profile Card */}
      <div className="duo-card p-4 bg-white flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-2xl bg-eagerGreen border-b-4 border-eagerGreen-dark flex items-center justify-center text-white font-feather font-black text-xl shadow-xs shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-feather font-black text-base text-duoGray-charcoal truncate">
              {displayName}
            </h3>
            <ShieldCheck size={16} className="text-sparkBlue shrink-0" />
          </div>
          <p className="text-xs font-bold text-duoGray-pencil truncate">
            {user.email}
          </p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-feather font-black bg-storybookGreen text-eagerGreen-dark border border-eagerGreen/30">
            Student Flexnote
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="duo-card p-3 bg-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-storybookGreen text-eagerGreen flex items-center justify-center shrink-0">
            <BookOpen size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-feather font-black uppercase text-duoGray-pencil">
              Zápisky
            </div>
            <div className="font-feather font-black text-base text-duoGray-charcoal">
              {totalNotes}
            </div>
          </div>
        </div>

        <div className="duo-card p-3 bg-white flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sparkBlue-tint text-sparkBlue flex items-center justify-center shrink-0">
            <Sparkles size={18} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="text-[10px] font-feather font-black uppercase text-duoGray-pencil">
              Drahokamy
            </div>
            <div className="font-feather font-black text-base text-duoGray-charcoal">
              {profile?.diamonds || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Cloud Sync Status Card */}
      <div className="duo-card p-3.5 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-eagerGreen animate-pulse"></span>
          <div>
            <div className="font-feather font-black text-xs text-duoGray-charcoal">
              Cloudová synchronizace
            </div>
            <div className="text-[10px] font-bold text-duoGray-pencil">
              Supabase PostgreSQL aktivní
            </div>
          </div>
        </div>
        <span className="text-[11px] font-feather font-black text-eagerGreen bg-storybookGreen px-2 py-0.5 rounded-full border border-eagerGreen/30">
          Online
        </span>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={handleSignOut}
        className="w-full duo-btn duo-btn-white py-2.5 px-4 text-xs font-feather font-black uppercase tracking-wider text-[#ff4b4b] hover:bg-red-50 border-2 border-duoGray-border flex items-center justify-center gap-2 cursor-pointer mt-2"
      >
        <LogOut size={16} />
        <span>Odhlásit se</span>
      </button>
    </div>
  );
};
