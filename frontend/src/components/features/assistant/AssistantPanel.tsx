'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, ExternalLink, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { AssistantService, ConversationMessage, GroundingSource } from '../../../services/assistant.service';
import ReactMarkdown from 'react-markdown';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
  thinkingSummary?: string;
  thoughtSignature?: string;
}

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingCategory?: string;
}

const SUGGESTED_QUESTIONS: Record<string, string[]> = {
  vehicle: [
    'Is this a fair price for this vehicle?',
    'What are common issues with this model?',
    'What should I inspect before buying?',
    'How does this compare to similar listings?',
  ],
  phone: [
    'Is this price competitive for this phone?',
    'How does this compare to newer models?',
    'What should I check before buying a used phone?',
    'Is the battery health acceptable?',
  ],
  computer: [
    'Is this a good deal for these specs?',
    'How does this compare to current models?',
    'Is this suitable for gaming / creative work?',
    'What should I look out for?',
  ],
  default: [
    'Is this a fair price?',
    'What should I know before buying?',
    'Are there any red flags with this listing?',
    'How does this compare to similar items?',
  ],
};

function getSuggestedQuestions(category?: string): string[] {
  if (!category) return SUGGESTED_QUESTIONS.default;
  const lower = category.toLowerCase();
  if (lower.includes('vehicle') || lower.includes('car') || lower.includes('moto') || lower.includes('boat')) {
    return SUGGESTED_QUESTIONS.vehicle;
  }
  if (lower.includes('phone') || lower.includes('mobile')) {
    return SUGGESTED_QUESTIONS.phone;
  }
  if (lower.includes('computer') || lower.includes('laptop') || lower.includes('desktop')) {
    return SUGGESTED_QUESTIONS.computer;
  }
  return SUGGESTED_QUESTIONS.default;
}

export const AssistantPanel: React.FC<AssistantPanelProps> = ({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  listingCategory,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', text: text.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Build history for API (include thought signatures)
    const history: ConversationMessage[] = messages.map(m => ({
      role: m.role,
      text: m.text,
      thoughtSignature: m.thoughtSignature,
    }));

    try {
      const result = await AssistantService.chat(text.trim(), listingId, history);

      if (result) {
        const assistantMessage: ChatMessage = {
          role: 'model',
          text: result.response,
          sources: result.sources,
          thinkingSummary: result.thinkingSummary,
          thoughtSignature: result.thoughtSignature,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'model', text: 'Sorry, I couldn\'t process your request. Please try again.' },
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'model', text: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, listingId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const suggestedQuestions = getSuggestedQuestions(listingCategory);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full sm:w-[420px] max-w-full h-full bg-white dark:bg-neutral-900 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-app-color flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-900 dark:text-white">AI Shopping Assistant</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Powered by Gemini 3</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Welcome message */}
              {messages.length === 0 && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/30 dark:to-violet-950/30 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      Ask me anything about <span className="font-semibold text-neutral-900 dark:text-white">{listingTitle}</span>.
                      I can check current market prices, find known issues, and help you decide if this is a good deal.
                    </p>
                  </div>

                  {/* Suggested questions */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider px-1">
                      Suggested questions
                    </p>
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="w-full text-left px-3.5 py-2.5 rounded-xl border border-app-color hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-sm text-neutral-700 dark:text-neutral-300 flex items-center justify-between group"
                      >
                        <span>{q}</span>
                        <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-blue-500 transition-colors shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md'
                    )}
                  >
                    {/* Thinking summary */}
                    {msg.thinkingSummary && (
                      <div className="mb-2 pb-2 border-b border-app-color">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 italic flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {msg.thinkingSummary.length > 120
                            ? msg.thinkingSummary.slice(0, 120) + '...'
                            : msg.thinkingSummary}
                        </p>
                      </div>
                    )}

                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="my-1.5">{children}</p>,
                        ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="pl-0.5">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-app-color space-y-1">
                        <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Sources
                        </p>
                        {msg.sources.map((source, si) => (
                          <a
                            key={si}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{source.title || source.url}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-1">
                      Gemini 3 is thinking...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-app-color shrink-0">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Ask about this listing..."
                  disabled={isLoading}
                  className="flex-1 h-11 px-4 rounded-xl border border-app-color bg-neutral-50 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 disabled:opacity-50 transition-all"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="h-11 w-11 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 dark:disabled:bg-neutral-700 flex items-center justify-center transition-colors shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
