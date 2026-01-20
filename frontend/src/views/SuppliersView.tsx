import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Star, Building2, Globe, Phone, Mail, ExternalLink } from 'lucide-react';
import { 
  RiskBadge,
  LoadingSpinner, 
  ErrorState, 
  EmptyState,
} from '../components/common';
import { getSuppliers } from '../utils/api';
import type { Supplier, SupplierFilters, RiskLevel, SupplierCategory } from '../types';

export function SuppliersView() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SupplierFilters>({});

  useEffect(() => {
    loadSuppliers();
  }, [page, filters]);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError(null);
      const response = await getSuppliers({
        ...filters,
        search: searchQuery || undefined,
        skip: (page - 1) * 20,
        limit: 20,
      });
      setSuppliers(response.items);
      setTotalCount(response.total);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadSuppliers();
  }

  const riskOptions: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const categoryOptions: SupplierCategory[] = [
    'RAW_MATERIALS', 'COMPONENTS', 'EQUIPMENT', 'SERVICES', 
    'IT', 'LOGISTICS', 'OFFICE_SUPPLIES', 'MRO', 'OTHER'
  ];

  function getRatingStars(rating?: number) {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'text-warning-400 fill-warning-400' : 'text-surface-300'}
          />
        ))}
        <span className="ml-1 text-sm text-surface-600">{rating.toFixed(1)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Suppliers</h1>
          <p className="text-surface-500">Manage vendor relationships and contracts</p>
        </div>
        <button 
          onClick={() => navigate('/suppliers/new')}
          className="btn-primary"
        >
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      {/* Search & Filters */}
      <div className="card">
        <div className="flex items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" size={18} />
            <input
              type="text"
              placeholder="Search suppliers by name, code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </form>
          <select 
            className="select w-40"
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value as SupplierCategory || undefined })}
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select 
            className="select w-40"
            value={filters.risk_level || ''}
            onChange={(e) => setFilters({ ...filters, risk_level: e.target.value as RiskLevel || undefined })}
          >
            <option value="">All Risk Levels</option>
            {riskOptions.map((risk) => (
              <option key={risk} value={risk}>{risk}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" className="text-primary-500" />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadSuppliers} />
      ) : suppliers.length === 0 ? (
        <EmptyState
          title="No suppliers found"
          description="Add suppliers to start managing vendor relationships."
          action={{
            label: 'Add Supplier',
            onClick: () => navigate('/suppliers/new'),
          }}
        />
      ) : (
        <>
          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((supplier) => (
              <div 
                key={supplier.id} 
                className="card-hover cursor-pointer"
                onClick={() => navigate(`/suppliers/${supplier.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-surface-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="text-surface-500" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-surface-900 truncate">{supplier.name}</h3>
                        <p className="text-sm text-surface-500">{supplier.code}</p>
                      </div>
                      <RiskBadge level={supplier.risk_level} />
                    </div>
                    {getRatingStars(supplier.performance_rating)}
                    <p className="text-xs text-surface-400 mt-2">
                      {supplier.category.replace(/_/g, ' ')}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-surface-100 space-y-2">
                  {supplier.contact_email && (
                    <div className="flex items-center gap-2 text-sm text-surface-600">
                      <Mail size={14} className="text-surface-400" />
                      <span className="truncate">{supplier.contact_email}</span>
                    </div>
                  )}
                  {supplier.contact_phone && (
                    <div className="flex items-center gap-2 text-sm text-surface-600">
                      <Phone size={14} className="text-surface-400" />
                      <span>{supplier.contact_phone}</span>
                    </div>
                  )}
                  {supplier.country && (
                    <div className="flex items-center gap-2 text-sm text-surface-600">
                      <Globe size={14} className="text-surface-400" />
                      <span>{supplier.city ? `${supplier.city}, ` : ''}{supplier.country}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className={`text-sm ${supplier.is_active ? 'text-success-600' : 'text-surface-400'}`}>
                    {supplier.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {supplier.is_preferred && (
                    <span className="badge-primary flex items-center gap-1">
                      <Star size={12} /> Preferred
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCount)} of {totalCount} suppliers
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
