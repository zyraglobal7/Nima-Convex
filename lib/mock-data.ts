// Mock data for Nima AI - Post-signup flow

export interface MockUser {
  id: string;
  name: string;
  email: string;
  gender: 'male' | 'female' | 'prefer-not-to-say';
  stylePreferences: string[];
  shirtSize: string;
  waistSize: string;
  country: string;
  currency: string;
  budgetRange: 'low' | 'mid' | 'premium';
  avatarUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: 'top' | 'bottom' | 'shoes' | 'accessory' | 'outerwear';
  price: number;
  currency: string;
  imageUrl: string;
  storeUrl: string;
  storeName: string;
  color: string;
  size?: string;
}

export interface Look {
  id: string;
  imageUrl: string;
  products: Product[];
  totalPrice: number;
  currency: string;
  styleTags: string[];
  occasion: string;
  nimaNote: string;
  createdAt: Date;
  height: 'short' | 'medium' | 'tall' | 'extra-tall'; // For masonry effect
  isLiked?: boolean;
  isDisliked?: boolean;
}

export interface Lookbook {
  id: string;
  name: string;
  description?: string;
  lookIds: string[];
  createdAt: Date;
  coverImageUrl?: string;
}

// Helper to get date group label
export function getDateGroupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);

  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (itemDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (itemDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  } else if (itemDate >= lastWeek) {
    return 'Last 7 Days';
  } else {
    return 'Earlier';
  }
}

// Group looks by date
export function groupLooksByDate(looks: Look[]): Map<string, Look[]> {
  const groups = new Map<string, Look[]>();
  const sortedLooks = [...looks].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  sortedLooks.forEach((look) => {
    const label = getDateGroupLabel(look.createdAt);
    const existing = groups.get(label) || [];
    groups.set(label, [...existing, look]);
  });

  return groups;
}

// Default mock user (can be overridden by localStorage)
export const defaultMockUser: MockUser = {
  id: 'mock-user-1',
  name: 'Style Explorer',
  email: 'explorer@nima.ai',
  gender: 'female',
  stylePreferences: ['Casual', 'Elegant', 'Minimalist'],
  shirtSize: 'M',
  waistSize: '28',
  country: 'Kenya',
  currency: 'KES',
  budgetRange: 'mid',
};

// Get mock user from localStorage or return default
export function getMockUser(): MockUser {
  if (typeof window === 'undefined') return defaultMockUser;
  
  const stored = localStorage.getItem('nima-onboarding-data');
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return {
        id: 'mock-user-1',
        name: data.email?.split('@')[0] || 'Style Explorer',
        email: data.email || defaultMockUser.email,
        gender: data.gender || defaultMockUser.gender,
        stylePreferences: data.stylePreferences || defaultMockUser.stylePreferences,
        shirtSize: data.shirtSize || defaultMockUser.shirtSize,
        waistSize: data.waistSize || defaultMockUser.waistSize,
        country: data.country || defaultMockUser.country,
        currency: data.currency || defaultMockUser.currency,
        budgetRange: data.budgetRange || defaultMockUser.budgetRange,
      };
    } catch {
      return defaultMockUser;
    }
  }
  return defaultMockUser;
}

