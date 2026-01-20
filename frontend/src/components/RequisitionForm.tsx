import React, { useState, useEffect } from 'react';
import type { Requisition, RequisitionLineItem, Supplier, Product } from '../types';
import { createRequisition, getSuppliers, getProducts } from '../utils/api';
import { RequisitionChatbot } from './RequisitionChatbot';

interface RequisitionFormProps {
  onSuccess?: (requisition: Requisition) => void;
  onCancel?: () => void;
  initialData?: Partial<Requisition>;
}

export const RequisitionForm: React.FC<RequisitionFormProps> = ({
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    description: initialData?.description || '',
    department: initialData?.department || 'IT',
    urgency: initialData?.urgency || 'STANDARD',
    needed_by_date: initialData?.needed_by_date || '',
    justification: initialData?.justification || '',
    cost_center: initialData?.cost_center || '',
    project_code: initialData?.project_code || '',
    notes: initialData?.notes || '',
    // Enterprise procurement fields
    category: initialData?.category || '',
    supplier_name: initialData?.supplier_name || '',
    gl_account: initialData?.gl_account || '',
    spend_type: initialData?.spend_type || 'OPEX',
    procurement_type: initialData?.procurement_type || 'goods',  // goods or services
    supplier_risk_score: initialData?.supplier_risk_score || null,
    supplier_status: initialData?.supplier_status || '',
    contract_on_file: initialData?.contract_on_file || false,
    budget_available: initialData?.budget_available || null,
    budget_impact: initialData?.budget_impact || '',
  });

  const [lineItems, setLineItems] = useState<Partial<RequisitionLineItem>[]>(
    initialData?.line_items || [{ description: '', quantity: 1, estimated_unit_price: 0 }]
  );

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiWizardLoading, setAiWizardLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'basic' | 'additional'>('basic');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersData, productsData] = await Promise.all([
          getSuppliers(),
          getProducts(),
        ]);
        setSuppliers(suppliersData.items || []);
        setProducts(productsData.items || []);
      } catch (err) {
        setError('Failed to load suppliers and products');
        console.error(err);
      }
    };
    fetchData();
  }, []);

  // Fetch categories when department changes
  useEffect(() => {
    const fetchCategories = async () => {
      if (!formData.department) return;
      
      try {
        const response = await fetch(
          `/api/v1/requisitions/categories/${formData.department}`
        );
        const data = await response.json();
        setCategories(data.categories || []);
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCategories();
  }, [formData.department]);

  // Fetch suppliers when category changes
  useEffect(() => {
    const fetchSuppliersByCategory = async () => {
      if (!formData.department || !formData.category) return;
      
      try {
        const response = await fetch(
          `/api/v1/requisitions/suppliers/by-category?department=${formData.department}&category=${formData.category}`
        );
        const data = await response.json();
        setFilteredSuppliers(data.suppliers || []);
      } catch (err) {
        console.error('Failed to load suppliers:', err);
      }
    };
    fetchSuppliersByCategory();
  }, [formData.department, formData.category]);

  // Auto-detect procurement type based on category
  const getProcurementTypeFromCategory = (category: string): 'goods' | 'services' => {
    const serviceCategories = [
      'Professional Services', 'Consulting', 'Training', 'Maintenance',
      'Software Licenses', 'Legal Services', 'Advisory', 'Support Services',
      'Audit Services', 'IT Services', 'Cleaning Services', 'Security Services',
    ];
    const lowerCategory = category.toLowerCase();
    const isService = serviceCategories.some(sc => lowerCategory.includes(sc.toLowerCase()));
    return isService ? 'services' : 'goods';
  };

  // Auto-detect procurement type when category changes
  useEffect(() => {
    if (formData.category) {
      const detectedType = getProcurementTypeFromCategory(formData.category);
      setFormData(prev => ({ ...prev, procurement_type: detectedType }));
    }
  }, [formData.category]);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle chatbot-parsed fields (fills both Tab 1 and Tab 2 fields)
  const handleChatbotFields = (fields: Record<string, any>) => {
    console.log('[CHATBOT] Received parsed fields:', JSON.stringify(fields, null, 2));
    console.log('[CHATBOT] Department from API:', fields.department);
    
    // Update form data with parsed fields
    setFormData(prev => {
      const newData = {
        ...prev,
        title: fields.title || prev.title,
        description: fields.description || prev.description,
        department: fields.department || prev.department,
        category: fields.category || prev.category,
        urgency: fields.urgency || prev.urgency,
        needed_by_date: fields.needed_by_date || prev.needed_by_date,
        project_code: fields.project_code || prev.project_code,
        justification: fields.justification || prev.justification,
        supplier_name: fields.supplier_name || prev.supplier_name,
        spend_type: fields.spend_type || prev.spend_type,
        cost_center: fields.cost_center || prev.cost_center,
        gl_account: fields.gl_account || prev.gl_account,
        notes: fields.notes || prev.notes,
      };
      console.log('[CHATBOT] Updated formData.department:', newData.department);
      return newData;
    });

    // Update line items if provided
    if (fields.line_items && fields.line_items.length > 0) {
      setLineItems(fields.line_items.map((item: any) => ({
        description: item.description || 'Item',
        quantity: item.quantity || 1,
        estimated_unit_price: item.estimated_unit_price || item.unit_price || 0,
      })));
    }
  };

  const handleAIWizard = async () => {
    if (!formData.department || !formData.category) {
      setError('Please select department and category first');
      return;
    }

    setAiWizardLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/requisitions/ai-wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: formData.department,
          category: formData.category,
          supplier_name: formData.supplier_name || '',  // Backend will auto-assign if empty
          amount: calculateTotal() || 1000,  // Default to $1000 if no line items
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Wizard error:', response.status, errorText);
        throw new Error(`AI Wizard failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Wizard response:', data);
      
      // Auto-fill the enterprise procurement fields
      setFormData(prev => ({
        ...prev,
        cost_center: data.cost_center || prev.cost_center,
        gl_account: data.gl_account || prev.gl_account,
        spend_type: data.spend_type || prev.spend_type,
        supplier_name: data.supplier_name || prev.supplier_name,  // Auto-assign if empty
        supplier_risk_score: data.supplier_risk_score,
        supplier_status: data.supplier_status,
        contract_on_file: data.contract_on_file,
        budget_available: data.budget_remaining,  // Map budget_remaining to budget_available
        budget_impact: data.budget_impact,
      }));

    } catch (err) {
      setError('Failed to run AI Wizard. Please try again.');
      console.error(err);
    } finally {
      setAiWizardLoading(false);
    }
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { description: '', quantity: 1, estimated_unit_price: 0 },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => {
      const price = (item.estimated_unit_price || 0) * (item.quantity || 1);
      return sum + price;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build line items with proper format for backend schema
      const formattedLineItems = lineItems.map(item => ({
        description: item.description || 'Item',
        category: formData.category || null,
        product_id: null,
        quantity: item.quantity || 1,
        unit_price: item.estimated_unit_price || 0,
        total: (item.estimated_unit_price || 0) * (item.quantity || 1),
        suggested_supplier_id: null,
        gl_account: formData.gl_account || null,
        cost_center: formData.cost_center || null,
      }));

      // Payload matching RequisitionCreate schema
      const payload = {
        requestor_id: 'james-wilson-001',  // Default to James Wilson
        department: formData.department,
        description: formData.description || formData.title,
        justification: formData.justification || null,
        urgency: formData.urgency,
        needed_by_date: formData.needed_by_date || null,
        line_items: formattedLineItems,
      };

      const result = await createRequisition(payload as any);
      onSuccess?.(result);
    } catch (err: any) {
      console.error('Requisition creation error:', err);
      // Handle error properly - extract message from various error formats
      let errorMsg = 'Failed to create requisition. Please check all required fields.';
      if (typeof err?.message === 'string') {
        errorMsg = err.message;
      } else if (err?.data?.detail) {
        errorMsg = typeof err.data.detail === 'string' ? err.data.detail : JSON.stringify(err.data.detail);
      }
      setError(errorMsg);
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

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Basic Information
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('additional')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'additional'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Additional Information
          </button>
        </nav>
      </div>

      {/* Tab 1: Basic Information */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => handleFieldChange('title', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="Office Supplies Order"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Urgency
                </label>
                <select
                  value={formData.urgency}
                  onChange={e => handleFieldChange('urgency', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="STANDARD">Standard</option>
                  <option value="URGENT">Urgent</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => handleFieldChange('description', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                rows={3}
                placeholder="Enter requisition description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Department *
                </label>
                <select
                  value={formData.department}
                  onChange={e => handleFieldChange('department', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="IT">IT</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                  <option value="HR">HR</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Facilities">Facilities</option>
                  <option value="Legal">Legal</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Sales">Sales</option>
                  <option value="R&D">R&D</option>
                  <option value="Procurement">Procurement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={e => handleFieldChange('category', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Needed By Date
                </label>
                <input
                  type="date"
                  value={formData.needed_by_date}
                  onChange={e => handleFieldChange('needed_by_date', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Project Code
                </label>
                <input
                  type="text"
                  value={formData.project_code}
                  onChange={e => handleFieldChange('project_code', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  placeholder="PRJ-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Justification
              </label>
              <textarea
                value={formData.justification}
                onChange={e => handleFieldChange('justification', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                rows={2}
                placeholder="Business justification for this requisition"
              />
            </div>
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

                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-700">
                      Est. Unit Price
                    </label>
                    <input
                      type="number"
                      value={item.estimated_unit_price || 0}
                      onChange={e =>
                        handleLineItemChange(index, 'estimated_unit_price', parseFloat(e.target.value))
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
                      ${((item.quantity || 1) * (item.estimated_unit_price || 0)).toFixed(2)}
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

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Additional Information */}
      {activeTab === 'additional' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Enterprise Procurement</h3>
              <button
                type="button"
                onClick={handleAIWizard}
                disabled={aiWizardLoading || !formData.department || !formData.category}
                className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>✨</span>
                {aiWizardLoading ? 'Auto-Filling...' : 'AI Wizard Auto-Fill'}
              </button>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
              <p className="text-sm text-purple-800">
                💡 Click "AI Wizard Auto-Fill" to automatically populate the enterprise procurement fields based on your department and category selection.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Supplier *
                </label>
                <select
                  value={formData.supplier_name}
                  onChange={e => handleFieldChange('supplier_name', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  required
                >
                  <option value="">Select Supplier</option>
                  {filteredSuppliers.map(sup => (
                    <option key={sup.name} value={sup.name}>{sup.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Spend Type
                </label>
                <select
                  value={formData.spend_type}
                  onChange={e => handleFieldChange('spend_type', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="OPEX">OPEX</option>
                  <option value="CAPEX">CAPEX</option>
                  <option value="INVENTORY">INVENTORY</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Procurement Type
                  <span className="ml-2 text-xs text-gray-500">(auto-detected from category)</span>
                </label>
                <select
                  value={formData.procurement_type}
                  onChange={e => handleFieldChange('procurement_type', e.target.value)}
                  className={`mt-1 block w-full rounded-md border px-3 py-2 ${
                    formData.procurement_type === 'services' 
                      ? 'border-purple-300 bg-purple-50' 
                      : 'border-blue-300 bg-blue-50'
                  }`}
                >
                  <option value="goods">📦 Goods (Physical Items)</option>
                  <option value="services">🛠️ Services (Work/Consulting)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.procurement_type === 'services' 
                    ? 'Service Acceptance will be used instead of Goods Receipt. 2-way match (PO ↔ Invoice) will apply.'
                    : 'Standard Goods Receipt and 3-way match (PO ↔ Receipt ↔ Invoice) will apply.'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost Center
                </label>
                <input
                  type="text"
                  value={formData.cost_center}
                  onChange={e => handleFieldChange('cost_center', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                  placeholder="Auto-filled by AI Wizard"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  GL Account
                </label>
                <input
                  type="text"
                  value={formData.gl_account}
                  onChange={e => handleFieldChange('gl_account', e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50"
                  placeholder="Auto-filled by AI Wizard"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {formData.supplier_risk_score !== null && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Supplier Risk Score
                  </label>
                  <div className={`mt-1 px-3 py-2 rounded-md text-center font-semibold ${
                    formData.supplier_risk_score > 70 ? 'bg-red-100 text-red-800' :
                    formData.supplier_risk_score > 40 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {formData.supplier_risk_score}
                  </div>
                </div>
              )}
              {formData.supplier_status && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Supplier Status
                  </label>
                  <div className={`mt-1 px-3 py-2 rounded-md text-center text-sm font-semibold ${
                    formData.supplier_status === 'preferred' ? 'bg-green-100 text-green-800' :
                    formData.supplier_status === 'known' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {formData.supplier_status.toUpperCase()}
                  </div>
                </div>
              )}
              {formData.contract_on_file !== null && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Contract on File
                  </label>
                  <div className={`mt-1 px-3 py-2 rounded-md text-center text-sm font-semibold ${
                    formData.contract_on_file ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {formData.contract_on_file ? 'YES' : 'NO'}
                  </div>
                </div>
              )}
            </div>

            {formData.budget_impact && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>Budget Impact:</strong> {formData.budget_impact}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={e => handleFieldChange('notes', e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                rows={3}
                placeholder="Additional notes or comments"
              />
            </div>
          </div>
        </div>
      )}

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
          {loading ? 'Creating...' : 'Create Requisition'}
        </button>
      </div>

      {/* AI Chatbot - Floating Assistant */}
      <RequisitionChatbot onFieldsFilled={handleChatbotFields} />
    </form>
  );
};
