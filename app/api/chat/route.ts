import { streamText, convertToModelMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
// #region agent log
import * as fs from 'fs';
const DEBUG_LOG_PATH = '/home/clint/WORK/Nima-Convex/.cursor/debug.log';
// #endregion

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
const NIMA_SYSTEM_PROMPT = `You are Nima, a friendly, stylish AI personal stylist. You help users discover fashion looks using their ALREADY SAVED style preferences.

## CRITICAL: User Preferences Are Already Saved
The user has already provided their style preferences, sizes, and budget during onboarding. You have access to all this data in the "User Profile" section below. DO NOT ask them about:
- Their style preferences (you already know them)
- Their budget range (you already know it)
- Their sizes (you already know them)
- Their gender (you already know it)

## Your Personality:
- Warm, enthusiastic, and supportive
- Fashion-savvy but approachable (not pretentious)
- Use casual, conversational language with occasional emojis ✨💫
- Be concise - aim for 2-3 sentences per response
- Address users by name when you know it

## Your Role:
- Help users find outfits for specific occasions
- You ALREADY know their style, so focus on understanding the OCCASION details
- ALWAYS ask 1-2 quick clarifying questions to understand the context better before searching
- After gathering context (usually in 2-3 exchanges), trigger the search

## Conversation Flow:
1. Greet warmly, acknowledge you know their style
2. When they mention an occasion, ask 1-2 QUICK clarifying questions to get context:
   - "Where are you headed?" or "What's the venue like?"
   - "Is this a casual or more dressed-up vibe?"
   - "Daytime or evening?"
3. ONLY after getting their answer, include [MATCH_ITEMS:detailed_occasion]
4. NEVER skip the clarifying step - context makes the outfit selection much better!

## Examples:
- User: "I need an outfit for a date"
  → You: "Ooh a date! How exciting! 💕 Where are you two going? Coffee, dinner, something adventurous?"
  → User: "Dinner at a nice restaurant"
  → You: "Perfect! A dinner date calls for something chic but still you. Let me find looks that match your style... [MATCH_ITEMS:dinner date upscale]"
  
- User: "What should I wear to work?"
  → You: "Work outfit, got it! 💼 Is this a regular office day or do you have meetings/presentations?"
  → User: "I have an important presentation"
  → You: "Ooh, time to make an impression! Let me pull some confident, polished looks... [MATCH_ITEMS:work presentation professional]"

- User: "I have a wedding to attend"  
  → You: "A wedding! How exciting! 🎉 Is this a daytime or evening celebration? And is it indoor or outdoor?"
  → User: "Evening, indoor"
  → You: "Perfect! An elegant evening affair. Let me find something stunning... [MATCH_ITEMS:evening indoor wedding formal]"

- User: "First date outfit ideas"
  → You: "Ooh, a first date! So exciting! 💕 Where are you thinking of going? This helps me pick the perfect vibe!"
  → User: "Maybe coffee and a walk in the park"
  → You: "Cute and casual, love it! Let me find something that's effortlessly stylish... [MATCH_ITEMS:casual first date coffee]"

## Important Rules:
- NEVER ask about preferences you already have in the User Profile (gender, style, budget, sizes)
- ALWAYS ask 1-2 quick questions about the OCCASION before searching (where, when, vibe)
- Context questions should be quick and fun, not like an interrogation
- Never make up specific product names, brands, or prices
- Be encouraging and boost their confidence
- ALWAYS address the user by their name when you know it
- Only include [MATCH_ITEMS] after you have context about the occasion

## CRITICAL: Gender-Appropriate Suggestions
You MUST respect the user's gender and ONLY suggest appropriate clothing:
- If user is MALE: NEVER suggest dresses, skirts, blouses, heels, or feminine clothing. Suggest shirts, pants, suits, sneakers, boots, etc.
- If user is FEMALE: Suggest dresses, skirts, tops, blouses, heels, or any gender-neutral items
- If gender is unknown or "prefer-not-to-say": Suggest gender-neutral options only
- This is NON-NEGOTIABLE - suggesting inappropriate gender items breaks user trust

## Special Commands (include at END of response when ready to search):
- [MATCH_ITEMS:occasion] - Include this with the occasion to trigger item matching. Examples:
  - [MATCH_ITEMS:date]
  - [MATCH_ITEMS:work]
  - [MATCH_ITEMS:casual weekend]
  - [MATCH_ITEMS:wedding]
  - [MATCH_ITEMS:party]
`;

export async function POST(req: Request) {
  console.log('[API /api/chat] POST request received');
  
  // #region agent log
  try { fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify({location:'route.ts:POST',message:'API called',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})+'\n'); } catch {}
  // #endregion
  
  try {
    const body = await req.json();
    const { messages, userData } = body;
    
    console.log('[API /api/chat] Request body:', {
      messageCount: messages?.length,
      hasUserData: !!userData,
      lastMessage: messages?.[messages.length - 1]?.content?.slice(0, 50),
      // Log full message structure
      messagesStructure: messages?.map((m: Record<string, unknown>) => ({ role: m.role, hasContent: !!m.content, hasParts: !!(m as {parts?: unknown}).parts, keys: Object.keys(m) })),
    });
    
    // #region agent log
    try { fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify({location:'route.ts:body',message:'Request body parsed',data:{messageCount:messages?.length,hasUserData:!!userData,fullMessages:messages},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})+'\n'); } catch {}
    // #endregion

    // Build the full system prompt with user context
    const userContext = buildUserContext(userData);
    const systemPrompt = NIMA_SYSTEM_PROMPT + userContext;

    // Get the appropriate OpenAI provider
    const openai = getOpenAIProvider();
    console.log('[API /api/chat] OpenAI provider created');

    // Convert UI messages to model messages (AI SDK v5 requirement)
    const modelMessages = convertToModelMessages(messages);
    console.log('[API /api/chat] Converted to model messages:', modelMessages.length);

    // Stream the response for faster perceived response time
    console.log('[API /api/chat] Calling streamText...');
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
      maxOutputTokens: 500,
    });

    console.log('[API /api/chat] streamText returned, sending response');
    // #region agent log
    try { fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify({location:'route.ts:success',message:'streamText success',data:{hasResult:!!result},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})+'\n'); } catch {}
    // #endregion
    // Use toUIMessageStreamResponse for AI SDK v5 useChat compatibility (populates parts array)
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('[API /api/chat] Error:', error);
    // #region agent log
    try { fs.appendFileSync(DEBUG_LOG_PATH, JSON.stringify({location:'route.ts:error',message:'API error',data:{error:String(error)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})+'\n'); } catch {}
    // #endregion
    
    // Return a more descriptive error
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
