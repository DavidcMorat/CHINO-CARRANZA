import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import logoImg from '../assets/images/Icon_taller.png';

interface LogoHeaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const LogoHeader: React.FC<LogoHeaderProps> = ({ size = 'md' }) => {
  const [imgError, setImgError] = useState(false);

  const dimensions = {
    sm: { img: 'w-20 h-20' },
    md: { img: 'w-56 h-auto max-h-52' },
    lg: { img: 'w-72 h-auto max-h-64' },
    xl: { img: 'w-full max-w-[380px] h-auto max-h-[300px]' }
  }[size];

  return (
    <div className="flex flex-col items-center justify-center select-none w-full">
      <div className="relative group flex items-center justify-center w-full">
        {!imgError ? (
          <img
            src={logoImg}
            alt="EL CHINO CARRANZA - Taller Automotriz"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className={`${dimensions.img} object-contain relative transition-transform duration-300 transform group-hover:scale-105`}
          />
        ) : (
          <div className="w-56 h-56 relative bg-neutral-900 border border-red-900/40 rounded-2xl flex items-center justify-center shadow-lg">
            <Wrench className="w-1/2 h-1/2 text-red-500 animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
};
