import React, { useState } from 'react';
import { Download, Monitor, CheckCircle, HelpCircle, X, ExternalLink } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'header' | 'banner';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'sidebar', className = '' }) => {
  const { isInstallable, isInstalled, isStandalone, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If running inside standalone installed window
  if (isStandalone || installSuccess) {
    if (variant === 'header') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>App en PC</span>
        </span>
      );
    }
    return (
      <div className="w-full py-2 px-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs font-medium flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Instalada en PC</span>
        </div>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-200 font-bold uppercase">
          Activa
        </span>
      </div>
    );
  }

  const handleDirectInstall = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          onClick={handleDirectInstall}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md shadow-red-950/40 transition-all transform active:scale-95 ${className}`}
          title="Instalar aplicación en PC"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
      ) : variant === 'banner' ? (
        <div className={`p-3 rounded-xl bg-gradient-to-r from-red-950/80 via-neutral-900 to-neutral-900 border border-red-800/60 flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Instalar en la PC</p>
              <p className="text-[11px] text-neutral-400">Ábrela como ventana independiente desde tu escritorio</p>
            </div>
          </div>
          <button
            onClick={handleDirectInstall}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold whitespace-nowrap transition-colors"
          >
            Instalar
          </button>
        </div>
      ) : (
        // Sidebar default button
        <button
          onClick={handleDirectInstall}
          className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold flex items-center justify-between shadow-lg shadow-red-950/50 transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0 group ${className}`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-red-800/60 group-hover:bg-red-700/80 transition-colors">
              <Download className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="text-left leading-tight">
              <span className="block font-bold">Instalar en PC</span>
              <span className="text-[10px] text-red-200 font-normal">App de escritorio</span>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-900/80 text-red-100 font-extrabold uppercase border border-red-400/30">
            PWA
          </span>
        </button>
      )}

      {/* Guide modal for manual installation or iOS / PC browsers */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-800 p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-950/60 overflow-hidden">
                <img src="/favicon.svg" alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Instalar EL CHINO CARRANZA</h3>
                <p className="text-xs text-neutral-400">Aplicación web progresiva (PWA)</p>
              </div>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-xs text-neutral-300">
                <p className="font-semibold text-neutral-200">Para instalar en iPhone o iPad:</p>
                <ol className="list-decimal list-inside space-y-2 text-neutral-400 pl-1">
                  <li>Toca el botón <strong className="text-white">Compartir</strong> en la barra de Safari.</li>
                  <li>Desplázate hacia abajo y selecciona <strong className="text-white">Agregar a la pantalla de inicio</strong>.</li>
                  <li>Toca <strong className="text-white">Agregar</strong> en la esquina superior.</li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3.5 text-xs text-neutral-300">
                <p className="text-neutral-300">
                  Puedes instalar la app directamente en tu PC con Windows o Mac para abrirla desde tu <strong>escritorio</strong> o <strong>barra de tareas</strong> sin el navegador:
                </p>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center font-bold text-[11px]">1</span>
                    <p className="text-neutral-300 leading-snug">
                      En <strong className="text-white">Google Chrome</strong> o <strong className="text-white">Microsoft Edge</strong>, busca el ícono de instalación <strong className="text-red-400">(⊕ o monitor con flecha)</strong> en el extremo derecho de la barra de direcciones URL.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center font-bold text-[11px]">2</span>
                    <p className="text-neutral-300 leading-snug">
                      O haz clic en los <strong>tres puntos (⋮)</strong> del navegador &gt; <strong className="text-white">Instalar EL CHINO CARRANZA</strong> (o en Aplicaciones &gt; Instalar este sitio como app).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center font-bold text-[11px]">3</span>
                    <p className="text-neutral-300 leading-snug">
                      Confirma <strong className="text-white">"Instalar"</strong>. ¡Listo! La app se abrirá en su propia ventana con el ícono rojo del taller en tu barra de tareas.
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-500 italic">
                  * Si estás viendo la vista previa en un iframe de AI Studio, abre la aplicación en una pestaña nueva para que el navegador permita la instalación directa.
                </p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full py-2 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
