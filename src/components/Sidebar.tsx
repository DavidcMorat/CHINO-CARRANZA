import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  UserCheck,
  FileSpreadsheet,
  TrendingDown,
  CalendarCheck,
  Calendar,
  Download,
  LogOut,
  RefreshCw,
  CheckCircle2,
  WifiOff,
  Sun,
  Moon
} from 'lucide-react';
import { LogoHeader } from './LogoHeader';

export type SectionType =
  | 'dashboard'
  | 'trabajos'
  | 'trabajadores'
  | 'materiales'
  | 'clientes'
  | 'presupuestos'
  | 'egresos'
  | 'asistencia'
  | 'calendario'
  | 'exportar';

interface SidebarProps {
  currentSection: SectionType;
  onSelectSection: (section: SectionType) => void;
  pendingJobsCount: number;
  isSynced: boolean;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  pendingJobsCount,
  isSynced,
  onLogout,
  theme,
  onToggleTheme
}) => {
  const navItems: { id: SectionType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'trabajos',
      label: 'Trabajos',
      icon: <Wrench className="w-4 h-4" />,
      badge: pendingJobsCount > 0 ? pendingJobsCount : undefined
    },
    { id: 'trabajadores', label: 'Trabajadores', icon: <Users className="w-4 h-4" /> },
    { id: 'materiales', label: 'Materiales', icon: <Package className="w-4 h-4" /> },
    { id: 'clientes', label: 'Clientes', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'presupuestos', label: 'Presupuestos', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'egresos', label: 'Egresos', icon: <TrendingDown className="w-4 h-4" /> },
    { id: 'asistencia', label: 'Asistencia', icon: <CalendarCheck className="w-4 h-4" /> },
    { id: 'calendario', label: 'Calendario', icon: <Calendar className="w-4 h-4" /> },
    { id: 'exportar', label: 'Exportar Excel', icon: <Download className="w-4 h-4" /> }
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-neutral-900 border-r border-neutral-800 h-screen sticky top-0 shrink-0 z-30">
        {/* Sidebar Logo Header - Enlarged PNG */}
        <div className="p-4 border-b border-neutral-800/80 bg-neutral-950/40 flex justify-center">
          <LogoHeader size="md" />
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectSection(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-950/50 font-semibold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`${isActive ? 'text-white' : 'text-neutral-400 group-hover:text-red-400'} transition-colors`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                      isActive ? 'bg-white text-red-700' : 'bg-red-900/60 text-red-300 border border-red-800'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync, Theme & Logout Footer */}
        <div className="p-4 border-t border-neutral-800/80 bg-neutral-950/40 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs px-2 text-neutral-400">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSynced ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isSynced ? 'Firebase en vivo' : 'Modo offline'}</span>
            </div>
            {isSynced ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>

          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="w-full py-2 px-3 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-indigo-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
              <span>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-bold uppercase">
              {theme === 'dark' ? 'Oscuro' : 'Claro'}
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl border border-neutral-800 bg-neutral-900 hover:bg-red-950/40 hover:border-red-800/50 text-neutral-400 hover:text-red-400 text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-200"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800 z-40 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoHeader size="sm" showText={false} />
          <div>
            <span className="font-black text-sm text-white">EL CHINO </span>
            <span className="font-black text-sm text-red-500">CARRANZA</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-neutral-300 hover:bg-neutral-800"
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4.5 h-4.5 text-amber-400" />
            ) : (
              <Moon className="w-4.5 h-4.5 text-indigo-400" />
            )}
          </button>

          <button
            onClick={onLogout}
            className="p-2 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800"
            title="Cerrar Sesión"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Horizontal Bottom Scroll Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 z-40 px-2 py-1.5 flex items-center gap-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`flex flex-col items-center justify-center min-w-[64px] py-1 px-2 rounded-lg text-[10px] font-medium transition-all ${
                isActive ? 'bg-red-600 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <div className="relative">
                {item.icon}
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="mt-0.5 truncate max-w-[60px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
