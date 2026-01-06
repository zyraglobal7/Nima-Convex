'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { ThemeToggle } from '@/components/theme-toggle';
import { MessagesIcon } from '@/components/messages/MessagesIcon';
import {
  WelcomeHero,
  ChatInput,
  PromptSuggestions,
  ChatHistoryButton,
  MessageBubble,
  PromptChips,
  ExploreCard,
} from '@/components/ask';
import { TypingIndicator } from '@/components/ask/MessageBubble';
import { AuthExpiredModal } from '@/components/auth';
import type { UIMessage } from 'ai';

// View state: welcome (initial) or chatting (after first message)
type ViewState = 'welcome' | 'chatting';
type ChatState = 'idle' | 'typing' | 'curating' | 'generating' | 'no_matches';

// Helper to extract text content from AI SDK v5 message parts
function getMessageText(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map(part => part.text)
    .join('');
}

// Define message type matching what MessageBubble expects
interface DisplayMessage {
  id: string;
  role: 'user' | 'nima';
  content: string;
  timestamp: Date;
  type: 'text' | 'searching' | 'fitting-ready';
  sessionId?: string;
  variant?: 'fresh' | 'remix';
}

// User data type for the API
interface UserData {
  firstName?: string;
  gender?: 'male' | 'female' | 'prefer-not-to-say';
  age?: string;
  stylePreferences: string[];
  budgetRange?: 'low' | 'mid' | 'premium';
  shirtSize?: string;
  waistSize?: string;
  shoeSize?: string;
  shoeSizeUnit?: 'EU' | 'US' | 'UK';
  country?: string;
  currency?: string;
}

interface AskNimaClientProps {
  authExpired?: boolean;
}

export default function AskNimaClient({ authExpired = false }: AskNimaClientProps) {
  // Query current user - Convex uses preloaded cache if available from server
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Show loading state while user profile is being fetched
  if (currentUser === undefined) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
        </div>
        <p className="text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }

  // Handle not authenticated state
  if (currentUser === null) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Sparkles className="w-12 h-12 text-primary" />
        <p className="text-foreground">Please sign in to chat with Nima</p>
        <Link 
          href="/sign-in" 
          className="px-6 py-2 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity"
        >
          Sign In
        </Link>
      </div>
    );
  }

  // Build user data for the API
  const userData: UserData = {
    firstName: currentUser.firstName,
    gender: currentUser.gender,
    age: currentUser.age,
    stylePreferences: currentUser.stylePreferences,
    budgetRange: currentUser.budgetRange,
    shirtSize: currentUser.shirtSize,
    waistSize: currentUser.waistSize,
    shoeSize: currentUser.shoeSize,
    shoeSizeUnit: currentUser.shoeSizeUnit,
    country: currentUser.country,
    currency: currentUser.currency,
  };

  return (
    <AskNimaInner
      authExpired={authExpired}
      userData={userData}
      currentUser={currentUser}
    />
  );
}

// Inner component - handles both welcome and chat views
interface AskNimaInnerProps {
  authExpired: boolean;
  userData: UserData;
  currentUser: NonNullable<ReturnType<typeof useQuery<typeof api.users.queries.getCurrentUser>>>;
}

