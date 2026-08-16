import React from 'react';
import { AlertOctagon, Clock, CheckCircle, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { TriageStats, Priority } from '../types';

interface StatsSummaryProps {
  stats: TriageStats;
  selectedPriority: Priority | 'all';
  onSelectPriority: (p: Priority | 'all') => void;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({
  stats,
  selectedPriority,
  onSelectPriority,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto mb-6">
      {/* 3 Core Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {/* Action Now */}
        <button
          type="button"
          onClick={() => onSelectPriority(selectedPriority === 'critical' ? 'all' : 'critical')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
            selectedPriority === 'critical' || selectedPriority === 'high'
              ? 'ring-2 ring-red-500 bg-red-50/90 dark:bg-red-950/40 border-red-300 dark:border-red-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-200 dark:hover:border-red-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                  Urgent Risk
                </span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Action now
                </h3>
              </div>
            </div>
            <span className="text-3xl font-extrabold text-red-600 dark:text-red-400 font-mono tracking-tight">
              {stats.action_now}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-300 bg-red-100/60 dark:bg-red-950/60 px-1.5 py-0.5 rounded">
              {stats.critical} Critical
            </span>
            <span>+</span>
            <span className="inline-flex items-center gap-1 font-medium text-orange-700 dark:text-orange-300 bg-orange-100/60 dark:bg-orange-950/60 px-1.5 py-0.5 rounded">
              {stats.high} High
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Breakdowns, delays & blocker escalations</p>
        </button>

        {/* Review Today */}
        <button
          type="button"
          onClick={() => onSelectPriority(selectedPriority === 'medium' ? 'all' : 'medium')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
            selectedPriority === 'medium' || selectedPriority === 'needs_review'
              ? 'ring-2 ring-amber-500 bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Follow-ups
                </span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Review today
                </h3>
              </div>
            </div>
            <span className="text-3xl font-extrabold text-amber-600 dark:text-amber-400 font-mono tracking-tight">
              {stats.review_today}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-medium text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">
              {stats.medium} Medium
            </span>
            <span>+</span>
            <span className="inline-flex items-center gap-1 font-medium text-purple-700 dark:text-purple-300 bg-purple-100/60 dark:bg-purple-950/60 px-1.5 py-0.5 rounded">
              {stats.needs_review} Needs Review
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Non-critical actions & ambiguous items</p>
        </button>

        {/* Can Wait */}
        <button
          type="button"
          onClick={() => onSelectPriority(selectedPriority === 'low' ? 'all' : 'low')}
          className={`text-left p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
            selectedPriority === 'low'
              ? 'ring-2 ring-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-900 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Routine
                </span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Can wait
                </h3>
              </div>
            </div>
            <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono tracking-tight">
              {stats.can_wait}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
              {stats.low} Low Priority
            </span>
            <span className="text-slate-400">({Math.round((stats.can_wait / (stats.total || 1)) * 100)}% of inbox)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Delivery confirmations & status receipts</p>
        </button>
      </div>
    </div>
  );
};
