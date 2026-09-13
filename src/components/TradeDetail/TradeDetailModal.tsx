import React, { useState } from 'react';
import { TradeRecord, Timeframe } from '../../types';
import { calculateTimeframeAlignment } from '../../utils/calculations';
import {
  X,
  Edit2,
  Copy,
  Trash2,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Maximize2,
  Check,
} from 'lucide-react';

interface TradeDetailModalProps {
  trade: TradeRecord;
  onClose: () => void;
  onEdit: (trade: TradeRecord) => void;
  onDuplicate: (tradeId: string) => void;
  onDelete: (tradeId: string) => void;
}

const TIMEFRAMES: Timeframe[] = ['Weekly', 'Daily', '4H', '1H', '15M', '5M', '1M'];

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const alignment = calculateTimeframeAlignment(trade);
  const isProfit = trade.actualR > 0;
  const isLoss = trade.actualR < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[#181920] bg-[#0A0B0E] shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="sticky top-0 z-20 border-b border-[#181920] bg-[#0D0E12] px-6 py-4 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">{trade.pair}</span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                  trade.direction === 'BUY'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                {trade.direction}
              </span>
            </div>

            <div
              className={`font-mono-num font-bold text-sm px-2.5 py-1 rounded-md border ${
                isProfit
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : isLoss
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-[#181920] text-gray-300 border-[#272932]'
              }`}
            >
              {trade.actualR > 0 ? `+${trade.actualR.toFixed(2)}R ✓` : trade.actualR < 0 ? `${trade.actualR.toFixed(2)}R ✕` : `0.00R`}
              {trade.pnl !== undefined && trade.pnl !== 0 && (
                <span className="ml-2 text-xs font-normal opacity-80 border-l border-current pl-2">
                  {trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)} {trade.currency || 'USD'}
                </span>
              )}
            </div>

            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
              trade.result === 'TP HIT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              trade.result === 'SL HIT' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              trade.result === 'BREAKEVEN' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              'bg-[#8B5CF6]/10 text-[#A78BFA] border-[#8B5CF6]/20'
            }`}>
              {trade.result}
            </span>

            {trade.setupGrade && (
              <span className="text-xs font-mono-num font-bold px-2 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30">
                Grade {trade.setupGrade}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onDuplicate(trade.id)}
              className="p-2 rounded-lg text-[#8E95A2] hover:text-white hover:bg-[#15161E] transition-colors"
              title="Duplicate Setup"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={() => onEdit(trade)}
              className="p-2 rounded-lg text-[#8E95A2] hover:text-white hover:bg-[#15161E] transition-colors"
              title="Edit Trade"
            >
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-2 rounded-lg text-[#8E95A2] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete Trade"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <div className="h-4 w-[1px] bg-[#181920] mx-1" />
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-[#8E95A2] hover:text-white hover:bg-[#15161E] transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showConfirmDelete && (
          <div className="border-b border-rose-500/30 bg-rose-500/10 px-6 py-3 flex items-center justify-between text-xs text-rose-300">
            <span>Are you sure you want to permanently delete this trade record?</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="px-2.5 py-1 rounded bg-[#0E0F14] text-[#CBD5E1] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(trade.id);
                  onClose();
                }}
                className="px-2.5 py-1 rounded bg-rose-600 text-white font-bold hover:bg-rose-500"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        )}

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Parameters Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-7 gap-3 p-4 rounded-xl border border-[#181920] bg-[#0E0F14] text-xs">
            <div>
              <span className="text-[#8E95A2] block text-[10px] uppercase font-medium">Session</span>
              <span className="font-bold text-white mt-0.5 block">{trade.session}</span>
            </div>
            <div>
              <span className="text-[#8E95A2] block text-[10px] uppercase font-medium">Date &amp; Time</span>
              <span className="font-mono-num text-white mt-0.5 block">
                {trade.tradeDate} {trade.tradeTime}
              </span>
            </div>
            <div>
              <span className="text-[#8E95A2] block text-[10px] uppercase font-medium">Entry</span>
              <span className="font-mono-num font-bold text-white mt-0.5 block">
                {trade.entryPrice || '—'}
              </span>
            </div>
            <div>
              <span className="text-[#8E95A2] block text-[10px] uppercase font-medium">Stop Loss</span>
              <span className="font-mono-num font-bold text-rose-300 mt-0.5 block">
                {trade.stopLoss || '—'}
              </span>
            </div>
            <div>
              <span className="text-[#8E95A2] block text-[10px] uppercase font-medium">Take Profit</span>
              <span className="font-mono-num font-bold text-emerald-300 mt-0.5 block">
                {trade.takeProfit || '—'}
              </span>
            </div>
            <div>
              <span className="text-[#8E95A2] block text-[10px] uppercase font-medium">
                {trade.resolutionSource === 'AUTO_MARKET_DATA' ? 'Detected Exit' : 'Exit'}
              </span>
              <span className="font-mono-num font-bold text-[#CBD5E1] mt-0.5 block">
                {trade.exitPrice || '—'}
              </span>
              {trade.resolutionSource === 'AUTO_MARKET_DATA' && (
                <span className="text-[#A78BFA] block text-[9px] mt-0.5">Source: Twelve Data</span>
              )}
            </div>
            <div>
              <span className="text-[#8E95A2] block text-[10px] uppercase font-medium">Planned R:R</span>
              <span className="font-mono-num font-bold text-[#A78BFA] mt-0.5 block">
                1:{trade.plannedRR?.toFixed(2) || '2.0'}
              </span>
            </div>
          </div>

          {/* Screenshot Previews */}
          {(trade.beforeScreenshot || trade.afterScreenshot) && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2]">
                Screenshots
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trade.beforeScreenshot && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#A78BFA] font-medium">Before Entry</span>
                    <div
                      onClick={() => setSelectedImage(trade.beforeScreenshot!)}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-[#181920] bg-[#0E0F14] cursor-pointer"
                    >
                      <img
                        src={trade.beforeScreenshot}
                        alt="Before Trade"
                        className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="h-6 w-6 text-white drop-shadow" />
                      </div>
                    </div>
                  </div>
                )}
                {trade.afterScreenshot && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-[#8E95A2] font-medium">After Exit</span>
                    <div
                      onClick={() => setSelectedImage(trade.afterScreenshot!)}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-[#181920] bg-[#0E0F14] cursor-pointer"
                    >
                      <img
                        src={trade.afterScreenshot}
                        alt="After Trade"
                        className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="h-6 w-6 text-white drop-shadow" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top-Down Multi-Timeframe Alignment */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2]">
                Multi-Timeframe Structure
              </span>
              <span className="text-xs font-mono-num font-bold text-[#A78BFA]">
                {alignment.ratio} Aligned ({trade.direction})
              </span>
            </div>

            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] overflow-hidden divide-y divide-[#181920]">
              <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-semibold text-[#8E95A2] uppercase tracking-wider bg-[#0D0E12]">
                <span>Timeframe</span>
                <span>Bias</span>
                <span>Zone</span>
                <span>Quality</span>
              </div>
              {TIMEFRAMES.map((tf) => {
                const tfData = trade.timeframeData?.[tf];
                const bias = tfData?.bias || 'NEUTRAL';
                const zone = tfData?.zone || 'NONE';
                const targetBias = trade.direction === 'BUY' ? 'BULLISH' : 'BEARISH';
                const isAligned = bias === targetBias;

                return (
                  <div key={tf} className="grid grid-cols-4 px-4 py-2.5 text-xs items-center">
                    <span className="font-mono-num font-bold text-white">{tf}</span>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          bias === 'BULLISH'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : bias === 'BEARISH'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-[#181920] text-gray-400'
                        }`}
                      >
                        {bias}
                      </span>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          zone === 'DEMAND'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : zone === 'SUPPLY'
                            ? 'bg-rose-500/10 text-rose-300'
                            : 'text-[#525866]'
                        }`}
                      >
                        {zone}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8E95A2]">
                      {trade.zoneQuality || '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Confluences & Reference Levels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Liquidity / Reference Levels */}
            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
                Key Levels
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-[#181920]">
                  <span className="text-[#CBD5E1]">Previous Day High</span>
                  <span className={trade.previousDayHOD ? 'text-emerald-400 font-bold' : 'text-[#525866]'}>
                    {trade.previousDayHOD ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#181920]">
                  <span className="text-[#CBD5E1]">Previous Day Low</span>
                  <span className={trade.previousDayLOD ? 'text-emerald-400 font-bold' : 'text-[#525866]'}>
                    {trade.previousDayLOD ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#181920]">
                  <span className="text-[#CBD5E1]">2-Day High</span>
                  <span className={trade.twoDayHOD ? 'text-emerald-400 font-bold' : 'text-[#525866]'}>
                    {trade.twoDayHOD ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-[#181920]">
                  <span className="text-[#CBD5E1]">2-Day Low</span>
                  <span className={trade.twoDayLOD ? 'text-emerald-400 font-bold' : 'text-[#525866]'}>
                    {trade.twoDayLOD ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#CBD5E1]">Key Level Reaction</span>
                  <span className={trade.reactingAroundKeyLevel ? 'text-emerald-400 font-bold' : 'text-[#525866]'}>
                    {trade.reactingAroundKeyLevel ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation & Structure */}
            <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 space-y-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
                Confirmations
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {trade.structureConfirmation && (
                  <span className="px-2 py-1 rounded bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20 text-xs">
                    Structure Confirmation
                  </span>
                )}
                {trade.bos && (
                  <span className="px-2 py-1 rounded bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20 text-xs">
                    BOS
                  </span>
                )}
                {trade.choch && (
                  <span className="px-2 py-1 rounded bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20 text-xs">
                    CHoCH
                  </span>
                )}
                {trade.priceActionConfirmation && (
                  <span className="px-2 py-1 rounded bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20 text-xs">
                    Price Action
                  </span>
                )}
                {trade.candleConfirmation && (
                  <span className="px-2 py-1 rounded bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20 text-xs">
                    Candle Confirmation
                  </span>
                )}
              </div>
              {trade.setupNotes && (
                <div className="pt-2 border-t border-[#181920]">
                  <span className="text-[10px] uppercase text-[#8E95A2] block">Trade Notes</span>
                  <p className="text-xs text-[#E1E4EA] mt-1 leading-relaxed">{trade.setupNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Execution & Discipline */}
          <div className="rounded-xl border border-[#181920] bg-[#0E0F14] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8E95A2]">
                Plan &amp; Execution
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded ${
                  trade.followedPlan
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                }`}
              >
                {trade.followedPlan ? 'Plan Followed' : 'Rule Break'}
              </span>
            </div>

            {trade.mistakes && trade.mistakes.length > 0 && (
              <div>
                <span className="text-[10px] uppercase text-rose-400 block mb-1">Mistakes &amp; Rule Breaks</span>
                <div className="flex flex-wrap gap-1.5">
                  {trade.mistakes.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {trade.lesson && (
              <div className="pt-2 border-t border-[#181920]">
                <span className="text-[10px] uppercase text-[#8E95A2] block">Notes &amp; Takeaways</span>
                <p className="text-xs text-white mt-1 italic leading-relaxed">"{trade.lesson}"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Image Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img src={selectedImage} alt="Fullscreen chart" className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-[#A78BFA] font-bold text-sm flex items-center gap-1 cursor-pointer"
            >
              <X className="h-5 w-5" /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
