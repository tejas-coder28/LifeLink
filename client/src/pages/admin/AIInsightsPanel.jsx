import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import InsightCard from '../../components/ai/InsightCard';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import PageTransition from '../../components/common/PageTransition';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

const AIInsightsPanel = () => {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getInsights();
      if (res.data && res.data.success) {
        setInsights(res.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch AI Insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  const handleGenerateNew = async (e) => {
    if (e) e.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const res = await aiApi.generateInsight(prompt);
      if (res.data && res.data.success) {
        setPrompt('');
        fetchInsights();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate new AI insight');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageTransition className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="hero-glass-card rounded-3xl p-6 sm:p-8 border border-glass shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-brand-500 mb-1">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Service Layer • Predictive Intelligence</span>
          </div>
          <h1 className="text-3xl font-black text-primary font-heading">AI Medical Logistics Insights</h1>
          <p className="text-secondary text-sm mt-1">
            Synthesizes live network demand, rare blood group shortages, and fulfillment analytics into actionable narrative reports.
          </p>
        </div>

        <button
          onClick={() => handleGenerateNew()}
          disabled={generating}
          className="btn-primary text-xs px-6 py-3 rounded-2xl flex items-center space-x-2 shrink-0 cursor-pointer shadow-glow-brand"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Synthesizing Insight...' : 'Generate Fresh Insight'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-2xl text-danger text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          {error}
        </div>
      )}

      {/* Prompt Form */}
      <Card hover={false} title="Custom Intelligence Prompt" icon={Sparkles}>
        <form onSubmit={handleGenerateNew} className="flex gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Focus analysis on rare blood group deficit risks for emergency surgical reserves..."
            className="flex-1 glass-input text-xs sm:text-sm px-4 py-2.5 rounded-xl border border-theme text-primary focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={generating}
            className="btn-primary text-xs px-5 py-2.5 rounded-xl cursor-pointer"
          >
            Submit Prompt
          </button>
        </form>
      </Card>

      {/* Insights Stream */}
      {loading ? (
        <Loader text="Aggregating database stats & generating narrative insights..." />
      ) : insights.length === 0 ? (
        <Card hover={false} className="text-center py-12">
          <p className="text-secondary text-sm">No insights generated yet. Click above to generate your first AI report.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {insights.map((insight) => (
            <InsightCard key={insight._id} insight={insight} />
          ))}
        </div>
      )}
    </PageTransition>
  );
};

export default AIInsightsPanel;
