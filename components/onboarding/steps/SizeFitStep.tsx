'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { StepProps, SIZE_OPTIONS, ShoeSizeUnit, convertShoeSize } from '../types';
import { ArrowLeft, MessageCircle, Ruler, Footprints, Shirt } from 'lucide-react';
import { motion } from 'framer-motion';

// Size slider configurations
const SHIRT_SIZES = SIZE_OPTIONS.shirt;
const WAIST_SIZES = SIZE_OPTIONS.waist;

// Default values
const DEFAULT_SHIRT_SIZE = 'M';
const DEFAULT_WAIST_SIZE = '32';
const DEFAULT_HEIGHT_CM = '170';
const DEFAULT_HEIGHT_FT = '5.7';
const DEFAULT_SHOE_SIZE_EU = '40';

// Height ranges
const HEIGHT_CM_MIN = 140;
const HEIGHT_CM_MAX = 210;
const HEIGHT_FT_MIN = 4.5;
const HEIGHT_FT_MAX = 7;

function formatHeight(value: number, unit: 'cm' | 'ft'): string {
  if (unit === 'cm') {
    return `${value} cm`;
  }
  const feet = Math.floor(value);
  const inches = Math.round((value - feet) * 12);
  return `${feet}'${inches}"`;
}

export function SizeFitStep({ formData, updateFormData, onNext, onBack }: StepProps) {
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>(formData.heightUnit || 'cm');
  const [shoeSizeUnit, setShoeSizeUnit] = useState<ShoeSizeUnit>(formData.shoeSizeUnit || 'EU');

  // Initialize default values when component mounts if not already set
  useEffect(() => {
    const updates: Partial<typeof formData> = {};
    
    if (!formData.shirtSize) {
      updates.shirtSize = DEFAULT_SHIRT_SIZE;
    }
    if (!formData.waistSize) {
      updates.waistSize = DEFAULT_WAIST_SIZE;
    }
    if (!formData.height) {
      updates.height = heightUnit === 'cm' ? DEFAULT_HEIGHT_CM : DEFAULT_HEIGHT_FT;
    }
    if (!formData.shoeSize) {
      const defaultShoeSize = shoeSizeUnit === 'EU' 
        ? DEFAULT_SHOE_SIZE_EU 
        : convertShoeSize(DEFAULT_SHOE_SIZE_EU, 'EU', shoeSizeUnit);
      updates.shoeSize = defaultShoeSize;
    }
    
    if (Object.keys(updates).length > 0) {
      updateFormData(updates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Convert between height units when switching
  const handleHeightUnitChange = (newUnit: 'cm' | 'ft') => {
    if (newUnit === heightUnit) return;
    
    let newHeight = '';
    if (formData.height) {
      const currentValue = parseFloat(formData.height);
      if (newUnit === 'cm') {
        // Convert ft to cm
        newHeight = Math.round(currentValue * 30.48).toString();
      } else {
        // Convert cm to ft
        newHeight = (currentValue / 30.48).toFixed(1);
      }
    }
    
    setHeightUnit(newUnit);
    updateFormData({ height: newHeight, heightUnit: newUnit });
  };

  // Convert between shoe size units when switching
  const handleShoeSizeUnitChange = (newUnit: ShoeSizeUnit) => {
    if (newUnit === shoeSizeUnit) return;
    
    let newShoeSize = '';
    if (formData.shoeSize) {
      newShoeSize = convertShoeSize(formData.shoeSize, shoeSizeUnit, newUnit);
    } else {
      // Set default size if none selected
      const sizes = SIZE_OPTIONS.shoe[newUnit];
      newShoeSize = sizes[Math.floor(sizes.length / 2)]; // Middle size as default
    }
    
    setShoeSizeUnit(newUnit);
    updateFormData({ shoeSize: newShoeSize, shoeSizeUnit: newUnit });
  };

  const getShirtIndex = () => {
    const index = SHIRT_SIZES.indexOf(formData.shirtSize);
    return index >= 0 ? index : SHIRT_SIZES.indexOf(DEFAULT_SHIRT_SIZE);
  };
  const getWaistIndex = () => {
    const index = WAIST_SIZES.indexOf(formData.waistSize);
    return index >= 0 ? index : WAIST_SIZES.indexOf(DEFAULT_WAIST_SIZE);
  };
  const getShoeIndex = () => {
    const sizes = SIZE_OPTIONS.shoe[shoeSizeUnit];
    const currentSize = formData.shoeSize || (shoeSizeUnit === 'EU' ? DEFAULT_SHOE_SIZE_EU : convertShoeSize(DEFAULT_SHOE_SIZE_EU, 'EU', shoeSizeUnit));
    const index = sizes.indexOf(currentSize);
    return index >= 0 ? index : Math.floor(sizes.length / 2);
  };
  const getHeightValue = () => {
    if (!formData.height) {
      return heightUnit === 'cm' ? parseFloat(DEFAULT_HEIGHT_CM) : parseFloat(DEFAULT_HEIGHT_FT);
    }
    return parseFloat(formData.height);
  };

  const isComplete = formData.shirtSize && formData.waistSize && formData.shoeSize && formData.height;

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-4 py-6">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors duration-200"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-serif font-semibold text-foreground">
                Let&apos;s talk fit
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                For perfectly tailored recommendations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pb-6 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-8">
          {/* Nima Chat Bubble */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative"
          >
            <div className="bg-surface/80 backdrop-blur-sm border border-border/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-primary-foreground" />
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  Don&apos;t worry, I won&apos;t judge! These help me find clothes that 
                  actually fit you — no more guessing games.
                </p>
              </div>
            </div>
            <div className="absolute -bottom-2 left-8 w-4 h-4 bg-surface/80 border-b border-r border-border/50 transform rotate-45" />
          </motion.div>

          {/* T-Shirt Size Slider */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Shirt className="w-4 h-4 text-secondary" />
                T-Shirt Size
              </label>
              <span className="text-lg font-semibold text-primary">
                {formData.shirtSize || DEFAULT_SHIRT_SIZE}
              </span>
            </div>
            <div className="px-2">
              <Slider
                value={[getShirtIndex()]}
                onValueChange={([value]) => updateFormData({ shirtSize: SHIRT_SIZES[value] })}
                max={SHIRT_SIZES.length - 1}
                min={0}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">XS</span>
                <span className="text-xs text-muted-foreground">3XL</span>
              </div>
            </div>
          </motion.div>

          {/* Waist Size Slider */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <span className="text-lg">📏</span>
                Waist Size
              </label>
              <span className="text-lg font-semibold text-primary">
                {formData.waistSize ? `${formData.waistSize}"` : `${DEFAULT_WAIST_SIZE}"`}
              </span>
            </div>
            <div className="px-2">
              <Slider
                value={[getWaistIndex()]}
                onValueChange={([value]) => updateFormData({ waistSize: WAIST_SIZES[value] })}
                max={WAIST_SIZES.length - 1}
                min={0}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">24"</span>
                <span className="text-xs text-muted-foreground">44"</span>
              </div>
            </div>
          </motion.div>

          {/* Height Slider */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Ruler className="w-4 h-4 text-secondary" />
                Height
              </label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-primary">
                  {formatHeight(getHeightValue(), heightUnit)}
                </span>
              </div>
            </div>
            
            {/* Unit Toggle */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleHeightUnitChange('cm')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  heightUnit === 'cm'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface border border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                cm
              </button>
              <button
                onClick={() => handleHeightUnitChange('ft')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  heightUnit === 'ft'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface border border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                ft / in
              </button>
            </div>

            <div className="px-2">
              <Slider
                value={[getHeightValue()]}
                onValueChange={([value]) => updateFormData({ height: value.toString(), heightUnit: heightUnit })}
                max={heightUnit === 'cm' ? HEIGHT_CM_MAX : HEIGHT_FT_MAX}
                min={heightUnit === 'cm' ? HEIGHT_CM_MIN : HEIGHT_FT_MIN}
                step={heightUnit === 'cm' ? 1 : 0.1}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {heightUnit === 'cm' ? '140 cm' : '4\'6"'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {heightUnit === 'cm' ? '210 cm' : '7\'0"'}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Shoe Size Slider */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Footprints className="w-4 h-4 text-secondary" />
                Shoe Size
              </label>
              <span className="text-lg font-semibold text-primary">
                {formData.shoeSize || (shoeSizeUnit === 'EU' ? DEFAULT_SHOE_SIZE_EU : convertShoeSize(DEFAULT_SHOE_SIZE_EU, 'EU', shoeSizeUnit))} {shoeSizeUnit}
              </span>
            </div>
            
            {/* Unit Toggle */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => handleShoeSizeUnitChange('EU')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  shoeSizeUnit === 'EU'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface border border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                EU
              </button>
              <button
                onClick={() => handleShoeSizeUnitChange('US')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  shoeSizeUnit === 'US'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface border border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                US
              </button>
              <button
                onClick={() => handleShoeSizeUnitChange('UK')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
                  shoeSizeUnit === 'UK'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-surface border border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                UK
              </button>
            </div>

            <div className="px-2">
              <Slider
                value={[getShoeIndex()]}
                onValueChange={([value]) => {
                  const sizes = SIZE_OPTIONS.shoe[shoeSizeUnit];
                  updateFormData({ shoeSize: sizes[value], shoeSizeUnit });
                }}
                max={SIZE_OPTIONS.shoe[shoeSizeUnit].length - 1}
                min={0}
                step={1}
                className="cursor-pointer"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-muted-foreground">
                  {SIZE_OPTIONS.shoe[shoeSizeUnit][0]}
                </span>
                <span className="text-xs text-muted-foreground">
                  {SIZE_OPTIONS.shoe[shoeSizeUnit][SIZE_OPTIONS.shoe[shoeSizeUnit].length - 1]}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Pro Tip */}
          <motion.div 
            className="bg-surface-alt rounded-xl p-4 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            <p className="font-medium text-foreground mb-1">💡 Pro tip</p>
            <p>
              Not 100% sure? Go with your usual size — I&apos;ll help you find 
              the perfect fit from there.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-md mx-auto">
          <Button
            onClick={onNext}
            disabled={!isComplete}
            size="lg"
            className="w-full h-14 text-base font-medium tracking-wide rounded-full bg-primary hover:bg-primary-hover text-primary-foreground transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] hover:shadow-lg"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
