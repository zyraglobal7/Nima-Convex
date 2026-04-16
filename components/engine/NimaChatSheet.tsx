'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Drawer as DrawerPrimitive } from 'vaul';
import { X, Sparkles } from 'lucide-react';
import {
  ChatInput,
  MessageBubble,
  PromptSuggestions,
  FittingRoomCard,
  SearchingCard,
  ChatHistoryButton,
} from '@/components/ask';
import { TypingIndicator } from '@/components/ask/MessageBubble';
import { trackEvent } from '@/lib/analytics';
import type { UIMessage } from 'ai';

type ChatState = 'idle' | 'typing' | 'curating' | 'generating' | 'no_matches';

interface DisplayMessage {
  id: string;
  role: 'user' | 'nima';
  content: string;
  timestamp: Date;
  type: 'text' | 'searching' | 'fitting-ready';
  sessionId?: string;
  variant?: 'fresh' | 'remix';
}

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

function getMessageText(message: UIMessage): string {
  if (!message.parts) return '';
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

interface NimaChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NimaChatSheet({ open, onOpenChange }: NimaChatSheetProps) {
  const router = useRouter();
  const currentUser = useQuery(api.users.queries.getCurrentUser);
  const [selectedThreadId, setSelectedThreadId] = useState<Id<'threads'> | null>(null);

  const wardrobeItemsRaw = useQuery(api.wardrobe.queries.getWardrobeItems, {});
  const wardrobeItems = wardrobeItemsRaw?.map((item) => ({
    description: item.description,
    category: item.category,
    color: item.color,
    formality: item.formality,
  })) ?? [];

  const userData: UserData = {
    firstName: currentUser?.firstName,
    gender: currentUser?.gender,
    stylePreferences: currentUser?.stylePreferences ?? [],
    budgetRange: currentUser?.budgetRange,
    shirtSize: currentUser?.shirtSize,
    waistSize: currentUser?.waistSize,
    shoeSize: currentUser?.shoeSize,
    shoeSizeUnit: currentUser?.shoeSizeUnit,
    country: currentUser?.country,
    currency: currentUser?.currency,
  };

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (isOpen) {
      trackEvent('ask_nima_sheet_opened');
    } else {
      trackEvent('ask_nima_sheet_closed');
    }
  };

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={handleOpenChange}
      direction="bottom"
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" />
        <DrawerPrimitive.Content
          className="fixed bottom-0 left-0 right-0 z-[201] bg-background border-t border-border rounded-t-3xl"
        >
          {/* Accessible title required by Radix Dialog — hidden visually */}
          <DrawerPrimitive.Title className="sr-only">
            Ask Nima — your personal stylist
          </DrawerPrimitive.Title>

          {/* Inner shell — owns height, flex layout, overflow.
              Lives inside DrawerPrimitive.Content so vaul's inline height
              styles don't collapse our flex chain. */}
          <div className="flex flex-col h-[90svh] max-h-[90svh] overflow-hidden">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Ask Nima</p>
                  <p className="text-xs text-text-secondary">Your personal stylist</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <ChatHistoryButton
                  onSelectThread={(id) => setSelectedThreadId(id)}
                  onNewChat={() => setSelectedThreadId(null)}
                />
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 rounded-full hover:bg-surface transition-colors text-text-secondary"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat body — takes remaining space */}
            <div className="flex-1 min-h-0 overflow-hidden relative">
              {currentUser ? (
                <ChatBody
                  key={selectedThreadId ?? 'new'}
                  userData={userData}
                  wardrobeItems={wardrobeItems}
                  currentUser={currentUser}
                  loadThreadId={selectedThreadId}
                  onFittingRoomClick={(sessionId) => {
                    onOpenChange(false);
                    router.push(`/fitting/${sessionId}`);
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
              )}
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>

    </DrawerPrimitive.Root>
  );
}

// ── Inner chat body ───────────────────────────────────────────────────────────

function ChatBody({
  userData,
  wardrobeItems,
  currentUser,
  loadThreadId,
  onFittingRoomClick,
}: {
  userData: UserData;
  wardrobeItems: Array<{ description: string; category: string; color: string; formality: string }>;
  currentUser: NonNullable<ReturnType<typeof useQuery<typeof api.users.queries.getCurrentUser>>>;
  loadThreadId?: Id<'threads'> | null;
  onFittingRoomClick: (sessionId: string) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingThreadIdRef = useRef<Id<'threads'> | null>(loadThreadId ?? null);
  // Holds the in-flight startConversation promise so onFinish can await it
  const threadCreationRef = useRef<Promise<Id<'threads'>> | null>(null);

  const [chatState, setChatState] = useState<ChatState>('idle');
  const [threadId, setThreadId] = useState<Id<'threads'> | null>(loadThreadId ?? null);
  const [createdLookIds, setCreatedLookIds] = useState<Id<'looks'>[]>([]);
  const [scenario, setScenario] = useState<'fresh' | 'remix'>('fresh');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Mutations / actions
  const startConversation = useMutation(api.messages.mutations.startConversation);
  const sendMessageToThread = useMutation(api.messages.mutations.sendMessage);
  const saveAssistantMessage = useMutation(api.messages.mutations.saveAssistantMessage);
  const saveFittingReadyMessage = useMutation(api.messages.mutations.saveFittingReadyMessage);
  const saveNoMatchesMessage = useMutation(api.messages.mutations.saveNoMatchesMessage);
  const createLooksFromChat = useMutation(api.chat.mutations.createLooksFromChat);
  const createRemixedLook = useMutation(api.chat.mutations.createRemixedLook);
  const generateChatLookImages = useAction(api.chat.actions.generateChatLookImages);
  const generateUploadUrl = useMutation(api.userImages.mutations.generateUploadUrl);
  const findSimilarItems = useAction(api.search.visualSearch.findSimilarItems);

  const userRecentLooks = useQuery(api.chat.queries.getUserRecentLooks, { limit: 10 });
  const messagesData = useQuery(
    api.messages.queries.getAllMessages,
    threadId ? { threadId } : 'skip'
  );

  const {
    messages: aiMessages,
    sendMessage,
    status,
    error: chatError,
  } = useChat({
    // @ts-expect-error AI SDK v5
    api: '/api/chat',
    body: { userData, wardrobeItems },
    onError: () => setChatState('idle'),
    onFinish: async ({ message }) => {
      const messageContent = getMessageText(message);

      // If startConversation is still in-flight, wait for it so we don't lose the thread ID
      if (threadCreationRef.current) {
        try {
          const resolvedId = await threadCreationRef.current;
          if (!pendingThreadIdRef.current) pendingThreadIdRef.current = resolvedId;
        } catch {
          // thread creation failed — message won't be saved, but don't crash
        }
        threadCreationRef.current = null;
      }

      const targetThreadId = pendingThreadIdRef.current || threadId;

      if (targetThreadId) {
        try {
          await saveAssistantMessage({
            threadId: targetThreadId,
            content: messageContent,
            model: 'gpt-4o',
          });
        } catch (e) {
          console.error('[ChatSheet] Failed to save assistant message:', e);
        }
      }

      const matchItemsMatch = messageContent.match(/\[MATCH_ITEMS:([^\]]+)\]/);
      if (matchItemsMatch) {
        const parts = matchItemsMatch[1].split('|');
        const occasion = parts[0].trim();
        const source = (['new', 'wardrobe', 'both'].includes(parts[1]?.trim() ?? '') ? parts[1].trim() : 'new') as 'new' | 'wardrobe' | 'both';
        handleMatchItems(occasion, source);
      } else {
        const remixMatch = messageContent.match(/\[REMIX_LOOK:([^|]+)\|([^\]]+)\]/);
        if (remixMatch) handleRemixLook(remixMatch[1], remixMatch[2]);
      }

      setChatState('idle');
    },
  });

  const isAiLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesData, aiMessages, chatState]);

  const handleMatchItems = useCallback(
    async (occasion: string, source: 'new' | 'wardrobe' | 'both' = 'new') => {
      const targetThreadId = threadId || pendingThreadIdRef.current;
      setChatState('curating');
      try {
        const result = await createLooksFromChat({ occasion, context: occasion, source });
        if (!result.success) {
          setChatState(result.message === 'no_matches' || result.message === 'no_photo' ? 'no_matches' : 'idle');
          if ((result.message === 'no_matches' || result.message === 'no_photo') && targetThreadId) {
            await saveNoMatchesMessage({ threadId: targetThreadId, occasion });
          }
          return;
        }
        const resultScenario = 'scenario' in result ? (result.scenario as 'fresh' | 'remix') : 'fresh';
        setScenario(resultScenario);
        setCreatedLookIds(result.lookIds);
        setChatState('generating');
        await generateChatLookImages({ lookIds: result.lookIds });
        if (targetThreadId) {
          await saveFittingReadyMessage({
            threadId: targetThreadId,
            lookIds: result.lookIds,
            content:
              resultScenario === 'remix'
                ? `Found ${result.lookIds.length} looks - some remixed from your previous styles!`
                : `Found ${result.lookIds.length} perfect looks for you!`,
          });
        }
        setChatState('idle');
      } catch (e) {
        console.error('[ChatSheet] handleMatchItems error:', e);
        setChatState('idle');
      }
    },
    [createLooksFromChat, generateChatLookImages, saveFittingReadyMessage, saveNoMatchesMessage, threadId]
  );

  const handleRemixLook = useCallback(
    async (sourceOccasion: string, twist: string) => {
      const targetThreadId = threadId || pendingThreadIdRef.current;
      setChatState('curating');
      setScenario('remix');
      try {
        const matchingLook = userRecentLooks?.find((look) =>
          look.occasion?.toLowerCase().includes(sourceOccasion.toLowerCase())
        );
        if (!matchingLook) { setChatState('idle'); return; }
        const result = await createRemixedLook({ sourceLookId: matchingLook._id, twist, occasion: sourceOccasion });
        if (!result.success) { setChatState('idle'); return; }
        setCreatedLookIds([result.lookId]);
        setChatState('generating');
        await generateChatLookImages({ lookIds: [result.lookId] });
        if (targetThreadId) {
          await saveFittingReadyMessage({
            threadId: targetThreadId,
            lookIds: [result.lookId],
            content: `I've remixed your look with a ${twist} twist!`,
          });
        }
        setChatState('idle');
      } catch (e) {
        console.error('[ChatSheet] handleRemixLook error:', e);
        setChatState('idle');
      }
    },
    [createRemixedLook, generateChatLookImages, saveFittingReadyMessage, threadId, userRecentLooks]
  );

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (chatState === 'no_matches') setChatState('idle');
    if (chatState !== 'idle' && chatState !== 'no_matches') return;

    setChatState('typing');
    sendMessage({ text: content });

    if (threadId) {
      // Continuing an existing thread — add the user message to it directly
      pendingThreadIdRef.current = threadId;
      sendMessageToThread({ threadId, content }).catch(console.error);
    } else {
      // New conversation — create thread; store promise so onFinish can await it
      const creationPromise = startConversation({ content, contextType: 'outfit_help' })
        .then((result) => {
          pendingThreadIdRef.current = result.threadId;
          setThreadId(result.threadId);
          return result.threadId;
        });
      threadCreationRef.current = creationPromise;
      creationPromise.catch(console.error);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploadingImage(true);
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error('Upload failed');
      const { storageId } = await response.json();
      const result = await findSimilarItems({ imageStorageId: storageId });
      if (!result.success || result.items.length === 0) {
        setChatState('no_matches');
        return;
      }
      const searchDescription = result.extractedAttributes?.description || 'uploaded image';
      const itemNames = result.items.slice(0, 3).map((item: { name: string }) => item.name).join(', ');
      await handleSendMessage(
        `I'm looking for items similar to this: ${searchDescription}. I found some matches like ${itemNames}. Can you help me style these?`
      );
    } catch (e) {
      console.error('[ChatSheet] Image upload error:', e);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const cleanContent = (content: string): string =>
    content
      .replace('[SEARCH_READY]', '')
      .replace(/\[MATCH_ITEMS:[^\]]+\]/g, '')
      .replace(/\[REMIX_LOOK:[^\]]+\]/g, '')
      .replace(/\[MIX_LOOKS:[^\]]+\]/g, '')
      .trim();

  // Build display messages
  const displayMessages: DisplayMessage[] = [];

  if (messagesData) {
    messagesData.forEach((msg) => {
      if (msg.messageType === 'fitting-ready' && msg.lookIds?.length) {
        displayMessages.push({
          id: msg._id,
          role: 'nima',
          content: msg.content,
          timestamp: new Date(msg.createdAt),
          type: 'fitting-ready',
          sessionId: msg.lookIds.join(','),
          variant: msg.content.includes('remixed') ? 'remix' : 'fresh',
        });
      } else {
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

  // Streaming AI message
  const lastAiMessage = aiMessages[aiMessages.length - 1];
  if (lastAiMessage?.role === 'assistant' && status === 'streaming') {
    const streamingContent = cleanContent(getMessageText(lastAiMessage));
    if (streamingContent && !displayMessages.some((m) => m.role === 'nima' && cleanContent(m.content) === streamingContent)) {
      displayMessages.push({
        id: 'streaming-' + lastAiMessage.id,
        role: 'nima',
        content: streamingContent,
        timestamp: new Date(),
        type: 'text',
      });
    }
  }

  // Pending user messages
  aiMessages.filter((m) => m.role === 'user').forEach((userMsg) => {
    const userContent = getMessageText(userMsg);
    if (userContent && !displayMessages.some((m) => m.role === 'user' && m.content === userContent)) {
      displayMessages.push({
        id: 'pending-' + userMsg.id,
        role: 'user',
        content: userContent,
        timestamp: new Date(),
        type: 'text',
      });
    }
  });

  // Fitting-ready state
  if (createdLookIds.length > 0 && chatState === 'idle' && !displayMessages.some((m) => m.type === 'fitting-ready')) {
    displayMessages.push({
      id: 'fitting-ready',
      role: 'nima',
      content:
        scenario === 'remix'
          ? `Found ${createdLookIds.length} looks — some remixed from your previous styles!`
          : `Found ${createdLookIds.length} perfect looks for you!`,
      timestamp: new Date(),
      type: 'fitting-ready',
      sessionId: createdLookIds.join(','),
      variant: scenario,
    });
  }

  displayMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const hasMessages = displayMessages.length > 0 || isAiLoading || chatState !== 'idle';

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Messages area */}
      <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 ${!hasMessages ? 'flex flex-col items-center justify-center' : 'space-y-4'}`}>
        {!hasMessages ? (
          <PromptSuggestions onSelect={handleSendMessage} />
        ) : (
          <>
            {displayMessages.map((msg) => {
              if (msg.type === 'fitting-ready' && msg.sessionId) {
                return (
                  <FittingRoomCard
                    key={msg.id}
                    sessionId={msg.sessionId}
                    variant={msg.variant ?? 'fresh'}
                    onClick={() => onFittingRoomClick(msg.sessionId!)}
                  />
                );
              }
              return (
                <MessageBubble
                  key={msg.id}
                  message={{
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    timestamp: msg.timestamp,
                    type: msg.type,
                  }}
                />
              );
            })}

            {(chatState === 'typing' || isAiLoading) && <TypingIndicator />}

            {(chatState === 'curating' || chatState === 'generating') && (
              <SearchingCard />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border/50 px-4 py-3 bg-background">
        <ChatInput
          onSend={handleSendMessage}
          onImageUpload={handleImageUpload}
          disabled={chatState !== 'idle' && chatState !== 'no_matches'}
          placeholder="Ask me anything about style..."
          isUploadingImage={isUploadingImage}
        />
      </div>
    </div>
  );
}
