import React, { useState, useEffect } from 'react';
import { aiApi } from '../../api/aiApi';
import InsightCard from '../../components/ai/InsightCard';
import Card from '../../components/common/Card';
import Loader from '../../components/common/Loader';
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
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <div className="glass-panel rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-rose-950/60 via-[#151c2e] to-[#151c2e] border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 mb-1">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Service Layer • Predictive Intelligence</span>
          </div>
          <h1 className="text-3xl font-black text-white">AI Medical Logistics Insights</h1>
          <p className="text-black text-sm mt-1">
            Synthesizes live network demand, rare blood group shortages, and fulfillment telemetry into actionable narrative reports.
          </p>
        </div>

        <button
          onClick={() => handleGenerateNew()}
          disabled={generating}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 transition-all flex items-center space-x-2 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          <span>{generating ? 'Synthesizing Insight...' : 'Generate Fresh Insight'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm flex items-center">
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
            className="flex-1 bg-lightbg text-black text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:border-rose-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={generating}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/30 transition-all"
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
          <p className="text-black text-sm">No insights generated yet. Click above to generate your first AI report.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {insights.map((insight) => (
            <InsightCard key={insight._id} insight={insight} />
          ))}
        </div>
      )}
    </div>
  );
};

export default AIInsightsPanel;
