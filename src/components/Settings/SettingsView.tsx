import React, { useState, useRef } from 'react';
import { UserSettings } from '../../types';
import { tradeRepository } from '../../services/tradeRepository';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Check,
  Shield,
  FileText,
  User,
  DollarSign,
  Layers,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void | Promise<void>;
  onRefreshData: () => void | Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onRefreshData,
}) => {
  const [formData, setFormData] = useState<UserSettings>({ ...settings });
  const [newPair, setNewPair] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleAddPair = () => {
    const clean = newPair.trim().toUpperCase();
    if (clean && !formData.customPairs.includes(clean)) {
      setFormData({
        ...formData,
        customPairs: [...formData.customPairs, clean],
      });
      setNewPair('');
    }
  };

  const handleRemovePair = (pair: string) => {
    setFormData({
      ...formData,
      customPairs: formData.customPairs.filter((p) => p !== pair),
    });
  };

  const handleBackup = () => {
    const jsonStr = tradeRepository.exportBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplyflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const count = await tradeRepository.importBackupJSON(content);
        setImportStatus(`Successfully imported ${count} trades.`);
        await onRefreshData();
        setTimeout(() => setImportStatus(null), 3000);
      } catch (err: any) {
        setImportStatus(`Import failed: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-[#8E95A2] mt-0.5">
          Account preferences, risk defaults, watchlist, and data backup.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile & Account Details */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <User className="h-4 w-4 text-[#A78BFA]" />
            <span>Profile &amp; Risk Defaults</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[#8E95A2] font-semibold uppercase text-[10px] tracking-wider mb-1.5">
                Trader Name
              </label>
              <input
                type="text"
                value={formData.userName}
                onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2 text-white focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8E95A2] font-semibold uppercase text-[10px] tracking-wider mb-1.5">
                Base Account Currency
              </label>
              <select
                value={formData.accountCurrency}
                onChange={(e) => setFormData({ ...formData, accountCurrency: e.target.value })}
                className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2 text-white focus:border-[#8B5CF6] focus:outline-none"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD ($)</option>
                <option value="CAD">CAD ($)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label className="block text-[#8E95A2] font-semibold uppercase text-[10px] tracking-wider mb-1.5">
                Account Size ({formData.accountCurrency})
              </label>
              <input
                type="number"
                value={formData.accountBalance}
                onChange={(e) => setFormData({ ...formData, accountBalance: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2 text-white font-mono-num focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8E95A2] font-semibold uppercase text-[10px] tracking-wider mb-1.5">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.riskPercentage}
                onChange={(e) => setFormData({ ...formData, riskPercentage: Number(e.target.value) || 0 })}
                className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2 text-white font-mono-num focus:border-[#8B5CF6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[#8E95A2] font-semibold uppercase text-[10px] tracking-wider mb-1.5">
                Default Target R:R Ratio
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.defaultTargetRR}
                onChange={(e) => setFormData({ ...formData, defaultTargetRR: Number(e.target.value) || 2.0 })}
                className="w-full rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2 text-white font-mono-num focus:border-[#8B5CF6] focus:outline-none"
              />
              <span className="text-[10px] text-[#525866] mt-1 block">
                Target at least 1:2 for Supply &amp; Demand trades
              </span>
            </div>
          </div>
        </div>

        {/* Watchlist / Pairs Management */}
        <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Layers className="h-4 w-4 text-[#A78BFA]" />
            <span>Watchlist</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.customPairs.map((p) => (
              <div
                key={p}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0E0F14] border border-[#181920] text-xs font-bold text-white"
              >
                <span>{p}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePair(p)}
                  className="text-[#8E95A2] hover:text-[#F87171] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-sm">
            <input
              type="text"
              placeholder="e.g. US500, SOLUSD"
              value={newPair}
              onChange={(e) => setNewPair(e.target.value)}
              className="flex-1 rounded-xl border border-[#181920] bg-[#0E0F14] px-3.5 py-2 text-xs text-white focus:border-[#8B5CF6] focus:outline-none uppercase"
            />
            <button
              type="button"
              onClick={handleAddPair}
              className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white transition-colors cursor-pointer"
            >
              Add Pair
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-[#8B5CF6]/25 transition-all cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </button>
          {savedSuccess && (
            <span className="text-xs text-[#34D399] flex items-center gap-1 font-semibold">
              <Check className="h-4 w-4" /> Settings saved
            </span>
          )}
        </div>
      </form>

      {/* Data Management & Portability Section */}
      <div className="rounded-2xl border border-[#181920] bg-[#0A0B0E] p-5 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Shield className="h-4 w-4 text-[#A78BFA]" />
          <span>Data Backup &amp; Export</span>
        </div>
        <p className="text-xs text-[#8E95A2]">
          Export or back up your trades anytime.
        </p>

        {importStatus && (
          <div className="p-3 rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 text-xs text-[#A78BFA]">
            {importStatus}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* CSV Export */}
          <button
            type="button"
            onClick={() => tradeRepository.exportToCSV()}
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] hover:bg-[#111217] text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="text-xs font-bold text-white block">Export CSV</span>
              <span className="text-[10px] text-[#8E95A2]">Export trades to spreadsheet</span>
            </div>
            <Download className="h-4 w-4 text-[#A78BFA]" />
          </button>

          {/* JSON Backup */}
          <button
            type="button"
            onClick={handleBackup}
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] hover:bg-[#111217] text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="text-xs font-bold text-white block">Full Backup (JSON)</span>
              <span className="text-[10px] text-[#8E95A2]">Includes screenshots and timeframe data</span>
            </div>
            <FileText className="h-4 w-4 text-[#A78BFA]" />
          </button>

          {/* Restore Backup */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] hover:bg-[#111217] text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="text-xs font-bold text-white block">Restore from Backup</span>
              <span className="text-[10px] text-[#8E95A2]">Import a previously exported JSON backup</span>
            </div>
            <Upload className="h-4 w-4 text-[#A78BFA]" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />

          {/* Clear Demo Data */}
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('Clear all demo trades? Real trades you entered will be preserved.')) {
                await tradeRepository.clearDemoData();
                await onRefreshData();
              }
            }}
            className="flex items-center justify-between p-3.5 rounded-xl border border-[#181920] bg-[#0E0F14] hover:bg-[#111217] text-left transition-colors cursor-pointer"
          >
            <div>
              <span className="text-xs font-bold text-white block">Clear Demo Trades</span>
              <span className="text-[10px] text-[#8E95A2]">Remove sample trades</span>
            </div>
            <RotateCcw className="h-4 w-4 text-[#8E95A2]" />
          </button>
        </div>

        {/* Danger Zone: Reset All Data */}
        <div className="pt-4 border-t border-[#181920] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#F87171] block">Reset Journal</span>
            <span className="text-[10px] text-[#8E95A2]">
              Permanently delete all trades and start clean.
            </span>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (window.confirm('WARNING: This will delete ALL trades in your journal. Are you sure?')) {
                await tradeRepository.resetAllData();
                await onRefreshData();
              }
            }}
            className="px-4 py-2 rounded-xl bg-[#F87171]/10 hover:bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30 text-xs font-bold transition-colors cursor-pointer"
          >
            Reset All Data
          </button>
        </div>
      </div>
    </div>
  );
};
