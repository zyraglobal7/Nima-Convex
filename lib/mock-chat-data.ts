// Mock data for Ask Nima chat feature
import { Look, mockLooks, type Product } from './mock-data';

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'nima';
  content: string;
  timestamp: Date;
  type: 'text' | 'searching' | 'fitting-ready';
  sessionId?: string; // Links to fitting room if type is 'fitting-ready'
}

export interface ChatConversation {
  id: string;
  title: string; // First user message or generated title
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
  searchSessions: string[]; // Array of session IDs
}

export interface FittingLook extends Look {
  userTryOnImageUrl: string; // Virtual try-on image URL
  isLiked: boolean;
  isSaved: boolean;
}

export interface SearchSession {
  id: string;
  chatId: string;
  query: string; // Original user request summary
  looks: FittingLook[];
  createdAt: Date;
}

// ============================================================================
// Constants
// ============================================================================

export const FREE_SEARCHES_PER_DAY = 2;

// ============================================================================
// Nima Greetings (gender-neutral, playful)
// ============================================================================

export const nimaGreetings = [
  "Hey there! What are we styling today? ✨",
  "Ready to find your next favorite look?",
  "Let's create some magic together! What's the occasion?",
  "Hey gorgeous! Tell me what you need 💫",
  "What's on your mind? Let's find the perfect fit!",
  "Style time! What look are we going for?",
  "Hey! Ready to discover something amazing?",
  "Let's get you looking incredible! What's up?",
];

// ============================================================================
// Quick Prompt Suggestions
// ============================================================================

export const quickPrompts = [
  {
    id: 'wedding',
    text: "I need a wedding guest outfit for...",
    icon: '💒',
  },
  {
    id: 'birthday',
    text: "Style me for a birthday celebration",
    icon: '🎂',
  },
  {
    id: 'work',
    text: "New work wardrobe essentials",
    icon: '💼',
  },
  {
    id: 'brunch',
    text: "Casual weekend brunch look",
    icon: '🥐',
  },
  {
    id: 'date',
    text: "First date outfit ideas",
    icon: '💕',
  },
  {
    id: 'vacation',
    text: "Vacation packing must-haves",
    icon: '✈️',
  },
  {
    id: 'interview',
    text: "Job interview power outfit",
    icon: '🎯',
  },
  {
    id: 'night-out',
    text: "Night out with friends",
    icon: '🌙',
  },
];

// ============================================================================
// Follow-up Questions (Nima asks these to understand the request better)
// ============================================================================

export const followUpQuestions = {
  occasion: [
    "What's the occasion? Is it formal, semi-formal, or casual?",
    "Tell me more about the event - is there a dress code?",
    "Where will you be wearing this? Indoor, outdoor, or both?",
  ],
  budget: [
    "What's your budget range for this look?",
    "Are you looking to splurge or keep it budget-friendly?",
    "Any price range in mind? I can work with any budget!",
  ],
  vibe: [
    "What vibe are you going for? Classic, trendy, bold?",
    "Do you want to stand out or blend in elegantly?",
    "Any specific colors or styles you're drawn to?",
  ],
  reusability: [
    "Is this for a one-time event or something you'll wear again?",
    "Looking for versatile pieces or something special just for this?",
    "Would you prefer items you can mix into your existing wardrobe?",
  ],
  comfort: [
    "How important is comfort? Will you be on your feet a lot?",
    "Any preferences on fit - relaxed or more fitted?",
    "Do you prefer heels or would you rather stay in flats?",
  ],
};

// ============================================================================
// Searching Status Messages
// ============================================================================

export const searchingMessages = [
  "Understanding your style...",
  "Browsing the latest collections...",
  "Curating perfect looks for you...",
  "Finding pieces that match your vibe...",
  "Almost there, just adding finishing touches...",
  "Putting together some amazing options...",
];

// ============================================================================
// Mock Try-On Images (using fashion model images as placeholders)
// ============================================================================

