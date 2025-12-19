/**
 * Constants for Nima Wrapped feature
 * Predefined style eras, personality types, moods, and trend mappings
 */

// ============================================
// STYLE ERAS
// ============================================

export interface StyleEra {
  id: string;
  name: string;
  nameVariantMale: string;
  nameVariantFemale: string;
  description: string;
  descriptionMale: string;
  descriptionFemale: string;
  matchTags: string[]; // Tags that map to this style era
}

export const STYLE_ERAS: StyleEra[] = [
  {
    id: 'minimalist',
    name: 'The Minimalist',
    nameVariantMale: 'The Minimalist',
    nameVariantFemale: 'The Minimalist',
    description: 'Clean lines, neutral tones, less is more.',
    descriptionMale: 'Clean lines, neutral tones, less is more. You let the fit speak for itself.',
    descriptionFemale: 'Clean lines, neutral tones, less is more. Effortlessly polished.',
    matchTags: ['minimalist', 'minimal', 'clean', 'simple', 'neutral', 'basics'],
  },
  {
    id: 'streetcore',
    name: 'Streetcore',
    nameVariantMale: 'Streetcore King',
    nameVariantFemale: 'Streetcore Queen',
    description: 'Urban edge meets effortless cool.',
    descriptionMale: 'Urban edge meets effortless cool. The streets are your runway.',
    descriptionFemale: 'Urban edge meets effortless cool. The streets are your runway.',
    matchTags: ['streetwear', 'street', 'urban', 'hype', 'sneakers', 'oversized'],
  },
  {
    id: 'clean_girl',
    name: 'Clean Girl Era',
    nameVariantMale: 'Clean Boy Era',
    nameVariantFemale: 'Clean Girl Era',
    description: 'Polished, fresh, effortlessly put-together.',
    descriptionMale: 'Polished, fresh, effortlessly put-together. Groomed to perfection.',
    descriptionFemale: 'Polished, fresh, effortlessly put-together. Slick buns and gold hoops energy.',
    matchTags: ['clean', 'polished', 'fresh', 'put-together', 'sleek', 'refined'],
  },
  {
    id: 'dark_academia',
    name: 'Dark Academia',
    nameVariantMale: 'Dark Academia',
    nameVariantFemale: 'Dark Academia',
    description: 'Scholarly vibes with a moody twist.',
    descriptionMale: 'Scholarly vibes with a moody twist. Oxford, but make it mysterious.',
    descriptionFemale: 'Scholarly vibes with a moody twist. Library dates and vintage blazers.',
    matchTags: ['academia', 'dark', 'vintage', 'scholarly', 'preppy', 'classic', 'brown', 'tweed'],
  },
  {
    id: 'bohemian',
    name: 'Boho Dreamer',
    nameVariantMale: 'Boho Spirit',
    nameVariantFemale: 'Boho Dreamer',
    description: 'Free-spirited, earthy, artistically layered.',
    descriptionMale: 'Free-spirited, earthy, artistically layered. Festival-ready year-round.',
    descriptionFemale: 'Free-spirited, earthy, artistically layered. Flowing fabrics and wanderlust.',
    matchTags: ['bohemian', 'boho', 'earthy', 'free-spirited', 'flowy', 'layered', 'artistic'],
  },
  {
    id: 'classic',
    name: 'Timeless Classic',
    nameVariantMale: 'Timeless Classic',
    nameVariantFemale: 'Timeless Classic',
    description: 'Elegant, refined, never out of style.',
    descriptionMale: 'Elegant, refined, never out of style. You dress like you mean business.',
    descriptionFemale: 'Elegant, refined, never out of style. Audrey Hepburn would approve.',
    matchTags: ['classic', 'elegant', 'timeless', 'refined', 'sophisticated', 'formal'],
  },
  {
    id: 'bold_maximalist',
    name: 'Bold Maximalist',
    nameVariantMale: 'Bold Maximalist',
    nameVariantFemale: 'Bold Maximalist',
    description: 'More is more. Color, print, statement.',
    descriptionMale: 'More is more. Color, print, statement. You never blend in.',
    descriptionFemale: 'More is more. Color, print, statement. You ARE the main character.',
    matchTags: ['bold', 'colorful', 'maximalist', 'statement', 'print', 'bright', 'eclectic'],
  },
  {
    id: 'sporty_chic',
    name: 'Sporty Chic',
    nameVariantMale: 'Athleisure King',
    nameVariantFemale: 'Sporty Chic',
    description: 'Athletic meets fashion-forward.',
    descriptionMale: 'Athletic meets fashion-forward. Gym to brunch without changing.',
    descriptionFemale: 'Athletic meets fashion-forward. Leggings are pants, and you prove it.',
    matchTags: ['sporty', 'athletic', 'athleisure', 'active', 'casual', 'comfortable'],
  },
  {
    id: 'romantic',
    name: 'Romantic',
    nameVariantMale: 'Romantic Soul',
    nameVariantFemale: 'Romantic',
    description: 'Soft, dreamy, and utterly feminine.',
    descriptionMale: 'Soft, thoughtful, with a poetic edge. Refined romance.',
    descriptionFemale: 'Soft, dreamy, and utterly feminine. Florals, lace, and fairy-tale vibes.',
    matchTags: ['romantic', 'feminine', 'soft', 'floral', 'lace', 'delicate', 'dreamy'],
  },
  {
    id: 'edgy',
    name: 'Edge Lord',
    nameVariantMale: 'Edge Lord',
    nameVariantFemale: 'Edge Queen',
    description: 'Dark, bold, unapologetically rebellious.',
    descriptionMale: 'Dark, bold, unapologetically rebellious. Leather and attitude.',
    descriptionFemale: 'Dark, bold, unapologetically rebellious. Combat boots are a lifestyle.',
    matchTags: ['edgy', 'dark', 'rebellious', 'punk', 'goth', 'leather', 'black'],
  },
];

