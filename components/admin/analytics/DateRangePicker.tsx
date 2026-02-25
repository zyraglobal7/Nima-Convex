'use client';

import * as React from 'react';
import { CalendarIcon, Lock } from 'lucide-react';
import { format, subDays, startOfMonth, startOfYear, endOfDay, startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
  /** Maximum number of days back this picker should allow. Undefined = unlimited (admin/premium). */
  maxDays?: number;
}

const ALL_PRESETS = [
  {
    label: 'Today',
    value: 'today',
    days: 1,
    getRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 7 days',
    value: '7d',
    days: 7,
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 14 days',
    value: '14d',
    days: 14,
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 13)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    value: '30d',
    days: 30,
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 60 days',
    value: '60d',
    days: 60,
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 59)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 90 days',
    value: '90d',
    days: 90,
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 89)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'This Month',
    value: 'this-month',
    days: 31,
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'This Year',
    value: 'this-year',
    days: 365,
    getRange: () => ({
      from: startOfYear(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Custom Range',
    value: 'custom',
    days: Infinity,
    getRange: () => undefined,
  },
];

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
  maxDays,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Filter presets to those within the tier's allowed window
  const presets = maxDays !== undefined
    ? ALL_PRESETS.filter((p) => p.days <= maxDays)
    : ALL_PRESETS;

  // Default preset: largest allowed one (excluding 'custom')
  const defaultPreset = [...presets].reverse().find((p) => p.value !== 'custom')?.value ?? '30d';
  const [selectedPreset, setSelectedPreset] = React.useState<string>(defaultPreset);

  // Initialize with default range on mount
  React.useEffect(() => {
    if (!dateRange) {
      const preset = presets.find((p) => p.value === defaultPreset);
      if (preset && preset.value !== 'custom') {
        onDateRangeChange(preset.getRange());
      }
    }
  }, []);

  // Earliest allowed date for calendar
  const minDate = maxDays !== undefined
    ? startOfDay(subDays(new Date(), maxDays - 1))
    : undefined;

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const preset = presets.find((p) => p.value === value);
    if (preset && value !== 'custom') {
      onDateRangeChange(preset.getRange());
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    setSelectedPreset('custom');
  };

  const displayValue = React.useMemo(() => {
    if (!dateRange?.from) return 'Select date range';
    if (!dateRange.to) return format(dateRange.from, 'MMM d, yyyy');
    return `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`;
  }, [dateRange]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[260px] justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            disabled={minDate ? { before: minDate } : undefined}
          />
          <div className="border-t p-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Context for sharing date range across analytics pages
interface AnalyticsDateContextType {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  startTimestamp: number;
  endTimestamp: number;
}

const AnalyticsDateContext = React.createContext<AnalyticsDateContextType | undefined>(
  undefined
);

export function AnalyticsDateProvider({ children }: { children: React.ReactNode }) {
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
    return {
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    };
  });

  const startTimestamp = dateRange?.from?.getTime() ?? startOfDay(subDays(new Date(), 29)).getTime();
  const endTimestamp = dateRange?.to?.getTime() ?? endOfDay(new Date()).getTime();

  return (
    <AnalyticsDateContext.Provider
      value={{
        dateRange,
        setDateRange,
        startTimestamp,
        endTimestamp,
      }}
    >
      {children}
    </AnalyticsDateContext.Provider>
  );
}

export function useAnalyticsDate() {
  const context = React.useContext(AnalyticsDateContext);
  if (!context) {
    throw new Error('useAnalyticsDate must be used within AnalyticsDateProvider');
  }
  return context;
}

/** Read-only label shown to Basic sellers who have no date-based analytics */
export function DateRangeLocked({ upgradeHref }: { upgradeHref: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed px-3 py-1.5 text-xs text-muted-foreground">
      <Lock className="h-3 w-3 shrink-0" />
      <span>Date filter — Starter+</span>
      <a href={upgradeHref} className="text-primary hover:underline ml-1 font-medium">
        Upgrade
      </a>
    </div>
  );
}
