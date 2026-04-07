import React, { useEffect, useState, useCallback } from 'react';
import { categoriesApi } from '@/api/categories';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import CategoryReportModal from '@/components/admin/CategoryReportModal';
import { FiFileText, FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { CategoryAttribute, CategoryType, ICategory } from '@/types';
import {
  generateAdminCategoriesPdf,
  type CategoryReportOptions,
} from '@/utils/adminCategoryReport';

interface CategoryForm {
  name: string;
  type: CategoryType;
  description?: string;
  attributes: CategoryAttribute[];
  isActive: boolean;
}

type ValidationResult =
  | { valid: true; payload: ReturnType<typeof normalizeFormStatic> }
  | { valid: false; message: string };

const normalizeFormStatic = (input: CategoryForm) => {
  const normalizedAttributes: CategoryAttribute[] = input.attributes.map((attribute) => {
    const fieldName = attribute.fieldName.trim();
    const options = (attribute.options || []).map((option) => option.trim()).filter(Boolean);

    if (attribute.fieldType === 'select') {
      return {
        fieldName,
        fieldType: attribute.fieldType,
        required: !!attribute.required,
        options,
      };
    }

    return {
      fieldName,
      fieldType: attribute.fieldType,
      required: !!attribute.required,
    };
  });

  return {
    name: input.name.trim(),
    type: input.type,
    description: input.description?.trim() || undefined,
    attributes: normalizedAttributes,
    isActive: input.isActive,
  };
};

const emptyForm: CategoryForm = {
  name: '',
  type: 'PRODUCT',
  description: '',
  attributes: [],
  isActive: true,
};

const defaultAttribute: CategoryAttribute = {
  fieldName: '',
  fieldType: 'string',
  required: false,
  options: [],
};

const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CategoryType | ''>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ICategory | null>(null);
  const [reportCategories, setReportCategories] = useState<ICategory[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const getIsActiveFilter = () => {
    if (statusFilter === 'active') {
      return true;
    }
    if (statusFilter === 'inactive') {
      return false;
    }
    return undefined;
  };

  const validateForm = (input: CategoryForm): ValidationResult => {
    const normalized = normalizeFormStatic(input);

    if (normalized.name.length < 3 || normalized.name.length > 100) {
      return { valid: false, message: 'Category name must be between 3 and 100 characters.' };
    }

    if (normalized.description && normalized.description.length > 500) {
      return { valid: false, message: 'Description must not exceed 500 characters.' };
    }

    for (let index = 0; index < normalized.attributes.length; index += 1) {
      const attribute = normalized.attributes[index];
      if (!attribute.fieldName) {
        return { valid: false, message: `Attribute #${index + 1} requires a field name.` };
      }

      if (attribute.fieldType === 'select' && (!attribute.options || attribute.options.length === 0)) {
        return { valid: false, message: `Attribute #${index + 1} must include at least one option.` };
      }
    }

    return { valid: true, payload: normalized };
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.getAll({
        search: search || undefined,
        type: typeFilter || undefined,
        isActive: getIsActiveFilter(),
      });
      setCategories(res.data.data);
    } catch {
      // global
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  const fetchReportCategories = useCallback(async () => {
    setReportLoading(true);
    try {
      const merged: ICategory[] = [];
      const limit = 100;
      let page = 1;
      let totalPages = 1;

      do {
        const response = await categoriesApi.getAll({
          search: search || undefined,
          type: typeFilter || undefined,
          isActive: getIsActiveFilter(),
          page,
          limit,
        });

        merged.push(...response.data.data);
        totalPages = response.data.pagination.totalPages || 1;
        page += 1;
      } while (page <= totalPages && page <= 50);

      setReportCategories(merged);
    } catch {
      setReportCategories([]);
    } finally {
      setReportLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchCategories();
      void fetchReportCategories();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCategories, fetchReportCategories]);

  const generatePdf = async (options: CategoryReportOptions) => {
    if (reportCategories.length === 0) {
      toast.error('No categories found to generate report.');
      return;
    }

    setPdfLoading(true);
    try {
      await generateAdminCategoriesPdf({
        categories: reportCategories,
        options,
      });
      setPdfModalOpen(false);
      toast.success('Categories PDF report generated successfully.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate categories PDF report.');
    } finally {
      setPdfLoading(false);
    }
  };

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const openEdit = (cat: ICategory) => {
    setEditId(cat._id);
    setForm({
      name: cat.name,
      type: cat.type,
      description: cat.description ?? '',
      attributes: (cat.attributes || []).map((attribute) => ({
        ...attribute,
        options: attribute.options || [],
      })),
      isActive: cat.isActive,
    });
    setFormError(null);
    setShowModal(true);
  };

  const addAttribute = () => {
    setForm((prev) => ({
      ...prev,
      attributes: [...prev.attributes, { ...defaultAttribute }],
    }));
  };

  const removeAttribute = (index: number) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.filter((_, attrIndex) => attrIndex !== index),
    }));
  };

  const updateAttribute = (index: number, patch: Partial<CategoryAttribute>) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attribute, attrIndex) => {
        if (attrIndex !== index) {
          return attribute;
        }

        const nextFieldType = patch.fieldType ?? attribute.fieldType;
        const merged: CategoryAttribute = {
          ...attribute,
          ...patch,
          fieldType: nextFieldType,
        };

        if (nextFieldType !== 'select') {
          delete merged.options;
        }

        if (nextFieldType === 'select' && !merged.options) {
          merged.options = [''];
        }

        return merged;
      }),
    }));
  };

  const addAttributeOption = (attributeIndex: number) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attribute, index) => {
        if (index !== attributeIndex) {
          return attribute;
        }

        const options = [...(attribute.options || []), ''];
        return {
          ...attribute,
          options,
        };
      }),
    }));
  };

  const updateAttributeOption = (attributeIndex: number, optionIndex: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attribute, index) => {
        if (index !== attributeIndex) {
          return attribute;
        }

        const options = [...(attribute.options || [])];
        options[optionIndex] = value;

        return {
          ...attribute,
          options,
        };
      }),
    }));
  };

  const removeAttributeOption = (attributeIndex: number, optionIndex: number) => {
    setForm((prev) => ({
      ...prev,
      attributes: prev.attributes.map((attribute, index) => {
        if (index !== attributeIndex) {
          return attribute;
        }

        const options = (attribute.options || []).filter((_, currentIndex) => currentIndex !== optionIndex);

        return {
          ...attribute,
          options,
        };
      }),
    }));
  };

  const handleSave = async () => {
    const validation = validateForm(form);
    if (!validation.valid) {
      setFormError(validation.message);
      toast.error(validation.message);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      if (editId) {
        await categoriesApi.update(editId, validation.payload);
        toast.success('Category updated');
      } else {
        await categoriesApi.create(validation.payload);
        toast.success('Category created');
      }
      setShowModal(false);
      void fetchCategories();
    } catch {
      // global
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await categoriesApi.delete(deleteTarget._id);
      toast.success('Category marked as inactive');
      setDeleteTarget(null);
      void fetchCategories();
    } catch {
      // global
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: ICategory) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: ICategory) => (
        <AdminBadge variant={row.type === 'PRODUCT' ? 'info' : 'purple'}>{row.type}</AdminBadge>
      ),
    },
    {
      key: 'attributes',
      header: 'Attributes',
      render: (row: ICategory) => (
        <span className="text-slate-500">{row.attributes?.length ?? 0} fields</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: ICategory) => (
        <AdminBadge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </AdminBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: ICategory) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Categories"
        description="Manage product and service categories"
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPdfModalOpen(true)}
              disabled={pdfLoading || reportLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FiFileText size={16} />
              {pdfLoading ? 'Generating PDF...' : reportLoading ? 'Preparing Data...' : 'Download PDF Report'}
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <FiPlus size={16} /> New Category
            </button>
          </div>
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search categories..." />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as CategoryType | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Types</option>
          <option value="PRODUCT">Product</option>
          <option value="SERVICE">Service</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminTable columns={columns} data={categories} loading={loading} emptyMessage="No categories found" />
      </div>

      {/* Create / Edit Modal */}
      <AdminModal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Category' : 'New Category'} size="md">
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {formError}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/50"
              placeholder="Category name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'PRODUCT' | 'SERVICE' }))}
              disabled={!!editId}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50 disabled:opacity-50"
            >
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/50"
              placeholder="Optional description"
            />
          </div>
          <div className="space-y-3 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-slate-700">Attributes</label>
              <button
                type="button"
                onClick={addAttribute}
                className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 transition-colors hover:border-blue-500/60 hover:text-slate-900"
              >
                <FiPlus size={12} /> Add Field
              </button>
            </div>

            {form.attributes.length === 0 && (
              <p className="text-xs text-slate-500">No custom attributes yet.</p>
            )}

            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {form.attributes.map((attribute, index) => (
                <div key={`attribute-${index}`} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      value={attribute.fieldName}
                      onChange={(e) => updateAttribute(index, { fieldName: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/50"
                      placeholder="Field name"
                    />
                    <select
                      value={attribute.fieldType}
                      onChange={(e) => updateAttribute(index, { fieldType: e.target.value as CategoryAttribute['fieldType'] })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500/50"
                    >
                      <option value="string">String</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="select">Select</option>
                    </select>
                  </div>

                  {attribute.fieldType === 'select' && (
                    <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-700">Options</p>
                        <button
                          type="button"
                          onClick={() => addAttributeOption(index)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 transition-colors hover:border-blue-500/60 hover:text-slate-900"
                        >
                          <FiPlus size={12} /> Add Option
                        </button>
                      </div>

                      {(attribute.options || []).length === 0 && (
                        <p className="text-xs text-slate-500">No options yet. Add at least one option.</p>
                      )}

                      {(attribute.options || []).map((option, optionIndex) => (
                        <div key={`attribute-${index}-option-${optionIndex}`} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateAttributeOption(index, optionIndex, e.target.value)}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500/50"
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeAttributeOption(index, optionIndex)}
                            className="rounded-md px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={attribute.required}
                        onChange={(e) => updateAttribute(index, { required: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/30"
                      />
                      Required field
                    </label>
                    <button
                      type="button"
                      onClick={() => removeAttribute(index)}
                      className="rounded-md px-2 py-1 text-xs text-rose-600 transition-colors hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {editId && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                id="isActive"
                className="h-4 w-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/30"
              />
              <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : editId ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </AdminModal>

      {/* Delete Confirmation Modal */}
      <AdminModal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Category" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Delete <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>? This will set the category as inactive (soft delete), and you can still view it using the status filter.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700"
            >
              Delete
            </button>
          </div>
        </div>
      </AdminModal>

      <CategoryReportModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        onGenerate={generatePdf}
        isGenerating={pdfLoading}
      />
    </div>
  );
};

export default AdminCategoriesPage;