// ============================================
// PERSONALITY TYPES
// ============================================

export interface PersonalityType {
  id: string;
  name: string;
  description: string;
  criteria: {
    minUniqueStyles?: number; // Minimum different style tags
    maxUniqueStyles?: number;
    trendinessScore?: 'high' | 'medium' | 'low'; // How much they follow trends
    consistencyScore?: 'high' | 'medium' | 'low'; // How consistent their style is
  };
}

export const PERSONALITY_TYPES: PersonalityType[] = [
  {
    id: 'curator',
    name: 'The Curator',
    description: "You don't follow every trend—you pick your trends and commit.",
    criteria: {
      minUniqueStyles: 2,
      maxUniqueStyles: 4,
      consistencyScore: 'high',
    },
  },
  {
    id: 'explorer',
    name: 'The Explorer',
    description: "You're always first to try new styles and push boundaries.",
    criteria: {
      minUniqueStyles: 5,
      trendinessScore: 'high',
    },
  },
  {
    id: 'classicist',
    name: 'The Classicist',
    description: 'Timeless over trendy. Quality over quantity.',
    criteria: {
      maxUniqueStyles: 3,
      trendinessScore: 'low',
      consistencyScore: 'high',
    },
  },
  {
    id: 'chameleon',
    name: 'The Chameleon',
    description: "Your style shifts with your mood—and that's your superpower.",
    criteria: {
      minUniqueStyles: 6,
      consistencyScore: 'low',
    },
  },
  {
    id: 'trendsetter',
    name: 'The Trendsetter',
    description: "Others look to you for what's next.",
    criteria: {
      trendinessScore: 'high',
      minUniqueStyles: 4,
    },
  },
];

// ============================================
// QUARTERLY MOODS
// ============================================

export interface QuarterlyMood {
  quarter: string;
  months: string;
  seasonalMoods: string[]; // Possible moods for this quarter
}

export const QUARTERLY_MOODS: QuarterlyMood[] = [
  {
    quarter: 'Q1',
    months: 'January–March',
    seasonalMoods: [
      'Cozy & Layered',
      'Winter Warrior',
      'New Year, New Style',
      'Comfort Mode',
      'Bundled Up',
      'Fresh Start Energy',
    ],
  },
  {
    quarter: 'Q2',
    months: 'April–June',
    seasonalMoods: [
      'Effortless Chic',
      'Spring Awakening',
      'Light & Breezy',
      'Color Pop Season',
      'Transitional Vibes',
      'Wedding Guest Ready',
    ],
  },
  {
    quarter: 'Q3',
    months: 'July–September',
    seasonalMoods: [
      'Statement Pieces',
      'Summer Bold',
      'Vacation Mode',
      'Hot Girl Summer',
      'Minimalist Summer',
      'Beach to Bar',
    ],
  },
  {
    quarter: 'Q4',
    months: 'October–December',
    seasonalMoods: [
      'Dark Academia Energy',
      'Holiday Glam',
      'Cozy Season',
      'Party Ready',
      'Year-End Glow Up',
      'Layering Expert',
    ],
  },
];

