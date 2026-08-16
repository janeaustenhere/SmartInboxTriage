import React from 'react';
import { Search, Filter, Layers, Copy, Check, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Priority, Category } from '../types';
import { CATEGORY_LABELS } from '../utils/formatters';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPriority: Priority | 'all';
  onPriorityChange: (p: Priority | 'all') => void;
  selectedCategory: Category | 'all';
  onCategoryChange: (c: Category | 'all') => void;
  viewMode: 'cards' | 'compact';
  onViewModeChange: (m: 'cards' | 'compact') => void;
  onCopyAllUrgent: () => void;
  hasCopiedAll: boolean;
  totalFiltered: number;
  totalMessages: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedPriority,
  onPriorityChange,
  selectedCategory,
  onCategoryChange,
  viewMode,
  onViewModeChange,
  onCopyAllUrgent,
  hasCopiedAll,
  totalFiltered,
  totalMessages
}) => {
  const priorities: { id: Priority | 'all'; label: string; dotColor?: string }[] = [
    { id: 'all', label: 'All Messages' },
    { id: 'critical', label: 'Critical', dotColor: 'bg-red-500' },
    { id: 'high', label: 'High', dotColor: 'bg-orange-500' },
    { id: 'medium', label: 'Medium', dotColor: 'bg-amber-500' },
    { id: 'needs_review', label: 'Needs Review', dotColor: 'bg-purple-500' },
    { id: 'low', label: 'Low', dotColor: 'bg-emerald-500' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by keyword, vehicle, order #, city, or action..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Selector */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[170px]">
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value as Category | 'all')}
              className="w-full appearance-none px-3 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 pr-8"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                <option key={catKey} value={catKey}>
                  {label}
                </option>
              ))}
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onViewModeChange('cards')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('compact')}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                viewMode === 'compact'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Compact
            </button>
          </div>

          {/* Copy All Actionable Drafts */}
          <button
            type="button"
            id="copy-urgent-btn"
            onClick={onCopyAllUrgent}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors whitespace-nowrap"
            title="Copies all Critical and High priority draft replies"
          >
            {hasCopiedAll ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Urgent Drafts Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Urgent Drafts</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Priority Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3 scrollbar-none">
        {priorities.map((p) => {
          const isActive = selectedPriority === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onPriorityChange(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                isActive
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {p.dotColor && <span className={`w-2 h-2 rounded-full ${p.dotColor}`} />}
              <span>{p.label}</span>
            </button>
          );
        })}

        <div className="ml-auto text-xs text-slate-400 pl-2 whitespace-nowrap">
          Showing {totalFiltered} of {totalMessages} messages
        </div>
      </div>
    </div>
  );
};
