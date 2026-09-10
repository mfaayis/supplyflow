import React, { useState, useEffect, useCallback } from 'react';
import { TradeRecord, UserSettings } from './types';
import { tradeRepository, DEFAULT_USER_SETTINGS } from './services/tradeRepository';
import { useAuth } from './hooks/useAuth';
import { supabase } from './lib/supabase';
import { AuthScreen } from './components/Auth/AuthScreen';
import { Logo } from './components/Shared/Logo';
import { OverviewView } from './components/Dashboard/OverviewView';
import { TradesListView } from './components/Trades/TradesListView';
import { AnalyticsView } from './components/Analytics/AnalyticsView';
import { DisciplineView } from './components/Discipline/DisciplineView';
import { TradingCalendarView } from './components/Calendar/TradingCalendarView';
import { SettingsView } from './components/Settings/SettingsView';
import { SupplyDemandFrameworkView } from './components/Methodology/SupplyDemandFrameworkView';
import { PeriodicReviewsView } from './components/Reviews/PeriodicReviewsView';
import { QuickTradeWizard } from './components/TradeEntry/QuickTradeWizard';
import { TradeDetailModal } from './components/TradeDetail/TradeDetailModal';
import {
  LayoutDashboard,
  BookOpen,
  LineChart,
  ShieldCheck,
  Calendar,
  Settings,
  Plus,
  MoreHorizontal,
  X,
  ChevronRight,
  Layers,
  FileText,
  LogOut,
  Loader2,
} from 'lucide-react';

