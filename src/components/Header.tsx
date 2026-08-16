import React from 'react';
import { Truck, Sparkles, Database, History, HelpCircle, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  hasSupabase: boolean;
  onOpenHistory: () => void;
  onOpenSupabaseModal: () => void;
  onReset: () => void;
  hasActiveResults: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  hasSupabase,
  onOpenHistory,
  onOpenSupabaseModal,
  onReset,
  hasActiveResults
}) => {
  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Persona */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={onReset}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                Smart Inbox Triage
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Gemini 3.7
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Operations Hub for Logistics • Riya's Desk
            </p>
          </div>
        </div>

        {/* Right action tools */}
        <div className="flex items-center gap-2 sm:gap-3">
          {hasActiveResults && (
            <button
              id="header-new-batch-btn"
              onClick={onReset}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            >
              + New Batch
            </button>
          )}

          <button
            id="header-history-btn"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="View recent triage history"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Recent Runs</span>
          </button>

          <button
            id="header-supabase-btn"
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
              hasSupabase
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
            title="Supabase Database Connection Status & Setup"
          >
            <Database className="w-3.5 h-3.5 text-current" />
            <span className="hidden md:inline">Supabase</span>
            <span
              className={`w-2 h-2 rounded-full ${
                hasSupabase ? 'bg-emerald-500 ring-2 ring-emerald-300' : 'bg-slate-400'
              }`}
            />
          </button>
        </div>
      </div>
    </header>
  );
};
