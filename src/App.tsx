import React, { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  auth,
  loadUserData,
  saveUserData,
  subscribeUserData,
  signOut,
  User
} from './lib/firebase';
import { AppData } from './types';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar, SectionType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { TrabajosView } from './components/TrabajosView';
import { TrabajadoresView } from './components/TrabajadoresView';
import { MaterialesView } from './components/MaterialesView';
import { ClientesView } from './components/ClientesView';
import { PresupuestosView } from './components/PresupuestosView';
import { EgresosView } from './components/EgresosView';
import { CalendarioView } from './components/CalendarioView';
import { ExportarView } from './components/ExportarView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CheckCircle2, AlertCircle, BellRing, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { setupFCMForegroundListener } from './lib/firebaseMessaging';
import { checkAndSendAutomaticNotifications, getCalendarAlerts } from './lib/calendarNotificationEngine';
import { formatCurrency } from './lib/dateUtils';

interface ToastItem {
  id: string;
  msg: string;
  type: 'success' | 'error';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState<boolean>(true);

  const [currentSection, setCurrentSection] = useState<SectionType>('dashboard');
  const [isSynced, setIsSynced] = useState<boolean>(true);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('chino_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('chino_theme', nextTheme);
  };

  // App Central State
  const [appData, setAppData] = useState<AppData>({
    trabajos: [],
    trabajadores: [],
    materiales: [],
    clientes: [],
    presupuestos: [],
    egresos: [],
    asistencias: [],
    anticipos: [],
    notasImportantes: []
  });

  // Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Fast preset navigation state
  const [quickPresetClienteId, setQuickPresetClienteId] = useState<string>('');
  const [openNewJobModal, setOpenNewJobModal] = useState<boolean>(false);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Auth State Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const initialData = await loadUserData(user);
        if (initialData) {
          setAppData(initialData);
        }
      } else {
        setAppData({
          trabajos: [],
          trabajadores: [],
          materiales: [],
          clientes: [],
          presupuestos: [],
          egresos: [],
          asistencias: [],
          anticipos: [],
          notasImportantes: []
        });
      }
      setLoadingAuth(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Foreground FCM Push Notification Listener
  useEffect(() => {
    const unsubFCM = setupFCMForegroundListener((payload) => {
      showToast(`🔔 ${payload.title}: ${payload.body}`, 'success');
    });
    return () => unsubFCM();
  }, []);

  // Motor Automático de Notificaciones del Calendario (Pagos, Egresos, Notas)
  useEffect(() => {
    if (loadingAuth || !currentUser) return;

    // Disparar chequeo automático cuando cambian los datos
    const timer = setTimeout(() => {
      checkAndSendAutomaticNotifications(appData, {
        onToast: (msg) => showToast(msg, 'success')
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [appData, loadingAuth, currentUser]);

  // Chequeo periódico (cada 15 min) y cuando la pestaña vuelve a tener foco
  useEffect(() => {
    if (loadingAuth || !currentUser) return;

    const interval = setInterval(() => {
      checkAndSendAutomaticNotifications(appData);
    }, 15 * 60 * 1000);

    const handleFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkAndSendAutomaticNotifications(appData);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [appData, loadingAuth, currentUser]);

  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isPendingWriteRef = React.useRef<boolean>(false);

  // Realtime Firestore Sync Listener
  useEffect(() => {
    if (!currentUser) return;
    const unsubSnapshot = subscribeUserData(currentUser, (newData) => {
      // Only update local state if we aren't currently debouncing a save, 
      // otherwise it might overwrite un-saved local changes with older DB state
      if (!isPendingWriteRef.current) {
        setAppData(newData);
        setIsSynced(true);
      }
    });

    return () => unsubSnapshot();
  }, [currentUser]);

  // Handler to update data both locally and in Firestore (debounced to save writes)
  const handleSaveData = (newData: AppData) => {
    setAppData(newData);
    setIsSynced(false); // Indicates saving is pending
    isPendingWriteRef.current = true;

    if (currentUser) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounce writes by 1500ms to reduce database usage and costs
      saveTimeoutRef.current = setTimeout(async () => {
        const ok = await saveUserData(currentUser, newData);
        setIsSynced(ok);
        isPendingWriteRef.current = false;
        saveTimeoutRef.current = null;
      }, 1500);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('Sesión cerrada correctamente');
    } catch (e) {
      showToast('Error al cerrar sesión', 'error');
    }
  };

  const handleQuickPresetJob = (clienteId: string) => {
    setQuickPresetClienteId(clienteId);
    setOpenNewJobModal(true);
    setCurrentSection('trabajos');
    showToast('Iniciando creación de trabajo con cliente preseleccionado');
  };

  // Count pending jobs for badge
  const pendingJobsCount = appData.trabajos.filter((t) => t.estado !== 'completado').length;

  // Resumen de alertas del calendario para hoy (pagos a personal, notas, presupuestos)
  const calendarAlerts = getCalendarAlerts(appData);

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-neutral-400">
          Cargando EL CHINO CARRANZA...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <OfflineIndicator />
        <LoginScreen
          onLoginSuccess={() => showToast('Bienvenido a EL CHINO CARRANZA')}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex font-sans antialiased selection:bg-red-600 selection:text-white ${theme === 'light' ? 'light-theme' : ''}`}>
      <OfflineIndicator />
      {/* Toast Notifications */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-xl text-xs font-semibold shadow-2xl border flex items-center gap-2.5 animate-in slide-in-from-right duration-300 ${
              t.type === 'success'
                ? 'bg-neutral-900 border-emerald-500/50 text-emerald-300 shadow-emerald-950/20'
                : 'bg-neutral-900 border-red-500/50 text-red-300 shadow-red-950/20'
            }`}
          >
            {t.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{t.msg}</span>
          </div>
        ))}
      </div>

      {/* Main Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(sec) => {
          setOpenNewJobModal(false);
          setCurrentSection(sec);
        }}
        pendingJobsCount={pendingJobsCount}
        isSynced={isSynced}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content View Container */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-h-screen pt-16 lg:pt-8 pb-20 lg:pb-8">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Banner de Alerta del Calendario para Hoy (Pagos a trabajadores, presupuestos, notas) */}
          {calendarAlerts.alerts.length > 0 && currentSection !== 'calendario' && (
            <div className="bg-gradient-to-r from-purple-950/80 via-neutral-900 to-neutral-900 border border-purple-800/70 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-purple-950/30 animate-in fade-in duration-300">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-900/60 border border-purple-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                  <BellRing className="w-5 h-5 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      {calendarAlerts.conteoPagos > 0
                        ? '⚠️ Alerta de Pagos de Personal Hoy'
                        : '🔔 Notificaciones del Calendario para Hoy'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900 text-purple-200 border border-purple-700 font-semibold">
                      {calendarAlerts.alerts.length} evento{calendarAlerts.alerts.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-300 mt-1">
                    {calendarAlerts.totalPagosHoy > 0 && (
                      <span className="text-purple-300 font-semibold mr-2">
                        Total pagos de hoy: {formatCurrency(calendarAlerts.totalPagosHoy)}
                      </span>
                    )}
                    <span className="text-neutral-400">
                      {calendarAlerts.alerts.slice(0, 2).map((a) => a.titulo).join(' • ')}
                      {calendarAlerts.alerts.length > 2 && ` (+${calendarAlerts.alerts.length - 2} más)`}
                    </span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCurrentSection('calendario')}
                className="self-end sm:self-center shrink-0 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Ver en Calendario</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {currentSection === 'dashboard' && (
            <DashboardView
              data={appData}
              onNavigateSection={(sec) => setCurrentSection(sec)}
            />
          )}

          {currentSection === 'trabajos' && (
            <TrabajosView
              data={appData}
              onSaveData={handleSaveData}
              onToast={showToast}
              initialOpenNewModal={openNewJobModal}
              prefilledClienteId={quickPresetClienteId}
            />
          )}

          {(currentSection === 'trabajadores' || currentSection === 'asistencia') && (
            <TrabajadoresView
              data={appData}
              onSaveData={handleSaveData}
              onToast={showToast}
            />
          )}

          {currentSection === 'materiales' && (
            <MaterialesView
              data={appData}
              onSaveData={handleSaveData}
              onToast={showToast}
            />
          )}

          {currentSection === 'clientes' && (
            <ClientesView
              data={appData}
              onSaveData={handleSaveData}
              onToast={showToast}
              onQuickPresetJob={handleQuickPresetJob}
            />
          )}

          {currentSection === 'presupuestos' && (
            <PresupuestosView
              data={appData}
              onSaveData={handleSaveData}
              onToast={showToast}
            />
          )}

          {currentSection === 'egresos' && (
            <EgresosView
              data={appData}
              onSaveData={handleSaveData}
              onToast={showToast}
            />
          )}

          {currentSection === 'calendario' && (
            <CalendarioView
              data={appData}
              onSaveData={handleSaveData}
              onToast={showToast}
            />
          )}

          {currentSection === 'exportar' && (
            <ExportarView data={appData} onToast={showToast} />
          )}
        </div>
      </main>
    </div>
  );
}