type AppView =
  | 'overview'
  | 'trades'
  | 'analytics'
  | 'discipline'
  | 'reviews'
  | 'calendar'
  | 'settings'
  | 'framework';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<AppView>('overview');
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [dataLoading, setDataLoading] = useState(true);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<TradeRecord | null>(null);
  const [activeDetailTrade, setActiveDetailTrade] = useState<TradeRecord | null>(null);
  const [showMobileMore, setShowMobileMore] = useState(false);

  // Load data whenever user changes (login/logout)
  const refreshData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [allTrades, settings] = await Promise.all([
        tradeRepository.getAllTrades(),
        tradeRepository.getSettings(),
      ]);
      setTrades(allTrades);
      setUserSettings(settings);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      refreshData();
    } else if (!authLoading) {
      setDataLoading(false);
    }
  }, [user, authLoading, refreshData]);

  const handleSaveTrade = async (tradeData: Partial<TradeRecord>) => {
    if (editingTrade) {
      await tradeRepository.updateTrade(editingTrade.id, tradeData);
    } else {
      await tradeRepository.saveTrade(tradeData);
    }
    await refreshData();
    setIsWizardOpen(false);
    setEditingTrade(null);
  };

  const handleOpenTradeDetail = (trade: TradeRecord) => {
    setActiveDetailTrade(trade);
  };

  const handleStartEdit = (trade: TradeRecord) => {
    setActiveDetailTrade(null);
    setEditingTrade(trade);
    setIsWizardOpen(true);
  };

  const handleDuplicateTrade = async (tradeId: string) => {
    const duplicated = await tradeRepository.duplicateTrade(tradeId);
    if (duplicated) {
      await refreshData();
      setActiveDetailTrade(null);
      setEditingTrade(duplicated);
      setIsWizardOpen(true);
    }
  };

  const handleDeleteTrade = async (tradeId: string) => {
    await tradeRepository.deleteTrade(tradeId);
    await refreshData();
    setActiveDetailTrade(null);
  };

  const handleSaveSettings = async (newSettings: UserSettings) => {
    await tradeRepository.saveSettings(newSettings);
    setUserSettings(newSettings);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setTrades([]);
    setUserSettings(DEFAULT_USER_SETTINGS);
  };

  // ── Auth gate ────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" />
          <Loader2 className="h-5 w-5 text-[#8B5CF6] animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Logo size="md" />
          <p className="text-xs text-[#525866] mt-1">Loading your journal…</p>
          <Loader2 className="h-5 w-5 text-[#8B5CF6] animate-spin" />
        </div>
      </div>
    );
  }

  // ── Main App ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#000000] text-[#E1E4EA] flex flex-col md:flex-row selection:bg-[#8B5CF6] selection:text-white">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 flex-col justify-between border-r border-[#181920] bg-[#0A0B0E] p-4 shrink-0 fixed inset-y-0 z-30">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div
            className="px-2 pt-2 flex items-center justify-between cursor-pointer"
            onClick={() => setCurrentView('overview')}
          >
            <Logo size="md" />
          </div>

          {/* Primary Quick Record Action */}
          <button
            onClick={() => {
              setEditingTrade(null);
              setIsWizardOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] py-3 px-4 text-xs font-black uppercase tracking-wider text-white transition-all shadow-[0_0_25px_rgba(139,92,246,0.35)] active:scale-[0.98] cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>New Trade</span>
          </button>

          {/* Nav Groups */}
          <div className="space-y-4">
            {/* Journaling Group */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#525866] block mb-1.5">
                Journaling
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setCurrentView('overview')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'overview'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => setCurrentView('trades')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'trades'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4" />
                    <span>Trades</span>
                  </div>
                  <span className="font-mono-num text-[10px] text-[#8E95A2] px-1.5 py-0.5 rounded bg-[#0E0F14] border border-[#181920]">
                    {trades.length}
                  </span>
                </button>

                <button
                  onClick={() => setCurrentView('calendar')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'calendar'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>Calendar</span>
                </button>
              </nav>
            </div>

            {/* Playbook Group */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#525866] block mb-1.5">
                Playbook
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setCurrentView('framework')}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'framework'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-[#A78BFA]" />
                    <span>S&D Framework</span>
                  </div>
                  <span className="text-[9px] font-mono-num font-bold text-[#A78BFA] px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 border border-[#8B5CF6]/30">
                    5-Year
                  </span>
                </button>
              </nav>
            </div>

            {/* Analytics Group */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#525866] block mb-1.5">
                Analytics
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setCurrentView('analytics')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'analytics'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <LineChart className="h-4 w-4" />
                  <span>Analytics</span>
                </button>

                <button
                  onClick={() => setCurrentView('discipline')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'discipline'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Discipline</span>
                </button>
              </nav>
            </div>

            {/* Periodic Group */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#525866] block mb-1.5">
                Periodic
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setCurrentView('reviews')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'reviews'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  <span>Reviews</span>
                </button>
              </nav>
            </div>

            {/* System Group */}
            <div>
              <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#525866] block mb-1.5">
                System
              </span>
              <nav className="space-y-1">
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    currentView === 'settings'
                      ? 'bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 shadow-xs'
                      : 'text-[#8E95A2] hover:text-white hover:bg-[#0E0F14]'
                  }`}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>
          </div>
        </div>

        {/* Bottom Profile / Sign Out Strip */}
        <div className="space-y-3 pt-4 border-t border-[#181920]">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="h-8 w-8 rounded-full bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 flex items-center justify-center font-bold text-xs text-[#A78BFA]">
              {(userSettings.userName?.trim() || 'T').charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden text-xs flex-1">
              <span className="font-bold text-white block truncate">{userSettings.userName?.trim() || 'Trader'}</span>
              <span className="text-[10px] text-[#8E95A2] font-mono-num block truncate">{user.email}</span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-[#525866] hover:text-[#F87171] transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="border-b border-[#181920] bg-[#0A0B0E]/80 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="md:hidden">
              <Logo size="sm" />
            </div>
            <span className="hidden md:inline-flex text-xs font-semibold text-[#8E95A2]">
              SUPPLYFLOW
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('framework')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                currentView === 'framework'
                  ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/50 text-[#A78BFA]'
                  : 'border-[#181920] bg-[#0E0F14] hover:bg-[#151720] hover:border-[#272932] text-[#8E95A2] hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-[#A78BFA]" />
              <span>S&D Framework</span>
            </button>

            <button
              onClick={() => {
                setEditingTrade(null);
                setIsWizardOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-extrabold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span>+ New Trade</span>
            </button>
          </div>
        </header>

        {/* Dynamic View Mount */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto pb-24 md:pb-8">
          {currentView === 'overview' && (
            <OverviewView
              trades={trades}
              userSettings={userSettings}
              onNewTrade={() => { setEditingTrade(null); setIsWizardOpen(true); }}
              onOpenTrade={handleOpenTradeDetail}
              onViewAllTrades={() => setCurrentView('trades')}
              onViewFramework={() => setCurrentView('framework')}
              onRefreshData={refreshData}
            />
          )}

          {currentView === 'framework' && (
            <SupplyDemandFrameworkView
              onNewTradeWithFramework={(presetData) => {
                setEditingTrade(presetData ? (presetData as any) : null);
                setIsWizardOpen(true);
              }}
              onBackToOverview={() => setCurrentView('overview')}
            />
          )}

          {currentView === 'trades' && (
            <TradesListView
              trades={trades}
              onOpenTrade={handleOpenTradeDetail}
              onNewTrade={() => { setEditingTrade(null); setIsWizardOpen(true); }}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView trades={trades} userSettings={userSettings} />
          )}

          {currentView === 'discipline' && (
            <DisciplineView
              trades={trades}
              userSettings={userSettings}
              onNewTrade={() => { setEditingTrade(null); setIsWizardOpen(true); }}
              onNavigateHome={() => setCurrentView('overview')}
              onRefreshData={refreshData}
            />
          )}

          {currentView === 'reviews' && (
            <PeriodicReviewsView
              trades={trades}
              userSettings={userSettings}
              onNewTrade={() => { setEditingTrade(null); setIsWizardOpen(true); }}
              onNavigateHome={() => setCurrentView('overview')}
            />
          )}

          {currentView === 'calendar' && (
            <TradingCalendarView trades={trades} onOpenTrade={handleOpenTradeDetail} />
          )}

          {currentView === 'settings' && (
            <SettingsView
              settings={userSettings}
              onSaveSettings={handleSaveSettings}
              onRefreshData={refreshData}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#181920] bg-[#0A0B0E]/95 backdrop-blur-md px-2 py-1.5 flex items-center justify-around">
        <button
          onClick={() => { setCurrentView('overview'); setShowMobileMore(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${currentView === 'overview' ? 'text-[#A78BFA]' : 'text-[#8E95A2]'}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Home</span>
        </button>

        <button
          onClick={() => { setCurrentView('trades'); setShowMobileMore(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${currentView === 'trades' ? 'text-[#A78BFA]' : 'text-[#8E95A2]'}`}
        >
          <BookOpen className="h-5 w-5" />
          <span>Trades</span>
        </button>

        {/* Center Prominent New Trade Button */}
        <button
          onClick={() => { setEditingTrade(null); setIsWizardOpen(true); setShowMobileMore(false); }}
          className="flex items-center justify-center h-11 w-11 rounded-full bg-[#8B5CF6] text-white shadow-lg shadow-[rgba(139,92,246,0.35)] -mt-4 active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </button>

        <button
          onClick={() => { setCurrentView('analytics'); setShowMobileMore(false); }}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${currentView === 'analytics' ? 'text-[#A78BFA]' : 'text-[#8E95A2]'}`}
        >
          <LineChart className="h-5 w-5" />
          <span>Analytics</span>
        </button>

        <button
          onClick={() => setShowMobileMore(!showMobileMore)}
          className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition-colors ${showMobileMore ? 'text-[#A78BFA]' : 'text-[#8E95A2]'}`}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>More</span>
        </button>
      </div>

      {/* Mobile "More" Drawer Sheet */}
      {showMobileMore && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end">
          <div className="bg-[#0A0B0E] border-t border-[#181920] rounded-t-2xl p-5 space-y-2 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#181920]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8E95A2]">Menu</span>
              <button onClick={() => setShowMobileMore(false)} className="p-1 rounded-lg text-[#8E95A2] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {[
              { view: 'framework' as AppView, icon: <Layers className="h-4 w-4 text-[#A78BFA]" />, label: 'S&D Framework', sub: 'Methodology' },
              { view: 'discipline' as AppView, icon: <ShieldCheck className="h-4 w-4 text-[#A78BFA]" />, label: 'Discipline', sub: '' },
              { view: 'reviews' as AppView, icon: <FileText className="h-4 w-4 text-[#A78BFA]" />, label: 'Periodic Reviews', sub: '' },
              { view: 'calendar' as AppView, icon: <Calendar className="h-4 w-4 text-[#A78BFA]" />, label: 'Calendar', sub: '' },
              { view: 'settings' as AppView, icon: <Settings className="h-4 w-4 text-[#A78BFA]" />, label: 'Settings', sub: '' },
            ].map(({ view, icon, label, sub }) => (
              <button
                key={view}
                onClick={() => { setCurrentView(view); setShowMobileMore(false); }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-[#0E0F14] text-xs font-bold text-white text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {icon}
                  <div>
                    <span className="block">{label}</span>
                    {sub && <span className="text-[10px] text-[#8E95A2] font-normal">{sub}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-[#8E95A2]" />
              </button>
            ))}

            {/* Sign Out in mobile drawer */}
            <button
              onClick={() => { handleSignOut(); setShowMobileMore(false); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#F87171]/10 text-xs font-bold text-[#F87171] text-left cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Trade Wizard */}
      {isWizardOpen && (
        <QuickTradeWizard
          initialTrade={editingTrade}
          userSettings={userSettings}
          onSave={handleSaveTrade}
          onCancel={() => { setIsWizardOpen(false); setEditingTrade(null); }}
        />
      )}

      {/* Trade Detail Modal */}
      {activeDetailTrade && (
        <TradeDetailModal
          trade={activeDetailTrade}
          onClose={() => setActiveDetailTrade(null)}
          onEdit={handleStartEdit}
          onDuplicate={handleDuplicateTrade}
          onDelete={handleDeleteTrade}
        />
      )}
    </div>
  );
}
