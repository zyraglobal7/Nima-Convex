'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, User, Camera, LogOut, ChevronRight, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { ThemeToggle } from '@/components/theme-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

// Style options from onboarding
const styleOptions = [
  { id: 'minimalist', label: 'Minimalist', emoji: '◻️' },
  { id: 'classic', label: 'Classic', emoji: '👔' },
  { id: 'streetwear', label: 'Streetwear', emoji: '🧢' },
  { id: 'bohemian', label: 'Bohemian', emoji: '🌻' },
  { id: 'sporty', label: 'Sporty', emoji: '⚽' },
  { id: 'elegant', label: 'Elegant', emoji: '✨' },
  { id: 'casual', label: 'Casual', emoji: '👕' },
  { id: 'vintage', label: 'Vintage', emoji: '📻' },
  { id: 'bold', label: 'Bold & Colorful', emoji: '🎨' },
  { id: 'preppy', label: 'Preppy', emoji: '🎾' },
  { id: 'edgy', label: 'Edgy', emoji: '🖤' },
  { id: 'romantic', label: 'Romantic', emoji: '🌹' },
];

const shirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const waistSizes = ['24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44'];
const currencies = ['USD', 'EUR', 'GBP', 'KES', 'NGN'];

export default function ProfilePage() {
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  
  // Mutations
  const updateProfile = useMutation(api.users.mutations.updateProfile);
  const updateStylePreferences = useMutation(api.users.mutations.updateStylePreferences);
  const updateSizePreferences = useMutation(api.users.mutations.updateSizePreferences);
  const updateBudgetPreferences = useMutation(api.users.mutations.updateBudgetPreferences);

  // Local state for editing
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingStyle, setIsSavingStyle] = useState(false);
  const [isSavingSize, setIsSavingSize] = useState(false);
  const [isSavingBudget, setIsSavingBudget] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [shirtSize, setShirtSize] = useState('');
  const [waistSize, setWaistSize] = useState('');
  const [shoeSize, setShoeSize] = useState('');
  const [shoeSizeUnit, setShoeSizeUnit] = useState<'EU' | 'US' | 'UK'>('US');
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [budgetRange, setBudgetRange] = useState<'low' | 'mid' | 'premium'>('mid');
  const [currency, setCurrency] = useState('USD');

  // Initialize form from user data
  useState(() => {
    if (currentUser) {
      setFirstName(currentUser.firstName || '');
      setLastName(currentUser.lastName || '');
      setSelectedStyles(currentUser.stylePreferences || []);
      setShirtSize(currentUser.shirtSize || '');
      setWaistSize(currentUser.waistSize || '');
      setShoeSize(currentUser.shoeSize || '');
      setShoeSizeUnit((currentUser.shoeSizeUnit as 'EU' | 'US' | 'UK') || 'US');
      setHeight(currentUser.height || '');
      setHeightUnit((currentUser.heightUnit as 'cm' | 'ft') || 'cm');
      setBudgetRange((currentUser.budgetRange as 'low' | 'mid' | 'premium') || 'mid');
      setCurrency(currentUser.currency || 'USD');
    }
  });

  const toggleStyle = (styleId: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((s) => s !== styleId)
        : [...prev, styleId]
    );
  };

  const handleSaveStyles = async () => {
    setIsSavingStyle(true);
    try {
      await updateStylePreferences({ stylePreferences: selectedStyles });
      toast.success('Style preferences updated!');
    } catch (error) {
      console.error('Failed to save styles:', error);
      toast.error('Failed to update style preferences');
    } finally {
      setIsSavingStyle(false);
    }
  };

  const handleSaveSizes = async () => {
    setIsSavingSize(true);
    try {
      await updateSizePreferences({
        shirtSize: shirtSize || undefined,
        waistSize: waistSize || undefined,
        shoeSize: shoeSize || undefined,
        shoeSizeUnit,
        height: height || undefined,
        heightUnit,
      });
      toast.success('Size preferences updated!');
    } catch (error) {
      console.error('Failed to save sizes:', error);
      toast.error('Failed to update size preferences');
    } finally {
      setIsSavingSize(false);
    }
  };

  const handleSaveBudget = async () => {
    setIsSavingBudget(true);
    try {
      await updateBudgetPreferences({
        budgetRange,
        currency,
      });
      toast.success('Budget preferences updated!');
    } catch (error) {
      console.error('Failed to save budget:', error);
      toast.error('Failed to update budget preferences');
    } finally {
      setIsSavingBudget(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
      toast.success('Profile updated!');
      setIsEditingProfile(false);
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile');
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const subscriptionLabels = {
    free: 'Free Plan',
    style_pass: 'Style Pass',
    vip: 'VIP',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/discover" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-serif font-semibold text-foreground">Nima</span>
            </Link>

            {/* Page title - center */}
            <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-medium text-foreground">
              Profile
            </h1>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Profile header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden relative">
              {currentUser.profileImageUrl ? (
                <Image
                  src={currentUser.profileImageUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-7 h-7 bg-surface border border-border rounded-full flex items-center justify-center hover:bg-surface-alt transition-colors">
              <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-medium text-foreground">
              {currentUser.firstName || currentUser.email?.split('@')[0] || 'User'}
              {currentUser.lastName ? ` ${currentUser.lastName}` : ''}
            </h2>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
            <Badge variant="secondary" className="mt-2">
              {subscriptionLabels[currentUser.subscriptionTier]}
            </Badge>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="style" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="style">Style</TabsTrigger>
            <TabsTrigger value="size">Size & Fit</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          {/* Style Tab */}
          <TabsContent value="style" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">Your Style Vibe</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select the styles that best describe your fashion preferences
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {styleOptions.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => toggleStyle(style.id)}
                      className={`
                        p-4 rounded-xl border-2 transition-all duration-200 text-left
                        ${selectedStyles.includes(style.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <span className="text-2xl mb-2 block">{style.emoji}</span>
                      <span className="text-sm font-medium text-foreground">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium text-foreground mb-2">Budget Range</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Help us find items that match your budget
                </p>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(['low', 'mid', 'premium'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setBudgetRange(range)}
                      className={`
                        p-4 rounded-xl border-2 transition-all duration-200 text-center
                        ${budgetRange === range
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <span className="text-sm font-medium text-foreground capitalize">
                        {range === 'low' ? '💰 Budget' : range === 'mid' ? '💎 Mid-Range' : '👑 Premium'}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="currency">Preferred Currency</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger id="currency" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleSaveStyles} disabled={isSavingStyle} className="flex-1">
                  {isSavingStyle ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Style Preferences
                </Button>
                <Button onClick={handleSaveBudget} disabled={isSavingBudget} variant="outline">
                  {isSavingBudget ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Budget'
                  )}
                </Button>
              </div>
            </motion.div>
          </TabsContent>

          {/* Size & Fit Tab */}
          <TabsContent value="size" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shirtSize">Shirt Size</Label>
                  <Select value={shirtSize} onValueChange={setShirtSize}>
                    <SelectTrigger id="shirtSize">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {shirtSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="waistSize">Waist Size</Label>
                  <Select value={waistSize} onValueChange={setWaistSize}>
                    <SelectTrigger id="waistSize">
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      {waistSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}{'"'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height</Label>
                  <div className="flex gap-2">
                    <Input
                      id="height"
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder={heightUnit === 'cm' ? '175' : "5'9"}
                      className="flex-1"
                    />
                    <Select
                      value={heightUnit}
                      onValueChange={(v) => setHeightUnit(v as 'cm' | 'ft')}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cm">cm</SelectItem>
                        <SelectItem value="ft">ft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shoeSize">Shoe Size</Label>
                  <div className="flex gap-2">
                    <Input
                      id="shoeSize"
                      type="text"
                      value={shoeSize}
                      onChange={(e) => setShoeSize(e.target.value)}
                      placeholder="10"
                      className="flex-1"
                    />
                    <Select
                      value={shoeSizeUnit}
                      onValueChange={(v) => setShoeSizeUnit(v as 'EU' | 'US' | 'UK')}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="US">US</SelectItem>
                        <SelectItem value="EU">EU</SelectItem>
                        <SelectItem value="UK">UK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveSizes} disabled={isSavingSize} className="w-full">
                {isSavingSize ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Size Preferences
              </Button>
            </motion.div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Profile Info */}
              <div className="p-4 bg-surface rounded-xl border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground">Profile Information</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingProfile(!isEditingProfile)}
                  >
                    {isEditingProfile ? 'Cancel' : 'Edit'}
                  </Button>
                </div>
                {isEditingProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="First name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Last name"
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveProfile} className="w-full">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name</span>
                      <span className="text-foreground">
                        {currentUser.firstName || '-'} {currentUser.lastName || ''}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="text-foreground">{currentUser.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span className="text-foreground">{currentUser.country || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscription */}
              <div className="p-4 bg-surface rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">Subscription</h3>
                    <p className="text-sm text-muted-foreground">
                      {subscriptionLabels[currentUser.subscriptionTier]}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              {/* Try-on Usage */}
              <div className="p-4 bg-surface rounded-xl border border-border">
                <h3 className="font-medium text-foreground mb-2">Daily Try-Ons</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-2 bg-surface-alt rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      style={{
                        width: `${Math.min((currentUser.dailyTryOnCount / 20) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {currentUser.dailyTryOnCount} / 20
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Resets daily. Upgrade for more try-ons.
                </p>
              </div>

              {/* Sign Out */}
              <Link
                href="/sign-out"
                className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border hover:bg-surface-alt transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-destructive" />
                  <span className="font-medium text-destructive">Sign Out</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-muted-foreground">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-muted-foreground">Lookbooks</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <User className="w-5 h-5 text-primary" />
            <span className="text-xs text-primary font-medium">Profile</span>
          </Link>
        </div>
      </nav>

      {/* Spacer for mobile nav */}
      <div className="h-20 md:hidden" />
    </div>
  );
}
