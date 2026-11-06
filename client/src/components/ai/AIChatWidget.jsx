import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Send,
  X,
  Loader2,
  RotateCcw,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { aiApi } from '../../api/aiApi';
import { useWordReveal } from '../../hooks/useWordReveal';

const ROLE_SUGGESTIONS = {
  donor: [
    'Check my eligibility',
    'Find requests matching my blood group',
    'View my donation history',
  ],
  user: [
    'Check my eligibility',
    'Find requests matching my blood group',
    'View my donation history',
  ],
  hospital: [
    'Check blood bank inventory',
    'Review incoming demands',
    'View active blood requests',
  ],
  admin: [
    'Platform summary stats',
    'Check shortage alerts',
    'Review pending hospitals',
  ],
  public: [
    'How do I request emergency blood?',
    'Find available donors & hospitals',
    'How does blood donation work?',
  ],
};

function getRoleKey(accountType, role) {
  const raw = accountType || role || 'public';
  if (['individual', 'recipient'].includes(raw)) return 'donor';
  return raw;
}

function getInitialGreeting(user, roleKey) {
  // Use full name for hospitals (e.g. "City General Hospital"), first name only for individuals/admin
  const fullName = user?.name || '';
  const firstName = fullName.split(' ')[0];
  if (roleKey === 'hospital') {
    return `Welcome to LifeLink${fullName ? `, ${fullName}` : ''}. How can I assist with your blood bank reserves or emergency demands?`;
  }
  if (roleKey === 'admin') {
    return `Welcome Admin${firstName ? ` ${firstName}` : ''}. How can I assist with platform oversight and emergency network operations?`;
  }
  if (roleKey === 'donor' || roleKey === 'user') {
    return `Hello${firstName ? ` ${firstName}` : ''}! I'm your LifeLink Assistant. How can I help you today with your blood donations or requests?`;
  }
  return `Welcome to LifeLink! How can I assist you with finding donors, locating hospitals, or requesting emergency blood?`;
}

/**
 * AnimatedBubble renders a single AI message with optional word-reveal.
 * User messages and non-animated messages render instantly.
 */
