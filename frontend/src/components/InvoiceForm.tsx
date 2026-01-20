import React, { useState, useEffect } from 'react';
import type { Invoice, InvoiceLineItem, PurchaseOrder } from '../types';
import { createInvoice, getPurchaseOrders } from '../utils/api';

interface InvoiceFormProps {
  onSuccess?: (invoice: Invoice) => void;
  onCancel?: () => void;
  initialData?: Partial<Invoice>;
}

export const InvoiceForm: React.FC<InvoiceFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    vendor_invoice_number: initialData?.vendor_invoice_number || '',
    purchase_order_id: initialData?.purchase_order_id || '',
    supplier_id: initialData?.supplier_id || '',
    invoice_date: initialData?.invoice_date || new Date().toISOString().split('T')[0],
    due_date: initialData?.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    subtotal: initialData?.subtotal || 0,
    tax_amount: initialData?.tax_amount || 0,
    notes: initialData?.notes || '',
  });

  const [lineItems, setLineItems] = useState<Partial<InvoiceLineItem>[]>(
    initialData?.line_items || [{ description: '', quantity: 1, unit_price: 0 }]
  );

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const posData = await getPurchaseOrders();
        setPurchaseOrders(posData.items || []);
      } catch (err) {
        setError('Failed to load purchase orders');
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, unit_price: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const price = (item.unit_price || 0) * (item.quantity || 1);
      return sum + price;
    }, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = formData.tax_amount || 0;
    return subtotal + tax;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const subtotal = calculateSubtotal();
      const total = calculateTotal();

      const payload = {
        ...formData,
        total_amount: total,
        tax_amount: formData.tax_amount || 0,
        line_items: lineItems.map(item => ({
          po_line_item_id: item.po_line_item_id,
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          line_amount: (item.unit_price || 0) * (item.quantity || 1),
        })),
      };

      const result = await createInvoice(payload as any);
      onSuccess?.(result);
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
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

      {/* Invoice Header */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Invoice Details</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Vendor Invoice Number *
            </label>
            <input
              type="text"
              value={formData.vendor_invoice_number}
              onChange={e => handleFieldChange('vendor_invoice_number', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="VINV-2024-001"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Purchase Order *
            </label>
            <select
              value={formData.purchase_order_id}
              onChange={e => handleFieldChange('purchase_order_id', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            >
              <option value="">Select a PO</option>
              {purchaseOrders.map(po => (
                <option key={po.id} value={po.id}>
                  {po.number}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Date
            </label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={e => handleFieldChange('invoice_date', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={e => handleFieldChange('due_date', e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
          </div>
        </div>

        {/* Payment terms removed - not in Invoice type */}
      </div>

      {/* Line Items */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>

        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700">
                  Description
                </label>
                <input
                  type="text"
                  value={item.description || ''}
                  onChange={e =>
                    handleLineItemChange(index, 'description', e.target.value)
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Item description"
                  required
                />
              </div>

              <div className="w-20">
                <label className="block text-xs font-medium text-gray-700">
                  Qty
                </label>
                <input
                  type="number"
                  value={item.quantity || 1}
                  onChange={e =>
                    handleLineItemChange(index, 'quantity', parseInt(e.target.value))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  min="1"
                  required
                />
              </div>

              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700">
                  Unit Price
                </label>
                <input
                  type="number"
                  value={item.unit_price || 0}
                  onChange={e =>
                    handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  step="0.01"
                  required
                />
              </div>

              <div className="w-24">
                <label className="block text-xs font-medium text-gray-700">
                  Total
                </label>
                <div className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-sm font-medium">
                  ${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLineItem}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + Add Line Item
        </button>
      </div>

      {/* Amounts */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Amounts</h3>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subtotal
            </label>
            <div className="mt-1 px-3 py-2 bg-gray-100 rounded-md text-lg font-bold">
              ${calculateSubtotal().toFixed(2)}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tax Amount
            </label>
            <input
              type="number"
              value={formData.tax_amount}
              onChange={e => handleFieldChange('tax_amount', parseFloat(e.target.value) || 0)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Total
            </label>
            <div className="mt-1 px-3 py-2 bg-blue-100 rounded-md text-lg font-bold text-blue-900">
              ${calculateTotal().toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Description & Notes */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Additional Information</h3>

        {/* Description removed - not in Invoice type */}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={e => handleFieldChange('notes', e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            rows={2}
            placeholder="Additional notes"
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
          {loading ? 'Creating...' : 'Create Invoice'}
        </button>
      </div>
    </form>
  );
};
