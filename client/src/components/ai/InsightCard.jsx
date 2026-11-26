import React from 'react';
import { Sparkles, CheckCircle2, TrendingUp, Cpu } from 'lucide-react';
import Card from '../common/Card';
import { formatDateTime } from '../../utils/dateFormatter';

const formatMetricValue = (key, value) => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'None';
  }
  if (value === null || value === undefined || value === '') {
    return 'None';
  }
  if (key === 'totalInventoryUnits') {
    return `${value} units`;
  }
  return String(value);
};

const formatMetricLabel = (key) => {
  const customLabels = {
    totalDonors: 'Total Donors',
    activeStandbyDonors: 'Active Standby Donors',
    totalRequests: 'Total Requests',
    fulfilledRequests: 'Fulfilled Requests',
    openRequests: 'Open Requests',
    fulfillmentRate: 'Fulfillment Rate',
    totalInventoryUnits: 'Hospital Reserve Units',
    highRiskBloodGroups: 'High Risk Blood Groups',
    surplusGroups: 'Surplus Groups',
  };
  return customLabels[key] || key.replace(/([A-Z])/g, ' $1');
};

const InsightCard = ({ insight }) => {
  if (!insight) return null;

  const { title, summary, metrics, recommendations, generatedAt, createdAt, rawResponse } = insight;
  const timestamp = generatedAt || createdAt;
  const isGemini = typeof rawResponse === 'string' && rawResponse.includes('"model"');

  return (
    <Card hover={false} className="border border-hairline hero-glass-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-hairline">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-info/10 text-info border border-info/20 shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-primary tracking-tight">{title}</h3>
            <p className="text-xs text-secondary flex items-center mt-0.5">
              <Cpu className="w-3.5 h-3.5 mr-1 text-info" />
              LifeLink AI Service Layer • {formatDateTime(timestamp)}
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-info/10 text-info border border-info/30">
          {isGemini ? 'Gemini AI Insight' : 'AI Narrative Insight'}
        </span>
      </div>

      <p className="text-secondary text-sm leading-relaxed mb-6 bg-surface p-4 rounded-xl border border-hairline">
        {summary}
      </p>

      {/* Metrics Grid */}
      {metrics && Object.keys(metrics).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {Object.entries(metrics).map(([key, value]) => {
            const formatted = formatMetricValue(key, value);
            const hasActiveRisk = /shortage|critical|deficit|highRisk/i.test(key) && formatted !== 'None';
            const isClearedRisk = /shortage|critical|deficit|highRisk/i.test(key) && formatted === 'None';
            return (
              <div key={key} className="bg-surface p-3 rounded-xl border border-hairline">
                <span className="text-[11px] font-medium text-muted block truncate">
                  {formatMetricLabel(key)}
                </span>
                <span
                  className={`text-base font-extrabold block mt-1 tabular-nums ${
                    hasActiveRisk ? 'text-danger' : isClearedRisk ? 'text-success' : 'text-primary'
                  }`}
                >
                  {formatted}
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
