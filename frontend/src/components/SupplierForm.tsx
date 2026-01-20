import React, { useState } from 'react';
import type { Supplier } from '../types';
import { createSupplier } from '../utils/api';

interface SupplierFormProps {
  onSuccess?: (supplier: Supplier) => void;
  onCancel?: () => void;
  initialData?: Partial<Supplier>;
}

export const SupplierForm: React.FC<SupplierFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    code: initialData?.code || '',
    tax_id: initialData?.tax_id || '',
    address_line1: initialData?.address_line1 || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    postal_code: initialData?.postal_code || '',
    country: initialData?.country || 'USA',
    contact_name: initialData?.contact_name || '',
    contact_email: initialData?.contact_email || '',
    contact_phone: initialData?.contact_phone || '',
    category: initialData?.category || 'IT',
    is_preferred: initialData?.is_preferred || false,
    payment_terms: initialData?.payment_terms || 'Net 30',
    bank_name: initialData?.bank_name || '',
    notes: initialData?.notes || '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await createSupplier(formData as any);
      onSuccess?.(result);
    } catch (err: any) {
      setError(err.message || 'Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleFieldChange('name', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="ABC Company Inc"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supplier Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={e => handleFieldChange('code', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="SUP-001"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contact Name
            </label>
            <input
              type="text"
              value={formData.contact_name}
              onChange={e => handleFieldChange('contact_name', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Category
            </label>
            <select
              value={formData.category}
              onChange={e => handleFieldChange('category', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="IT">IT</option>
              <option value="SERVICES">Services</option>
              <option value="OFFICE_SUPPLIES">Office Supplies</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="RAW_MATERIALS">Raw Materials</option>
              <option value="LOGISTICS">Logistics</option>
              <option value="MRO">MRO</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Address</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Street Address
          </label>
          <input
            type="text"
            value={formData.address_line1}
            onChange={e => handleFieldChange('address_line1', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="123 Main Street"
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              City
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={e => handleFieldChange('city', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="New York"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              State
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={e => handleFieldChange('state', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="NY"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Postal Code
            </label>
            <input
              type="text"
              value={formData.postal_code}
              onChange={e => handleFieldChange('postal_code', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="10001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={e => handleFieldChange('country', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="USA"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={formData.contact_email}
              onChange={e => handleFieldChange('contact_email', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="contact@supplier.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={e => handleFieldChange('contact_phone', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="+1-555-0123"
            />
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Financial</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Terms
            </label>
            <select
              value={formData.payment_terms}
              onChange={e => handleFieldChange('payment_terms', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Net 45">Net 45</option>
              <option value="Net 60">Net 60</option>
              <option value="COD">Cash on Delivery</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tax ID
            </label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={e => handleFieldChange('tax_id', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="12-3456789"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Bank Name
          </label>
          <input
            type="text"
            value={formData.bank_name}
            onChange={e => handleFieldChange('bank_name', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            placeholder="First National Bank"
          />
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Preferences</h3>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="preferred"
            checked={formData.is_preferred}
            onChange={e => handleFieldChange('is_preferred', e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="preferred" className="ml-3 text-sm font-medium text-gray-700">
            Mark as Preferred Supplier
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={e => handleFieldChange('notes', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            rows={3}
            placeholder="Additional notes about supplier"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md font-medium disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Supplier'}
        </button>
      </div>
    </form>
  );
};
