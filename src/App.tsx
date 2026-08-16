import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { InputSection } from './components/InputSection';
import { StatsSummary } from './components/StatsSummary';
import { FilterBar } from './components/FilterBar';
import { MessageCard } from './components/MessageCard';
import { HistoryModal } from './components/HistoryModal';
import { SupabaseModal } from './components/SupabaseModal';
import { Footer } from './components/Footer';
import { TriagedMessage, Priority, Category, TriageRun, AnalyzeResponse } from './types';
import { calculateTriageStats, sortMessagesByPriority } from './utils/formatters';
import { AlertCircle, AlertTriangle, CheckCircle2, ArrowLeft, RefreshCw, Layers } from 'lucide-react';

export default function App() {
  const [messages, setMessages] = useState<TriagedMessage[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [rawInput, setRawInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [dbWarning, setDbWarning] = useState<string | null>(null);
  const [hasCopiedAll, setHasCopiedAll] = useState<boolean>(false);

  // Filters & View State
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');

  // Modals & System state
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);
  const [hasSupabase, setHasSupabase] = useState<boolean>(false);

  // Check config on load
  useEffect(() => {
    fetch('/api/config')
      .then(async (res) => {
        if (!res.ok) return null;
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      })
      .then((data) => {
        if (data) {
          setHasSupabase(!!data.hasSupabase);
        }
      })
      .catch((e) => console.warn('Could not fetch config:', e));
  }, []);

  const handleAnalyze = async (raw: string, parsedMessages: string[]) => {
    setIsLoading(true);
    setErrorBanner(null);
    setDbWarning(null);
    setRawInput(raw);

    try {
      const response = await fetch('/api/triage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: parsedMessages,
          raw_input: raw,
        }),
      });

      const responseText = await response.text();
      let data: AnalyzeResponse;
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned non-JSON response (${response.status} ${response.statusText || ''}): ${
            responseText ? responseText.slice(0, 200) : 'No response body'
          }`
        );
      }

      if (!response.ok || data.error) {
        const errorMsg = data.error || 'Failed to triage messages. Please try again.';
        const detailsMsg = (data as any).details ? ` - ${(data as any).details}` : '';
        throw new Error(`${errorMsg}${detailsMsg}`);
      }

      const sorted = sortMessagesByPriority(data.messages);
      setMessages(sorted);
      setActiveRunId(data.run_id);

      if (!data.saved_to_db) {
        setDbWarning(
          'Results generated but could not be saved to Supabase database. (Running in session storage mode)'
        );
      } else {
        setHasSupabase(true);
      }

      // Reset filters to show full triage results
      setSelectedPriority('all');
      setSelectedCategory('all');
      setSearchQuery('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Triage error:', err);
      setErrorBanner(err.message || 'An unexpected error occurred while communicating with Gemini.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadPastRun = async (runId: string) => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/history/${runId}`);
      if (!res.ok) throw new Error('Could not load specified triage run.');
      const text = await res.text();
      const data = JSON.parse(text);
      const sorted = sortMessagesByPriority(data.messages);
      setMessages(sorted);
      setActiveRunId(data.id);
      setRawInput(data.raw_input || '');
      setSelectedPriority('all');
      setSelectedCategory('all');
      setSearchQuery('');
    } catch (e: any) {
      setErrorBanner(e.message || 'Failed to retrieve past run.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDraft = (id: string, newReply: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, user_edited_reply: newReply } : msg))
    );
  };

  const handleResetToInput = () => {
    setMessages([]);
    setActiveRunId(null);
    setErrorBanner(null);
    setDbWarning(null);
  };

  // Filter messages based on search, priority, and category
  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Priority filter
      if (selectedPriority !== 'all' && msg.priority !== selectedPriority) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'all' && msg.category !== selectedCategory) {
        return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesOriginal = msg.original_message.toLowerCase().includes(query);
        const matchesReason = msg.reason.toLowerCase().includes(query);
        const matchesAction = msg.recommended_action.toLowerCase().includes(query);
        const matchesCategory = msg.category.toLowerCase().includes(query);
        const matchesDraft = (msg.user_edited_reply || msg.draft_reply).toLowerCase().includes(query);
        return matchesOriginal || matchesReason || matchesAction || matchesCategory || matchesDraft;
      }
      return true;
    });
  }, [messages, selectedPriority, selectedCategory, searchQuery]);

  const stats = useMemo(() => calculateTriageStats(messages), [messages]);

  const handleCopyAllUrgent = async () => {
    const urgent = messages.filter((m) => m.priority === 'critical' || m.priority === 'high');
    if (urgent.length === 0) return;

    const formatted = urgent
      .map(
        (m, idx) =>
          `[${m.priority.toUpperCase()}] "${m.original_message}"\nSuggested Action: ${m.recommended_action}\nDraft Reply: ${
            m.user_edited_reply || m.draft_reply
          }\n`
      )
      .join('\n---\n\n');

    try {
      await navigator.clipboard.writeText(formatted);
      setHasCopiedAll(true);
      setTimeout(() => setHasCopiedAll(false), 2500);
    } catch (e) {
      console.warn('Failed to copy all urgent drafts:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header Navigation */}
      <Header
        hasSupabase={hasSupabase}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onReset={handleResetToInput}
        hasActiveResults={messages.length > 0}
      />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Banner */}
        {errorBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3 text-red-800 dark:text-red-200">
            <AlertCircle className="w-5 h-5 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1 space-y-1">
              <h4 className="font-semibold text-sm">Triage Analysis Error</h4>
              <p className="text-xs">{errorBanner}</p>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Non-blocking DB Alert */}
        {dbWarning && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-amber-800 dark:text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <span>
                <strong>Note:</strong> {dbWarning}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="font-semibold underline text-amber-900 dark:text-amber-300"
              >
                Configure Supabase
              </button>
              <button
                onClick={() => setDbWarning(null)}
                className="text-amber-600 hover:text-amber-800"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* View Switch: Input Section VS Triaged Results Dashboard */}
        {messages.length === 0 ? (
          <InputSection
            onAnalyze={handleAnalyze}
            isLoading={isLoading}
            initialValue={rawInput}
          />
        ) : (
          <div className="space-y-6">
            {/* Top Back/Reset & Batch Info Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetToInput}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Paste New Batch</span>
                </button>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Morning Triage Plan
                  </h2>
                  <p className="text-xs text-slate-500">
                    {messages.length} messages analyzed • Sorted by operational urgency
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  Past Batches
                </button>
              </div>
            </div>

            {/* Top Summary Metric Cards */}
            <StatsSummary
              stats={stats}
              selectedPriority={selectedPriority}
              onSelectPriority={setSelectedPriority}
            />

            {/* Filter and View Mode Controls */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedPriority={selectedPriority}
              onPriorityChange={setSelectedPriority}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onCopyAllUrgent={handleCopyAllUrgent}
              hasCopiedAll={hasCopiedAll}
              totalFiltered={filteredMessages.length}
              totalMessages={messages.length}
            />

            {/* Triaged Messages List */}
            {filteredMessages.length === 0 ? (
              <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No messages match active filters
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Try clearing search keywords or switching priority and category filters.
                </p>
                <button
                  onClick={() => {
                    setSelectedPriority('all');
                    setSelectedCategory('all');
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg hover:bg-indigo-100"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className={viewMode === 'cards' ? 'space-y-4' : 'space-y-2.5'}>
                {filteredMessages.map((msg, index) => (
                  <MessageCard
                    key={msg.id || `${index}-${msg.original_message.slice(0, 15)}`}
                    message={msg}
                    index={index}
                    onUpdateDraft={handleUpdateDraft}
                    compact={viewMode === 'compact'}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Disclaimer & Info */}
      <Footer />

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectRun={handleLoadPastRun}
      />

      {/* Supabase Persistence Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        hasSupabase={hasSupabase}
      />
    </div>
  );
}
