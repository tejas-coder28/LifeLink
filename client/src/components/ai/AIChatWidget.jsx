import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Send, X, Loader2 } from 'lucide-react';
import { aiApi } from '../../api/aiApi';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello, I am LifeLink AI. Ask me about blood availability, donor compatibility, or regional shortage patterns.',
    },
  ]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userMsg = { role: 'user', text: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setLoading(true);

    try {
      const res = await aiApi.generateInsight(userMsg.text);
      if (res.data && res.data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: res.data.data.analysis || res.data.data.summary,
            recommendations: res.data.data.recommendations,
          },
        ]);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Sorry, I encountered an issue retrieving real-time data from the network. Please try again shortly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Trigger Button */}
      {!isOpen && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2.5 glass-card text-primary px-5 py-3 rounded-full shadow-spatial-raised border border-hairline cursor-pointer hover:border-info/40"
        >
          <Sparkles className="w-5 h-5 text-info animate-pulse" />
          <span className="font-extrabold text-sm font-heading">Ask LifeLink AI</span>
        </motion.button>
      )}

      {/* Chat Drawer Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="w-[calc(100vw-3rem)] sm:w-96 glass-modal rounded-3xl border border-hairline shadow-spatial-overlay overflow-hidden flex flex-col h-[490px] max-h-[82vh]"
          >
            {/* Header */}
            <div className="bg-surface/80 px-4 py-3.5 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-info/10 border border-info/20 text-info flex items-center justify-center shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary font-heading leading-none">LifeLink AI Assistant</h4>
                  <span className="text-[10px] text-success font-bold flex items-center mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-success mr-1 animate-ping" /> Online
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-primary p-1.5 rounded-full hover:bg-surface transition-colors cursor-pointer"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 bg-surface/30 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-info text-white dark:bg-raised dark:text-primary dark:border dark:border-info/30 rounded-br-none'
                        : 'bg-surface border border-hairline text-primary rounded-bl-none shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    {msg.recommendations && (
                      <ul className="mt-3 pt-3 border-t border-hairline space-y-1.5 text-xs text-secondary">
                        {msg.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start">
                            <span className="text-info mr-1.5 font-bold">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-surface text-secondary p-3 rounded-2xl rounded-bl-none border border-hairline shadow-sm flex items-center space-x-2 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-info" />
                    <span>Synthesizing network insights...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 bg-surface/80 border-t border-hairline flex items-center space-x-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ask AI about donor supply..."
                className="flex-1 glass-input text-xs px-3.5 py-2.5 rounded-xl border border-hairline text-primary focus:outline-none focus:ring-2 focus:ring-info/20 focus:border-info transition-all"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="p-2.5 rounded-xl bg-info hover:bg-info/90 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                aria-label="Send message"
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
