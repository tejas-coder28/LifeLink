import React from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, TrendingUp, Cpu } from 'lucide-react';
import Card from '../common/Card';

const InsightCard = ({ insight }) => {
  if (!insight) return null;

  const { title, summary, metrics, recommendations, generatedAt } = insight;

  return (
    <Card hover={false} className="border border-rose-500/30 hero-glass-card shadow-lg">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-theme">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white shadow-lg shadow-rose-600/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-primary tracking-tight">{title}</h3>
            <p className="text-xs text-secondary flex items-center mt-0.5">
              <Cpu className="w-3.5 h-3.5 mr-1 text-rose-500 dark:text-rose-400" />
              LifeLink AI Service Layer • {new Date(generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          AI Narrative Insight
        </span>
      </div>

      <p className="text-secondary text-sm leading-relaxed mb-6 bg-surface-glass p-4 rounded-xl border border-theme">
        {summary}
      </p>

      {/* Metrics Grid */}
      {metrics && Object.keys(metrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(metrics).map(([key, value]) => (
            <div key={key} className="bg-surface-glass p-3 rounded-xl border border-theme">
              <span className="text-[11px] font-medium text-muted capitalize block truncate">
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <span className="text-base font-extrabold text-rose-600 dark:text-rose-400 block mt-1">
                {Array.isArray(value) ? value.join(', ') : String(value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
            Strategic AI Recommendations
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2 text-xs text-primary bg-emerald-500/10 dark:bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
};

export default InsightCard;
