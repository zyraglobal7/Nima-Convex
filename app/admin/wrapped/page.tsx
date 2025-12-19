'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Gift,
  Calendar,
  Palette,
  Play,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

type Theme = 'aurora' | 'geometric' | 'fluid';

const themes: { id: Theme; name: string; description: string; preview: string }[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Soft gradients, flowing shapes with gentle wave motion',
    preview: 'bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200',
  },
  {
    id: 'geometric',
    name: 'Geometric',
    description: 'Sharp lines, grid patterns with bounce easing',
    preview: 'bg-gradient-to-br from-amber-100 via-orange-100 to-rose-100',
  },
  {
    id: 'fluid',
    name: 'Fluid',
    description: 'Organic blobs, smooth curves with spring physics',
    preview: 'bg-gradient-to-br from-emerald-100 via-teal-100 to-cyan-100',
  },
];

export default function AdminWrappedPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [runDate, setRunDate] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme>('aurora');
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const settings = useQuery(api.wrapped.queries.getWrappedSettings, { year: selectedYear });
  const stats = useQuery(api.wrapped.queries.getWrappedStats, { year: selectedYear });

  // Mutations
  const upsertSettings = useMutation(api.wrapped.mutations.upsertWrappedSettings);
  const toggleActive = useMutation(api.wrapped.mutations.toggleWrappedActive);
  const triggerGeneration = useMutation(api.wrapped.mutations.triggerManualGeneration);

  // Initialize form from settings
  useEffect(() => {
    if (settings) {
      const date = new Date(settings.runDate);
      setRunDate(date.toISOString().split('T')[0]);
      setSelectedTheme(settings.theme);
      setIsActive(settings.isActive);
    } else {
      // Default to December 15th of selected year
      setRunDate(`${selectedYear}-12-15`);
      setSelectedTheme('aurora');
      setIsActive(false);
    }
  }, [settings, selectedYear]);

  const handleSaveSettings = async () => {
    if (!runDate) {
      toast.error('Please select a run date');
      return;
    }

    setIsSaving(true);
    try {
      const runDateTimestamp = new Date(runDate).getTime();
      await upsertSettings({
        year: selectedYear,
        runDate: runDateTimestamp,
        theme: selectedTheme,
        isActive,
      });
      toast.success('Wrapped settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    try {
      await toggleActive({ year: selectedYear, isActive: !isActive });
      setIsActive(!isActive);
      toast.success(isActive ? 'Wrapped deactivated' : 'Wrapped activated!');
    } catch (error) {
      console.error('Failed to toggle active:', error);
      toast.error('Failed to update status');
    }
  };

  const handleTriggerGeneration = async () => {
    setIsGenerating(true);
    try {
      await triggerGeneration({ year: selectedYear });
      toast.success('Wrapped generation started! This may take a few minutes.');
    } catch (error) {
      console.error('Failed to trigger generation:', error);
      toast.error('Failed to start generation');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-semibold flex items-center gap-3">
          <Gift className="h-8 w-8 text-primary" />
          Nima Wrapped
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure and manage the yearly Nima Wrapped experience for users.
        </p>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-4">
        <Label htmlFor="year">Year</Label>
        <div className="flex gap-2">
          {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Generation Settings
            </CardTitle>
            <CardDescription>
              Configure when Nima Wrapped will be generated for {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Run Date */}
            <div className="space-y-2">
              <Label htmlFor="runDate">Run Date</Label>
              <Input
                id="runDate"
                type="date"
                value={runDate}
                onChange={(e) => setRunDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Wrapped will be automatically generated at midnight UTC on this date.
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Make Wrapped Visible</Label>
                <p className="text-sm text-muted-foreground">
                  {settings
                    ? `When active, users can view their ${selectedYear} Wrapped`
                    : 'Save settings first to enable this toggle'}
                </p>
              </div>
              <Switch checked={isActive} onCheckedChange={handleToggleActive} disabled={!settings} />
            </div>

            {/* Save Button */}
            <Button onClick={handleSaveSettings} disabled={isSaving} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Theme Selector Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Theme Selection
            </CardTitle>
            <CardDescription>
              Choose the visual theme for this year&apos;s Wrapped experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme.id)}
                className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                  selectedTheme === theme.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-16 h-16 rounded-lg ${theme.preview}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{theme.name}</span>
                      {selectedTheme === theme.id && (
                        <Badge variant="secondary" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{theme.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Stats & Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Generation Status
          </CardTitle>
          <CardDescription>
            Overview of Wrapped generation progress for {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Stats */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Total Eligible Users
              </div>
              {stats ? (
                <p className="text-2xl font-bold">{stats.totalUsers}</p>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Users with Wrapped
              </div>
              {stats ? (
                <p className="text-2xl font-bold">{stats.usersWithWrapped}</p>
              ) : (
                <Skeleton className="h-8 w-16" />
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4" />
                Generation Progress
              </div>
              {stats ? (
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{stats.generationPercentage}%</p>
                  {stats.generationPercentage === 100 && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ) : (
                <Skeleton className="h-8 w-20" />
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {stats && (
            <div className="mt-6">
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${stats.generationPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Manual Trigger */}
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Manual Generation</h4>
                <p className="text-sm text-muted-foreground">
                  Trigger Wrapped generation for all users immediately
                </p>
              </div>
              <Button
                onClick={handleTriggerGeneration}
                disabled={isGenerating}
                variant="outline"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Generate Now
                  </>
                )}
              </Button>
            </div>

            {!settings && (
              <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800">No settings configured</p>
                  <p className="text-sm text-amber-700">
                    Please save settings before generating Wrapped for {selectedYear}.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