const MessageBubble = memo(function MessageBubble({ msg, isLatestAI, onActionClick, onSkip }) {
  const { displayed, done } = useWordReveal(
    msg.role === 'assistant' ? msg.text : '',
    msg.id,
    isLatestAI
  );

  const textToShow = msg.role === 'user' ? msg.text : (isLatestAI ? displayed : msg.text);
  // Show action buttons immediately for non-animated messages; after reveal for animated
  const showActions = msg.actions && msg.actions.length > 0 && (msg.role === 'user' || !isLatestAI || done);

  return (
    <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-sm cursor-pointer select-text ${
          msg.role === 'user'
            ? 'bg-raised text-primary border border-hairline rounded-br-none'
            : 'bg-surface text-primary border border-hairline rounded-bl-none'
        }`}
        onClick={isLatestAI && !done ? onSkip : undefined}
        title={isLatestAI && !done ? 'Click to reveal full reply instantly' : undefined}
      >
        <p className="whitespace-pre-line text-xs sm:text-sm">
          {textToShow}
          {isLatestAI && !done && (
            <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-info/70 rounded-sm animate-pulse align-middle" />
          )}
        </p>

        {/* One-click Action Navigation Buttons */}
        {showActions && (
          <div className="mt-3 pt-2.5 border-t border-hairline flex flex-wrap gap-2">
            {msg.actions.map((act, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onActionClick(act)}
                className="px-3 py-1.5 rounded-xl bg-info/10 hover:bg-info/20 text-info border border-info/30 hover:border-info/50 font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm group"
              >
                <Compass className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform" />
                <span>{act.label}</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

const AIChatWidget = () => {
  const { user, accountType, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const roleKey = getRoleKey(accountType, role);
  const defaultSuggestions = ROLE_SUGGESTIONS[roleKey] || ROLE_SUGGESTIONS.public;

  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(defaultSuggestions);
  // animatingId tracks which message ID should run word-reveal; null = none
  const [animatingId, setAnimatingId] = useState(null);
  const [messages, setMessages] = useState([
    {
      id: 'greeting',
      role: 'assistant',
      text: getInitialGreeting(user, roleKey),
      actions: [],
    },
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Re-initialize greeting when user or role changes
  useEffect(() => {
    const greeting = getInitialGreeting(user, roleKey);
    const initialChips = ROLE_SUGGESTIONS[roleKey] || ROLE_SUGGESTIONS.public;
    setSuggestions(initialChips);
    setAnimatingId(null);
    setMessages([
      {
        id: 'greeting',
        role: 'assistant',
        text: greeting,
        actions: [],
      },
    ]);
  }, [user?._id, roleKey]);

  // Auto-scroll on new messages or loading state change
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Focus input and listen for Esc to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClearChat = () => {
    const greeting = getInitialGreeting(user, roleKey);
    const initialChips = ROLE_SUGGESTIONS[roleKey] || ROLE_SUGGESTIONS.public;
    setMessages([
      {
        id: 'greeting',
        role: 'assistant',
        text: greeting,
        actions: [],
      },
    ]);
    setSuggestions(initialChips);
    setAnimatingId(null);
    setPrompt('');
  };

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || prompt).trim();
    if (!query || loading) return;

    const userMessage = { id: `user-${Date.now()}`, role: 'user', text: query };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setPrompt('');
    setLoading(true);
    setAnimatingId(null); // stop any running animation when user sends

    // Build history for backend (excluding greeting)
    const historyPayload = nextMessages
      .slice(1, -1)
      .slice(-6)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    try {
      const res = await aiApi.chat({
        message: query,
        history: historyPayload,
        currentPath: location.pathname + location.search,
      });

      if (res.data && res.data.success) {
        const responseData = res.data.data;
        const newMsgId = `ai-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: newMsgId,
            role: 'assistant',
            text: responseData.reply,
            actions: responseData.actions || [],
          },
        ]);
        setAnimatingId(newMsgId);
        if (Array.isArray(responseData.suggestions) && responseData.suggestions.length > 0) {
          setSuggestions(responseData.suggestions);
        }
      } else {
        throw new Error('Invalid response structure');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'I apologize, but I am unable to connect to the LifeLink services right now. Please check your connection and try again.',
          actions: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleActionClick = (action) => {
    if (!action || !action.path) return;
    let targetUrl = action.path;
    if (action.tab && !targetUrl.includes('tab=')) {
      targetUrl += (targetUrl.includes('?') ? '&' : '?') + `tab=${encodeURIComponent(action.tab)}`;
    }
    navigate(targetUrl);
    if (window.innerWidth < 640) {
      setIsOpen(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Minimized Pill Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 150);
          }}
          className="flex items-center space-x-2.5 bg-surface/90 hover:bg-surface text-primary px-4 py-3 rounded-full shadow-spatial-floating border border-hairline hover:border-info/40 cursor-pointer backdrop-blur-xl transition-all group"
          aria-label="Open LifeLink AI Assistant"
        >
          <div className="w-6 h-6 rounded-full bg-info/10 text-info flex items-center justify-center border border-info/20">
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
          </div>
          <span className="font-extrabold text-xs sm:text-sm font-heading tracking-tight">Ask LifeLink AI</span>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </motion.button>
      )}

      {/* Expanded Chat Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="w-[calc(100vw-2rem)] sm:w-[410px] bg-surface/95 dark:bg-[#111A2E]/95 rounded-3xl border border-hairline shadow-spatial-overlay flex flex-col h-[520px] max-h-[85vh] backdrop-blur-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-raised/80 px-4 py-3.5 border-b border-hairline flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-info/10 border border-info/25 text-info flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs sm:text-sm font-bold text-primary font-heading leading-none">
                      LifeLink AI Assistant
                    </h4>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-raised border border-hairline text-muted">
                      {roleKey}
                    </span>
                  </div>
                  <span className="text-[10px] text-success font-bold flex items-center mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" /> Active Network
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={handleClearChat}
                  title="Reset conversation"
                  aria-label="Reset conversation"
                  className="text-muted hover:text-primary p-1.5 rounded-full hover:bg-surface transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close assistant"
                  aria-label="Close assistant"
                  className="text-muted hover:text-primary p-1.5 rounded-full hover:bg-surface transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Container — min-h-0 prevents flex overflow clipping (Bug F) */}
            <div
              role="log"
              aria-live="polite"
              className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 text-xs sm:text-sm"
            >
              {messages.map((msg, index) => (
                <MessageBubble
                  key={msg.id || index}
                  msg={msg}
                  isLatestAI={msg.role === 'assistant' && msg.id === animatingId}
                  onActionClick={handleActionClick}
                  onSkip={() => setAnimatingId(null)}
                />
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-surface text-secondary p-3 rounded-2xl rounded-bl-none border border-hairline shadow-sm flex items-center space-x-2 text-xs">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-info" />
                    <span>Analyzing domain records...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Role Quick Suggestion Chips — flex-wrap to avoid horizontal scrollbar (Bug E) */}
            {suggestions.length > 0 && !loading && (
              <div className="px-3 py-2 bg-raised/40 border-t border-hairline flex flex-wrap gap-1.5 shrink-0">
                {suggestions.slice(0, 4).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(chip)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-raised border border-hairline hover:border-info/40 text-secondary hover:text-primary transition-colors cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="p-3 bg-surface/90 border-t border-hairline flex items-center space-x-2 shrink-0"
            >
              <input
                ref={inputRef}
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask LifeLink about ${roleKey === 'hospital' ? 'reserves or requests' : 'donations or requests'}...`}
                className="flex-1 bg-raised text-xs px-3.5 py-2.5 rounded-xl border border-hairline text-primary focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-all"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                aria-label="Send message"
                className="btn-primary p-2.5 rounded-xl text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIChatWidget;
