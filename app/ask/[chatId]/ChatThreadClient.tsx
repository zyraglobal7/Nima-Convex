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
  ChatInput,
  MessageBubble,
  ChatHistoryButton,
  PromptChips,
} from '@/components/ask';
import { TypingIndicator } from '@/components/ask/MessageBubble';
import { AuthExpiredModal } from '@/components/auth';
import type { UIMessage } from 'ai';

type ChatState = 'chatting' | 'typing' | 'curating' | 'generating' | 'ready' | 'no_matches' | 'searching';

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

interface ChatThreadClientProps {
  chatId: string;
  authExpired?: boolean;
}

// Outer wrapper component - handles auth and loading states
export default function ChatThreadClient({ chatId, authExpired = false }: ChatThreadClientProps) {
  // Query current user - Convex uses preloaded cache if available from server
  const currentUser = useQuery(api.users.queries.getCurrentUser);

  // Show loading state while user profile is being fetched
  // This ensures userData is available before any chat interaction
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

  // Handle not authenticated state (user is null from preloaded query)
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

  // Build user data for the API - now guaranteed to have currentUser
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

  // Render the inner chat component only after user data is loaded
  // This ensures useChat is initialized with the correct userData
  return (
    <ChatThreadInner
      chatId={chatId}
      authExpired={authExpired}
      userData={userData}
      currentUser={currentUser}
    />
  );
}

// Inner chat component - only mounted when user data is available
interface ChatThreadInnerProps {
  chatId: string;
  authExpired: boolean;
  userData: UserData;
  currentUser: NonNullable<ReturnType<typeof useQuery<typeof api.users.queries.getCurrentUser>>>;
}

