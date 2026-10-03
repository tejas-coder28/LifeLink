import React, { useState } from 'react';
import { Bot, Send, Sparkles, X, Loader2 } from 'lucide-react';
import { aiApi } from '../../api/aiApi';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am LifeLink AI. Ask me about blood group availability, donor response trends, or emergency inventory advice.',
    },
  ]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userText = prompt;
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: userText }]);
    setLoading(true);

    try {
      const res = await aiApi.generateInsight(userText);
      if (res.data && res.data.success) {
        const insight = res.data.data;
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: insight.summary,
            recommendations: insight.recommendations,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'I am currently synthesizing network analytics. ' + (err.response?.data?.message || 'Please try again in a moment.'),
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
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center space-x-2 glass-card text-primary px-5 py-3 rounded-full shadow-lg hover:-translate-y-0.5 transition-all duration-300 border border-theme cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-sm">Ask LifeLink AI</span>
        </button>
      )}

      {/* Chat Drawer Window */}
      {isOpen && (
        <div className="w-[calc(100vw-3rem)] sm:w-96 glass-modal border border-theme rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[480px] max-h-[80vh] animate-slideUp origin-bottom-right">
          {/* Header */}
          <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 border-b border-theme flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 rounded-lg bg-rose-500/10 dark:bg-slate-800 text-rose-600 dark:text-rose-400">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-primary leading-none">LifeLink AI Assistant</h4>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-ping"></span> Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted hover:text-primary p-1 rounded-lg hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto space-y-4 text-sm">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-rose-600 text-white rounded-br-none'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-theme rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.recommendations && (
                    <ul className="mt-3 pt-3 border-t border-theme space-y-1 text-xs text-secondary">
                      {msg.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-rose-500 mr-1.5">•</span>
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
                <div className="bg-white dark:bg-slate-800 text-secondary p-3 rounded-2xl rounded-bl-none border border-theme shadow-sm flex items-center space-x-2 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  <span>Synthesizing insight...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-surface border-t border-theme flex items-center space-x-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask AI about donor supply..."
              className="flex-1 glass-input text-xs px-3.5 py-2.5 rounded-xl border border-theme text-primary focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white p-2.5 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AIChatWidget;
