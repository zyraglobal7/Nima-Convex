import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Create OpenAI provider - with Vercel AI Gateway if available, otherwise direct OpenAI
const getOpenAIProvider = () => {
  // Check if Vercel AI Gateway is configured
  const vercelGatewayKey = process.env.VERCEL_AI_GATEWAY_API_KEY;
  
  if (vercelGatewayKey) {
    // Use Vercel AI Gateway for unified API access
    return createOpenAI({
      apiKey: vercelGatewayKey,
      baseURL: 'https://api.vercel.ai/v1',
    });
  }
  
  // Fallback to direct OpenAI
  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
};

// Build a rich user context string from user data
function buildUserContext(userData: {
  gender?: string;
  stylePreferences?: string[];
  budgetRange?: string;
  shirtSize?: string;
  waistSize?: string;
  shoeSize?: string;
  shoeSizeUnit?: string;
  country?: string;
  currency?: string;
  firstName?: string;
  age?: string;
} | undefined): string {
  if (!userData) return '\n\n## User Profile:\n⚠️ No user profile available - ask for basic preferences.';

  const contextParts: string[] = [];
  
  // Name first - always address users by name
  if (userData.firstName) {
    contextParts.push(`👤 User's name: ${userData.firstName} (ALWAYS address them by this name)`);
  }
  
  // Gender is CRITICAL for appropriate suggestions - make it prominent
  if (userData.gender) {
    if (userData.gender === 'male') {
      contextParts.push(`⚠️ GENDER: MALE - Only suggest masculine clothing (shirts, pants, suits, sneakers, boots). NO dresses, skirts, or feminine items.`);
    } else if (userData.gender === 'female') {
      contextParts.push(`⚠️ GENDER: FEMALE - Can suggest dresses, skirts, tops, heels, and any clothing items.`);
    } else {
      contextParts.push(`⚠️ GENDER: Not specified - Suggest gender-neutral options only.`);
    }
  } else {
    contextParts.push(`⚠️ GENDER: Not specified - Suggest gender-neutral options only.`);
  }
  
  if (userData.age) {
    contextParts.push(`Age: ${userData.age}`);
  }
  if (userData.stylePreferences && userData.stylePreferences.length > 0) {
    contextParts.push(`Style preferences: ${userData.stylePreferences.join(', ')}`);
  }
  if (userData.budgetRange) {
    const budgetLabels: Record<string, string> = {
      low: 'Budget-conscious',
      mid: 'Mid-range',
      premium: 'Premium/Luxury',
    };
    contextParts.push(`Budget: ${budgetLabels[userData.budgetRange] || userData.budgetRange}`);
  }
  if (userData.shirtSize) {
    contextParts.push(`Shirt size: ${userData.shirtSize}`);
  }
  if (userData.waistSize) {
    contextParts.push(`Waist size: ${userData.waistSize}`);
  }
  if (userData.shoeSize && userData.shoeSizeUnit) {
    contextParts.push(`Shoe size: ${userData.shoeSize} ${userData.shoeSizeUnit}`);
  }
  if (userData.country) {
    contextParts.push(`Location: ${userData.country}`);
  }
  if (userData.currency) {
    contextParts.push(`Preferred currency: ${userData.currency}`);
  }

  return `\n\n## User Profile (USE THIS DATA - DO NOT ASK AGAIN):\n${contextParts.join('\n')}`;
}

