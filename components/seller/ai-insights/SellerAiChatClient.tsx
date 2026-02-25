'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAccessToken } from '@workos-inc/authkit-nextjs/components';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Sparkles,
  Send,
  Trash2,
  TrendingUp,
  Package,
  Users,
  ShoppingBag,
  RefreshCw,
  Bot,
  User,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  parts?: Array<{ type: string; text: string }>;
  content?: string;
}

// ─── Starter questions ────────────────────────────────────────────────────────

const STARTER_QUESTIONS = [
  {
    icon: TrendingUp,
    label: 'Revenue trends',
    question: "What's my revenue trend over the last 30 days, and which categories are driving it?",
  },
  {
    icon: Package,
    label: 'Restock advice',
    question: 'Which products should I restock urgently based on saves and purchase demand?',
  },
  {
    icon: ShoppingBag,
    label: 'Top sellers',
    question: 'What are my top-performing products and what makes them successful?',
  },
  {
    icon: Users,
    label: 'Customer loyalty',
    question: 'How strong is my customer loyalty, and how can I improve my repeat buyer rate?',
  },
];

// ─── Helper: extract text from AI SDK v5 message ─────────────────────────────

function getMessageText(message: ChatMessage): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === 'text')
      .map((p) => p.text)
      .join('');
  }
  return message.content ?? '';
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  message,
  isStreaming,
}: {
  message: ChatMessage;
  isStreaming: boolean;
}) {
  const isUser = message.role === 'user';
  const text = getMessageText(message);

  return (
    <div className={cn('flex gap-3 w-full', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted/60 text-foreground rounded-bl-sm border border-border/50'
        )}
      >
        {isStreaming && !isUser && !text ? (
          <div className="flex gap-1.5 items-center py-1">
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap break-words">{text}</div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              h3: ({ children }) => <p className="font-semibold mt-3 mb-1">{children}</p>,
              h2: ({ children }) => <p className="font-semibold mt-3 mb-1">{children}</p>,
              code: ({ children }) => <code className="bg-black/10 rounded px-1 text-xs">{children}</code>,
              hr: () => <hr className="my-3 border-border/40" />,
            }}
          >
            {text}
          </ReactMarkdown>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary border flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

// ─── Input bar ────────────────────────────────────────────────────────────────

function ChatInputBar({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState('');

  const handleSubmit = () => {
    const text = draft.trim();
    if (!text || disabled) return;
    onSend(text);
    setDraft('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t bg-background/80 backdrop-blur-sm p-4">
      <div className="flex gap-3 items-end max-w-4xl mx-auto">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your products, revenue, customers…"
          rows={1}
          className="resize-none min-h-[44px] max-h-[120px] text-sm overflow-y-auto"
          disabled={disabled}
        />
        <Button
          onClick={handleSubmit}
          disabled={disabled || !draft.trim()}
          size="icon"
          className="shrink-0 h-11 w-11"
        >
          {disabled ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground text-center mt-2 max-w-4xl mx-auto">
        AI-powered insights from your live store data · Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onSend }: { onSend: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 px-4 py-12">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Your AI Business Analyst</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Ask anything about your store performance — revenue, products, customers, and growth opportunities.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
        {STARTER_QUESTIONS.map(({ icon: Icon, label, question }) => (
          <button
            key={label}
            onClick={() => onSend(question)}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 text-left hover:bg-muted/50 hover:border-primary/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors mt-0.5">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{question}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Error banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm shrink-0">
      <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-destructive">Something went wrong</p>
        <p className="text-muted-foreground text-xs mt-0.5">{message}</p>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground text-xs shrink-0">
        Dismiss
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SellerAiChatClient() {
  const { getAccessToken } = useAccessToken();
  const history = useQuery(api.sellers.aiChat.getSellerChatHistory);
  const saveMessage = useMutation(api.sellers.aiChat.saveSellerChatMessage);
  const clearHistory = useMutation(api.sellers.aiChat.clearSellerChatHistory);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [historySeeded, setHistorySeeded] = useState(false);

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/seller-chat',
      prepareSendMessagesRequest: async ({ messages: msgs, body }) => {
        const convexToken = await getAccessToken().catch(() => null);
        return {
          body: { ...body, messages: msgs, convexToken },
        };
      },
    }),
    onError: (error: Error) => {
      setErrorMsg(error.message || 'Failed to get a response. Please try again.');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onFinish: async ({ message }: any) => {
      const text = getMessageText(message as ChatMessage);
      if (text) {
        try {
          await saveMessage({ role: 'assistant', content: text });
        } catch {
          // Non-critical
        }
      }
    },
  });

  // Seed messages from Convex history once loaded
  useEffect(() => {
    if (history !== undefined && history !== null && !historySeeded) {
      setHistorySeeded(true);
      if (history.length > 0) {
        setMessages(
          history.map((m) => ({
            id: m._id,
            role: m.role,
            content: m.content,
            parts: [{ type: 'text', text: m.content }],
          }))
        );
      }
    }
  }, [history, historySeeded, setMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const isStreaming = status === 'streaming' || status === 'submitted';

  const handleSend = useCallback(async (text: string) => {
    setErrorMsg(null);
    try {
      await saveMessage({ role: 'user', content: text });
    } catch {
      // Non-critical
    }
    sendMessage({ text });
  }, [saveMessage, sendMessage]);

  const handleClear = async () => {
    await clearHistory();
    setMessages([]);
    setErrorMsg(null);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-base">AI Insights</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Powered by your live store data
            </p>
          </div>
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400 ml-1">
            Premium
          </Badge>
        </div>

        {!isEmpty && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Clear history</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear conversation history?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all messages in this chat. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClear}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Clear history
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {/* Message area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto"
      >
        {isEmpty ? (
          <EmptyState onSend={handleSend} />
        ) : (
          <div className="flex flex-col gap-5 px-4 py-6 max-w-4xl mx-auto">
            {(messages as ChatMessage[]).map((message, i) => (
              <MessageBubble
                key={message.id}
                message={message}
                isStreaming={isStreaming && i === messages.length - 1 && message.role === 'assistant'}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0">
        <ChatInputBar onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