function ChatThreadInner({ chatId, authExpired, userData, currentUser }: ChatThreadInnerProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Track pending threadId for new conversations (used before state is updated)
  const pendingThreadIdRef = useRef<Id<'threads'> | null>(null);

  const [chatState, setChatState] = useState<ChatState>('chatting');
  const [threadId, setThreadId] = useState<Id<'threads'> | null>(null);
  const [isNewThread, setIsNewThread] = useState(chatId === 'new');
  const [searchSessions, setSearchSessions] = useState<string[]>([]);

  // Safe navigation helper to prevent router errors before initialization
  const safeNavigate = useCallback((path: string, replace = false) => {
    // Defer navigation to next frame to ensure router is fully initialized
    requestAnimationFrame(() => {
      try {
        if (replace) {
          router.replace(path);
        } else {
          router.push(path);
        }
      } catch (error) {
        // Fallback to window.location if router fails
        console.warn('Router navigation failed, using fallback:', error);
        if (replace) {
          window.location.replace(path);
        } else {
          window.location.href = path;
        }
      }
    });
  }, [router]);

  // Get thread data if not a new chat
  const thread = useQuery(
    api.threads.queries.getThread,
    threadId ? { threadId } : 'skip'
  );

  // Get messages for the thread
  const messagesData = useQuery(
    api.messages.queries.getAllMessages,
    threadId ? { threadId } : 'skip'
  );

  // Mutations and Actions
  const startConversation = useMutation(api.messages.mutations.startConversation);
  const sendMessageMutation = useMutation(api.messages.mutations.sendMessage);
  const saveAssistantMessage = useMutation(api.messages.mutations.saveAssistantMessage);
  const createLooksFromChat = useMutation(api.chat.mutations.createLooksFromChat);
  const generateChatLookImages = useAction(api.chat.actions.generateChatLookImages);
  
  // Track created look IDs for fitting room navigation
  const [createdLookIds, setCreatedLookIds] = useState<Id<'looks'>[]>([]);
  const [generationProgress, setGenerationProgress] = useState<string>('');

  // Set threadId from chatId prop if it's a valid ID
  useEffect(() => {
    if (chatId !== 'new') {
      const threadIdValue = chatId as Id<'threads'>;
      setThreadId(threadIdValue);
      pendingThreadIdRef.current = threadIdValue; // Also set ref for callbacks
      setIsNewThread(false);
    }
  }, [chatId]);

  // Persist searchSessions to sessionStorage when they change
  // This prevents losing state when URL changes from /ask/new to /ask/{threadId}
  useEffect(() => {
    if (searchSessions.length > 0 && threadId) {
      sessionStorage.setItem(`nima-sessions-${threadId}`, JSON.stringify(searchSessions));
    }
  }, [searchSessions, threadId]);

  // Restore searchSessions from sessionStorage when threadId is set
  useEffect(() => {
    if (threadId) {
      const saved = sessionStorage.getItem(`nima-sessions-${threadId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log('[Chat] Restoring searchSessions from sessionStorage:', parsed);
            setSearchSessions(parsed);
          }
        } catch (e) {
          console.error('[Chat] Failed to parse saved searchSessions:', e);
        }
      }
    }
  }, [threadId]);

  // Log searchSessions changes for debugging
  useEffect(() => {
    console.log('[Chat] searchSessions updated:', searchSessions.length, searchSessions);
  }, [searchSessions]);

  // useChat for AI streaming (AI SDK v5 API)
  // userData is guaranteed to be available at this point
  const {
    messages: aiMessages,
    setMessages: setAiMessages,
    sendMessage,
    status,
    error: chatError,
  } = useChat({
    // @ts-expect-error - AI SDK v5 types may not include api/body options but they work at runtime
    api: '/api/chat',
    // userData is guaranteed to be defined here since this component only mounts after user loads
    body: { userData },
    onError: (error) => {
      console.error('[Chat] useChat onError:', error);
      setChatState('chatting');
    },
    onFinish: async ({ message }) => {
      console.log('[Chat] onFinish called, message:', message);
      const messageContent = getMessageText(message);
      console.log('[Chat] Extracted message content:', messageContent.slice(0, 100));
      
      // Save assistant message to Convex when streaming finishes
      // Use pendingThreadIdRef first since state may not be updated yet for new threads
      const targetThreadId = pendingThreadIdRef.current || threadId;
      console.log('[Chat] Saving to threadId:', targetThreadId);
      if (targetThreadId) {
        try {
          await saveAssistantMessage({
            threadId: targetThreadId,
            content: messageContent,
            model: 'gpt-4o-mini',
          });
          console.log('[Chat] Assistant message saved successfully');
        } catch (error) {
          console.error('Failed to save assistant message:', error);
        }
      }

      // Check for [MATCH_ITEMS:occasion] tag - new flow
      const matchItemsMatch = messageContent.match(/\[MATCH_ITEMS:([^\]]+)\]/);
      if (matchItemsMatch) {
        const occasion = matchItemsMatch[1];
        console.log('[Chat] Detected MATCH_ITEMS with occasion:', occasion);
        handleMatchItems(occasion);
      }
      // Legacy: Check if AI is ready to search
      else if (messageContent.includes('[SEARCH_READY]')) {
        handleSearchReady();
      }

      // Update URL after AI response completes (to avoid resetting state during streaming)
      if (pendingThreadIdRef.current && window.location.pathname === '/ask/new') {
        window.history.replaceState(null, '', `/ask/${pendingThreadIdRef.current}`);
      }

      setChatState('chatting');
    },
  });

  // Log status changes
  useEffect(() => {
    console.log('[Chat] Status changed:', status);
  }, [status]);

  // Log messages changes
  useEffect(() => {
    console.log('[Chat] aiMessages updated:', aiMessages.length, 'messages', aiMessages.map(m => ({ id: m.id, role: m.role, content: getMessageText(m).slice(0, 50), parts: m.parts, keys: Object.keys(m) })));
  }, [aiMessages]);

  // Log any chat errors
  useEffect(() => {
    if (chatError) {
      console.error('[Chat] Chat error:', chatError);
    }
  }, [chatError]);

  // Derive loading state from status (AI SDK v5)
  const isAiLoading = status === 'submitted' || status === 'streaming';

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages, chatState]);

  // Load existing messages into useChat state when thread loads (AI SDK v5 format)
  useEffect(() => {
    if (messagesData && messagesData.length > 0 && aiMessages.length === 0) {
      const formattedMessages = messagesData.map((msg) => ({
        id: msg._id,
        role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
        parts: [{ type: 'text' as const, text: msg.content }],
        createdAt: new Date(msg.createdAt),
      }));
      setAiMessages(formattedMessages as UIMessage[]);
    }
  }, [messagesData, aiMessages.length, setAiMessages]);

  // Handle pending message from /ask page (when user navigates from homepage)
  // This ref tracks if we've already processed the pending message
  const pendingMessageProcessedRef = useRef(false);
  useEffect(() => {
    if (chatId === 'new' && typeof window !== 'undefined' && !pendingMessageProcessedRef.current) {
      const pendingMessage = sessionStorage.getItem('nima-pending-message');
      console.log('[Chat] Checking for pending message:', { chatId, pendingMessage: pendingMessage?.slice(0, 50) });
      if (pendingMessage) {
        pendingMessageProcessedRef.current = true;
        sessionStorage.removeItem('nima-pending-message');
        // Send the message immediately - sendMessage is from useChat
        console.log('[Chat] Sending pending message to AI:', pendingMessage.slice(0, 50));
        setChatState('typing');
        console.log('[Chat] About to call sendMessage with:', pendingMessage);
        sendMessage({ text: pendingMessage });
        
        // Create thread in background - DON'T update URL yet to avoid resetting useChat state
        startConversation({ content: pendingMessage, contextType: 'outfit_help' })
          .then((result) => {
            console.log('[Chat] Thread created:', result.threadId);
            pendingThreadIdRef.current = result.threadId;
            setThreadId(result.threadId);
            setIsNewThread(false);
            // URL will be updated in onFinish after AI response completes
          })
          .catch((error) => {
            console.error('Failed to create thread:', error);
          });
      }
    }
  }, [chatId, sendMessage, startConversation]);

  // Handle item matching - calls mutation to create looks from user preferences
  // Then triggers image generation for those looks
  const handleMatchItems = useCallback(async (occasion: string) => {
    console.log('[Chat] handleMatchItems starting:', {
      occasion,
      threadId,
      pendingThreadId: pendingThreadIdRef.current,
      currentSearchSessions: searchSessions.length,
    });
    
    // Step 1: Curating - Match items and create looks
    setChatState('curating');
    setGenerationProgress('Curating based on your preferences...');

    try {
      const result = await createLooksFromChat({ occasion, context: occasion });
      console.log('[Chat] createLooksFromChat result:', result);

      if (!result.success) {
        // Handle errors gracefully - no auto-dismiss so users can read messages
        if (result.message === 'no_matches') {
          console.log('[Chat] No matching items found for occasion:', occasion);
          setChatState('no_matches');
          // Don't auto-dismiss - let user read the message and try again
        } else if (result.message === 'no_photo') {
          console.log('[Chat] User needs to upload a photo');
          setChatState('no_matches');
          // Will show a helpful message in the UI instead of alert
        } else {
          console.warn('[Chat] Match items failed:', result.message);
          setChatState('chatting');
        }
        return;
      }

      // Step 2: Generating - Create try-on images
      const lookIds = result.lookIds;
      setCreatedLookIds(lookIds);
      setChatState('generating');
      setGenerationProgress('Creating the new you...');
      
      console.log('[Chat] Starting image generation for', lookIds.length, 'looks');

      // Generate images for all looks
      const genResult = await generateChatLookImages({ lookIds });
      console.log('[Chat] Image generation result:', genResult);

      if (genResult.success) {
        // Success! Add to search sessions to show fitting room card
        // Use comma-separated lookIds as session ID for multi-look support
        const sessionId = lookIds.join(',');
        const newSessions = [...searchSessions, sessionId];
        setSearchSessions(newSessions);
        
        // Also persist to sessionStorage immediately using pending or current threadId
        const targetThreadId = threadId || pendingThreadIdRef.current;
        if (targetThreadId) {
          sessionStorage.setItem(`nima-sessions-${targetThreadId}`, JSON.stringify(newSessions));
          console.log('[Chat] Saved searchSessions to sessionStorage for thread:', targetThreadId);
        }
        
        setChatState('chatting');
      } else {
        // Some or all images failed, but still show what we have
        console.warn('[Chat] Some image generations failed');
        const sessionId = lookIds.join(',');
        const newSessions = [...searchSessions, sessionId];
        setSearchSessions(newSessions);
        
        // Also persist to sessionStorage immediately
        const targetThreadId = threadId || pendingThreadIdRef.current;
        if (targetThreadId) {
          sessionStorage.setItem(`nima-sessions-${targetThreadId}`, JSON.stringify(newSessions));
        }
        
        setChatState('chatting');
      }
    } catch (error) {
      console.error('[Chat] Error in item matching flow:', error);
      setChatState('chatting');
    }
  }, [createLooksFromChat, generateChatLookImages, searchSessions, threadId]);

  // Legacy search ready handler
  const handleSearchReady = useCallback(() => {
    setChatState('searching');
    // Generate a mock session ID for now
    const sessionId = `session-${Date.now()}`;
    setSearchSessions((prev) => [...prev, sessionId]);

    // Simulate search delay then show fitting room card
    setTimeout(() => {
      setChatState('chatting');
    }, 2000);
  }, []);

  const handleSendMessage = async (content: string) => {
    console.log('[Chat] handleSendMessage called:', { content: content.slice(0, 50), chatState, isNewThread, threadId });
    
    // Reset no_matches state when user tries again
    if (chatState === 'no_matches') {
      setChatState('chatting');
    }
    
    if (chatState !== 'chatting' && chatState !== 'no_matches') {
      console.log('[Chat] Blocked - chatState:', chatState, 'content empty:', !content.trim());
      return;
    }
    
    if (!content.trim()) {
      console.log('[Chat] Blocked - content empty');
      return;
    }

    setChatState('typing');

    if (isNewThread && !threadId) {
      // 1. Send to AI IMMEDIATELY for instant response
      console.log('[Chat] NEW THREAD: Calling sendMessage for AI');
      sendMessage({ text: content });
      
      // 2. Create thread in background (don't block AI call)
      // DON'T update URL yet - it will be updated in onFinish after AI response completes
      startConversation({ content, contextType: 'outfit_help' })
        .then((result) => {
          console.log('[Chat] Thread created in background:', result.threadId);
          pendingThreadIdRef.current = result.threadId;
          setThreadId(result.threadId);
          setIsNewThread(false);
          // URL will be updated in onFinish after AI response completes
        })
        .catch((error) => {
          console.error('Failed to create thread:', error);
        });
    } else if (threadId) {
      // Send to AI immediately, save to DB in background
      console.log('[Chat] EXISTING THREAD: Calling sendMessage for AI');
      sendMessage({ text: content });
      
      // Save user message to existing thread in background
      sendMessageMutation({ threadId, content }).catch((error) => {
        console.error('Failed to save message:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('Not authenticated') || errorMessage.includes('not authenticated')) {
          alert('Your session has expired. Please sign in again.');
          safeNavigate('/sign-in');
        }
      });
    } else {
      console.warn('[Chat] handleSendMessage: no action taken - isNewThread:', isNewThread, 'threadId:', threadId);
    }
  };

  const handleFittingRoomClick = (sessionId: string) => {
    safeNavigate(`/fitting/${sessionId}`);
  };

  const handleNewChat = () => {
    safeNavigate('/ask');
  };

  const handlePromptSelect = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Convert AI messages to display format (AI SDK v5 uses message.parts)
  const displayMessages: DisplayMessage[] = aiMessages.map((msg) => {
    let content = getMessageText(msg);
    // AI SDK v5 UIMessage may have createdAt as optional or under a different property
    const timestamp = (msg as UIMessage & { createdAt?: Date }).createdAt || new Date();
    
    // Clean up special tags from display
    content = content
      .replace('[SEARCH_READY]', '')
      .replace(/\[MATCH_ITEMS:[^\]]+\]/g, '')
      .trim();
    
    return {
      id: msg.id,
      role: msg.role === 'assistant' ? 'nima' : 'user',
      content,
      timestamp,
      type: 'text' as const,
    };
  });

  // Log display messages for debugging
  console.log('[Chat] Display messages:', displayMessages.length, displayMessages.map(m => ({ id: m.id, role: m.role, content: m.content.slice(0, 30) })));

  // Add fitting-ready messages for search sessions (using look IDs)
  searchSessions.forEach((sessionId) => {
    displayMessages.push({
      id: `fitting-${sessionId}`,
      role: 'nima',
      content: '',
      timestamp: new Date(),
      type: 'fitting-ready',
      sessionId,
    });
  });

  // Add "no matches" message if in that state - helpful and actionable
  if (chatState === 'no_matches') {
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

  // Add initial greeting if no messages - personalized based on user preferences
  if (displayMessages.length === 0 && !isAiLoading) {
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

  const title = thread?.title || (displayMessages.find(m => m.role === 'user')?.content.slice(0, 40) || 'New conversation');

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Auth Expired Modal */}
      {authExpired && <AuthExpiredModal />}
      
      {/* Header - fixed at top */}
      <header className="flex-shrink-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Back button */}
            <Link
              href="/ask"
              className="p-2 -ml-2 rounded-full hover:bg-surface transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </Link>

            {/* Title */}
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

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <MessagesIcon />
              <ChatHistoryButton currentChatId={chatId} onNewChat={handleNewChat} />
            </div>
          </div>
        </div>
      </header>

      {/* Free searches badge */}
      <div className="flex-shrink-0 flex justify-center py-2 bg-surface/30">
        <div className="px-3 py-1 rounded-full bg-background/80 border border-border/30">
          <span className="text-xs text-muted-foreground">
            <span className="text-secondary font-medium">
              {currentUser ? Math.max(0, 20 - (currentUser.dailyTryOnCount || 0)) : 2}
            </span> free searches today
          </span>
        </div>
      </div>

      {/* Messages area - scrollable */}
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
                {/* Progress indicator */}
                <div className="mt-3 h-1 bg-surface-alt rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                    initial={{ width: '0%' }}
                    animate={{ 
                      width: chatState === 'curating' ? '40%' : '90%' 
                    }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* No matches suggestion - explore page link */}
          <AnimatePresence>
            {chatState === 'no_matches' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-surface/50 rounded-2xl border border-border/30"
              >
                <Link
                  href="/explore"
                  className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl hover:from-primary/20 hover:to-secondary/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Explore Public Looks</p>
                      <p className="text-xs text-muted-foreground">See what others are wearing</p>
                    </div>
                  </div>
                  <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick prompts for continuing - inline card */}
          {chatState === 'chatting' && searchSessions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-surface/50 rounded-2xl border border-border/30"
            >
              <p className="text-xs text-muted-foreground mb-3">Continue styling:</p>
              <PromptChips onSelect={handlePromptSelect} limit={3} />
            </motion.div>
          )}

          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Bottom padding for fixed elements */}
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