// ============================================
// TREND TAGS (for trend analysis)
// ============================================

// These are considered "trending" tags that indicate fashion-forward choices
export const TRENDING_TAGS_2024: string[] = [
  'quiet-luxury',
  'mob-wife',
  'coquette',
  'ballet-core',
  'tomato-girl',
  'coastal-grandmother',
  'old-money',
  'tenniscore',
  'gorpcore',
  'barbiecore',
  'cargo',
  'maxi-skirt',
  'sheer',
  'cherry-red',
  'butter-yellow',
];

export const TRENDING_TAGS_2025: string[] = [
  'cherry-coded',
  'quiet-luxury',
  'tenniscore',
  'boho-revival',
  'burgundy',
  'leopard-print',
  'ballet-flats',
  'maxi-everything',
  'sheer',
  'bronze-age',
  'soft-goth',
  'office-siren',
  'romantic-maximalism',
  'western',
  'prep-revival',
];

// Tags that are considered "skipped" or old trends
export const SKIPPED_TRENDS_2025: string[] = [
  'ultra-low-rise',
  'micro-mini',
  'y2k-extreme',
  'logomania',
  'neon',
  'tie-dye',
  'chunky-dad-shoes',
  'bucket-hat',
];

// ============================================
// COLOR MAPPINGS
// ============================================

export interface ColorMapping {
  name: string;
  displayName: string;
  emoji: string;
  hex: string;
}

export const COLOR_MAPPINGS: ColorMapping[] = [
  { name: 'black', displayName: 'Black', emoji: '🖤', hex: '#000000' },
  { name: 'white', displayName: 'White', emoji: '🤍', hex: '#FFFFFF' },
  { name: 'beige', displayName: 'Beige', emoji: '🤎', hex: '#F5F5DC' },
  { name: 'grey', displayName: 'Grey', emoji: '🩶', hex: '#808080' },
  { name: 'gray', displayName: 'Grey', emoji: '🩶', hex: '#808080' },
  { name: 'navy', displayName: 'Navy', emoji: '💙', hex: '#000080' },
  { name: 'blue', displayName: 'Blue', emoji: '💙', hex: '#0000FF' },
  { name: 'green', displayName: 'Green', emoji: '💚', hex: '#008000' },
  { name: 'red', displayName: 'Red', emoji: '❤️', hex: '#FF0000' },
  { name: 'pink', displayName: 'Pink', emoji: '💗', hex: '#FFC0CB' },
  { name: 'brown', displayName: 'Brown', emoji: '🤎', hex: '#8B4513' },
  { name: 'cream', displayName: 'Cream', emoji: '🤍', hex: '#FFFDD0' },
  { name: 'tan', displayName: 'Tan', emoji: '🤎', hex: '#D2B48C' },
  { name: 'olive', displayName: 'Olive', emoji: '💚', hex: '#808000' },
  { name: 'burgundy', displayName: 'Burgundy', emoji: '🍷', hex: '#800020' },
  { name: 'purple', displayName: 'Purple', emoji: '💜', hex: '#800080' },
  { name: 'yellow', displayName: 'Yellow', emoji: '💛', hex: '#FFFF00' },
  { name: 'orange', displayName: 'Orange', emoji: '🧡', hex: '#FFA500' },
  { name: 'gold', displayName: 'Gold', emoji: '✨', hex: '#FFD700' },
  { name: 'silver', displayName: 'Silver', emoji: '🩶', hex: '#C0C0C0' },
];

// ============================================
// WRAPPED THEMES
// ============================================

export type WrappedTheme = 'aurora' | 'geometric' | 'fluid';

export interface ThemeConfig {
  id: WrappedTheme;
  name: string;
  description: string;
  animationStyle: string;
}

