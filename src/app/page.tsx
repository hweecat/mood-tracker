'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useTrackerData } from '@/hooks/useTrackerData';
import { useTheme } from '@/components/ThemeProvider';
import { MoodEntryForm } from '@/components/MoodEntryForm';
import { CBTLogForm } from '@/components/CBTLogForm';
import { ActionItemsWidget } from '@/components/ActionItemsWidget';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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
  User,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CBTLog } from '@/types';
import { useSession, signOut } from 'next-auth/react';

// Dynamic imports for components not immediately visible
const HistoryView = dynamic(() => import('@/components/HistoryView').then(mod => mod.HistoryView), {
  loading: () => <div className="h-40 flex items-center justify-center bg-muted/20 rounded-3xl animate-pulse text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading History...</div>
});

const MoodChart = dynamic(() => import('@/components/MoodChart').then(mod => mod.MoodChart), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center bg-muted/20 rounded-3xl animate-pulse text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Chart...</div>
});

const InsightsView = dynamic(() => import('@/components/InsightsView').then(mod => mod.InsightsView), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center bg-muted/20 rounded-3xl animate-pulse text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Insights...</div>
});

const CBTGuide = dynamic(() => import('@/components/CBTGuide').then(mod => mod.CBTGuide));
const DataManagement = dynamic(() => import('@/components/DataManagement').then(mod => mod.DataManagement));
const SettingsView = dynamic(() => import('@/components/SettingsView').then(mod => mod.SettingsView));
const CrisisResources = dynamic(() => import('@/components/CrisisResources').then(mod => mod.CrisisResources));

type MainTab = 'dashboard' | 'mood' | 'journal' | 'insights' | 'menu';
type MenuTab = 'history' | 'guide' | 'data' | 'settings' | 'crisis';

export default function Home() {
  const { data: session } = useSession();
  const { moodEntries, cbtLogs, addMoodEntry, addCBTLog, updateCBTLog, deleteMoodEntry, deleteCBTLog, fetchData } = useTrackerData();
  const [activeTab, setActiveTab] = useState<MainTab>('dashboard');
  const [menuTab, setMenuTab] = useState<MenuTab | null>(null);
  const [editingCBTLog, setEditingCBTLog] = useState<CBTLog | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
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
    <div className="min-h-screen pb-28 bg-background">
      <header className="bg-background border-b-2 border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-black text-brand-700 tracking-tighter uppercase">MindfulTrack</h1>
          <div className="flex items-center gap-3 relative">
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
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 rounded-full hover:bg-secondary transition-all active:scale-95 outline-none focus-visible:ring-4 focus-visible:ring-brand-500"
            >
              <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center border-2 border-brand-500 dark:border-brand-800 shadow-sm">
                <span className="text-sm font-black text-brand-700 dark:text-brand-400 uppercase">{userInitials}</span>
              </div>
            </button>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-64 bg-card border-2 border-border rounded-[2rem] shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-6 border-b-2 border-border bg-muted/30">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Signed in as</p>
                    <p className="font-black text-foreground truncate">{session?.user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{session?.user?.email || 'demo@example.com'}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => { navigateTo('menu'); navigateToMenu('settings'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 p-4 text-sm font-bold text-foreground hover:bg-secondary rounded-2xl transition-all"
                    >
                      <User size={18} className="text-muted-foreground" />
                      Profile Settings
                    </button>
                    <button
                      onClick={() => signOut()}
                      className="w-full flex items-center gap-3 p-4 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
                    >
                      <LogOut size={18} />
                      Sign Out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main aria-label="Main Content" className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <Card aria-label="Welcome Banner" className="bg-black rounded-[2.5rem] p-8 text-white shadow-2xl border-b-8 border-slate-900 border-none">
              <h2 className="text-3xl font-black mb-2 tracking-tight">Hello there!</h2>
              <p className="font-bold text-sm uppercase tracking-widest text-[#e2e8f0]">How is your mind feeling today?</p>
              <div className="mt-8 flex gap-4">
                <Button 
                  onClick={() => navigateTo('mood')}
                  variant="neo"
                >
                  Check-in
                </Button>
                <Button 
                  onClick={() => navigateTo('journal')}
                >
                  Journal
                </Button>
              </div>
            </Card>

            <section aria-label="Action Items">
              <ActionItemsWidget cbtLogs={cbtLogs} onToggleStatus={toggleActionStatus} />
            </section>

            <MoodChart entries={moodEntries} />

            <section aria-label="Recent Activity" className="space-y-6">
              <div className="flex items-center justify-between border-b-2 border-border pb-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#334155] dark:text-[#cbd5e1]">Recent Activity</h3>
              </div>
              <HistoryView 
                moodEntries={moodEntries.slice(0, 3)} 
                cbtLogs={cbtLogs.slice(0, 3)} 
                onEditCBT={handleEditCBT}
                onDeleteMood={deleteMoodEntry}
                onDeleteCBT={deleteCBTLog}
              />
              {(moodEntries.length > 3 || cbtLogs.length > 3) && (
                <Button 
                  variant="secondary"
                  onClick={() => { setActiveTab('menu'); setMenuTab('history'); }}
                  className="w-full"
                >
                  View Full History
                </Button>
              )}
            </section>
          </div>
        )}

        {activeTab === 'mood' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Mood Check-in</h2>
            <MoodEntryForm onSubmit={(entry) => { addMoodEntry(entry); navigateTo('dashboard'); }} />
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="space-y-6">
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
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-foreground tracking-tighter uppercase">Insights</h2>
            <InsightsView moodEntries={moodEntries} cbtLogs={cbtLogs} />
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6">
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
              <div className="">
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
      </main>

      {/* Navigation Bar */}
      <nav 
        aria-label="Main Navigation"
        className="fixed bottom-0 left-0 right-0 bg-background border-t-2 border-border px-6 py-3 flex justify-between items-center z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]"
      >
        <NavButton active={activeTab === 'dashboard'} onClick={() => navigateTo('dashboard')} icon={LayoutDashboard} label="Home" />
        <NavButton active={activeTab === 'mood'} onClick={() => navigateTo('mood')} icon={PlusCircle} label="Mood" />
        <NavButton active={activeTab === 'journal'} onClick={() => navigateTo('journal')} icon={BookText} label="Journal" />
        <NavButton active={activeTab === 'insights'} onClick={() => navigateTo('insights')} icon={BarChart2} label="Insights" />
        <NavButton active={activeTab === 'menu'} onClick={() => navigateTo('menu')} icon={Menu} label="Menu" />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: LucideIcon, label: string }) {
  return (
    <button 
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        "flex flex-col items-center gap-1 transition-none min-w-[64px] min-h-[64px] rounded-2xl p-2 outline-none focus-visible:ring-4 focus-visible:ring-brand-500",
        active 
          ? "text-black dark:text-white bg-brand-200 dark:bg-brand-900 shadow-sm" 
          : "text-foreground dark:text-foreground hover:bg-secondary"
      )}
    >
      <Icon size={24} strokeWidth={active ? 3 : 2} aria-hidden="true" />
      <span className="text-xs font-black uppercase tracking-normal">
        {label}
      </span>
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