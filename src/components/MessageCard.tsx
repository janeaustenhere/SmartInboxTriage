import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCcw,
  AlertOctagon,
  AlertTriangle,
  Clock,
  HelpCircle,
  CheckCircle2,
  Tag,
  ArrowRight,
  Info,
  Sparkles,
  MessageSquareQuote
} from 'lucide-react';
import { TriagedMessage, Priority } from '../types';
import { PRIORITY_CONFIG, CATEGORY_LABELS } from '../utils/formatters';

interface MessageCardProps {
  message: TriagedMessage;
  index: number;
  onUpdateDraft: (id: string, newReply: string) => void;
  compact?: boolean;
}

export const MessageCard: React.FC<MessageCardProps> = ({
  message,
  index,
  onUpdateDraft,
  compact = false
}) => {
  const [copied, setCopied] = useState(false);
  const [replyText, setReplyText] = useState(
    message.user_edited_reply !== undefined ? message.user_edited_reply : message.draft_reply
  );

  const config = PRIORITY_CONFIG[message.priority] || PRIORITY_CONFIG.needs_review;
  const isCritical = message.priority === 'critical';
  const isHigh = message.priority === 'high';
  const isEdited = replyText !== message.draft_reply;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(replyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Clipboard write failed:', e);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyText(val);
    if (message.id) {
      onUpdateDraft(message.id, val);
    }
  };

  const handleResetDraft = () => {
    setReplyText(message.draft_reply);
    if (message.id) {
      onUpdateDraft(message.id, message.draft_reply);
    }
  };

  const getPriorityIcon = (p: Priority) => {
    switch (p) {
      case 'critical':
        return <AlertOctagon className="w-3.5 h-3.5" />;
      case 'high':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'medium':
        return <Clock className="w-3.5 h-3.5" />;
      case 'needs_review':
        return <HelpCircle className="w-3.5 h-3.5" />;
      case 'low':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
    }
  };

  if (compact) {
    return (
      <div
        className={`rounded-xl border p-3.5 transition-all bg-white dark:bg-slate-900 ${
          isCritical
            ? 'border-red-300 dark:border-red-800/80 ring-1 ring-red-400/20'
            : isHigh
            ? 'border-orange-300 dark:border-orange-800/70'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${config.badgeBg}`}
              >
                {getPriorityIcon(message.priority)}
                {config.label}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {CATEGORY_LABELS[message.category] || message.category}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {Math.round(message.confidence * 100)}% conf
              </span>
            </div>

            <p className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
              "{message.original_message}"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="font-semibold text-slate-500 dark:text-slate-400">Why it matters: </span>
                <span className="text-slate-700 dark:text-slate-300">{message.reason}</span>
              </div>
              <div>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">Action: </span>
                <span className="text-slate-700 dark:text-slate-300">{message.recommended_action}</span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-1.5 pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500">Draft reply</span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <textarea
              value={replyText}
              onChange={handleTextChange}
              rows={2}
              className="w-full text-xs p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden ${
        config.cardBg
      } ${config.cardBorder} ${config.accentGlow} relative`}
    >
      {/* Top Banner for Critical & High Items */}
      {isCritical && (
        <div className="bg-red-600 text-white text-xs font-bold px-4 py-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>CRITICAL LOGISTICS ESCALATION — IMMEDIATE ACTION REQUIRED</span>
          </div>
          <span className="text-[11px] font-mono opacity-90">Priority Rank #1</span>
        </div>
      )}
      {isHigh && (
        <div className="bg-orange-600 text-white text-xs font-semibold px-4 py-0.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>HIGH PRIORITY DELAY / VENDOR BLOCKER</span>
          </div>
          <span className="text-[11px] font-mono opacity-90">Priority Rank #2</span>
        </div>
      )}

      <div className="p-5 sm:p-6 space-y-4">
        {/* Header Row: Badges, Category, Confidence */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-xs ${config.badgeBg}`}
            >
              {getPriorityIcon(message.priority)}
              <span>{config.label}</span>
            </span>

            {/* Category Badge */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-xs">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>{CATEGORY_LABELS[message.category] || message.category}</span>
            </span>

            {/* Confidence */}
            <span className="text-[11px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-100/80 dark:bg-slate-800/80">
              AI Confidence {Math.round(message.confidence * 100)}%
            </span>
          </div>

          <span className="text-xs text-slate-400 font-mono">Message #{index + 1}</span>
        </div>

        {/* Original Message Box */}
        <div className="rounded-xl p-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start gap-2.5">
            <MessageSquareQuote className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Original Incoming Message
              </div>
              <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                {message.original_message}
              </p>
            </div>
          </div>
        </div>

        {/* Dual Insight Columns: Why it matters & Suggested Action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Why it matters */}
          <div className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Why it matters</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-normal">
              {message.reason}
            </p>
          </div>

          {/* Suggested next action */}
          <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300">
              <ArrowRight className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Suggested next action</span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 font-medium leading-normal">
              {message.recommended_action}
            </p>
          </div>
        </div>

        {/* Missing Information Callout (if any) */}
        {message.missing_information && message.missing_information.length > 0 && (
          <div className="p-3 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-start gap-2 text-xs text-purple-800 dark:text-purple-300">
            <HelpCircle className="w-3.5 h-3.5 mt-0.5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <span className="font-semibold">Missing info to request: </span>
              {message.missing_information.join(' • ')}
            </div>
          </div>
        )}

        {/* Editable Draft Reply Section */}
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                Draft reply (Editable)
              </span>
              {isEdited && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
                  Edited
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isEdited && (
                <button
                  type="button"
                  onClick={handleResetDraft}
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Reset to AI generated draft"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}

              <button
                type="button"
                id={`copy-reply-btn-${index}`}
                onClick={handleCopy}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl shadow-xs transition-all ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy reply</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <textarea
            value={replyText}
            onChange={handleTextChange}
            rows={2}
            className="w-full text-xs sm:text-sm p-3 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
            placeholder="Edit draft reply before copying to WhatsApp or email..."
          />
        </div>
      </div>
    </div>
  );
};
