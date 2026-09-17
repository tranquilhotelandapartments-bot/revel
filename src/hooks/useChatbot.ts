import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getOrgSettings,
  getPrograms,
  getProjects,
  getArticles,
  getImpactStats,
} from '../services/api';
import {
  buildSystemPrompt,
  sendChatMessage,
  ChatMessage,
} from '../services/chatbotService';

export interface UseChatbotReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => void;
}

export function useChatbot(): UseChatbotReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const systemPromptRef = useRef<string>('');

  // Load all live project data once on mount and build the system prompt
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [settings, programs, projects, articles, stats] = await Promise.all([
          getOrgSettings(),
          getPrograms(),
          getProjects(),
          getArticles(),
          getImpactStats(),
        ]);

        if (cancelled) return;

        systemPromptRef.current = buildSystemPrompt(
          settings,
          programs,
          projects,
          articles,
          stats
        );
        setIsReady(true);
      } catch (err) {
        if (!cancelled) {
          console.error('[Chatbot] Failed to load context data:', err);
          setError('Could not load knowledge base. Please refresh and try again.');
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading || !isReady) return;

      const userMsg: ChatMessage = { role: 'user', text: text.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      try {
        // Pass full conversation history (excluding the new message we just added)
        const reply = await sendChatMessage(
          systemPromptRef.current,
          messages,        // history before this message
          text.trim()
        );
        const botMsg: ChatMessage = { role: 'model', text: reply };
        setMessages((prev) => [...prev, botMsg]);
      } catch (err: unknown) {
        console.error('[Chatbot] Error sending message:', err);
        const errText =
          err instanceof Error && err.message.includes('VITE_GEMINI_API_KEY')
            ? 'AI key not configured yet. Please add VITE_GEMINI_API_KEY to .env.'
            : 'Something went wrong. Please try again shortly.';
        setError(errText);
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: errText },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, isReady, messages]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, isLoading, isReady, error, sendMessage, clearChat };
}
