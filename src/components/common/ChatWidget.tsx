import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatbot } from '../../hooks/useChatbot';

// ─── Suggested starter questions ───────────────────────────────────────────
const SUGGESTED = [
  'Where is Revel House Uganda located?',
  'What programs do you run?',
  'How can I donate?',
  'What is your mission?',
  'How do I contact you?',
];

// ─── Bot avatar SVG ─────────────────────────────────────────────────────────
function BotAvatar({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <circle cx="18" cy="18" r="18" fill="#69B53F" />
      <rect x="11" y="13" width="14" height="10" rx="3" fill="white" />
      <circle cx="15" cy="18" r="1.5" fill="#69B53F" />
      <circle cx="21" cy="18" r="1.5" fill="#69B53F" />
      <path d="M15 24 Q18 27 21 24" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <rect x="16.5" y="10" width="3" height="3" rx="1" fill="white" />
      <circle cx="18" cy="10" r="1" fill="#69B53F" />
    </svg>
  );
}

// ─── Typing indicator dots ──────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 2px' }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#69B53F',
            opacity: 0.7,
            display: 'inline-block',
            animation: `rhu-bounce 1.1s ${i * 0.18}s ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Format model response (convert **bold** and newlines) ──────────────────
function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim() !== '' || text.includes('\n\n'));
  return (
    <div style={{ lineHeight: 1.6 }}>
      {lines.map((line, i) => {
        // Convert **bold** markdown
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} style={{ margin: '0 0 4px 0' }}>
            {parts.map((part, j) =>
              j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

// ─── Main Chat Widget ───────────────────────────────────────────────────────
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, isReady, sendMessage, clearChat } = useChatbot();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;
    const msg = input.trim();
    setInput('');
    await sendMessage(msg);
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestion = async (q: string) => {
    await sendMessage(q);
  };

  const showSuggestions = messages.length === 0 && !isLoading;

  return (
    <>
      {/* ── Global animation keyframes ── */}
      <style>{`
        @keyframes rhu-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes rhu-pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0; }
        }
        @keyframes rhu-chat-in {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rhu-msg-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .rhu-chat-window { animation: rhu-chat-in 0.25s cubic-bezier(0.16,1,0.3,1) forwards; }
        .rhu-msg { animation: rhu-msg-in 0.22s ease-out forwards; }
        .rhu-fab:hover { transform: scale(1.07) !important; }
        .rhu-fab:active { transform: scale(0.96) !important; }
        .rhu-send:hover:not(:disabled) { background: #5aa032 !important; }
        .rhu-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .rhu-sugg:hover { background: rgba(105,181,63,0.18) !important; border-color: #69B53F !important; color: #69B53F !important; }
        .rhu-clear:hover { opacity: 1 !important; }
        .rhu-input:focus { outline: none; border-color: #69B53F !important; box-shadow: 0 0 0 2px rgba(105,181,63,0.2); }
        .rhu-scroll::-webkit-scrollbar { width: 4px; }
        .rhu-scroll::-webkit-scrollbar-track { background: transparent; }
        .rhu-scroll::-webkit-scrollbar-thumb { background: rgba(105,181,63,0.3); border-radius: 4px; }
      `}</style>

      {/* ── Floating Action Button ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 16,
          pointerEvents: 'none',
        }}
      >
        {/* Chat Window */}
        {open && (
          <div
            ref={windowRef}
            className="rhu-chat-window"
            style={{
              pointerEvents: 'all',
              width: 'min(92vw, 380px)',
              height: 'min(80vh, 560px)',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 20,
              overflow: 'hidden',
              background: 'var(--c-surface, #fff)',
              border: '1px solid rgba(105,181,63,0.25)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(105,181,63,0.12)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #69B53F 0%, #4e9a2a 100%)',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexShrink: 0,
              }}
            >
              <BotAvatar size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#fff', lineHeight: 1.2 }}>
                  Revel House Assistant
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
                  {isReady ? '● Online — ask me anything' : '◌ Loading knowledge base…'}
                </div>
              </div>
              {messages.length > 0 && (
                <button
                  className="rhu-clear"
                  onClick={clearChat}
                  title="Clear conversation"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontSize: 11,
                    padding: '3px 7px',
                    cursor: 'pointer',
                    opacity: 0.75,
                    transition: 'opacity 0.15s',
                    flexShrink: 0,
                  }}
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1,
                  flexShrink: 0,
                  transition: 'background 0.15s',
                }}
              >
                ✕
              </button>
            </div>

            {/* Message list */}
            <div
              className="rhu-scroll"
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Welcome message */}
              {messages.length === 0 && !isLoading && (
                <div
                  className="rhu-msg"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                >
                  <BotAvatar size={26} />
                  <div
                    style={{
                      background: 'rgba(105,181,63,0.10)',
                      border: '1px solid rgba(105,181,63,0.2)',
                      borderRadius: '4px 14px 14px 14px',
                      padding: '9px 12px',
                      fontSize: 13,
                      color: 'var(--c-ink, #1a1a1a)',
                      maxWidth: '85%',
                    }}
                  >
                    👋 Hi! I'm the Revel House Uganda assistant. I can answer questions about our location, programs, projects, impact, how to donate, and more. What would you like to know?
                  </div>
                </div>
              )}

              {/* Suggested questions */}
              {showSuggestions && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 6,
                    paddingLeft: 34,
                  }}
                >
                  {SUGGESTED.map((q) => (
                    <button
                      key={q}
                      className="rhu-sugg"
                      onClick={() => handleSuggestion(q)}
                      disabled={!isReady}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(105,181,63,0.35)',
                        borderRadius: 20,
                        padding: '5px 10px',
                        fontSize: 11.5,
                        color: 'var(--c-ink, #333)',
                        cursor: isReady ? 'pointer' : 'not-allowed',
                        transition: 'all 0.15s',
                        opacity: isReady ? 1 : 0.5,
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {/* Conversation messages */}
              {messages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={i}
                    className="rhu-msg"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      flexDirection: isUser ? 'row-reverse' : 'row',
                    }}
                  >
                    {!isUser && <BotAvatar size={26} />}
                    <div
                      style={{
                        maxWidth: '82%',
                        padding: '9px 12px',
                        borderRadius: isUser
                          ? '14px 4px 14px 14px'
                          : '4px 14px 14px 14px',
                        fontSize: 13,
                        lineHeight: 1.55,
                        background: isUser
                          ? 'linear-gradient(135deg, #69B53F, #4e9a2a)'
                          : 'rgba(105,181,63,0.10)',
                        border: isUser
                          ? 'none'
                          : '1px solid rgba(105,181,63,0.2)',
                        color: isUser ? '#fff' : 'var(--c-ink, #1a1a1a)',
                        boxShadow: isUser
                          ? '0 2px 10px rgba(105,181,63,0.25)'
                          : 'none',
                      }}
                    >
                      {isUser ? (
                        msg.text
                      ) : (
                        <FormattedText text={msg.text} />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div
                  className="rhu-msg"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
                >
                  <BotAvatar size={26} />
                  <div
                    style={{
                      background: 'rgba(105,181,63,0.10)',
                      border: '1px solid rgba(105,181,63,0.2)',
                      borderRadius: '4px 14px 14px 14px',
                      padding: '4px 12px',
                    }}
                  >
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input area */}
            <div
              style={{
                padding: '10px 12px',
                borderTop: '1px solid rgba(105,181,63,0.15)',
                background: 'var(--c-surface, #fff)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <textarea
                ref={inputRef}
                className="rhu-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isReady ? 'Ask about location, programs, donate…' : 'Loading…'}
                disabled={!isReady || isLoading}
                rows={1}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: '1px solid rgba(105,181,63,0.3)',
                  borderRadius: 12,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  background: 'var(--c-bg, #f9f9f9)',
                  color: 'var(--c-ink, #1a1a1a)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  lineHeight: 1.45,
                  maxHeight: 96,
                  overflowY: 'auto',
                }}
              />
              <button
                className="rhu-send"
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !isReady}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: 'none',
                  background: '#69B53F',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
                title="Send (Enter)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <div style={{ pointerEvents: 'all', position: 'relative' }}>
          {/* Pulse ring when closed */}
          {!open && (
            <span
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: '50%',
                border: '2px solid #69B53F',
                animation: 'rhu-pulse-ring 2s ease-out infinite',
                pointerEvents: 'none',
              }}
            />
          )}
          <button
            id="rhu-chat-fab"
            className="rhu-fab"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: 'none',
              background: open
                ? 'linear-gradient(135deg, #4e9a2a, #3a7a20)'
                : 'linear-gradient(135deg, #69B53F, #4e9a2a)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(105,181,63,0.45), 0 2px 8px rgba(0,0,0,0.15)',
              transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1), background 0.2s',
              transform: 'scale(1)',
            }}
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <BotAvatar size={30} />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
