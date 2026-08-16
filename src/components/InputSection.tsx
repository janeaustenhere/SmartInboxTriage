import React, { useState, useId } from 'react';
import { Sparkles, Trash2, ArrowRight, AlertCircle, RefreshCw, FileText, CheckCircle2, ChevronDown } from 'lucide-react';
import { SAMPLE_BATCHES, SAMPLE_LOGISTICS_MESSAGES } from '../data/sampleData';
import { parseRawInput } from '../utils/formatters';

interface InputSectionProps {
  onAnalyze: (rawInput: string, messages: string[]) => Promise<void>;
  isLoading: boolean;
  initialValue?: string;
}

export const InputSection: React.FC<InputSectionProps> = ({
  onAnalyze,
  isLoading,
  initialValue = ''
}) => {
  const [inputText, setInputText] = useState(initialValue);
  const [clientErrors, setClientErrors] = useState<string[]>([]);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState<number>(0);
  const [showBatchDropdown, setShowBatchDropdown] = useState<boolean>(false);
  const textareaId = useId();

  // Compute live counts
  const lines = inputText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const charCount = inputText.length;
  const lineCount = lines.length;

  const handlePopulateSample = (messagesToUse = SAMPLE_LOGISTICS_MESSAGES) => {
    const text = messagesToUse.join('\n');
    setInputText(text);
    setClientErrors([]);
    setShowBatchDropdown(false);
  };

  const handleClear = () => {
    setInputText('');
    setClientErrors([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { messages, errors } = parseRawInput(inputText);

    if (errors.length > 0) {
      setClientErrors(errors);
      return;
    }

    setClientErrors([]);
    onAnalyze(inputText, messages);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Title & Subtitle */}
      <div className="text-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2.5">
          Smart Inbox Triage
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          Turn a morning of unread logistics messages into an action plan.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 relative">
        <form onSubmit={handleSubmit}>
          {/* Textarea Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <label
                htmlFor={textareaId}
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Paste today’s messages
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Paste one message per line. Maximum 80 messages.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 relative">
              <div className="relative">
                <button
                  type="button"
                  id="sample-data-btn"
                  onClick={() => handlePopulateSample(SAMPLE_BATCHES[selectedBatchIndex].messages)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Fill Sample Data</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBatchDropdown(!showBatchDropdown)}
                  className="inline-flex items-center px-1.5 py-1.5 text-xs font-semibold rounded-r-lg -ml-1 border-l border-indigo-200 dark:border-indigo-800 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300"
                  aria-label="Choose sample preset"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showBatchDropdown && (
                  <div className="absolute right-0 mt-1 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-20">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Sample Presets
                    </div>
                    {SAMPLE_BATCHES.map((b, idx) => (
                      <button
                        key={b.name}
                        type="button"
                        onClick={() => {
                          setSelectedBatchIndex(idx);
                          handlePopulateSample(b.messages);
                        }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 dark:hover:bg-slate-700/50 flex flex-col gap-0.5 text-slate-700 dark:text-slate-200"
                      >
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{b.name}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{b.description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {inputText.length > 0 && (
                <button
                  type="button"
                  id="clear-input-btn"
                  onClick={handleClear}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Textarea Field */}
          <div className="relative">
            <textarea
              id={textareaId}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                if (clientErrors.length > 0) setClientErrors([]);
              }}
              rows={8}
              placeholder={`Example:\nTruck MH04 AB1234 has broken down near Pune. Today’s 11 AM delivery is pending.\nDelivery completed for order #8292.\nVendor has not delivered packaging material needed for today’s dispatch.\nCustomer says shipment #9921 is three days late and wants an urgent update.`}
              disabled={isLoading}
              className={`w-full rounded-xl p-4 text-sm font-mono leading-relaxed bg-slate-50 dark:bg-slate-950/60 border text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-none focus:ring-2 transition-all resize-y min-h-[220px] ${
                clientErrors.length > 0
                  ? 'border-red-400 focus:ring-red-400/30'
                  : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
              }`}
            />
          </div>

          {/* Live Meta Counters */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
            <div className="flex items-center gap-3">
              <span className={`font-medium ${lineCount > 80 ? 'text-red-600 font-bold' : ''}`}>
                {lineCount} / 80 messages
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className={`${charCount > 12000 ? 'text-red-600 font-bold' : ''}`}>
                {charCount.toLocaleString()} / 12,000 characters
              </span>
            </div>
            {lineCount > 0 && lineCount <= 80 && charCount <= 12000 && (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to triage
              </span>
            )}
          </div>

          {/* Validation Errors Box */}
          {clientErrors.length > 0 && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 flex items-start gap-2.5 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
              <div className="space-y-1">
                {clientErrors.map((err, i) => (
                  <p key={i} className="font-medium">
                    {err}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Submit CTA Button */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ⚡ Analyzes priority, operational risk, suggested actions & editable replies in one shot.
            </div>

            <button
              type="submit"
              id="analyse-messages-btn"
              disabled={isLoading || lineCount === 0}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm shadow-md transition-all ${
                isLoading
                  ? 'bg-indigo-400 text-white cursor-wait'
                  : lineCount === 0
                  ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-indigo-500/25 active:scale-[0.98]'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Triaging with Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyse messages</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
