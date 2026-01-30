'use client';

import { useState, useEffect } from 'react';
import { useTrackerData } from '@/hooks/useTrackerData';
import { useTheme } from '@/components/ThemeProvider';
import { MoodEntryForm } from '@/components/MoodEntryForm';
import { CBTLogForm } from '@/components/CBTLogForm';
import { HistoryView } from '@/components/HistoryView';
import { MoodChart } from '@/components/MoodChart';
import { CBTGuide } from '@/components/CBTGuide';
import { InsightsView } from '@/components/InsightsView';
import { DataManagement } from '@/components/DataManagement';
import { SettingsView } from '@/components/SettingsView';
import { CrisisResources } from '@/components/CrisisResources';
import { ActionItemsWidget } from '@/components/ActionItemsWidget';
import { 
  LayoutDashboard, 
  PlusCircle, 
  BookText, 
  History, 
  LucideIcon, 
  GraduationCap,
  BarChart2,
  Database,
  Settings,
  Moon,
  Sun,
  Menu,
  ChevronRight,
  ShieldAlert,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CBTLog } from '@/types';
import { useSession, signOut } from 'next-auth/react';

type MainTab = 'dashboard' | 'mood' | 'journal' | 'insights' | 'menu';
type MenuTab = 'history' | 'guide' | 'data' | 'settings' | 'crisis';

