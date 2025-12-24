export type BudgetRange = 'low' | 'mid' | 'premium';
export type Gender = 'male' | 'female' | 'prefer-not-to-say';
export type HeightUnit = 'cm' | 'ft';
export type ShoeSizeUnit = 'EU' | 'US' | 'UK';

/** Uploaded image info stored during onboarding */
export interface UploadedImage {
  imageId: string; // Convex user_images document ID
  storageId: string; // Convex storage ID
  filename: string;
  previewUrl: string; // Local preview URL for display
}

export interface OnboardingFormData {
  // Gender & Age
  gender: Gender | '';
  age: string;
  
  // Style
  stylePreferences: string[];
  
  // Size & Fit
  shirtSize: string;
  waistSize: string;
  height: string;
  heightUnit: HeightUnit;
  shoeSize: string;
  shoeSizeUnit: ShoeSizeUnit;
  
  // Location & Budget
  country: string;
  currency: string;
  budgetRange: BudgetRange;
  
  // Photos & Account
  photos: File[]; // Local file objects (deprecated - use uploadedImages)
  uploadedImages: UploadedImage[]; // Uploaded image records
  onboardingToken: string; // Token for tracking uploads
  email: string;
}

export interface StepProps {
  formData: OnboardingFormData;
  updateFormData: (data: Partial<OnboardingFormData>) => void;
  onNext: () => void;
  onBack?: () => void;
}

export const TOTAL_STEPS = 8; // Added gender step

export const SIZE_OPTIONS = {
  shirt: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
  waist: ['24', '26', '28', '30', '32', '34', '36', '38', '40', '42', '44'],
  shoe: {
    EU: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'],
    US: ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16'],
    UK: ['2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'],
  },
};

// Shoe size conversion functions
export function convertShoeSize(
  size: string,
  fromUnit: ShoeSizeUnit,
  toUnit: ShoeSizeUnit
): string {
  if (fromUnit === toUnit) return size;

  const sizeNum = parseInt(size);
  let euSize: number;

  // Convert to EU first (as base)
  if (fromUnit === 'EU') {
    euSize = sizeNum;
  } else if (fromUnit === 'US') {
    euSize = sizeNum + 31; // US = EU - 31
  } else {
    // UK
    euSize = sizeNum + 33; // UK = EU - 33
  }

  // Convert from EU to target unit
  if (toUnit === 'EU') {
    return euSize.toString();
  } else if (toUnit === 'US') {
    return (euSize - 31).toString();
  } else {
    // UK
    return (euSize - 33).toString();
  }
}

// Kenya-specific budget options with actual KES amounts
export const BUDGET_OPTIONS: { 
  value: BudgetRange; 
  label: string; 
  description: string;
  range: string;
  icon: string;
}[] = [
  { 
    value: 'low', 
    label: 'Smart Saver', 
    description: 'Great finds that won\'t break the bank',
    range: 'Up to KES 2,000',
    icon: '🏷️',
  },
  { 
    value: 'mid', 
    label: 'Best of Both', 
    description: 'Quality meets value',
    range: 'KES 2,000 - 10,000',
    icon: '⚖️',
  },
  { 
    value: 'premium', 
    label: 'Treat Yourself', 
    description: 'As long as it\'s nice',
    range: 'KES 10,000+',
    icon: '✨',
  },
];

export const STYLE_TAGS = [
  'Casual',
  'Formal',
  'Streetwear',
  'Minimalist',
  'Bohemian',
  'Vintage',
  'Sporty',
  'Elegant',
  'Edgy',
  'Preppy',
  'Romantic',
  'Classic',
];

// Style outfit images for the style quiz
export const STYLE_OUTFIT_IMAGES = [
  { id: '1', url: '/minimalist, casual.png', tags: ['Casual', 'Minimalist'] },
  { id: '2', url: '/Formal, Elegant.png', tags: ['Formal', 'Elegant'] },
  { id: '3', url: '/Streetwear, Edgy.png', tags: ['Streetwear', 'Edgy'] },
  { id: '4', url: '/Sporty, gym wear.png', tags: ['Sporty', 'Casual'] },
  { id: '5', url: '/Classic, Preppy.png', tags: ['Classic', 'Preppy'] },
  { id: '6', url: '/Vintage, Romantic, .png', tags: ['Vintage', 'Romantic'] },
  { id: '7', url: '/Neutrals, classic.png', tags: ['Minimalist', 'Classic'] },
  { id: '8', url: '/Trendy, Casual.png', tags: ['Casual', 'Sporty'] },
];

// Only Kenya for now
export const COUNTRIES = [
  { code: 'KE', name: 'Kenya', currency: 'KES', emoji: '🇰🇪', phoneCode: '+254' },
];

export const GENDER_OPTIONS: { value: Gender; label: string; icon: string }[] = [
  { value: 'female', label: 'Woman', icon: '👩' },
  { value: 'male', label: 'Man', icon: '👨' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say', icon: '🤫' },
];