// Mock products
export const mockProducts: Product[] = [
  // Tops
  {
    id: 'prod-1',
    name: 'Silk Blend Blouse',
    brand: 'Zara',
    category: 'top',
    price: 4500,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400&h=500&fit=crop',
    storeUrl: 'https://www.zara.com',
    storeName: 'Zara',
    color: 'Ivory',
  },
  {
    id: 'prod-2',
    name: 'Cashmere Crew Neck',
    brand: 'Massimo Dutti',
    category: 'top',
    price: 8900,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&h=500&fit=crop',
    storeUrl: 'https://www.massimodutti.com',
    storeName: 'Massimo Dutti',
    color: 'Camel',
  },
  {
    id: 'prod-3',
    name: 'Linen Button-Down',
    brand: 'H&M',
    category: 'top',
    price: 2800,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&h=500&fit=crop',
    storeUrl: 'https://www.hm.com',
    storeName: 'H&M',
    color: 'White',
  },
  {
    id: 'prod-4',
    name: 'Burgundy Knit Top',
    brand: 'Mango',
    category: 'top',
    price: 3500,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=400&h=500&fit=crop',
    storeUrl: 'https://www.mango.com',
    storeName: 'Mango',
    color: 'Burgundy',
  },
  // Bottoms
  {
    id: 'prod-5',
    name: 'High-Rise Tailored Trousers',
    brand: 'Zara',
    category: 'bottom',
    price: 5200,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop',
    storeUrl: 'https://www.zara.com',
    storeName: 'Zara',
    color: 'Beige',
  },
  {
    id: 'prod-6',
    name: 'Relaxed Fit Chinos',
    brand: 'ASOS',
    category: 'bottom',
    price: 3800,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=500&fit=crop',
    storeUrl: 'https://www.asos.com',
    storeName: 'ASOS',
    color: 'Olive',
  },
  {
    id: 'prod-7',
    name: 'Wide-Leg Linen Pants',
    brand: 'Massimo Dutti',
    category: 'bottom',
    price: 6500,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?w=400&h=500&fit=crop',
    storeUrl: 'https://www.massimodutti.com',
    storeName: 'Massimo Dutti',
    color: 'Sand',
  },
  {
    id: 'prod-8',
    name: 'Classic Denim Jeans',
    brand: 'Levi\'s',
    category: 'bottom',
    price: 7200,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=500&fit=crop',
    storeUrl: 'https://www.levi.com',
    storeName: 'Levi\'s',
    color: 'Indigo',
  },
  // Shoes
  {
    id: 'prod-9',
    name: 'Leather Loafers',
    brand: 'Clarks',
    category: 'shoes',
    price: 9500,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=400&fit=crop',
    storeUrl: 'https://www.clarks.com',
    storeName: 'Clarks',
    color: 'Tan',
  },
  {
    id: 'prod-10',
    name: 'White Sneakers',
    brand: 'Adidas',
    category: 'shoes',
    price: 8200,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop',
    storeUrl: 'https://www.adidas.com',
    storeName: 'Adidas',
    color: 'White',
  },
  {
    id: 'prod-11',
    name: 'Suede Ankle Boots',
    brand: 'Zara',
    category: 'shoes',
    price: 7800,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop',
    storeUrl: 'https://www.zara.com',
    storeName: 'Zara',
    color: 'Brown',
  },
  // Outerwear
  {
    id: 'prod-12',
    name: 'Wool Blend Coat',
    brand: 'Massimo Dutti',
    category: 'outerwear',
    price: 15000,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400&h=500&fit=crop',
    storeUrl: 'https://www.massimodutti.com',
    storeName: 'Massimo Dutti',
    color: 'Camel',
  },
  {
    id: 'prod-13',
    name: 'Lightweight Blazer',
    brand: 'H&M',
    category: 'outerwear',
    price: 5500,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=500&fit=crop',
    storeUrl: 'https://www.hm.com',
    storeName: 'H&M',
    color: 'Navy',
  },
  // Accessories
  {
    id: 'prod-14',
    name: 'Leather Belt',
    brand: 'Mango',
    category: 'accessory',
    price: 2200,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400&h=300&fit=crop',
    storeUrl: 'https://www.mango.com',
    storeName: 'Mango',
    color: 'Brown',
  },
  {
    id: 'prod-15',
    name: 'Minimalist Watch',
    brand: 'Daniel Wellington',
    category: 'accessory',
    price: 12000,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
    storeUrl: 'https://www.danielwellington.com',
    storeName: 'Daniel Wellington',
    color: 'Rose Gold',
  },
  {
    id: 'prod-16',
    name: 'Tote Bag',
    brand: 'Zara',
    category: 'accessory',
    price: 4800,
    currency: 'KES',
    imageUrl: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&h=400&fit=crop',
    storeUrl: 'https://www.zara.com',
    storeName: 'Zara',
    color: 'Cognac',
  },
];

// Nima's styling commentary templates
const nimaCommentary = [
  "This {color} {item} brings out your warm undertones beautifully! The {style} silhouette is perfect for your frame.",
  "I love how the {item} creates such an effortless yet polished look. The {color} palette complements your style preferences.",
  "This outfit screams {occasion}! The {item} paired with {item2} is a combination I knew you'd love.",
  "The relaxed fit of the {item} keeps it comfortable while the {color} adds sophistication. You'll turn heads!",
  "This {style} ensemble is exactly what I had in mind for you. The {color} tones work beautifully together.",
  "Notice how the {item} elevates the whole look? This is the kind of effortless elegance that suits you perfectly.",
  "I curated this look because I know you appreciate {style} pieces. The {color} {item} is the star here!",
  "This combination of {item} and {item2} creates such a harmonious silhouette. The {color} palette is very you!",
];

// NOTE: Mock looks have been removed to prevent fake/inaccurate images from being displayed.
// All look data should now come from the database via Convex queries.

// Helper to format price
// Note: For mock data, prices are in whole currency units
// For real database data, use the formatPrice from lib/utils/format.ts which handles cents
export function formatPrice(price: number, currency: string = 'KES'): string {
  return `${currency} ${price.toLocaleString()}`;
}

// Loading messages for the loading screen
export const loadingMessages = [
  "Curating your perfect looks...",
  "Learning your unique style...",
  "Finding fits that complement you...",
  "Matching outfits to your preferences...",
  "Preparing your personalized feed...",
  "Almost there, gorgeous...",
];

// Discover page welcome message
export const discoverWelcomeMessage = "Here's what I found for you! These looks are curated based on your style preferences. Tap any outfit to see the details and shop the pieces.";

