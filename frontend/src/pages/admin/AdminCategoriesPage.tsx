import React, { useEffect, useState, useCallback } from 'react';
import { categoriesApi } from '@/api/categories';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface CategoryRow {
  _id: string;
  name: string;
  type: string;
  description?: string;
  attributes: { fieldName: string; fieldType: string; required: boolean; options?: string[] }[];
  isActive: boolean;
  createdAt: string;
}

const emptyForm = { name: '', type: 'PRODUCT' as 'PRODUCT' | 'SERVICE', description: '', isActive: true };

const AdminCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.getAll({ search: search || undefined, type: typeFilter || undefined });
      setCategories(res.data.categories as unknown as CategoryRow[]);
    } catch {
      // global
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchCategories(), 300);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (cat: CategoryRow) => {
    setEditId(cat._id);
    setForm({ name: cat.name, type: cat.type as 'PRODUCT' | 'SERVICE', description: cat.description ?? '', isActive: cat.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await categoriesApi.update(editId, form);
        toast.success('Category updated');
      } else {
        await categoriesApi.create(form);
        toast.success('Category created');
      }
      setShowModal(false);
      fetchCategories();
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
      toast.success('Category deleted');
      setDeleteTarget(null);
      fetchCategories();
    } catch {
      // global
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (row: CategoryRow) => <span className="font-medium text-white">{row.name}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: CategoryRow) => (
        <AdminBadge variant={row.type === 'PRODUCT' ? 'info' : 'purple'}>{row.type}</AdminBadge>
      ),
    },
    {
      key: 'attributes',
      header: 'Attributes',
      render: (row: CategoryRow) => (
        <span className="text-slate-400">{row.attributes?.length ?? 0} fields</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: CategoryRow) => (
        <AdminBadge variant={row.isActive ? 'success' : 'neutral'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </AdminBadge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: CategoryRow) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
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
        actions={
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <FiPlus size={16} /> New Category
          </button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search categories..." />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50"
        >
          <option value="">All Types</option>
          <option value="PRODUCT">Product</option>
          <option value="SERVICE">Service</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-800/60 bg-slate-900/50">
        <AdminTable columns={columns} data={categories} loading={loading} emptyMessage="No categories found" />
      </div>

      {/* Create / Edit Modal */}
      <AdminModal isOpen={showModal} onClose={() => setShowModal(false)} title={editId ? 'Edit Category' : 'New Category'} size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50"
              placeholder="Category name"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'PRODUCT' | 'SERVICE' }))}
              disabled={!!editId}
              className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-blue-500/50 disabled:opacity-50"
            >
              <option value="PRODUCT">Product</option>
              <option value="SERVICE">Service</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-blue-500/50"
              placeholder="Optional description"
            />
          </div>
          {editId && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                id="isActive"
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500/30"
              />
              <label htmlFor="isActive" className="text-sm text-slate-300">Active</label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800/60">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
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
          <p className="text-sm text-slate-300">
            Are you sure you want to delete <span className="font-semibold text-white">{deleteTarget?.name}</span>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
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
    </div>
  );
};

export default AdminCategoriesPage;
