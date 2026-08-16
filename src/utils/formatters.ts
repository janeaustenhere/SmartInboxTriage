import { Priority, Category, TriagedMessage, TriageStats } from '../types';

export const PRIORITY_CONFIG: Record<
  Priority,
  {
    label: string;
    rank: number;
    bgClass: string;
    textClass: string;
    borderClass: string;
    badgeBg: string;
    cardBg: string;
    cardBorder: string;
    accentGlow: string;
    description: string;
  }
> = {
  critical: {
    label: 'Critical',
    rank: 1,
    bgClass: 'bg-red-500/10 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    textClass: 'text-red-700 dark:text-red-400',
    borderClass: 'border-red-500/30',
    badgeBg: 'bg-red-600 text-white',
    cardBg: 'bg-red-50/70 dark:bg-red-950/20',
    cardBorder: 'border-red-300 dark:border-red-800/80 ring-1 ring-red-400/20',
    accentGlow: 'shadow-sm shadow-red-500/10',
    description: 'Vehicle breakdown, safety incident, stranded shipment, major escalation'
  },
  high: {
    label: 'High',
    rank: 2,
    bgClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
    textClass: 'text-orange-700 dark:text-orange-400',
    borderClass: 'border-orange-500/30',
    badgeBg: 'bg-orange-600 text-white',
    cardBg: 'bg-orange-50/50 dark:bg-orange-950/15',
    cardBorder: 'border-orange-300 dark:border-orange-800/70',
    accentGlow: 'shadow-sm shadow-orange-500/10',
    description: 'Delivery delay, vendor blocker, urgent customer complaint'
  },
  medium: {
    label: 'Medium',
    rank: 3,
    bgClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    textClass: 'text-amber-700 dark:text-amber-400',
    borderClass: 'border-amber-500/30',
    badgeBg: 'bg-amber-500 text-slate-900 font-semibold',
    cardBg: 'bg-amber-50/30 dark:bg-amber-950/10',
    cardBorder: 'border-amber-200 dark:border-amber-800/50',
    accentGlow: 'shadow-sm shadow-amber-500/10',
    description: 'Non-critical issue requiring follow-up today'
  },
  needs_review: {
    label: 'Needs Review',
    rank: 4,
    bgClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    textClass: 'text-purple-700 dark:text-purple-400',
    borderClass: 'border-purple-500/30',
    badgeBg: 'bg-purple-600 text-white',
    cardBg: 'bg-purple-50/30 dark:bg-purple-950/10',
    cardBorder: 'border-purple-200 dark:border-purple-800/50',
    accentGlow: 'shadow-sm shadow-purple-500/10',
    description: 'Ambiguous or incomplete message needing human confirmation'
  },
  low: {
    label: 'Low',
    rank: 5,
    bgClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    borderClass: 'border-emerald-500/30',
    badgeBg: 'bg-emerald-600 text-white',
    cardBg: 'bg-slate-50/50 dark:bg-slate-900/30',
    cardBorder: 'border-slate-200 dark:border-slate-800',
    accentGlow: '',
    description: 'Delivery confirmation, routine status, or acknowledgement'
  }
};

export const CATEGORY_LABELS: Record<Category | string, string> = {
  vehicle_breakdown: 'Vehicle Breakdown',
  delivery_delay: 'Delivery Delay',
  pickup_issue: 'Pickup Issue',
  vendor_issue: 'Vendor Issue',
  customer_escalation: 'Customer Escalation',
  delivery_confirmation: 'Delivery Confirmation',
  routine_update: 'Routine Update',
  other: 'Other Logistics'
};

export function calculateTriageStats(messages: TriagedMessage[]): TriageStats {
  const counts: Record<Priority, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    needs_review: 0,
    low: 0,
  };

  for (const msg of messages) {
    if (counts[msg.priority] !== undefined) {
      counts[msg.priority]++;
    } else {
      counts.needs_review++;
    }
  }

  return {
    action_now: counts.critical + counts.high,
    review_today: counts.medium + counts.needs_review,
    can_wait: counts.low,
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    needs_review: counts.needs_review,
    low: counts.low,
    total: messages.length,
  };
}

export function sortMessagesByPriority(messages: TriagedMessage[]): TriagedMessage[] {
  return [...messages].sort((a, b) => {
    const rankA = PRIORITY_CONFIG[a.priority]?.rank ?? 99;
    const rankB = PRIORITY_CONFIG[b.priority]?.rank ?? 99;
    return rankA - rankB;
  });
}

export function parseRawInput(raw: string): { messages: string[]; errors: string[] } {
  const errors: string[] = [];
  const trimmed = raw.trim();

  if (!trimmed) {
    errors.push('Please enter or paste at least one logistics message.');
    return { messages: [], errors };
  }

  if (raw.length > 12000) {
    errors.push(`Character limit exceeded (${raw.length.toLocaleString()} / 12,000 max characters).`);
  }

  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    errors.push('Input cannot contain only empty whitespace. Please provide meaningful messages.');
  } else if (lines.length > 80) {
    errors.push(`Message limit exceeded (${lines.length} messages found. Maximum allowed is 80 messages per batch).`);
  }

  return { messages: lines, errors };
}
