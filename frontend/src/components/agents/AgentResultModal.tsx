import React from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface AgentNote {
  timestamp: string;
  note: string;
}

interface AgentResultModalProps {
  isOpen: boolean;
  agentName: string;
  agentLabel: string;
  status: string;
  result: any;
  notes: AgentNote[];
  flagged: boolean;
  flagReason?: string;
  onClose: () => void;
}

/**
 * AgentResultModal: Displays detailed agent results, flags, and notes
 */
export const AgentResultModal: React.FC<AgentResultModalProps> = ({
  isOpen,
  agentName,
  agentLabel,
  status,
  result,
  notes,
  flagged,
  flagReason,
  onClose,
}) => {
  if (!isOpen) return null;

  const isSuccess = status === 'success';
  const headerColor = flagged ? 'bg-red-50 border-red-200' : isSuccess ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200';
  const iconColor = flagged ? 'text-red-600' : isSuccess ? 'text-green-600' : 'text-blue-600';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`border-b ${headerColor} p-6 sticky top-0`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {flagged ? (
                <AlertTriangle className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-1`} />
              ) : isSuccess ? (
                <CheckCircle2 className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-1`} />
              ) : (
                <Info className={`w-6 h-6 ${iconColor} flex-shrink-0 mt-1`} />
              )}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{agentLabel}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Status: <span className={isSuccess ? 'text-green-700' : 'text-amber-700'}>{status}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Flag Alert */}
          {flagged && flagReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900">⚠️ Alert Flagged</h3>
                  <p className="text-red-800 mt-1">{flagReason}</p>
                </div>
              </div>
            </div>
          )}

          {/* Agent Result */}
          {result && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Analysis Results</h3>
              <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words">
                {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          {/* Agent Notes */}
          {notes && notes.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Agent Notes ({notes.length})</h3>
              <div className="space-y-3">
                {notes.map((note, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                    <p className="text-gray-600 mb-1">
                      {new Date(note.timestamp).toLocaleString()}
                    </p>
                    <p className="text-gray-900">{note.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!result && (!notes || notes.length === 0) && (
            <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-600">
              No detailed results available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
