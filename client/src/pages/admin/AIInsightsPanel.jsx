import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import InsightCard from '../../components/ai/InsightCard';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
import PageTransition from '../../components/common/PageTransition';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

const AIInsightsPanel = ({ insights: parentInsights, setInsights: setParentInsights }) => {
  const isEmbedded = typeof setParentInsights === 'function';
  const [localInsights, setLocalInsights] = useState(parentInsights || []);
  const [loading, setLoading] = useState(!parentInsights || parentInsights.length === 0);
  const [generating, setGenerating] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState(null);

  const insights = isEmbedded && Array.isArray(parentInsights) ? parentInsights : localInsights;

  const updateInsightsList = (nextList) => {
    setLocalInsights(nextList);
    if (isEmbedded) {
      setParentInsights(nextList);
    }
  };

  const fetchInsights = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const res = await aiApi.getInsights();
      if (res.data && res.data.success) {
        updateInsightsList(res.data.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch AI Insights');
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    if (!parentInsights || parentInsights.length === 0) {
      fetchInsights(true);
    } else {
      setLocalInsights(parentInsights);
      setLoading(false);
    }
  }, []);

  const runGeneration = async (targetPrompt = '') => {
    setGenerating(true);
    setError(null);
    try {
      const res = await aiApi.generateInsight(targetPrompt);
      if (res.data && res.data.success) {
        const created = res.data.data;
        if (targetPrompt) setPrompt('');
        if (created) {
          const filtered = insights.filter((item) => (item._id || item.id) !== (created._id || created.id));
          updateInsightsList([created, ...filtered].slice(0, 10));
        } else {
          await fetchInsights(false);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate new AI insight');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFresh = () => {
    runGeneration('');
  };

  const handleSubmitPrompt = (e) => {
    e.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError('Please enter a prompt describing what you want analyzed.');
      return;
    }
    runGeneration(trimmed);
  };

  const content = (
    <div className="space-y-6">
      <div className="glass-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-danger mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Service Layer • Predictive Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-primary font-heading">AI Medical Logistics Insights</h2>
          <p className="text-secondary text-xs sm:text-sm mt-1">
            Synthesizes live network demand, blood group shortages, and fulfillment analytics into actionable narrative reports.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGenerateFresh}
          disabled={generating}
          className="btn-primary text-xs px-5 py-3 rounded-2xl flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Synthesizing Insight...' : 'Generate Fresh Insight'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/30 rounded-2xl text-danger text-sm flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Custom Prompt Form */}
      <Card hover={false} title="Custom Intelligence Prompt" icon={Sparkles}>
        <form onSubmit={handleSubmitPrompt} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Focus analysis on O- emergency demand, low stock reserves, and standby donor coverage..."
            className="flex-1 glass-input text-xs sm:text-sm px-4 py-2.5 rounded-xl text-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={generating || !prompt.trim()}
            className="btn-primary text-xs px-5 py-2.5 rounded-xl cursor-pointer disabled:opacity-50"
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
          <p className="text-secondary text-sm">No insights generated yet. Click Generate Fresh Insight above to create a report.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {insights.map((insight) => (
            <InsightCard key={insight._id || insight.id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );

  if (isEmbedded) return content;

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 py-8">
      {content}
    </PageTransition>
  );
};

export default AIInsightsPanel;
