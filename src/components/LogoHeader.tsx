import React, { useState } from 'react';
import { Wrench } from 'lucide-react';
import generatedLogo from '../assets/images/taller_logo_icon_1785891982390.jpg';

interface LogoHeaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
}

export const LogoHeader: React.FC<LogoHeaderProps> = ({ size = 'md', showText = true }) => {
  const [imgError, setImgError] = useState(false);
  const [useGeneratedFallback, setUseGeneratedFallback] = useState(false);

  // Logo sizes requested: "hacer el logo un poco más grande (el png)"
  const dimensions = {
    sm: { img: 'w-10 h-10', text: 'text-sm', title: 'text-xs' },
    md: { img: 'w-20 h-20', text: 'text-base', title: 'text-sm' },
    lg: { img: 'w-32 h-32', text: 'text-xl', title: 'text-base' },
    xl: { img: 'w-44 h-44', text: 'text-2xl', title: 'text-lg' }
  }[size];

  const handlePrimaryError = () => {
    if (!useGeneratedFallback) {
      setUseGeneratedFallback(true);
    } else {
      setImgError(true);
    }
  };

  const imgSrc = useGeneratedFallback ? generatedLogo : 'Icon_taller.png';

  return (
    <div className="flex flex-col items-center justify-center gap-2 select-none">
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-red-900 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-300"></div>
        
        {!imgError ? (
          <img
            src={imgSrc}
            alt="EL CHINO CARRANZA"
            onError={handlePrimaryError}
            referrerPolicy="no-referrer"
            className={`${dimensions.img} object-contain relative transition-transform duration-300 transform group-hover:scale-105 filter drop-shadow-[0_0_15px_rgba(230,57,70,0.5)]`}
          />
        ) : (
          <div className={`${dimensions.img} relative bg-neutral-900 border border-red-900/40 rounded-2xl flex items-center justify-center shadow-lg`}>
            <Wrench className="w-1/2 h-1/2 text-red-500 animate-pulse" />
          </div>
        )}
      </div>

      {showText && (
        <div className="text-center">
          <h2 className={`font-extrabold tracking-tight text-white ${dimensions.text}`}>
            EL CHINO <span className="text-red-500 font-black tracking-wider uppercase">CARRANZA</span>
          </h2>
          <p className={`text-neutral-400 font-medium ${dimensions.title}`}>
            Taller Automotriz
          </p>
        </div>
      )}
    </div>
  );
};