const tryOnImages = [
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600&h=900&fit=crop',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=900&fit=crop',
];

// ============================================================================
// Mock Search Sessions (Fitting Room Results)
// ============================================================================

function createFittingLook(look: Look, tryOnIndex: number): FittingLook {
  return {
    ...look,
    userTryOnImageUrl: tryOnImages[tryOnIndex % tryOnImages.length],
    isLiked: false,
    isSaved: false,
  };
}

export const mockSearchSessions: SearchSession[] = [
  {
    id: 'session-001',
    chatId: 'chat-001',
    query: 'Wedding guest outfit - garden party, semi-formal',
    looks: [
      createFittingLook(mockLooks[0], 0),
      createFittingLook(mockLooks[4], 1),
      createFittingLook(mockLooks[5], 2),
      createFittingLook(mockLooks[10], 3),
    ],
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: 'session-002',
    chatId: 'chat-001',
    query: 'Casual Friday office look',
    looks: [
      createFittingLook(mockLooks[1], 2),
      createFittingLook(mockLooks[3], 3),
      createFittingLook(mockLooks[7], 4),
    ],
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
  },
  {
    id: 'session-003',
    chatId: 'chat-002',
    query: 'Birthday dinner outfit - upscale restaurant',
    looks: [
      createFittingLook(mockLooks[2], 1),
      createFittingLook(mockLooks[5], 3),
      createFittingLook(mockLooks[8], 5),
      createFittingLook(mockLooks[11], 0),
    ],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  },
];

// ============================================================================
// Mock Chat Conversations
// ============================================================================

export const mockConversations: ChatConversation[] = [
  {
    id: 'chat-001',
    title: 'Wedding guest outfit',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
    searchSessions: ['session-001', 'session-002'],
    messages: [
      {
        id: 'msg-001',
        role: 'nima',
        content: "Hey there! What are we styling today? ✨",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
        type: 'text',
      },
      {
        id: 'msg-002',
        role: 'user',
        content: "I need an outfit for a wedding next weekend. It's a garden party.",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 + 30000),
        type: 'text',
      },
      {
        id: 'msg-003',
        role: 'nima',
        content: "Oh exciting! A garden wedding sounds lovely 🌸 Is it a daytime or evening event? And what's the dress code - formal, semi-formal, or more relaxed?",
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000 + 60000),
        type: 'text',
      },
      {
        id: 'msg-004',
        role: 'user',
        content: "It's in the afternoon, semi-formal. I want something elegant but not too stuffy.",
        timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000),
        type: 'text',
      },
      {
        id: 'msg-005',
        role: 'nima',
        content: "Perfect! I'm thinking flowy fabrics, soft colors, maybe some floral or earthy tones. Any colors you love or want to avoid?",
        timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000 + 30000),
        type: 'text',
      },
      {
        id: 'msg-006',
        role: 'user',
        content: "I love blush pink and sage green! No bright red please.",
        timestamp: new Date(Date.now() - 2.4 * 60 * 60 * 1000),
        type: 'text',
      },
      {
        id: 'msg-007',
        role: 'nima',
        content: "Great taste! Let me find some gorgeous options for you...",
        timestamp: new Date(Date.now() - 2.4 * 60 * 60 * 1000 + 15000),
        type: 'text',
      },
      {
        id: 'msg-008',
        role: 'nima',
        content: '',
        timestamp: new Date(Date.now() - 2.3 * 60 * 60 * 1000),
        type: 'fitting-ready',
        sessionId: 'session-001',
      },
      {
        id: 'msg-009',
        role: 'user',
        content: "These are amazing! Can you also find me something for casual Friday at work?",
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
        type: 'text',
      },
      {
        id: 'msg-010',
        role: 'nima',
        content: "Absolutely! What's your office vibe - startup casual or corporate relaxed?",
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000 + 20000),
        type: 'text',
      },
      {
        id: 'msg-011',
        role: 'user',
        content: "Startup casual, but I still want to look put together.",
        timestamp: new Date(Date.now() - 1.4 * 60 * 60 * 1000),
        type: 'text',
      },
      {
        id: 'msg-012',
        role: 'nima',
        content: "Got it! Polished but comfortable. Let me work my magic ✨",
        timestamp: new Date(Date.now() - 1.4 * 60 * 60 * 1000 + 15000),
        type: 'text',
      },
      {
        id: 'msg-013',
        role: 'nima',
        content: '',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
        type: 'fitting-ready',
        sessionId: 'session-002',
      },
    ],
  },
  {
    id: 'chat-002',
    title: 'Birthday dinner outfit',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    searchSessions: ['session-003'],
    messages: [
      {
        id: 'msg-020',
        role: 'nima',
        content: "Ready to find your next favorite look? 💫",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
        type: 'text',
      },
      {
        id: 'msg-021',
        role: 'user',
        content: "It's my birthday next week! I'm going to a fancy dinner.",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 30000),
        type: 'text',
      },
      {
        id: 'msg-022',
        role: 'nima',
        content: "Happy early birthday! 🎂 Let's make you the star! Tell me about the restaurant - is it super upscale or more trendy-chic?",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60000),
        type: 'text',
      },
      {
        id: 'msg-023',
        role: 'user',
        content: "Upscale! It's a celebration so I want to dress up",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 90000),
        type: 'text',
      },
      {
        id: 'msg-024',
        role: 'nima',
        content: "I love that energy! Let me find some showstopping looks for your special night...",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 120000),
        type: 'text',
      },
      {
        id: 'msg-025',
        role: 'nima',
        content: '',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000 + 180000),
        type: 'fitting-ready',
        sessionId: 'session-003',
      },
    ],
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getRandomGreeting(): string {
  return nimaGreetings[Math.floor(Math.random() * nimaGreetings.length)];
}

