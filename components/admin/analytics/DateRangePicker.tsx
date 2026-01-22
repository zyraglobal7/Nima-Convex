'use client';

import * as React from 'react';
import { CalendarIcon } from 'lucide-react';
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
}

const presets = [
  {
    label: 'Today',
    value: 'today',
    getRange: () => ({
      from: startOfDay(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 7 days',
    value: '7d',
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 6)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 14 days',
    value: '14d',
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 13)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Last 30 days',
    value: '30d',
    getRange: () => ({
      from: startOfDay(subDays(new Date(), 29)),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'This Month',
    value: 'this-month',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'This Year',
    value: 'this-year',
    getRange: () => ({
      from: startOfYear(new Date()),
      to: endOfDay(new Date()),
    }),
  },
  {
    label: 'Custom Range',
    value: 'custom',
    getRange: () => undefined,
  },
];

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedPreset, setSelectedPreset] = React.useState<string>('30d');

  // Initialize with 30 days on mount
  React.useEffect(() => {
    if (!dateRange) {
      const preset = presets.find((p) => p.value === '30d');
      if (preset) {
        onDateRangeChange(preset.getRange());
      }
    }
  }, []);

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    const preset = presets.find((p) => p.value === value);
    if (preset && value !== 'custom') {
      const range = preset.getRange();
      onDateRangeChange(range);
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    setSelectedPreset('custom');
  };

  const displayValue = React.useMemo(() => {
    if (!dateRange?.from) return 'Select date range';
    if (!dateRange.to) return format(dateRange.from, 'MMM d, yyyy');
    return `${format(dateRange.from, 'MMM d, yyyy')} - ${format(dateRange.to, 'MMM d, yyyy')}`;
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
          />
          <div className="border-t p-3 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsOpen(false);
              }}
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
    // Default to last 30 days
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

