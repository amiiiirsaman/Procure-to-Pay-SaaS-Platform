import React, { useState } from 'react';
import type { Requisition } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface RequisitionDetailTabsProps {
  requisition: Requisition;
  showMoreDetails?: boolean;
  defaultTab?: 'basic' | 'additional';
}

export const RequisitionDetailTabs: React.FC<RequisitionDetailTabsProps> = ({
  requisition,
  showMoreDetails = false,
  defaultTab = 'basic',
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'additional'>(defaultTab);
  const [showAdditional, setShowAdditional] = useState(showMoreDetails);

  const getRiskScoreBadgeColor = (score: number | null | undefined) => {
    if (!score) return 'bg-gray-100 text-gray-700';
    if (score < 40) return 'bg-green-100 text-green-700';
    if (score < 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getStatusBadgeColor = (status: string | null | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-700';
    if (status === 'preferred') return 'bg-green-100 text-green-700';
    if (status === 'known') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Tab Header */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4 px-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Basic Information
          </button>
          <button
            onClick={() => { setActiveTab('additional'); setShowAdditional(true); }}
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'additional'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Additional Information
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'basic' && (
          <div className="space-y-6">
            {/* Header with Title and Amount */}
            <div className="flex justify-between items-start pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{requisition.title || requisition.description}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {requisition.number} • Requested by: {requisition.requester_id || requisition.requestor_id}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(requisition.total_amount || requisition.amount || 0)}
                </div>
              </div>
            </div>

            {/* Basic Fields Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <div className="text-gray-900 font-medium">{requisition.department}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <div className="text-gray-900 font-medium">{requisition.category || 'N/A'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
                <div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    requisition.urgency === 'EMERGENCY' ? 'bg-red-100 text-red-700' :
                    requisition.urgency === 'URGENT' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {requisition.urgency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Needed By</label>
                <div className="text-gray-900 font-medium">
                  {requisition.needed_by_date ? formatDate(requisition.needed_by_date) : 'Not specified'}
                </div>
              </div>

              {requisition.project_code && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Code</label>
                  <div className="text-gray-900 font-medium">{requisition.project_code}</div>
                </div>
              )}
            </div>

            {/* Description */}
            {requisition.description && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <p className="text-gray-700 whitespace-pre-wrap">{requisition.description}</p>
              </div>
            )}

            {/* Justification */}
            {requisition.justification && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Justification</label>
                <p className="text-gray-700 whitespace-pre-wrap">{requisition.justification}</p>
              </div>
            )}

            {/* Line Items */}
            {requisition.line_items && requisition.line_items.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-3">Line Items</label>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Unit Price</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requisition.line_items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t border-gray-200">
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-right text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-sm text-gray-900">
                            {formatCurrency(item.estimated_unit_price || item.unit_price || 0)}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-medium text-gray-900">
                            {formatCurrency(item.total || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-right text-sm font-semibold text-gray-700">
                          Total Amount:
                        </td>
                        <td className="px-4 py-2 text-right text-lg font-bold text-blue-600">
                          {formatCurrency(requisition.total_amount || requisition.amount || 0)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* More Details Button (only if not already showing) */}
            {!showAdditional && (
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => { setActiveTab('additional'); setShowAdditional(true); }}
                  className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Show More Details →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'additional' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enterprise Procurement Information</h3>

            {/* Supplier Information */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <div className="text-gray-900 font-medium">{requisition.supplier_name || 'N/A'}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spend Type</label>
                <div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    requisition.spend_type === 'CAPEX' ? 'bg-purple-100 text-purple-700' :
                    requisition.spend_type === 'OPEX' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {requisition.spend_type || 'OPEX'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Center</label>
                <div className="text-gray-900 font-medium font-mono text-sm">
                  {requisition.cost_center || 'Not assigned'}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">GL Account</label>
                <div className="text-gray-900 font-medium font-mono text-sm">
                  {requisition.gl_account || 'Not assigned'}
                </div>
              </div>
            </div>

            {/* Supplier Risk & Status Badges */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Risk Score</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  getRiskScoreBadgeColor(requisition.supplier_risk_score)
                }`}>
                  {requisition.supplier_risk_score !== null && requisition.supplier_risk_score !== undefined
                    ? requisition.supplier_risk_score
                    : 'N/A'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Status</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  getStatusBadgeColor(requisition.supplier_status)
                }`}>
                  {requisition.supplier_status || 'Unknown'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract on File</label>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  requisition.contract_on_file ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {requisition.contract_on_file ? 'YES' : 'NO'}
                </span>
              </div>
            </div>

            {/* Budget Impact */}
            {requisition.budget_impact && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Budget Impact</label>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">{requisition.budget_impact}</p>
                  {requisition.budget_available !== null && requisition.budget_available !== undefined && (
                    <p className="text-xs text-blue-600 mt-1">
                      Budget Available: {formatCurrency(requisition.budget_available)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {requisition.notes && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <p className="text-gray-700 whitespace-pre-wrap">{requisition.notes}</p>
              </div>
            )}

            {/* Agent Notes (if flagged) */}
            {requisition.agent_notes && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">AI Agent Notes</label>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800 whitespace-pre-wrap">{requisition.agent_notes}</p>
                </div>
              </div>
            )}

            {/* Flag Information */}
            {requisition.flagged_by && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Flagged Information</label>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>Flagged by:</strong> {requisition.flagged_by}
                  </p>
                  {requisition.flag_reason && (
                    <p className="text-sm text-orange-800 mt-1">
                      <strong>Reason:</strong> {requisition.flag_reason}
                    </p>
                  )}
                  {requisition.current_stage && (
                    <p className="text-sm text-orange-800 mt-1">
                      <strong>Stage:</strong> {requisition.current_stage}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