export const WRAPPED_THEMES: ThemeConfig[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    description: 'Soft gradients, flowing shapes with gentle wave motion',
    animationStyle: 'fade-scale-wave',
  },
  {
    id: 'geometric',
    name: 'Geometric',
    description: 'Sharp lines, grid patterns with bounce easing',
    animationStyle: 'slide-rotate-bounce',
  },
  {
    id: 'fluid',
    name: 'Fluid',
    description: 'Organic blobs, smooth curves with spring physics',
    animationStyle: 'morph-flow-spring',
  },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get style era based on dominant tags
 */
export function getStyleEra(
  tags: string[],
  gender: 'male' | 'female' | 'prefer-not-to-say' | undefined
): StyleEra {
  const tagLower = tags.map((t) => t.toLowerCase());

  // Score each style era based on matching tags
  const scores = STYLE_ERAS.map((era) => {
    const matchCount = era.matchTags.filter((matchTag) =>
      tagLower.some((t) => t.includes(matchTag) || matchTag.includes(t))
    ).length;
    return { era, score: matchCount };
  });

  // Sort by score and get the best match
  scores.sort((a, b) => b.score - a.score);

  // Default to minimalist if no strong match
  return scores[0].score > 0 ? scores[0].era : STYLE_ERAS[0];
}

/**
 * Get personality type based on user behavior
 */
export function getPersonalityType(
  uniqueStyleCount: number,
  trendingTagCount: number,
  totalTags: number
): PersonalityType {
  const trendRatio = totalTags > 0 ? trendingTagCount / totalTags : 0;

  // Determine trendy score
  const trendinessScore: 'high' | 'medium' | 'low' =
    trendRatio > 0.3 ? 'high' : trendRatio > 0.15 ? 'medium' : 'low';

  // Determine consistency
  const consistencyScore: 'high' | 'medium' | 'low' =
    uniqueStyleCount <= 3 ? 'high' : uniqueStyleCount <= 5 ? 'medium' : 'low';

  // Find best matching personality
  if (uniqueStyleCount >= 6 && consistencyScore === 'low') {
    return PERSONALITY_TYPES.find((p) => p.id === 'chameleon')!;
  }

  if (trendinessScore === 'high' && uniqueStyleCount >= 4) {
    return PERSONALITY_TYPES.find((p) => p.id === 'trendsetter')!;
  }

  if (trendinessScore === 'high') {
    return PERSONALITY_TYPES.find((p) => p.id === 'explorer')!;
  }

  if (consistencyScore === 'high' && trendinessScore === 'low') {
    return PERSONALITY_TYPES.find((p) => p.id === 'classicist')!;
  }

  // Default to curator
  return PERSONALITY_TYPES.find((p) => p.id === 'curator')!;
}

/**
 * Get mood for a quarter based on dominant tag
 */
export function getQuarterMood(quarter: number, dominantTag: string): string {
  const quarterData = QUARTERLY_MOODS[quarter - 1];
  if (!quarterData) return 'Style Evolution';

  // Try to match tag to a mood
  const tagLower = dominantTag.toLowerCase();

  if (tagLower.includes('cozy') || tagLower.includes('layer') || tagLower.includes('warm')) {
    return quarter === 1 || quarter === 4 ? 'Cozy & Layered' : 'Comfort Mode';
  }

  if (tagLower.includes('bold') || tagLower.includes('statement')) {
    return 'Statement Pieces';
  }

  if (tagLower.includes('chic') || tagLower.includes('elegant')) {
    return 'Effortless Chic';
  }

  if (tagLower.includes('dark') || tagLower.includes('academia')) {
    return 'Dark Academia Energy';
  }

  // Return a random seasonal mood
  const moods = quarterData.seasonalMoods;
  return moods[Math.floor(Math.random() * moods.length)];
}

/**
 * Get color display info
 */
export function getColorInfo(colorName: string): ColorMapping {
  const normalized = colorName.toLowerCase().trim();
  const found = COLOR_MAPPINGS.find((c) => c.name === normalized);
  return (
    found || {
      name: normalized,
      displayName: colorName.charAt(0).toUpperCase() + colorName.slice(1),
      emoji: '🎨',
      hex: '#888888',
    }
  );
}

/**
 * Generate a unique share token
 */
export function generateWrappedShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 24; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `wrp_${result}`;
}

