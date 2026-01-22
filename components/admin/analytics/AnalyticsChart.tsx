'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { format, parseISO } from 'date-fns';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Color palette for charts - warm luxury tones matching Nima brand
const CHART_COLORS = [
  '#5C2A33', // Nima Burgundy
  '#A67C52', // Camel Brown
  '#6B7F5E', // Sage
  '#8C6A50', // Toffee
  '#44242D', // Deep Wine
  '#B85C5C', // Dusty Rose
  '#9C948A', // Stone
  '#6B635B', // Warm Gray
  '#C9A07A', // Rose Gold
  '#A66B73', // Soft Burgundy
];

export interface ChartDataPoint {
  [key: string]: string | number;
}

interface BaseChartProps {
  title: string;
  description?: string;
  data: ChartDataPoint[];
  className?: string;
  height?: number;
}

interface LineAreaChartProps extends BaseChartProps {
  type: 'line' | 'area';
  dataKey: string;
  xAxisKey?: string;
  showGrid?: boolean;
  formatXAxis?: (value: string) => string;
  formatTooltip?: (value: number) => string;
}

interface BarChartProps extends BaseChartProps {
  type: 'bar';
  dataKey: string;
  xAxisKey?: string;
  layout?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  formatXAxis?: (value: string) => string;
  formatTooltip?: (value: number) => string;
}

interface PieChartProps extends BaseChartProps {
  type: 'pie';
  dataKey: string;
  nameKey: string;
  showLegend?: boolean;
}

interface MultiLineChartProps extends BaseChartProps {
  type: 'multi-line';
  lines: Array<{
    dataKey: string;
    name: string;
    color?: string;
  }>;
  xAxisKey?: string;
  showGrid?: boolean;
  formatXAxis?: (value: string) => string;
}

export type AnalyticsChartProps =
  | LineAreaChartProps
  | BarChartProps
  | PieChartProps
  | MultiLineChartProps;

// Default date formatter
const defaultDateFormatter = (value: string) => {
  try {
    return format(parseISO(value), 'MMM d');
  } catch {
    return value;
  }
};

// Default number formatter
const defaultNumberFormatter = (value: number) => value.toLocaleString();

// Custom tooltip component
function CustomTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatLabel?: (value: string) => string;
  formatValue?: (value: number) => string;
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
      {label && (
        <p className="font-medium mb-1">
          {formatLabel ? formatLabel(label) : label}
        </p>
      )}
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {formatValue ? formatValue(entry.value) : defaultNumberFormatter(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsChart(props: AnalyticsChartProps) {
  const { title, description, data, className, height = 300 } = props;

  const renderChart = () => {
    switch (props.type) {
      case 'line':
      case 'area': {
        const { dataKey, xAxisKey = 'date', showGrid = true, formatXAxis, formatTooltip } = props;
        const ChartComponent = props.type === 'line' ? LineChart : AreaChart;
        const DataComponent = props.type === 'line' ? Line : Area;

        return (
          <ResponsiveContainer width="100%" height={height}>
            <ChartComponent data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey={xAxisKey}
                tickFormatter={formatXAxis || defaultDateFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={defaultNumberFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload as Array<{ name: string; value: number; color: string }>}
                    label={label}
                    formatLabel={formatXAxis || defaultDateFormatter}
                    formatValue={formatTooltip}
                  />
                )}
              />
              {props.type === 'area' ? (
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={CHART_COLORS[0]}
                  fill={CHART_COLORS[0]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ) : (
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={CHART_COLORS[0]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_COLORS[0] }}
                />
              )}
            </ChartComponent>
          </ResponsiveContainer>
        );
      }

      case 'multi-line': {
        const { lines, xAxisKey = 'date', showGrid = true, formatXAxis } = props;

        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey={xAxisKey}
                tickFormatter={formatXAxis || defaultDateFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tickFormatter={defaultNumberFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload as Array<{ name: string; value: number; color: string }>}
                    label={label}
                    formatLabel={formatXAxis || defaultDateFormatter}
                  />
                )}
              />
              <Legend />
              {lines.map((line, index) => (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color || CHART_COLORS[index % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
      }

      case 'bar': {
        const { dataKey, xAxisKey = 'name', layout = 'vertical', showGrid = true, formatXAxis, formatTooltip } = props;

        if (layout === 'horizontal') {
          return (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={data} layout="vertical">
                {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />}
                <XAxis type="number" tickFormatter={defaultNumberFormatter} tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey={xAxisKey}
                  tick={{ fontSize: 12 }}
                  width={100}
                  tickFormatter={formatXAxis}
                />
                <Tooltip
                  content={({ active, payload, label }) => (
                    <CustomTooltip
                      active={active}
                      payload={payload as Array<{ name: string; value: number; color: string }>}
                      label={label}
                      formatValue={formatTooltip}
                    />
                  )}
                />
                <Bar dataKey={dataKey} fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          );
        }

        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              {showGrid && <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />}
              <XAxis
                dataKey={xAxisKey}
                tickFormatter={formatXAxis || defaultDateFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={defaultNumberFormatter}
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => (
                  <CustomTooltip
                    active={active}
                    payload={payload as Array<{ name: string; value: number; color: string }>}
                    label={label}
                    formatLabel={formatXAxis || defaultDateFormatter}
                    formatValue={formatTooltip}
                  />
                )}
              />
              <Bar dataKey={dataKey} fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }

      case 'pie': {
        const { dataKey, nameKey, showLegend = true } = props;

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={height / 3}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => defaultNumberFormatter(value)}
              />
              {showLegend && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}

// Stats card for displaying key numbers
export interface StatItemProps {
  label: string;
  value: string | number;
  description?: string;
}

export function StatsGrid({
  stats,
  className,
}: {
  stats: StatItemProps[];
  className?: string;
}) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="pb-2">
            <CardDescription>{stat.label}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
            {stat.description && (
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Data table for detailed data
export interface DataTableColumn<T> {
  key: keyof T;
  header: string;
  format?: (value: T[keyof T]) => string;
}

export function DataTable<T extends Record<string, unknown>>({
  title,
  description,
  data,
  columns,
  className,
}: {
  title: string;
  description?: string;
  data: T[];
  columns: DataTableColumn<T>[];
  className?: string;
}) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {columns.map((col) => (
                  <th key={String(col.key)} className="py-2 px-3 text-left font-medium">
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b last:border-0">
                  {columns.map((col) => (
                    <td key={String(col.key)} className="py-2 px-3">
                      {col.format
                        ? col.format(row[col.key])
                        : String(row[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