export function getRandomSearchingMessage(): string {
  return searchingMessages[Math.floor(Math.random() * searchingMessages.length)];
}

export function getConversationById(chatId: string): ChatConversation | undefined {
  return mockConversations.find((c) => c.id === chatId);
}

export function getSearchSessionById(sessionId: string): SearchSession | undefined {
  return mockSearchSessions.find((s) => s.id === sessionId);
}

export function generateChatId(): string {
  return `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Get all products from all looks in a session (for swapping)
export function getAllProductsInSession(session: SearchSession): Product[] {
  const productMap = new Map<string, Product>();
  session.looks.forEach((look) => {
    look.products.forEach((product) => {
      productMap.set(product.id, product);
    });
  });
  return Array.from(productMap.values());
}

// Get alternative products for swapping (same category, different product)
export function getSwappableProducts(
  session: SearchSession,
  currentProductId: string,
  category: Product['category']
): Product[] {
  const allProducts = getAllProductsInSession(session);
  return allProducts.filter(
    (p) => p.id !== currentProductId && p.category === category
  );
}

// Format relative time
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Create a new empty conversation
export function createNewConversation(): ChatConversation {
  const greeting = getRandomGreeting();
  return {
    id: generateChatId(),
    title: 'New conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
    searchSessions: [],
    messages: [
      {
        id: generateMessageId(),
        role: 'nima',
        content: greeting,
        timestamp: new Date(),
        type: 'text',
      },
    ],
  };
}

// Generate mock fitting results for a new search
export function generateMockFittingResults(chatId: string, query: string): SearchSession {
  // Pick 3-5 random looks from mockLooks
  const numLooks = 3 + Math.floor(Math.random() * 3);
  const shuffled = [...mockLooks].sort(() => Math.random() - 0.5);
  const selectedLooks = shuffled.slice(0, numLooks);

  return {
    id: generateSessionId(),
    chatId,
    query,
    looks: selectedLooks.map((look, index) => createFittingLook(look, index)),
    createdAt: new Date(),
  };
}

