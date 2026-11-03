import React from 'react';
import { Sparkles, CheckCircle2, TrendingUp, Cpu } from 'lucide-react';
import Card from '../common/Card';

const InsightCard = ({ insight }) => {
  if (!insight) return null;

  const { title, summary, metrics, recommendations, generatedAt } = insight;

  return (
    <Card hover={false} className="border border-hairline hero-glass-card shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-hairline">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-info/10 text-info border border-info/20 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-primary tracking-tight">{title}</h3>
            <p className="text-xs text-secondary flex items-center mt-0.5">
              <Cpu className="w-3.5 h-3.5 mr-1 text-info" />
              LifeLink AI Service Layer • {new Date(generatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-info/10 text-info border border-info/30">
          AI Narrative Insight
        </span>
      </div>

      <p className="text-secondary text-sm leading-relaxed mb-6 bg-surface p-4 rounded-xl border border-hairline">
        {summary}
      </p>

      {/* Metrics Grid */}
      {metrics && Object.keys(metrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(metrics).map(([key, value]) => {
            const isCriticalKey = /shortage|critical|deficit/i.test(key);
            return (
              <div key={key} className="bg-surface p-3 rounded-xl border border-hairline">
                <span className="text-[11px] font-medium text-muted capitalize block truncate">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className={`text-base font-extrabold block mt-1 ${isCriticalKey ? 'text-danger' : 'text-primary'}`}>
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-1.5 text-info" />
            Strategic AI Recommendations
          </h4>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2 text-xs text-primary bg-surface p-2.5 rounded-lg border border-hairline">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
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