export default function Home() {
  const { data: session } = useSession();
  const { moodEntries, cbtLogs, addMoodEntry, addCBTLog, updateCBTLog, deleteMoodEntry, deleteCBTLog, fetchData } = useTrackerData();
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [menuTab, setMenuTab] = useState<MenuTab | null>(null);
  const [editingCBTLog, setEditingCBTLog] = useState<CBTLog | null>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const userInitials = session?.user?.name 
    ? session.user.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'JD';
  
  const handleEditCBT = (log: CBTLog) => {
    setEditingCBTLog(log);
    setActiveTab('journal');
  };

  const handleCBTCancel = () => {
    setEditingCBTLog(null);
    if (menuTab === 'history') {
      setActiveTab('menu');
    } else {
      setActiveTab('dashboard');
    }
  };

  const navigateTo = (tab: MainTab) => {
    setActiveTab(tab);
    setMenuTab(null);
    setEditingCBTLog(null);
  };

  const navigateToMenu = (tab: MenuTab) => {
    setMenuTab(tab);
    setEditingCBTLog(null);
  };

  const toggleActionStatus = (log: CBTLog) => {
    updateCBTLog({
      ...log,
      actionPlanStatus: log.actionPlanStatus === 'completed' ? 'pending' : 'completed'
    });
  };

  return (
    <main className="min-h-screen pb-28 bg-background">
      <header className="bg-background border-b-2 border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-black text-brand-600 tracking-tighter uppercase">MindfulTrack</h1>
          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="p-2.5 rounded-xl bg-secondary text-foreground hover:bg-muted transition-all border border-border shadow-sm active:scale-90 focus-visible:ring-4 focus-visible:ring-brand-500 outline-none"
                aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-foreground" />
                )}
              </button>
            )}
            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center border-2 border-brand-500 dark:border-brand-800 shadow-sm">
              <span className="text-sm font-black text-brand-700 dark:text-brand-400 uppercase">{userInitials}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 dark:bg-black rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-slate-800 dark:border-slate-900">
              <h2 className="text-3xl font-black mb-2 tracking-tight text-white">Hello there!</h2>
              <p className="text-slate-300 font-bold text-sm uppercase tracking-widest">How is your mind feeling today?</p>
              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => navigateTo('mood')}
                  className="bg-white text-slate-900 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg hover:bg-slate-100 active:scale-95 transition-all focus-visible:ring-4 focus-visible:ring-white/50 outline-none"
                >
                  Check-in
                </button>
                <button 
                  onClick={() => navigateTo('journal')}
                  className="bg-brand-600 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg hover:bg-brand-700 active:scale-95 transition-all border-b-4 border-brand-800 focus-visible:ring-4 focus-visible:ring-brand-400 outline-none"
                >
                  Journal
                </button>
              </div>
            </div>

            <ActionItemsWidget cbtLogs={cbtLogs} onToggleStatus={toggleActionStatus} />

            <MoodChart entries={moodEntries} />

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-border pb-2">
                <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em]">Recent Activity</h3>
              </div>
              <HistoryView 
                moodEntries={moodEntries.slice(0, 3)} 
                cbtLogs={cbtLogs.slice(0, 3)} 
                onEditCBT={handleEditCBT}
                onDeleteMood={deleteMoodEntry}
                onDeleteCBT={deleteCBTLog}
              />
              {(moodEntries.length > 3 || cbtLogs.length > 3) && (
                <button 
                  onClick={() => { setActiveTab('menu'); setMenuTab('history'); }}
                  className="w-full py-4 text-xs font-black uppercase tracking-[0.2em] text-foreground hover:bg-secondary rounded-2xl transition-all border-2 border-border focus-visible:ring-4 focus-visible:ring-brand-500 outline-none"
                >
                  View Full History
                </button>
              )}
            </div>
          </div>
        )}

        {activeTab === 'mood' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Mood Check-in</h2>
            <MoodEntryForm onSubmit={(entry) => { addMoodEntry(entry); navigateTo('dashboard'); }} />
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">
              {editingCBTLog ? 'Edit CBT Journal Entry' : 'CBT Journal Entry'}
            </h2>
            <CBTLogForm 
              initialData={editingCBTLog || undefined}
              onCancel={handleCBTCancel}
              onSubmit={(logData) => {
                if (editingCBTLog) { updateCBTLog({ ...editingCBTLog, ...logData }); } 
                else { addCBTLog(logData); }
                if (menuTab === 'history') {
                  setActiveTab('menu');
                } else {
                  navigateTo('dashboard');
                }
              }} 
            />
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Insights</h2>
            <InsightsView moodEntries={moodEntries} cbtLogs={cbtLogs} />
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
            {!menuTab ? (
              <>
                <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Menu</h2>
                <div className="grid gap-4">
                   <MenuButton icon={History} label="History" onClick={() => navigateToMenu('history')} />
                   <MenuButton icon={GraduationCap} label="CBT Guide" onClick={() => navigateToMenu('guide')} />
                   <MenuButton icon={Database} label="Data Management" onClick={() => navigateToMenu('data')} />
                   <MenuButton icon={Settings} label="Settings" onClick={() => navigateToMenu('settings')} />
                   <div className="pt-4 mt-2 border-t-2 border-border space-y-4">
                     <MenuButton icon={ShieldAlert} label="Crisis Resources" onClick={() => navigateToMenu('crisis')} variant="danger" />
                     <button
                        onClick={() => signOut()}
                        className="w-full py-4 text-sm font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all hover:bg-secondary rounded-2xl"
                     >
                       Sign Out
                     </button>
                   </div>
                </div>
              </>
            ) : (
              <div className="animate-in fade-in slide-in-from-right-8 duration-300">
                <button 
                  onClick={() => setMenuTab(null)}
                  className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground mb-6 transition-colors"
                >
                  <ArrowLeft size={16} /> Back to Menu
                </button>
                
                {menuTab === 'history' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">History</h2>
                    <HistoryView 
                      moodEntries={moodEntries} 
                      cbtLogs={cbtLogs} 
                      onEditCBT={handleEditCBT} 
                      onDeleteMood={deleteMoodEntry}
                      onDeleteCBT={deleteCBTLog}
                    />
                  </div>
                )}
                {menuTab === 'guide' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">CBT Guide</h2>
                    <CBTGuide />
                  </div>
                )}
                {menuTab === 'data' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Data</h2>
                    <DataManagement onDataImported={() => fetchData()} />
                  </div>
                )}
                {menuTab === 'settings' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Settings</h2>
                    <SettingsView />
                  </div>
                )}
                {menuTab === 'crisis' && (
                  <div className="space-y-6">
                    <h2 className="text-3xl font-black text-red-600 dark:text-red-500 tracking-tighter uppercase">Crisis Resources</h2>
                    <CrisisResources />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <nav 
        role="tablist"
        aria-label="Main Navigation"
        className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-border px-6 py-3 flex justify-between items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]"
      >
        <NavButton active={activeTab === 'dashboard'} onClick={() => navigateTo('dashboard')} icon={LayoutDashboard} label="Home" />
        <NavButton active={activeTab === 'mood'} onClick={() => navigateTo('mood')} icon={PlusCircle} label="Mood" />
        <NavButton active={activeTab === 'journal'} onClick={() => navigateTo('journal')} icon={BookText} label="Journal" />
        <NavButton active={activeTab === 'insights'} onClick={() => navigateTo('insights')} icon={BarChart2} label="Insights" />
        <NavButton active={activeTab === 'menu'} onClick={() => navigateTo('menu')} icon={Menu} label="Menu" />
      </nav>
    </main>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: LucideIcon, label: string }) {
  return (
    <button 
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all min-w-[56px] min-h-[56px] rounded-2xl p-2 outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
        active 
          ? "text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 shadow-sm" 
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      )}
    >
      <Icon size={24} strokeWidth={active ? 3 : 2} />
      <span className="text-[10px] font-black uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function MenuButton({ icon: Icon, label, onClick, variant = 'default' }: { icon: LucideIcon, label: string, onClick: () => void, variant?: 'default' | 'danger' }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all shadow-sm active:scale-[0.98] outline-none focus-visible:ring-4 focus-visible:ring-brand-500 group",
        variant === 'danger'
          ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 hover:border-red-500 dark:hover:border-red-500 text-red-700 dark:text-red-400"
          : "bg-card border-border hover:border-brand-500 text-foreground"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-2xl transition-colors",
          variant === 'danger'
            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/50"
            : "bg-secondary text-muted-foreground group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 group-hover:text-brand-600 dark:group-hover:text-brand-400"
        )}>
          <Icon size={24} />
        </div>
        <span className="font-bold text-lg">{label}</span>
      </div>
      <ChevronRight size={20} className="text-muted-foreground group-hover:text-foreground" />
    </button>
  );
}