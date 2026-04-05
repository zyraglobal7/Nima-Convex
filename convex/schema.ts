import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  // ============================================
  // USERS & USER DATA
  // ============================================

  /**
   * users - Core user profile linked to WorkOS
   * Contains auth info, profile data, onboarding preferences, and subscription status
   */
  users: defineTable({
    // WorkOS linkage
    workosUserId: v.string(), // WorkOS user ID (subject from JWT)
    email: v.string(),
    emailVerified: v.boolean(),

    // Profile
    username: v.optional(v.string()), // Unique username (set by user)
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    profileImageId: v.optional(v.id('_storage')), // From WorkOS or uploaded
    profileImageUrl: v.optional(v.string()), // External URL fallback

    // Onboarding data
    gender: v.optional(
      v.union(v.literal('male'), v.literal('female'), v.literal('prefer-not-to-say'))
    ),
    age: v.optional(v.string()),
    stylePreferences: v.array(v.string()), // ["Casual", "Minimalist", etc.]

    // Size & Fit
    shirtSize: v.optional(v.string()),
    waistSize: v.optional(v.string()),
    height: v.optional(v.string()),
    heightUnit: v.optional(v.union(v.literal('cm'), v.literal('ft'))),
    shoeSize: v.optional(v.string()),
    shoeSizeUnit: v.optional(v.union(v.literal('EU'), v.literal('US'), v.literal('UK'))),

    // Location & Budget
    country: v.optional(v.string()),
    currency: v.optional(v.string()),
    budgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),
    occasions: v.optional(v.array(v.string())), // ["Work/Office", "Casual Hangouts", etc.]

    // Optional contact (for future)
    phoneNumber: v.optional(v.string()),
    phoneVerified: v.optional(v.boolean()),

    // Subscription & Limits
    subscriptionTier: v.union(v.literal('free'), v.literal('style_pass'), v.literal('vip')),
    dailyTryOnCount: v.number(), // Deprecated - kept for backward compat
    dailyTryOnResetAt: v.number(), // Deprecated - kept for backward compat

    // Credits system (replaces daily try-on limits)
    credits: v.optional(v.number()), // Purchased credits balance
    freeCreditsUsedThisWeek: v.optional(v.number()), // 0-5, how many of the 5 free weekly credits used
    weeklyCreditsResetAt: v.optional(v.number()), // Timestamp when free credits were last reset

    // Status
    onboardingCompleted: v.boolean(),
    onboardingWorkflowStartedAt: v.optional(v.number()), // Prevents double-triggering the look generation workflow
    styleProfile: v.optional(v.string()), // AI-generated detailed style profile (derived from raw preferences)
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Role-based access control
    role: v.optional(v.union(v.literal('user'), v.literal('admin'), v.literal('seller'))),

    // Saved shipping address (auto-saved from last order for checkout pre-fill)
    savedShippingAddress: v.optional(v.object({
      fullName: v.string(),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    })),
  })
    .index('by_workos_user_id', ['workosUserId'])
    .index('by_email', ['email'])
    .index('by_username', ['username']),

  /**
   * user_images - User photos for virtual try-on
   * Stores references to uploaded images with metadata and processing status
   * 
   * Note: userId is optional to support onboarding flow where images are uploaded
   * before the user is authenticated. onboardingToken is used to track these images
   * and link them to the user after authentication.
   */
  user_images: defineTable({
    userId: v.optional(v.id('users')), // Optional during onboarding
    storageId: v.id('_storage'),

    // Onboarding support - used to claim images after auth
    onboardingToken: v.optional(v.string()),

    // Image metadata
    filename: v.optional(v.string()),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),

    // Classification
    imageType: v.union(
      v.literal('full_body'),
      v.literal('upper_body'),
      v.literal('face'),
      v.literal('other')
    ),
    isPrimary: v.boolean(), // Primary image for try-on

    // Processing status
    // 'onboarding' - uploaded during onboarding, not yet linked to user
    // 'pending' - linked to user, waiting for processing
    // 'processed' - ready for use
    // 'failed' - processing failed
    status: v.union(
      v.literal('onboarding'),
      v.literal('pending'),
      v.literal('processed'),
      v.literal('failed')
    ),
    processedUrl: v.optional(v.string()), // URL after processing (if needed)

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_primary', ['userId', 'isPrimary'])
    .index('by_onboarding_token', ['onboardingToken']),

  // ============================================
  // ITEMS & PRODUCTS
  // ============================================

  /**
   * items - Fashion products/clothing items
   * Comprehensive product catalog with categorization, pricing, and style tags
   */
  items: defineTable({
    // Seller ownership (optional - null means Nima curated)
    sellerId: v.optional(v.id('sellers')),

    // Identity
    publicId: v.string(), // External-facing ID (item_xxx)
    sku: v.optional(v.string()),

    // Basic info
    name: v.string(),
    brand: v.optional(v.string()),
    description: v.optional(v.string()),

    // Categorization
    category: v.union(
      v.literal('top'),
      v.literal('bottom'),
      v.literal('dress'),
      v.literal('outfit'),
      v.literal('outerwear'),
      v.literal('shoes'),
      v.literal('accessory'),
      v.literal('bag'),
      v.literal('jewelry'),
      v.literal('swimwear')
    ),
    subcategory: v.optional(v.string()), // e.g., "t-shirt", "jeans", "sneakers"
    gender: v.union(v.literal('male'), v.literal('female'), v.literal('unisex')),

    // Pricing (in smallest currency unit - cents/cents)
    price: v.number(),
    currency: v.string(),
    originalPrice: v.optional(v.number()), // For sale items

    // Attributes
    colors: v.array(v.string()),
    sizes: v.array(v.string()),
    material: v.optional(v.string()),

    // Style tags (for matching)
    tags: v.array(v.string()), // ["casual", "formal", "summer"]
    occasion: v.optional(v.array(v.string())), // ["work", "date_night", "weekend"]
    season: v.optional(v.array(v.string())), // ["summer", "winter", "all_season"]

    // Source
    sourceStore: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    affiliateUrl: v.optional(v.string()),

    // Stock & Availability
    inStock: v.boolean(),
    stockQuantity: v.optional(v.number()),

    // Status
    isActive: v.boolean(),
    isFeatured: v.optional(v.boolean()),

    // Performance metrics (for seller dashboard)
    viewCount: v.optional(v.number()),
    saveCount: v.optional(v.number()),
    purchaseCount: v.optional(v.number()),
    tryOnCount: v.optional(v.number()),
    lookbookSaveCount: v.optional(v.number()),
    cartAddCount: v.optional(v.number()),
    lookInclusionCount: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_category', ['category'])
    .index('by_gender_and_category', ['gender', 'category'])
    .index('by_active_and_category', ['isActive', 'category'])
    .index('by_active_and_gender', ['isActive', 'gender'])
    .index('by_seller', ['sellerId'])
    .index('by_seller_and_active', ['sellerId', 'isActive'])
    .searchIndex('search_items', {
      searchField: 'name',
      filterFields: ['category', 'gender', 'isActive'],
    }),

  /**
   * item_images - Product images
   * Multiple images per item with ordering and type classification
   */
  item_images: defineTable({
    itemId: v.id('items'),
    storageId: v.optional(v.id('_storage')), // Internal storage
    externalUrl: v.optional(v.string()), // External URL

    // Image details
    altText: v.optional(v.string()),
    sortOrder: v.number(), // For ordering
    isPrimary: v.boolean(),

    // Image type
    imageType: v.union(
      v.literal('front'),
      v.literal('back'),
      v.literal('side'),
      v.literal('detail'),
      v.literal('model'),
      v.literal('flat_lay')
    ),

    createdAt: v.number(),
  })
    .index('by_item', ['itemId'])
    .index('by_item_and_primary', ['itemId', 'isPrimary']),

  // ============================================
  // LOOKS & OUTFITS
  // ============================================

  /**
   * looks - Curated outfit combinations
   * Collection of items styled together with Nima's commentary
   */
  looks: defineTable({
    publicId: v.string(), // look_xxx

    // Items in the look
    itemIds: v.array(v.id('items')),

    // Pricing (computed)
    totalPrice: v.number(),
    currency: v.string(),

    // Style info
    name: v.optional(v.string()),
    styleTags: v.array(v.string()),
    occasion: v.optional(v.string()),
    season: v.optional(v.string()),

    // Nima's commentary
    nimaComment: v.optional(v.string()), // AI-generated stylist note

    // Target audience
    targetGender: v.union(v.literal('male'), v.literal('female'), v.literal('unisex')),
    targetBudgetRange: v.optional(v.union(v.literal('low'), v.literal('mid'), v.literal('premium'))),

    // Status & Metrics
    isActive: v.boolean(),
    isFeatured: v.optional(v.boolean()),
    isPublic: v.optional(v.boolean()), // For user-shareable looks on /explore
    sharedWithFriends: v.optional(v.boolean()), // Share with friends (can be true even if isPublic is false)
    viewCount: v.optional(v.number()),
    saveCount: v.optional(v.number()),

    // Variant info (for single-item looks like try-ons)
    selectedSize: v.optional(v.string()), // e.g. "M", "US 10"
    selectedColor: v.optional(v.string()), // e.g. "Red", "Navy"

    // Image generation status for workflow
    generationStatus: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('processing'),
        v.literal('completed'),
        v.literal('failed')
      )
    ),

    // User save/discard status
    // 'pending' = just generated, not saved yet
    // 'saved' = user saved it to lookbooks
    // 'discarded' = user discarded it (can be restored)
    status: v.optional(
      v.union(
        v.literal('pending'),
        v.literal('saved'),
        v.literal('discarded')
      )
    ),

    // Creator (for user-generated looks in future)
    createdBy: v.optional(v.union(v.literal('system'), v.literal('user'))),
    creatorUserId: v.optional(v.id('users')),

    // Creation source - how the look was created
    // 'chat' = Created via AI chat conversation
    // 'apparel' = Created via "Create a Look" feature on Apparel tab
    // 'recreated' = Recreated from another user's look
    // 'shared' = Received via direct message from another user
    // 'system' = System/admin created
    creationSource: v.optional(
      v.union(
        v.literal('chat'),
        v.literal('apparel'),
        v.literal('recreated'),
        v.literal('shared'),
        v.literal('system')
      )
    ),
    // For recreated looks, track the original look
    originalLookId: v.optional(v.id('looks')),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_public_id', ['publicId'])
    .index('by_active_and_gender', ['isActive', 'targetGender'])
    .index('by_occasion', ['occasion'])
    .index('by_active_and_featured', ['isActive', 'isFeatured'])
    .index('by_creator_and_status', ['creatorUserId', 'generationStatus'])
    .index('by_public_and_active', ['isPublic', 'isActive'])
    .index('by_user_and_save_status', ['creatorUserId', 'status'])
    .index('by_creation_source', ['creationSource']),

  /**
   * look_images - AI-generated try-on images
   * Cached images showing a user wearing a specific look
   */
  look_images: defineTable({
    lookId: v.id('looks'),
    userId: v.id('users'),
    storageId: v.optional(v.id('_storage')), // Optional until generation completes

    // Source info
    userImageId: v.id('user_images'), // Which user photo was used

    // Generation details
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    generationProvider: v.optional(v.string()), // "fashn_ai", "kolors", etc.
    generationJobId: v.optional(v.string()), // External job ID
    errorMessage: v.optional(v.string()),

    // Expiry (for cache management)
    expiresAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_look', ['lookId'])
    .index('by_look_and_user', ['lookId', 'userId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // ============================================
  // LOOKBOOKS & COLLECTIONS
  // ============================================

  /**
   * lookbooks - User collections (like Pinterest boards)
   * Allows users to save and organize looks and items
   */
  lookbooks: defineTable({
    userId: v.id('users'),

    name: v.string(),
    description: v.optional(v.string()),
    coverImageId: v.optional(v.id('_storage')), // Custom cover
    autoCoverItemId: v.optional(v.id('items')), // Auto-generated from first item

    // Visibility
    isPublic: v.boolean(),
    shareToken: v.optional(v.string()), // For sharing private lookbooks

    // Collaboration (future)
    isCollaborative: v.optional(v.boolean()),
    collaboratorIds: v.optional(v.array(v.id('users'))),

    // Metrics
    itemCount: v.number(), // Denormalized for performance

    // Status
    isArchived: v.optional(v.boolean()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_archived', ['userId', 'isArchived'])
    .index('by_share_token', ['shareToken']),

  /**
   * lookbook_items - Items saved to lookbooks
   * Junction table supporting both looks and individual items
   */
  lookbook_items: defineTable({
    lookbookId: v.id('lookbooks'),
    userId: v.id('users'), // Denormalized for fast queries

    // Can save either a look or individual item
    itemType: v.union(v.literal('look'), v.literal('item')),
    lookId: v.optional(v.id('looks')),
    itemId: v.optional(v.id('items')),

    // User notes
    note: v.optional(v.string()),

    // Ordering
    sortOrder: v.number(),

    createdAt: v.number(),
  })
    .index('by_lookbook', ['lookbookId'])
    .index('by_user', ['userId'])
    .index('by_lookbook_and_item', ['lookbookId', 'itemId'])
    .index('by_lookbook_and_look', ['lookbookId', 'lookId']),

  // ============================================
  // CHAT & MESSAGING
  // ============================================

  /**
   * threads - Chat threads with Nima AI
   * Conversation containers with optional context (look, item, etc.)
   */
  threads: defineTable({
    userId: v.id('users'),

    title: v.optional(v.string()), // Auto-generated or user-set

    // Context
    contextType: v.optional(
      v.union(v.literal('general'), v.literal('look'), v.literal('item'), v.literal('outfit_help'))
    ),
    contextLookId: v.optional(v.id('looks')),
    contextItemId: v.optional(v.id('items')),

    // Status
    isArchived: v.optional(v.boolean()),
    lastMessageAt: v.number(),
    messageCount: v.number(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_archived', ['userId', 'isArchived'])
    .index('by_user_and_last_message', ['userId', 'lastMessageAt']),

  /**
   * messages - Individual chat messages
   * Supports rich content including attachments and AI metadata
   */
  messages: defineTable({
    threadId: v.id('threads'),
    userId: v.id('users'), // Denormalized

    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),

    // Message type for special rendering (fitting room cards, no-matches, etc.)
    messageType: v.optional(
      v.union(
        v.literal('text'),           // Regular text message (default)
        v.literal('fitting-ready'),  // Fitting room card with look IDs
        v.literal('no-matches')      // No matches found, show explore card
      )
    ),

    // Look IDs for fitting-ready messages
    lookIds: v.optional(v.array(v.id('looks'))),

    // Rich content
    attachments: v.optional(
      v.array(
        v.object({
          type: v.union(v.literal('image'), v.literal('look'), v.literal('item')),
          storageId: v.optional(v.id('_storage')),
          lookId: v.optional(v.id('looks')),
          itemId: v.optional(v.id('items')),
        })
      )
    ),

    // AI metadata
    model: v.optional(v.string()), // "gpt-4o", "claude-3", etc.
    tokenCount: v.optional(v.number()),

    // Status
    status: v.union(v.literal('sent'), v.literal('streaming'), v.literal('error')),
    errorMessage: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index('by_thread', ['threadId'])
    .index('by_user', ['userId']),

  // ============================================

  // NIMA WRAPPED (Year-End Recap)
  // ============================================

  /**
   * wrapped_settings - Admin settings for yearly wrapped feature
   * Controls when wrapped is generated and which theme to use
   */
  wrapped_settings: defineTable({
    year: v.number(),
    runDate: v.number(), // Timestamp when cron should generate wrapped
    theme: v.union(v.literal('aurora'), v.literal('geometric'), v.literal('fluid')),
    isActive: v.boolean(), // Whether wrapped is viewable by users
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_year', ['year']),

  /**
   * user_wrapped - Pre-computed wrapped data per user per year
   * Generated by cron job, stores all stats for the wrapped experience
   */
  user_wrapped: defineTable({
    userId: v.id('users'),
    year: v.number(),

    // Slide 1: Style Era
    styleEra: v.string(), // e.g., "The Minimalist"
    styleEraDescription: v.string(),
    dominantTags: v.array(v.string()),

    // Slide 2: Top Items (tried-on AND saved)
    topItems: v.array(
      v.object({
        itemId: v.id('items'),
        name: v.string(),
        count: v.number(),
      })
    ),

    // Slide 3: Color Palette
    colorPalette: v.array(
      v.object({
        color: v.string(),
        percentage: v.number(),
      })
    ),

    // Slide 4: Mood Swings (quarterly breakdown)
    moodSwings: v.array(
      v.object({
        quarter: v.string(), // "Q1", "Q2", etc.
        months: v.string(), // "January–March"
        mood: v.string(), // "Cozy & Layered"
        topTag: v.string(),
      })
    ),

    // Slide 5: Top Brands
    topBrands: v.array(
      v.object({
        brand: v.string(),
        saveCount: v.number(),
      })
    ),

    // Slide 6: Personality & Trends
    personalityType: v.string(),
    personalityDescription: v.string(),
    trendsAhead: v.array(v.string()),
    trendsSkipped: v.array(v.string()),

    // Slide 7: Most-Saved Look
    mostSavedLookId: v.optional(v.id('looks')),

    // Overall Stats
    totalLooksSaved: v.number(),
    totalTryOns: v.number(),
    totalLookbooks: v.number(),

    // Share token for public link
    shareToken: v.string(),

    // Tracking
    viewedAt: v.optional(v.number()), // Timestamp when user viewed their wrapped

    createdAt: v.number(),
  })
    .index('by_user_and_year', ['userId', 'year'])
    .index('by_share_token', ['shareToken']),

  // FRIENDS & SOCIAL
  // ============================================

  /**
   * friendships - Friend relationships between users
   * Bidirectional: when status is 'accepted', either user can query as requester or addressee
   */
  friendships: defineTable({
    requesterId: v.id('users'), // User who sent the request
    addresseeId: v.id('users'), // User who received the request
    status: v.union(
      v.literal('pending'), // Request sent, waiting for response
      v.literal('accepted') // Both accepted - they're friends!
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_requester', ['requesterId'])
    .index('by_addressee', ['addresseeId'])
    .index('by_users', ['requesterId', 'addresseeId']) // For quick lookup
    .index('by_status', ['status'])
    .index('by_addressee_and_status', ['addresseeId', 'status']), // For pending requests

  /**
   * direct_messages - Private look sharing between users
   * Simple conversation history tracking looks shared between two users
   */
  direct_messages: defineTable({
    senderId: v.id('users'), // User who sent the look
    recipientId: v.id('users'), // User who received the look
    lookId: v.id('looks'), // The look being shared
    isRead: v.boolean(), // Whether recipient has viewed the message
    createdAt: v.number(),
  })
    .index('by_sender', ['senderId'])
    .index('by_recipient', ['recipientId'])
    .index('by_recipient_and_read', ['recipientId', 'isRead'])
    .index('by_users', ['senderId', 'recipientId']) // For conversation lookup
    .index('by_recipient_and_created', ['recipientId', 'createdAt']), // For sorting conversations

  // ============================================
  // ITEM TRY-ONS (Single Item Virtual Try-On)
  // ============================================

  /**
   * item_try_ons - AI-generated try-on images for individual items
   * Cached images showing a user wearing a specific single item
   */
  item_try_ons: defineTable({
    itemId: v.id('items'),
    userId: v.id('users'),
    storageId: v.optional(v.id('_storage')), // Optional until generation completes

    // Source info
    userImageId: v.id('user_images'), // Which user photo was used

    // Variant selection
    selectedSize: v.optional(v.string()), // e.g. "M"
    selectedColor: v.optional(v.string()), // e.g. "Red"

    // Generation details
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    generationProvider: v.optional(v.string()), // "google-gemini", etc.
    generationJobId: v.optional(v.string()), // External job ID
    errorMessage: v.optional(v.string()),

    // Expiry (for cache management)
    expiresAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_item_and_user', ['itemId', 'userId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // ============================================
  // SHOPPING CART
  // ============================================

  /**
   * cart_items - Items saved to user's shopping cart
   * Persists across sessions for logged-in users
   */
  cart_items: defineTable({
    userId: v.id('users'),
    itemId: v.id('items'),
    quantity: v.number(),
    selectedSize: v.optional(v.string()),
    selectedColor: v.optional(v.string()),
    addedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_item', ['userId', 'itemId']),

  // ============================================
  // SELLERS & MARKETPLACE
  // ============================================

  /**
   * sellers - Seller/Store profiles for multi-vendor marketplace
   * Links to users table for authentication
   */
  sellers: defineTable({
    userId: v.id('users'), // The owner user

    // Store identity
    slug: v.string(), // Unique URL handle: /shop/nike
    shopName: v.string(),
    description: v.optional(v.string()),

    // Branding
    logoStorageId: v.optional(v.id('_storage')),
    bannerStorageId: v.optional(v.id('_storage')),

    // Contact
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),

    // Verification
    verificationStatus: v.union(
      v.literal('pending'),
      v.literal('verified'),
      v.literal('rejected')
    ),
    verificationNotes: v.optional(v.string()),

    // Tier
    tier: v.optional(v.union(
      v.literal('basic'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('premium')
    )),

    // Status
    isActive: v.boolean(),
    tryOnCredits: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_slug', ['slug'])
    .index('by_verification_status', ['verificationStatus'])
    .index('by_tier', ['tier']),

  // ============================================
  // ORDERS
  // ============================================

  /**
   * orders - Customer orders (high-level transaction)
   * Contains payment info and shipping address snapshot
   */
  orders: defineTable({
    // Customer info
    userId: v.id('users'),
    orderNumber: v.string(), // Human-readable: ORD-20260113-XXXX

    // Shipping address (snapshot at order time)
    shippingAddress: v.object({
      fullName: v.string(),
      addressLine1: v.string(),
      addressLine2: v.optional(v.string()),
      city: v.string(),
      state: v.optional(v.string()),
      postalCode: v.string(),
      country: v.string(),
      phone: v.string(),
    }),

    // Financials (all in cents)
    subtotal: v.number(),
    serviceFee: v.number(),
    shippingCost: v.number(),
    total: v.number(),
    currency: v.string(),

    // Payment
    paymentStatus: v.union(
      v.literal('pending'),
      v.literal('paid'),
      v.literal('failed'),
      v.literal('refunded')
    ),
    paymentMethod: v.optional(v.string()),
    paymentIntentId: v.optional(v.string()),

    // Fingo Pay M-Pesa
    merchantTransactionId: v.optional(v.string()), // Our unique ref for Fingo Pay
    mpesaPhoneNumber: v.optional(v.string()), // Phone used for M-Pesa STK Push

    // Order status (overall)
    status: v.union(
      v.literal('pending'), // Just placed
      v.literal('processing'), // Payment confirmed, sellers packing
      v.literal('partially_shipped'), // Some items shipped
      v.literal('shipped'), // All items shipped
      v.literal('delivered'), // All items delivered
      v.literal('cancelled')
    ),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_order_number', ['orderNumber'])
    .index('by_status', ['status'])
    .index('by_created_at', ['createdAt'])
    .index('by_merchant_transaction_id', ['merchantTransactionId']),

  /**
   * order_items - Individual line items in an order (seller-facing)
   * Each row links an item to an order AND a seller
   * Allows multi-seller orders with independent fulfillment
   */
  order_items: defineTable({
    orderId: v.id('orders'),
    sellerId: v.optional(v.id('sellers')), // null for Nima curated items
    itemId: v.id('items'),

    // Snapshot at order time (prices can change later)
    itemName: v.string(),
    itemBrand: v.optional(v.string()),
    itemPrice: v.number(), // Unit price in cents
    itemImageUrl: v.optional(v.string()),

    // Order details
    quantity: v.number(),
    selectedSize: v.optional(v.string()),
    selectedColor: v.optional(v.string()),

    // Financial breakdown
    lineTotal: v.number(), // itemPrice * quantity

    // Fulfillment status (seller-controlled)
    fulfillmentStatus: v.union(
      v.literal('pending'), // Waiting for payment confirmation
      v.literal('processing'), // Seller preparing item
      v.literal('shipped'), // Seller shipped
      v.literal('delivered'), // Confirmed delivered
      v.literal('cancelled')
    ),
    trackingNumber: v.optional(v.string()),
    trackingCarrier: v.optional(v.string()),
    shippedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_order', ['orderId'])
    .index('by_seller', ['sellerId'])
    .index('by_seller_and_status', ['sellerId', 'fulfillmentStatus'])
    .index('by_item', ['itemId']),

  /**
   * payouts - Financial tracking for seller earnings
   * Records payout history and pending amounts
   */
  payouts: defineTable({
    sellerId: v.id('sellers'),

    // Period
    periodStart: v.number(),
    periodEnd: v.number(),

    // Amounts (in cents)
    grossRevenue: v.number(), // Total sales
    netAmount: v.number(), // Amount to pay seller

    // Status
    status: v.union(
      v.literal('pending'), // Being calculated
      v.literal('processing'), // Transfer initiated
      v.literal('paid'), // Money sent
      v.literal('failed')
    ),

    // Payment details
    stripeTransferId: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_seller', ['sellerId'])
    .index('by_seller_and_status', ['sellerId', 'status'])
    .index('by_period', ['periodStart', 'periodEnd']),

  // ============================================
  // LOOK INTERACTIONS (Likes, Dislikes, Saves)
  // ============================================

  /**
   * look_interactions - User interactions with looks
   * Tracks loves, dislikes, and saves for analytics and activity feed
   */
  look_interactions: defineTable({
    lookId: v.id('looks'),
    userId: v.id('users'),
    interactionType: v.union(
      v.literal('love'),
      v.literal('dislike'),
      v.literal('save'),
      v.literal('recreate')
    ),
    // For activity feed - track if owner has seen this notification
    seenByOwner: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index('by_look', ['lookId'])
    .index('by_user', ['userId'])
    .index('by_look_and_user', ['lookId', 'userId'])
    .index('by_look_and_type', ['lookId', 'interactionType'])
    .index('by_created_at', ['createdAt']),

  // ============================================
  // ITEM LIKES (User likes on individual items)
  // ============================================

  /**
   * item_likes - User likes on individual apparel items
   * Tracks when users like/heart items for showing in Liked Items section
   */
  item_likes: defineTable({
    userId: v.id('users'),
    itemId: v.id('items'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_item', ['itemId'])
    .index('by_user_and_item', ['userId', 'itemId'])
    .index('by_user_and_created', ['userId', 'createdAt']),

  // ============================================
  // CREDIT PURCHASES (Fingo Pay M-Pesa)
  // ============================================

  /**
   * credit_purchases - Tracks credit purchase attempts and completions
   * Each row represents an M-Pesa STK Push transaction
   */
  credit_purchases: defineTable({
    userId: v.id('users'),

    // Package details
    creditAmount: v.number(), // Number of credits purchased (10, 20, 50, 100)
    priceKes: v.number(), // Price in KES (500, 1000, 2500, 5000)

    // Payment details
    phoneNumber: v.string(), // M-Pesa phone number used
    merchantTransactionId: v.string(), // Our unique transaction reference
    fingoTransactionId: v.optional(v.string()), // Fingo Pay's transaction ID

    // Status
    status: v.union(
      v.literal('pending'), // STK push sent, waiting for payment
      v.literal('completed'), // Payment confirmed via webhook
      v.literal('failed') // Payment failed or timed out
    ),
    failureReason: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_merchant_transaction_id', ['merchantTransactionId'])
    .index('by_user_and_status', ['userId', 'status']),

  // ============================================
  // PUSH NOTIFICATION TOKENS
  // ============================================

  /**
   * push_tokens - Expo push notification tokens per user
   * Allows sending native push notifications to user devices
   */
  push_tokens: defineTable({
    userId: v.id('users'),
    token: v.string(), // Expo push token (ExponentPushToken[xxx])
    platform: v.union(v.literal('ios'), v.literal('android'), v.literal('web')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_token', ['token']),

  // ============================================
  // SELLER SUBSCRIPTIONS
  // ============================================

  /**
   * seller_subscriptions - Paid tier subscription records
   * Each row is one billing cycle attempt. Active subscription drives seller.tier.
   */
  /**
   * Tier configuration — one row per tier, editable by admins.
   * Seeded with defaults on first read if missing.
   */
  tier_config: defineTable({
    tier: v.union(
      v.literal('basic'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('premium')
    ),
    maxProducts: v.union(v.number(), v.null()),       // null = unlimited
    revenueChartDays: v.number(),                      // 0 = no chart
    orderHistoryDays: v.union(v.number(), v.null()),   // null = unlimited
    topProductsLimit: v.union(v.number(), v.null()),   // null = unlimited, 0 = hidden
    showEngagementCounts: v.boolean(),
    showCartCounts: v.boolean(),
    priceKes: v.number(),                              // 0 for basic
    updatedAt: v.number(),
  }).index('by_tier', ['tier']),

  seller_subscriptions: defineTable({
    sellerId: v.id('sellers'),
    tier: v.union(
      v.literal('starter'),
      v.literal('growth'),
      v.literal('premium')
    ),
    status: v.union(
      v.literal('pending'),   // STK push sent, waiting for payment
      v.literal('active'),    // Paid, running
      v.literal('expired'),   // periodEnd passed, seller downgraded to basic
      v.literal('cancelled'), // Manually cancelled by admin
      v.literal('failed')     // Payment failed
    ),
    periodStart: v.optional(v.number()),
    periodEnd: v.optional(v.number()),     // periodStart + 30 days
    amountKes: v.number(),                 // 5000 | 15000 | 30000
    phoneNumber: v.string(),               // M-Pesa phone used
    merchantTransactionId: v.string(),     // nima_sub_xxxx
    fingoTransactionId: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_seller', ['sellerId'])
    .index('by_seller_and_status', ['sellerId', 'status'])
    .index('by_status', ['status'])
    .index('by_period_end', ['periodEnd'])
    .index('by_merchant_transaction_id', ['merchantTransactionId']),

  // ============================================
  // SELLER AI CHAT
  // ============================================

  /**
   * seller_chat_messages - Premium seller AI insights conversation history
   * Stores messages for the AI business analyst chat feature (Premium only)
   */
  seller_chat_messages: defineTable({
    sellerId: v.id('sellers'),
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    createdAt: v.number(),
  })
    .index('by_seller', ['sellerId'])
    .index('by_seller_and_created', ['sellerId', 'createdAt']),

  // ============================================
  // NIMA CONNECT (Third-Party API)
  // ============================================

  /**
   * api_partners - External merchants using Nima Connect API
   * Each partner has an API key (hashed) and usage limits based on plan
   */
  api_partners: defineTable({
    name: v.string(),
    slug: v.string(),
    websiteUrl: v.string(),
    apiKeyHash: v.string(),       // SHA-256 of full key
    apiKeyPrefix: v.string(),     // first 16 chars of key (after "nima_pk_") for O(1) lookup
    allowedDomains: v.array(v.string()),
    webhookUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
    plan: v.union(
      v.literal('free'),
      v.literal('starter'),
      v.literal('growth'),
      v.literal('enterprise'),
    ),
    monthlyTryOnLimit: v.number(),   // free=50, starter=500, growth=5000, enterprise=999999
    tryOnsUsedThisMonth: v.number(),
    billingResetAt: v.number(),
    isActive: v.boolean(),
    sellerId: v.optional(v.id('sellers')), // link to seller if they're also a Nima seller
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_api_key_prefix', ['apiKeyPrefix'])
    .index('by_slug', ['slug'])
    .index('by_seller', ['sellerId']),

  /**
   * api_sessions - Try-on sessions created by API partners
   * Each session represents one try-on request for an external product
   */
  api_sessions: defineTable({
    partnerId: v.id('api_partners'),
    sessionToken: v.string(),
    nimaUserId: v.optional(v.id('users')),
    guestFingerprint: v.optional(v.string()),
    externalProductId: v.string(),
    externalProductUrl: v.optional(v.string()),
    productImageUrl: v.string(),
    productName: v.optional(v.string()),
    // Partner-supplied ID to correlate this session with their cart/order system
    trackingId: v.optional(v.string()),
    productCategory: v.optional(
      v.union(
        v.literal('top'),
        v.literal('bottom'),
        v.literal('dress'),
        v.literal('outfit'),
        v.literal('outerwear'),
      )
    ),
    guestImageStorageId: v.optional(v.id('_storage')),
    resultStorageId: v.optional(v.id('_storage')),
    guestTryOnUsed: v.boolean(),
    guestTryOnCount: v.optional(v.number()),
    status: v.union(
      v.literal('created'),
      v.literal('photo_needed'),
      v.literal('photo_uploaded'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed'),
      v.literal('expired'),
    ),
    errorMessage: v.optional(v.string()),
    expiresAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_session_token', ['sessionToken'])
    .index('by_partner', ['partnerId'])
    .index('by_nima_user', ['nimaUserId'])
    .index('by_expires_at', ['expiresAt']),

  /**
   * api_usage_logs - Audit log of events per session
   * Includes try-on lifecycle events AND post-try-on conversion events
   * (item_added_to_cart, item_purchased) reported by partners via /api/v1/track
   */
  api_usage_logs: defineTable({
    partnerId: v.id('api_partners'),
    sessionId: v.id('api_sessions'),
    eventType: v.union(
      v.literal('session_created'),
      v.literal('photo_uploaded'),
      v.literal('tryon_generated'),
      v.literal('tryon_failed'),
      v.literal('user_converted'),
      // Conversion events — reported by partner after try-on
      v.literal('item_added_to_cart'),
      v.literal('item_purchased'),
    ),
    externalProductId: v.optional(v.string()),
    wasAuthenticated: v.boolean(),
    generationTimeMs: v.optional(v.number()),
    // Conversion tracking fields (set for item_added_to_cart / item_purchased)
    itemValue: v.optional(v.number()),   // monetary value in smallest unit (e.g. cents/KES)
    currency: v.optional(v.string()),    // e.g. "KES", "USD"
    trackingId: v.optional(v.string()),  // partner's internal cart/order reference
    createdAt: v.number(),
  })
    .index('by_partner', ['partnerId'])
    .index('by_partner_and_created', ['partnerId', 'createdAt'])
    .index('by_event_type', ['eventType']),

  // ============================================
  // QUICK TRY-ONS (Camera-captured item try-on)
  // ============================================

  /**
   * quick_try_ons - Try-on using camera-captured item image
   * User captures an item they see, tries it on using their primary profile image
   */
  quick_try_ons: defineTable({
    userId: v.id('users'),
    userImageId: v.id('user_images'), // User's primary profile image
    capturedItemStorageId: v.id('_storage'), // Camera-captured item photo
    resultStorageId: v.optional(v.id('_storage')),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // ============================================
  // SELLER TRY-ONS (Customer try-on via seller link)
  // ============================================

  /**
   * seller_try_ons - Customer try-ons triggered by seller try-on links
   * Credits are deducted from the seller's tryOnCredits balance
   */
  seller_try_ons: defineTable({
    sellerId: v.id('sellers'),
    itemId: v.id('items'),
    customerImageStorageId: v.id('_storage'), // Customer's uploaded photo
    resultStorageId: v.optional(v.id('_storage')),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    errorMessage: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_seller', ['sellerId'])
    .index('by_status', ['status']),

});