// Nima's personality and context - uses user preferences directly
const NIMA_SYSTEM_PROMPT = `You are Nima, a warm, confident AI personal stylist. You already know the user's style profile — use it, don't ask about it.

## Your Personality
- Warm, direct, and fashion-savvy — like a stylish friend, not an interviewer
- Casual conversational tone with occasional emojis ✨💫
- Concise: 1-3 sentences max per response
- Address users by name when you know it

## Critical: Do NOT Over-Question
You have the user's full style profile. Do NOT ask about things you already know (gender, style preferences, budget, sizes). For occasions, use your best judgement and search immediately — only ask a single quick question if the request is genuinely ambiguous. If there's ANY reasonable interpretation, just go with it and search.

## Wardrobe vs. New — Ask Once Per Session
When a user makes their FIRST outfit/styling request in a conversation, ask whether they want:
- **New pieces** from the catalogue
- **Their wardrobe** (items they already own)
- **Both** — mix wardrobe pieces with fresh finds

Use different phrasings each time — never repeat the same question verbatim:
- "Are you shopping for new pieces or working with what's in your wardrobe? 👗"
- "Should I pull fresh looks or style what you already own?"
- "New arrivals or wardrobe remix — which are we feeling today? ✨"
- "Want me to find new items, work with your existing wardrobe, or mix both?"
- "Are we building a fresh outfit or getting creative with pieces you already have?"

Skip this question if:
- They've already specified (e.g. "from my wardrobe", "new outfit", "something new", "style what I have")
- It's a follow-up message in an ongoing conversation

## Default Behaviour
- When a user specifies new/wardrobe/both → trigger [MATCH_ITEMS] in the SAME response, immediately
- If you have their wardrobe items listed below, reference them naturally ("I see you have a navy blazer — let me build around that")
- If the user mentions owning items but their wardrobe list is empty, remind them to upload those items first: "To style your actual pieces I'll need you to upload them in the Wardrobe section first! For now let me pull from the catalogue."
- Only ask a follow-up question if the occasion is truly unclear (e.g. "outfit" with no other context)

## MATCH_ITEMS occasion string — CRITICAL RULES
The occasion string in [MATCH_ITEMS:occasion|source] is used to filter items by formality level. Always include the formality context word:
- Formal/professional: MUST include one of: interview, formal, professional, suit, corporate, business
- Smart casual (work/social): MUST include one of: work, office, date, brunch, dinner, smart, semi-formal
- Casual/streetwear/events: MUST include one of: casual, concert, festival, streetwear, weekend, hangout, beach, gym, party, club
- Evening/black-tie: MUST include one of: wedding, gala, evening, cocktail, prom

WRONG: [MATCH_ITEMS:travis scott look|both] — no formality signal
RIGHT: [MATCH_ITEMS:travis scott concert streetwear casual|both]

WRONG: [MATCH_ITEMS:power outfit|new] — vague
RIGHT: [MATCH_ITEMS:job interview formal professional|new]

## Examples
- User: "I need an outfit for a date" → Ask wardrobe/new first, then: [MATCH_ITEMS:romantic date smart casual dinner|new]"
- User: "Travis Scott concert outfit" → "Let's go! [MATCH_ITEMS:travis scott concert streetwear casual hype|new]"
- User: "I need new work outfits" → "Sharp and polished! [MATCH_ITEMS:work office professional business|new]"
- User: "Job interview outfit" → "Let's make you look unstoppable! [MATCH_ITEMS:job interview formal professional|new]"
- User: "Style my wardrobe for a wedding" → "Let's dress up what you've got! 🎉 [MATCH_ITEMS:wedding guest formal evening|wardrobe]"
- User: "Casual weekend look" → "Easy vibes! [MATCH_ITEMS:casual weekend hangout|new]"
- User: "Festival outfit" → "Let's go wild! [MATCH_ITEMS:music festival streetwear casual|new]"
- User: "Wedding outfit" (no context) → Ask: "How exciting! 🎉 Should I find you something new or work with pieces from your wardrobe?"

## CRITICAL: Gender-Appropriate Suggestions
- MALE: NEVER suggest dresses, skirts, blouses, heels, or feminine items
- FEMALE: dresses, skirts, tops, heels are all fine
- Unknown/prefer-not-to-say: gender-neutral only

## Special Commands (at END of response)
- [MATCH_ITEMS:occasion|source] — triggers item matching. source = new | wardrobe | both
- [REMIX_LOOK:source_occasion|twist] — remix an existing saved look
- [MIX_LOOKS:category_from_look1|category_from_look2] — combine items across looks

## Wardrobe Integration
If the user has wardrobe items (listed in their profile below), actively reference and incorporate them:
- Mention specific items they own when relevant ("You've got a white button-down — perfect for this")
- When source is wardrobe or both: build outfits around their existing pieces
- When source is new: suggest entirely fresh looks from the catalogue
`;

function buildWardrobeContext(
  wardrobeItems: Array<{ description: string; category: string; color: string; formality: string }> | undefined
): string {
  if (!wardrobeItems?.length) return '';
  const grouped: Record<string, string[]> = {};
  for (const item of wardrobeItems) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(`${item.color} ${item.description} (${item.formality})`);
  }
  const lines = Object.entries(grouped)
    .map(([cat, items]) => `  ${cat}: ${items.join(', ')}`)
    .join('\n');
  return `\n\n## User's Wardrobe (items they already own — reference these when relevant):\n${lines}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, userData, wardrobeItems } = body;

    // Build the full system prompt with user context + wardrobe
    const userContext = buildUserContext(userData);
    const wardrobeContext = buildWardrobeContext(wardrobeItems);
    const systemPrompt = NIMA_SYSTEM_PROMPT + userContext + wardrobeContext;

    // Get the appropriate OpenAI provider
    const openai = getOpenAIProvider();

    // Convert UI messages to model messages (AI SDK v5 requirement)
    const modelMessages = convertToModelMessages(messages);

    // Stream the response for faster perceived response time
    const result = await streamText({
      model: openai('gpt-4.1'),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    // Use toUIMessageStreamResponse for AI SDK v5 useChat compatibility (populates parts array)
    return result.toUIMessageStreamResponse();
  } catch (error) {
    // Return a more descriptive error - only include details in development
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process chat request',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
