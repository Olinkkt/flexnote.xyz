import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
  activeSubjectName?: string;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#f7f7f7] md:bg-[#f0f2f5] flex flex-col items-center select-none font-nunito transition-colors duration-200">
      {/* Responsive Shell: 100% edge-to-edge on mobile (<768px), max-w-2xl centered on desktop */}
      <div className="w-full max-w-2xl min-h-screen flex flex-col bg-[#f7f7f7] relative md:border-x-2 md:border-duoGray-border md:shadow-sm">
        <div className="flex-1 w-full pb-24 relative bg-[#f7f7f7]">
          {children}
        </div>
      </div>
    </div>
  );
};

