import React from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface Recommendation {
  type: 'suggestion' | 'warning' | 'critical';
  title: string;
  description: string;
  action?: string;
  metadata?: Record<string, any>;
}

interface RecommendationsListProps {
  recommendations?: Recommendation[] | Record<string, any>;
  isLoading?: boolean;
  agentName?: string;
}

/**
 * RecommendationsList: Displays agent recommendations, suggestions, and alerts
 */
export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  isLoading = false,
  agentName,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!recommendations) {
    return (
      <div className="text-center py-6 text-gray-500">
        No recommendations available
      </div>
    );
  }

  // Handle both array and object formats
  let items: Recommendation[] = [];
  if (Array.isArray(recommendations)) {
    items = recommendations;
  } else if (typeof recommendations === 'object') {
    // Try to extract recommendations from common patterns
    if (recommendations.recommendations && Array.isArray(recommendations.recommendations)) {
      items = recommendations.recommendations;
    } else {
      // Convert object to array of recommendations
      items = Object.entries(recommendations).map(([key, value]) => ({
        type: 'suggestion',
        title: key,
        description: String(value),
      }));
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500">
        No recommendations available
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((rec, idx) => {
        const typeConfig = {
          critical: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, textColor: 'text-red-900' },
          warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, textColor: 'text-amber-900' },
          suggestion: { bg: 'bg-blue-50', border: 'border-blue-200', icon: TrendingUp, textColor: 'text-blue-900' },
        };

        const config = typeConfig[rec.type || 'suggestion'];
        const Icon = config.icon;

        return (
          <div key={idx} className={`${config.bg} border ${config.border} rounded-lg p-3`}>
            <div className="flex items-start gap-3">
              <Icon className={`w-5 h-5 ${config.textColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1">
                <h4 className={`font-semibold ${config.textColor} text-sm`}>{rec.title}</h4>
                <p className={`${config.textColor} text-sm mt-1 opacity-90`}>{rec.description}</p>
                {rec.action && (
                  <p className={`${config.textColor} text-xs mt-2 font-medium italic`}>
                    Action: {rec.action}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
