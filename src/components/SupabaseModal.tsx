import React, { useState } from 'react';
import { X, Database, Check, Copy, AlertCircle, CheckCircle2, Terminal } from 'lucide-react';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasSupabase: boolean;
}

export const SUPABASE_SQL_SCHEMA = `-- 1. Create triage_runs table
CREATE TABLE IF NOT EXISTS public.triage_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_input TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Create triaged_messages table
CREATE TABLE IF NOT EXISTS public.triaged_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.triage_runs(id) ON DELETE CASCADE,
  original_message TEXT NOT NULL,
  priority TEXT NOT NULL,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  draft_reply TEXT NOT NULL,
  confidence NUMERIC DEFAULT 0.85,
  missing_information JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 3. Enable RLS (Row Level Security) with public read/write for MVP hackathon
ALTER TABLE public.triage_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triaged_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on triage_runs" 
  ON public.triage_runs FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on triage_runs" 
  ON public.triage_runs FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read access on triaged_messages" 
  ON public.triaged_messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on triaged_messages" 
  ON public.triaged_messages FOR INSERT WITH CHECK (true);

-- 4. Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_triaged_messages_run_id ON public.triaged_messages(run_id);
`;

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  hasSupabase,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Supabase Persistence Setup</h3>
              <p className="text-xs text-slate-500">Database schema & environment variable instructions</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* Status banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 ${
              hasSupabase
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
            }`}
          >
            {hasSupabase ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="font-semibold text-sm">
                {hasSupabase ? 'Supabase is Connected' : 'Supabase is Not Configured in Environment'}
              </p>
              <p className="text-xs opacity-90 leading-relaxed">
                {hasSupabase
                  ? 'All triage runs and classified messages will be automatically saved to your triage_runs and triaged_messages tables.'
                  : 'The app is currently running in zero-friction Hackathon Mode with session memory fallback. To enable permanent cloud storage, set SUPABASE_URL and SUPABASE_KEY in your environment variables.'}
              </p>
            </div>
          </div>

          {/* Setup steps */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>1. Environment Variables</span>
            </h4>
            <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-1 overflow-x-auto">
              <p className="text-slate-400"># In your .env or platform secrets:</p>
              <p>SUPABASE_URL="https://your-project.supabase.co"</p>
              <p>SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-indigo-500" />
                <span>2. Supabase SQL Migration (Copy & paste into Supabase SQL Editor)</span>
              </h4>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'SQL Copied!' : 'Copy SQL'}</span>
              </button>
            </div>

            <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-[11px] font-mono leading-relaxed overflow-x-auto max-h-56 border border-slate-800">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold text-xs hover:opacity-90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
