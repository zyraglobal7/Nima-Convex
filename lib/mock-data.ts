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

function generateNimaNote(products: Product[], styleTags: string[], occasion: string): string {
  const template = nimaCommentary[Math.floor(Math.random() * nimaCommentary.length)];
  const mainProduct = products[0];
  const secondProduct = products.length > 1 ? products[1] : products[0];
  
  return template
    .replace(/{color}/g, mainProduct.color.toLowerCase())
    .replace(/{item}/g, mainProduct.name.toLowerCase())
    .replace(/{item2}/g, secondProduct.name.toLowerCase())
    .replace(/{style}/g, styleTags[0]?.toLowerCase() || 'elegant')
    .replace(/{occasion}/g, occasion.toLowerCase());
}

// Generate dates for looks (today, yesterday, last week)
function generateDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(Math.floor(Math.random() * 12) + 8); // Between 8am and 8pm
  return date;
}


// Mock looks - fashion outfit images
export const mockLooks: Look[] = [
  {
    id: 'look-1',
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop',
    products: [mockProducts[0], mockProducts[4], mockProducts[8]],
    totalPrice: 19200,
    currency: 'KES',
    styleTags: ['Elegant', 'Minimal'],
    occasion: 'Office',
    nimaNote: '',
    createdAt: generateDate(0),
    height: 'tall',
  },
  {
    id: 'look-2',
    imageUrl: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=800&fit=crop',
    products: [mockProducts[1], mockProducts[6], mockProducts[9]],
    totalPrice: 23600,
    currency: 'KES',
    styleTags: ['Casual', 'Weekend'],
    occasion: 'Brunch',
    nimaNote: '',
    createdAt: generateDate(0),
    height: 'medium',
  },
  {
    id: 'look-3',
    imageUrl: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&h=1000&fit=crop',
    products: [mockProducts[3], mockProducts[7], mockProducts[10]],
    totalPrice: 18500,
    currency: 'KES',
    styleTags: ['Edgy', 'Street'],
    occasion: 'Night Out',
    nimaNote: '',
    createdAt: generateDate(0),
    height: 'extra-tall',
  },
  {
    id: 'look-4',
    imageUrl: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=700&fit=crop',
    products: [mockProducts[2], mockProducts[5], mockProducts[13]],
    totalPrice: 12100,
    currency: 'KES',
    styleTags: ['Casual', 'Relaxed'],
    occasion: 'Weekend',
    nimaNote: '',
    createdAt: generateDate(1),
    height: 'short',
  },
  {
    id: 'look-5',
    imageUrl: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?w=600&h=850&fit=crop',
    products: [mockProducts[11], mockProducts[0], mockProducts[4]],
    totalPrice: 24700,
    currency: 'KES',
    styleTags: ['Elegant', 'Professional'],
    occasion: 'Meeting',
    nimaNote: '',
    createdAt: generateDate(1),
    height: 'medium',
  },
  {
    id: 'look-6',
    imageUrl: 'https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=600&h=950&fit=crop',
    products: [mockProducts[12], mockProducts[2], mockProducts[8]],
    totalPrice: 18800,
    currency: 'KES',
    styleTags: ['Smart Casual', 'Versatile'],
    occasion: 'Date Night',
    nimaNote: '',
    createdAt: generateDate(1),
    height: 'tall',
  },
  {
    id: 'look-7',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&h=800&fit=crop',
    products: [mockProducts[1], mockProducts[7], mockProducts[14], mockProducts[15]],
    totalPrice: 31300,
    currency: 'KES',
    styleTags: ['Chic', 'Modern'],
    occasion: 'Shopping',
    nimaNote: '',
    createdAt: generateDate(2),
    height: 'medium',
  },
  {
    id: 'look-8',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&h=750&fit=crop',
    products: [mockProducts[3], mockProducts[5], mockProducts[9]],
    totalPrice: 15500,
    currency: 'KES',
    styleTags: ['Casual', 'Comfortable'],
    occasion: 'Everyday',
    nimaNote: '',
    createdAt: generateDate(3),
    height: 'short',
  },
  {
    id: 'look-9',
    imageUrl: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600&h=900&fit=crop',
    products: [mockProducts[0], mockProducts[6], mockProducts[10], mockProducts[13]],
    totalPrice: 21000,
    currency: 'KES',
    styleTags: ['Bohemian', 'Free-spirited'],
    occasion: 'Festival',
    nimaNote: '',
    createdAt: generateDate(3),
    height: 'tall',
  },
  {
    id: 'look-10',
    imageUrl: 'https://images.unsplash.com/photo-1475180429478-0e955f89e9db?w=600&h=1000&fit=crop',
    products: [mockProducts[2], mockProducts[4], mockProducts[8], mockProducts[14]],
    totalPrice: 21700,
    currency: 'KES',
    styleTags: ['Minimal', 'Clean'],
    occasion: 'Work',
    nimaNote: '',
    createdAt: generateDate(4),
    height: 'extra-tall',
  },
  {
    id: 'look-11',
    imageUrl: 'https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?w=600&h=800&fit=crop',
    products: [mockProducts[11], mockProducts[1], mockProducts[7]],
    totalPrice: 30100,
    currency: 'KES',
    styleTags: ['Sophisticated', 'Timeless'],
    occasion: 'Dinner',
    nimaNote: '',
    createdAt: generateDate(5),
    height: 'medium',
  },
  {
    id: 'look-12',
    imageUrl: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?w=600&h=850&fit=crop',
    products: [mockProducts[3], mockProducts[6], mockProducts[9], mockProducts[15]],
    totalPrice: 23000,
    currency: 'KES',
    styleTags: ['Trendy', 'Fashion-forward'],
    occasion: 'Event',
    nimaNote: '',
    createdAt: generateDate(5),
    height: 'tall',
  },
  {
    id: 'look-13',
    imageUrl: 'https://images.unsplash.com/photo-1495385794356-15371f348c31?w=600&h=700&fit=crop',
    products: [mockProducts[0], mockProducts[5], mockProducts[10]],
    totalPrice: 16100,
    currency: 'KES',
    styleTags: ['Classic', 'Refined'],
    occasion: 'Lunch',
    nimaNote: '',
    createdAt: generateDate(6),
    height: 'short',
  },
  {
    id: 'look-14',
    imageUrl: 'https://images.unsplash.com/photo-1509551388413-e18d0ac5d495?w=600&h=900&fit=crop',
    products: [mockProducts[12], mockProducts[2], mockProducts[4], mockProducts[8]],
    totalPrice: 22300,
    currency: 'KES',
    styleTags: ['Preppy', 'Polished'],
    occasion: 'Campus',
    nimaNote: '',
    createdAt: generateDate(6),
    height: 'tall',
  },
  {
    id: 'look-15',
    imageUrl: 'https://images.unsplash.com/photo-1492707892479-7bc8d5a4ee93?w=600&h=800&fit=crop',
    products: [mockProducts[1], mockProducts[6], mockProducts[9], mockProducts[14]],
    totalPrice: 28400,
    currency: 'KES',
    styleTags: ['Romantic', 'Soft'],
    occasion: 'Date',
    nimaNote: '',
    createdAt: generateDate(7),
    height: 'medium',
  },
  {
    id: 'look-16',
    imageUrl: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&h=750&fit=crop',
    products: [mockProducts[3], mockProducts[7], mockProducts[10], mockProducts[15]],
    totalPrice: 26700,
    currency: 'KES',
    styleTags: ['Sporty', 'Active'],
    occasion: 'Casual Friday',
    nimaNote: '',
    createdAt: generateDate(8),
    height: 'short',
  },
];

// Generate Nima notes for all looks
mockLooks.forEach((look) => {
  look.nimaNote = generateNimaNote(look.products, look.styleTags, look.occasion);
});

// Mock lookbooks
export const mockLookbooks: Lookbook[] = [
  {
    id: 'lookbook-1',
    name: 'Work Essentials',
    description: 'Professional looks for the office',
    lookIds: ['look-1', 'look-5', 'look-10'],
    createdAt: generateDate(10),
    coverImageUrl: mockLooks[0].imageUrl,
  },
  {
    id: 'lookbook-2',
    name: 'Weekend Vibes',
    description: 'Relaxed styles for days off',
    lookIds: ['look-2', 'look-4', 'look-8'],
    createdAt: generateDate(15),
    coverImageUrl: mockLooks[1].imageUrl,
  },
];

// Helper to get a look by ID
export function getLookById(id: string): Look | undefined {
  return mockLooks.find((look) => look.id === id);
}

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

