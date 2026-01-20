import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CreditCard, Calendar, AlertTriangle, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { 
  StatusBadge,
  LoadingSpinner, 
  ErrorState, 
  EmptyState,
} from '../components/common';
import { getPayments } from '../utils/api';
import { formatCurrency, formatDate, formatRelativeTime } from '../utils/formatters';
import type { Payment, PaymentFilters, PaymentStatus, PaymentMethod } from '../types';

export function PaymentsView() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PaymentFilters>({});

  useEffect(() => {
    loadPayments();
  }, [page, filters]);

  async function loadPayments() {
    try {
      setLoading(true);
      setError(null);
      const response = await getPayments({
        ...filters,
        skip: (page - 1) * 20,
        limit: 20,
      });
      setPayments(response.items);
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }

  const statusOptions: PaymentStatus[] = ['SCHEDULED', 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'];
  const methodOptions: PaymentMethod[] = ['BANK_TRANSFER', 'CHECK', 'WIRE', 'ACH', 'CREDIT_CARD', 'OTHER'];

  function getStatusIcon(status: PaymentStatus) {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="text-success-500" size={20} />;
      case 'FAILED':
        return <AlertTriangle className="text-danger-500" size={20} />;
      case 'PROCESSING':
        return <Clock className="text-warning-500" size={20} />;
      case 'SCHEDULED':
        return <Calendar className="text-primary-500" size={20} />;
      default:
        return <DollarSign className="text-surface-500" size={20} />;
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Payments</h1>
          <p className="text-surface-500">Manage payment processing and schedules</p>
        </div>
        <button 
          onClick={() => navigate('/payments/new')}
          className="btn-primary"
        >
          <Plus size={18} />
          Schedule Payment
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <select 
            className="select w-48"
            value={filters.status || ''}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as PaymentStatus || undefined })}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select 
            className="select w-48"
            value={filters.method || ''}
            onChange={(e) => setFilters({ ...filters, method: e.target.value as PaymentMethod || undefined })}
          >
            <option value="">All Methods</option>
            {methodOptions.map((method) => (
              <option key={method} value={method}>{method.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <input
            type="date"
            className="input w-40"
            value={filters.date_from || ''}
            onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
            placeholder="From date"
          />
          <input
            type="date"
            className="input w-40"
            value={filters.date_to || ''}
            onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
            placeholder="To date"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" className="text-primary-500" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadPayments} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="w-16 h-16 text-surface-300" />}
          title="No payments found"
          description="Schedule your first payment to get started."
          action={{
            label: 'Schedule Payment',
            onClick: () => navigate('/payments/new'),
          }}
        />
      ) : (
        <>
          {/* Table */}
          <div className="table-container bg-white">
            <table className="table">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Scheduled</th>
                  <th>Processed</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr 
                    key={payment.id} 
                    className="cursor-pointer hover:bg-surface-50"
                    onClick={() => navigate(`/payments/${payment.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-surface-100 rounded-lg flex items-center justify-center">
                          {getStatusIcon(payment.status)}
                        </div>
                        <span className="font-mono text-primary-600">{payment.number}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-surface-600">
                        {payment.invoice?.number || payment.invoice_id}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={payment.status} />
                    </td>
                    <td>
                      <span className="text-sm text-surface-600">
                        {payment.method.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      <span className="font-medium text-surface-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-surface-600">
                        {formatDate(payment.scheduled_date)}
                      </span>
                    </td>
                    <td>
                      {payment.processed_date ? (
                        <span className="text-sm text-surface-600">
                          {formatDate(payment.processed_date)}
                        </span>
                      ) : (
                        <span className="text-sm text-surface-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} payments
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="btn-secondary btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(totalCount / 20)}
                className="btn-secondary btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