function AskNimaInner({ authExpired, userData, currentUser }: AskNimaInnerProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingThreadIdRef = useRef<Id<'threads'> | null>(null);

  // View state: welcome or chatting
  const [viewState, setViewState] = useState<ViewState>('welcome');
  const [chatState, setChatState] = useState<ChatState>('idle');
  const [threadId, setThreadId] = useState<Id<'threads'> | null>(null);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [createdLookIds, setCreatedLookIds] = useState<Id<'looks'>[]>([]);
  const [scenario, setScenario] = useState<'fresh' | 'remix'>('fresh');

  const remainingSearches = Math.max(0, 20 - (currentUser.dailyTryOnCount || 0));

  // Safe navigation helper
  const safeNavigate = useCallback((path: string, replace = false) => {
    requestAnimationFrame(() => {
      try {
        if (replace) {
          router.replace(path);
        } else {
          router.push(path);
        }
      } catch (error) {
        console.warn('Router navigation failed, using fallback:', error);
        if (replace) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      }
    });
  }, [router]);

  // Mutations and Actions
  const startConversation = useMutation(api.messages.mutations.startConversation);
  const saveAssistantMessage = useMutation(api.messages.mutations.saveAssistantMessage);
  const saveFittingReadyMessage = useMutation(api.messages.mutations.saveFittingReadyMessage);
  const saveNoMatchesMessage = useMutation(api.messages.mutations.saveNoMatchesMessage);
  const createLooksFromChat = useMutation(api.chat.mutations.createLooksFromChat);
  const createRemixedLook = useMutation(api.chat.mutations.createRemixedLook);
  const generateChatLookImages = useAction(api.chat.actions.generateChatLookImages);
  
  // Query user's recent looks for AI context
  const userRecentLooks = useQuery(api.chat.queries.getUserRecentLooks, { limit: 10 });

  // Query messages for the thread when it exists (for stable timestamps)
  const messagesData = useQuery(
    api.messages.queries.getAllMessages,
    threadId ? { threadId } : 'skip'
  );

  // useChat for AI streaming
  const {
    messages: aiMessages,
    sendMessage,
    status,
    error: chatError,
  } = useChat({
    // @ts-expect-error - AI SDK v5 types may not include api/body options but they work at runtime
    api: '/api/chat',
    body: { userData },
    onError: (error) => {
      console.error('[Chat] useChat onError:', error);
      setChatState('idle');
    },
    onFinish: async ({ message }) => {
      console.log('[Chat] onFinish called');
      const messageContent = getMessageText(message);
      
      // Save assistant message to Convex
      const targetThreadId = pendingThreadIdRef.current || threadId;
      if (targetThreadId) {
        try {
          await saveAssistantMessage({
            threadId: targetThreadId,
            content: messageContent,
            model: 'gpt-4o-mini',
          });
          console.log('[Chat] Assistant message saved');
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }

      // Check for [MATCH_ITEMS:occasion] tag
      const matchItemsMatch = messageContent.match(/\[MATCH_ITEMS:([^\]]+)\]/);
      if (matchItemsMatch) {
        const occasion = matchItemsMatch[1];
        console.log('[Chat] Detected MATCH_ITEMS with occasion:', occasion);
        handleMatchItems(occasion);
      } else {
        // Check for [REMIX_LOOK:source|twist] tag
        const remixMatch = messageContent.match(/\[REMIX_LOOK:([^|]+)\|([^\]]+)\]/);
        if (remixMatch) {
          const sourceOccasion = remixMatch[1];
          const twist = remixMatch[2];
          console.log('[Chat] Detected REMIX_LOOK:', { sourceOccasion, twist });
          handleRemixLook(sourceOccasion, twist);
        }
      }

      // Update URL after AI response completes
      if (pendingThreadIdRef.current && window.location.pathname === '/ask') {
        router.replace(`/ask/${pendingThreadIdRef.current}`);
      }

      setChatState('idle');
    },
  });

  // Derive loading state from status
  const isAiLoading = status === 'submitted' || status === 'streaming';

  // Log any chat errors
  useEffect(() => {
    if (chatError) {
      console.error('[Chat] Chat error:', chatError);
    }
  }, [chatError]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (viewState === 'chatting') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesData, aiMessages, chatState, viewState]);

  // Handle item matching
  const handleMatchItems = useCallback(async (occasion: string) => {
    const targetThreadId = threadId || pendingThreadIdRef.current;
    console.log('[Chat] handleMatchItems starting:', { occasion, threadId: targetThreadId });
    
    setChatState('curating');
    setGenerationProgress('Curating based on your preferences...');

    try {
      const result = await createLooksFromChat({ occasion, context: occasion });
      console.log('[Chat] createLooksFromChat result:', result);

      if (!result.success) {
        if (result.message === 'no_matches' || result.message === 'no_photo') {
          console.log('[Chat] No matching items found for occasion:', occasion);
          setChatState('no_matches');
          
          if (targetThreadId) {
            try {
              await saveNoMatchesMessage({ threadId: targetThreadId, occasion });
              console.log('[Chat] Saved no-matches message');
            } catch (error) {
              console.error('[Chat] Failed to save no-matches message:', error);
            }
          }
        } else {
          console.warn('[Chat] Match items failed:', result.message);
          setChatState('idle');
        }
        return;
      }

      // Get scenario from result
      const resultScenario = 'scenario' in result ? result.scenario : 'fresh';
      setScenario(resultScenario as 'fresh' | 'remix');

      // Generate images
      const lookIds = result.lookIds;
      setCreatedLookIds(lookIds);
      setChatState('generating');
      setGenerationProgress('Creating the new you...');
      
      console.log('[Chat] Starting image generation for', lookIds.length, 'looks, scenario:', resultScenario);

      const genResult = await generateChatLookImages({ lookIds });
      console.log('[Chat] Image generation result:', genResult);

      if (targetThreadId) {
        try {
          await saveFittingReadyMessage({
            threadId: targetThreadId,
            lookIds,
            content: resultScenario === 'remix'
              ? `Found ${lookIds.length} looks - some remixed from your previous styles!`
              : `Found ${lookIds.length} perfect looks for you!`,
          });
          console.log('[Chat] Saved fitting-ready message');
        } catch (error) {
          console.error('[Chat] Failed to save fitting-ready message:', error);
        }
      }
      
      setChatState('idle');
    } catch (error) {
      console.error('[Chat] Error in item matching flow:', error);
      setChatState('idle');
    }
  }, [createLooksFromChat, generateChatLookImages, saveFittingReadyMessage, saveNoMatchesMessage, threadId]);

  // Handle remix look
  const handleRemixLook = useCallback(async (sourceOccasion: string, twist: string) => {
    const targetThreadId = threadId || pendingThreadIdRef.current;
    console.log('[Chat] handleRemixLook starting:', { sourceOccasion, twist });
    
    setChatState('curating');
    setGenerationProgress('Remixing your look...');
    setScenario('remix');

    try {
      const matchingLook = userRecentLooks?.find(
        (look) => look.occasion?.toLowerCase().includes(sourceOccasion.toLowerCase())
      );

      if (!matchingLook) {
        console.log('[Chat] No matching look found for remix');
        setChatState('idle');
        return;
      }

      const result = await createRemixedLook({
        sourceLookId: matchingLook._id,
        twist,
        occasion: sourceOccasion,
      });

      if (!result.success) {
        console.warn('[Chat] Remix failed:', result.message);
        setChatState('idle');
        return;
      }

      setCreatedLookIds([result.lookId]);
      setChatState('generating');
      setGenerationProgress('Creating your remixed look...');

      const genResult = await generateChatLookImages({ lookIds: [result.lookId] });
      console.log('[Chat] Remix image generation result:', genResult);

      if (targetThreadId) {
        try {
          await saveFittingReadyMessage({
            threadId: targetThreadId,
            lookIds: [result.lookId],
            content: `I've remixed your look with a ${twist} twist!`,
          });
        } catch (error) {
          console.error('[Chat] Failed to save fitting-ready message:', error);
        }
      }

      setChatState('idle');
    } catch (error) {
      console.error('[Chat] Error in remix flow:', error);
      setChatState('idle');
    }
  }, [createRemixedLook, generateChatLookImages, saveFittingReadyMessage, threadId, userRecentLooks]);

  // Handle sending a message - switches from welcome to chatting view
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Reset no_matches state when user tries again
    if (chatState === 'no_matches') {
      setChatState('idle');
    }
    
    if (chatState !== 'idle' && chatState !== 'no_matches') {
      console.log('[Chat] Blocked - chatState:', chatState);
      return;
    }

    console.log('[Chat] handleSendMessage:', content.slice(0, 50));

    // Switch to chatting view immediately - no navigation needed!
    setViewState('chatting');
    setChatState('typing');

    // Send to AI immediately
    sendMessage({ text: content });

    // Create thread in background
    startConversation({ content, contextType: 'outfit_help' })
      .then((result) => {
        console.log('[Chat] Thread created:', result.threadId);
        pendingThreadIdRef.current = result.threadId;
        setThreadId(result.threadId);
        // URL will be updated in onFinish
      })
      .catch((error) => {
        console.error('Failed to create thread:', error);
      });
  };

  const handlePromptSelect = (prompt: string) => {
    handleSendMessage(prompt);
  };

  const handleFittingRoomClick = (sessionId: string) => {
    safeNavigate(`/fitting/${sessionId}`);
  };

  const handleNewChat = () => {
    // Reset to welcome state
    setViewState('welcome');
    setChatState('idle');
    setThreadId(null);
    pendingThreadIdRef.current = null;
    setCreatedLookIds([]);
    setScenario('fresh');
  };

  // Helper to clean special tags from content
  const cleanContent = (content: string): string => {
    return content
      .replace('[SEARCH_READY]', '')
      .replace(/\[MATCH_ITEMS:[^\]]+\]/g, '')
      .replace(/\[REMIX_LOOK:[^\]]+\]/g, '')
      .replace(/\[MIX_LOOKS:[^\]]+\]/g, '')
      .trim();
  };

  // Build display messages from DATABASE as single source of truth (when available)
  const displayMessages: DisplayMessage[] = [];

  // Add all messages from database (stable timestamps)
  if (messagesData) {
    messagesData.forEach((msg) => {
      if (msg.messageType === 'fitting-ready' && msg.lookIds && msg.lookIds.length > 0) {
        const sessionId = msg.lookIds.join(',');
        displayMessages.push({
          id: msg._id,
          role: 'nima',
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          type: 'fitting-ready',
          sessionId,
          variant: msg.content.includes('remixed') ? 'remix' : 'fresh',
        });
      } else if (msg.messageType === 'no-matches') {
        displayMessages.push({
          id: msg._id,
          role: 'nima',
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          type: 'text',
        });
      } else {
        // Regular text message (user or assistant)
        displayMessages.push({
          id: msg._id,
          role: msg.role === 'assistant' ? 'nima' : 'user',
          content: cleanContent(msg.content),
          timestamp: new Date(msg.createdAt),
          type: 'text',
        });
      }
    });
  }

  // Add ONLY the currently streaming AI message (not yet saved to DB)
  const lastAiMessage = aiMessages[aiMessages.length - 1];
  if (lastAiMessage && lastAiMessage.role === 'assistant' && status === 'streaming') {
    const streamingContent = cleanContent(getMessageText(lastAiMessage));
    // Only add if not already in displayMessages (check by content since ID differs)
    if (streamingContent && !displayMessages.some(m => m.role === 'nima' && cleanContent(m.content) === streamingContent)) {
      displayMessages.push({
        id: 'streaming-' + lastAiMessage.id,
        role: 'nima',
        content: streamingContent,
        timestamp: new Date(),
        type: 'text',
      });
    }
  }

  // Add pending user message (just sent, not yet in DB)
  const pendingUserMessages = aiMessages.filter(m => m.role === 'user');
  pendingUserMessages.forEach((userMsg) => {
    const userContent = getMessageText(userMsg);
    // Only add if not already in displayMessages from DB
    if (userContent && !displayMessages.some(m => m.role === 'user' && m.content === userContent)) {
      displayMessages.push({
        id: 'pending-' + userMsg.id,
        role: 'user',
        content: userContent,
        timestamp: new Date(),
        type: 'text',
      });
    }
  });

  // Add fitting-ready message if looks were created (before it's saved to DB)
  if (createdLookIds.length > 0 && chatState === 'idle' && !displayMessages.some(m => m.type === 'fitting-ready')) {
    displayMessages.push({
      id: 'fitting-ready',
      role: 'nima',
      content: scenario === 'remix'
        ? `Found ${createdLookIds.length} looks - some remixed from your previous styles!`
        : `Found ${createdLookIds.length} perfect looks for you!`,
      timestamp: new Date(),
      type: 'fitting-ready',
      sessionId: createdLookIds.join(','),
      variant: scenario,
    });
  }

  // Add no-matches message if in that state (before it's saved to DB)
  if (chatState === 'no_matches' && !displayMessages.some(m => m.content.includes("couldn't find enough items"))) {
    displayMessages.push({
      id: 'no-matches',
      role: 'nima',
      content: `Oops! I couldn't find enough items in our collection that match your request right now. 😅

Don't worry though! Here's what you can try:
• Ask for a different occasion (like "casual brunch" or "office meeting")
• Check out the Discover page - I've already created some looks for you there!
• Try being more general (like "casual" instead of "outdoor camping")

We're always adding new items, so check back soon! ✨`,
      timestamp: new Date(),
      type: 'text',
    });
  }

  // Add initial greeting for chatting view
  if (viewState === 'chatting' && displayMessages.length === 0 && !isAiLoading) {
    const userName = currentUser?.firstName ? `Hey ${currentUser.firstName}` : "Hey there";
    const styleNote = currentUser?.stylePreferences?.length 
      ? `I already know you're into ${currentUser.stylePreferences.slice(0, 2).join(' and ')} styles.`
      : "I've got your style profile ready.";
    
    displayMessages.push({
      id: 'greeting',
      role: 'nima',
      content: `${userName}! ${styleNote} What occasion are we styling for today? ✨`,
      timestamp: new Date(),
      type: 'text',
    });
  }

  // Sort all messages by timestamp (must be done AFTER all messages are added)
  displayMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const title = displayMessages.find(m => m.role === 'user')?.content.slice(0, 40) || 'Ask Nima';

  // Render welcome view
  if (viewState === 'welcome') {
    return (
      <div className="h-screen flex flex-col relative overflow-hidden bg-background">
        {authExpired && <AuthExpiredModal />}
        
        {/* Animated Background */}
        <div
          className="fixed inset-0 animate-rising-sun pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 150% 100% at 50% 100%, 
              var(--secondary) 0%, 
              transparent 50%),
              radial-gradient(ellipse 100% 80% at 50% 120%, 
              var(--primary) 0%, 
              transparent 40%),
              linear-gradient(to top, 
              rgba(201, 160, 122, 0.15) 0%, 
              rgba(166, 124, 82, 0.08) 30%, 
              transparent 60%)`,
          }}
        />

        {/* Ambient glow orbs */}
        <motion.div
          className="fixed top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ background: 'var(--secondary)' }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="fixed bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
          style={{ background: 'var(--primary)' }}
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Header */}
        <header className="flex-shrink-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/discover" className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
                <h1 className="text-lg font-medium text-foreground">Ask Nima</h1>
              </div>
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <MessagesIcon />
                <ChatHistoryButton onNewChat={handleNewChat} />
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center py-3"
          >
            <div className="px-4 py-1.5 rounded-full bg-surface/80 backdrop-blur-sm border border-border/50">
              <span className="text-xs text-muted-foreground">
                <span className="text-secondary font-medium">{remainingSearches}</span> free searches remaining today
              </span>
            </div>
          </motion.div>

          <div className="flex flex-col items-center justify-center min-h-[calc(100%-4rem)] px-4 py-8">
            <div className="w-full max-w-md mx-auto flex flex-col items-center">
              <WelcomeHero className="mb-10" />
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="w-full"
              >
                <PromptSuggestions onSelect={handlePromptSelect} />
              </motion.div>
            </div>
          </div>

          <div className="h-32 md:h-24" />
        </main>

        {/* Fixed bottom input */}
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSendMessage} placeholder="Describe what you're looking for..." />
          </div>
        </div>

        {/* Bottom navigation (mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4 z-30">
          <div className="flex items-center justify-around">
            <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
              <Sparkles className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Discover</span>
            </Link>
            <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-xs text-primary font-medium">Ask Nima</span>
            </Link>
            <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-xs text-muted-foreground">Lookbooks</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs text-muted-foreground">Profile</span>
            </Link>
          </div>
        </nav>
      </div>
    );
  }

  // Render chatting view
  return (
    <div className="h-screen flex flex-col bg-background">
      {authExpired && <AuthExpiredModal />}
      
      {/* Header */}
      <header className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleNewChat}
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 text-center px-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
                <h1 className="text-sm font-medium text-foreground truncate max-w-[180px]">
                  {title}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <MessagesIcon />
              <ChatHistoryButton onNewChat={handleNewChat} />
            </div>
          </div>
        </div>
      </header>

      {/* Free searches badge */}
      <div className="flex-shrink-0 flex justify-center py-2 bg-surface/30">
        <div className="px-3 py-1 rounded-full bg-background/80 border border-border/30">
          <span className="text-xs text-muted-foreground">
            <span className="text-secondary font-medium">{remainingSearches}</span> free searches today
          </span>
        </div>
      </div>

      {/* Messages area */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          <AnimatePresence mode="popLayout">
            {displayMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                animate={true}
                onFittingRoomClick={handleFittingRoomClick}
              />
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {(chatState === 'typing' || isAiLoading) && <TypingIndicator />}
          </AnimatePresence>

          {/* Curating/Generating state */}
          <AnimatePresence>
            {(chatState === 'curating' || chatState === 'generating') && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-gradient-to-r from-surface/80 to-surface/50 rounded-2xl border border-border/30"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary-foreground animate-pulse" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {chatState === 'curating' ? 'Curating your looks...' : 'Creating the new you...'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {generationProgress || (chatState === 'curating' 
                        ? 'Finding the perfect items for your style' 
                        : 'Generating your personalized try-on images')}
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1 bg-surface-alt rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ width: chatState === 'curating' ? '40%' : '90%' }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No matches - explore card */}
          <AnimatePresence>
            {chatState === 'no_matches' && <ExploreCard />}
          </AnimatePresence>

          {/* Quick prompts */}
          {chatState === 'idle' && displayMessages.some(m => m.type === 'fitting-ready') && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-surface/50 rounded-2xl border border-border/30"
            >
              <p className="text-xs text-muted-foreground mb-3">Continue styling:</p>
              <PromptChips onSelect={handlePromptSelect} limit={3} />
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
        
        <div className="h-32 md:h-24" />
      </main>

      {/* Fixed bottom input */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/50 p-4">
        <div className="max-w-3xl mx-auto">
          <ChatInput
            onSend={handleSendMessage}
            disabled={chatState === 'curating' || chatState === 'generating' || isAiLoading}
            placeholder={
              chatState === 'curating'
                ? 'Curating your looks...'
                : chatState === 'generating'
                ? 'Creating your try-on images...'
                : isAiLoading
                ? 'Nima is typing...'
                : 'Type your message...'
            }
          />
        </div>
      </div>

      {/* Bottom navigation (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 py-2 px-4 z-30">
        <div className="flex items-center justify-around">
          <Link href="/discover" className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Discover</span>
          </Link>
          <Link href="/ask" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-xs text-primary font-medium">Ask Nima</span>
          </Link>
          <Link href="/lookbooks" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="text-xs text-muted-foreground">Lookbooks</span>
          </Link>
          <Link href="/profile" className="flex flex-col items-center gap-1 p-2">
            <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-muted-foreground">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
