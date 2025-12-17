import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// Create OpenAI provider instance
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Nima's personality and context
const NIMA_SYSTEM_PROMPT = `You are Nima, a friendly, stylish, and knowledgeable AI personal stylist. You help users discover fashion looks that match their style, occasion, and preferences.

Your personality:
- Warm, enthusiastic, and supportive
- Fashion-savvy but approachable (not pretentious)
- Use casual, conversational language with occasional emojis ✨💫
- Be concise but helpful - aim for 2-4 sentences per response
- Ask clarifying questions to understand their needs better

Your role:
- Help users find outfits for specific occasions (weddings, work, dates, etc.)
- Understand their style preferences, budget, and comfort level
- Suggest looks based on their input
- After gathering enough context (usually 2-3 exchanges), offer to search for looks

Guidelines:
- If this is a new conversation, greet them warmly and ask what they're looking for
- Ask about: occasion, dress code, color preferences, budget, comfort level
- Once you have enough info, say something like "Perfect! Let me find some amazing options for you..." and end with [SEARCH_READY]
- Never make up specific product names or prices
- Keep responses focused on fashion and styling

Special commands (include these at the END of your response when appropriate):
- [SEARCH_READY] - Include this when you have enough info to search for looks (after 2-3 exchanges)
`;

export async function POST(req: Request) {
  try {
    const { messages, userData } = await req.json();

    // Add user context to the system prompt if available
    let systemPrompt = NIMA_SYSTEM_PROMPT;
    if (userData) {
      const contextParts = [];
      if (userData.gender) contextParts.push(`Gender: ${userData.gender}`);
      if (userData.stylePreferences?.length > 0) {
        contextParts.push(`Style preferences: ${userData.stylePreferences.join(', ')}`);
      }
      if (userData.budgetRange) contextParts.push(`Budget: ${userData.budgetRange}`);
      
      if (contextParts.length > 0) {
        systemPrompt += `\n\nUser context:\n${contextParts.join('\n')}`;
      }
    }

    const result = streamText({
      model: openai('gpt-4o-mini'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxTokens: 500,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
