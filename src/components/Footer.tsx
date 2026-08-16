import React from 'react';
import { ShieldCheck, Sparkles, Terminal } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Human-in-the-loop: AI suggestions should be reviewed before action is taken.
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span>Built for Riya • Logistics Ops</span>
          <span>•</span>
          <span>Powered by Gemini 3.7 & Supabase</span>
        </div>
      </div>
    </footer>
  );
};
