import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '@/api/admin';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminTable from '@/components/admin/AdminTable';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import type { AdminUser, Pagination } from '@/types/admin';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await adminApi.getUsers({ page, limit: 15, search, role: roleFilter || undefined, status: statusFilter || undefined });
      setUsers(res.data.users);
      setPagination(res.data.pagination);
    } catch {
      // global handler
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(1), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleStatusToggle = async (user: AdminUser) => {
    const action = user.isActive !== false ? 'suspend' : 'activate';
    try {
      await adminApi.updateUserStatus(user._id, action);
      toast.success(`User ${action}d successfully`);
      fetchUsers(pagination.page);
      setSelectedUser(null);
    } catch {
      // global handler
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'User',
      render: (row: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xs font-medium shrink-0">
            {row.profileImage ? (
              <img src={row.profileImage} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              row.name?.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.name}</p>
            <p className="text-xs text-slate-600">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (row: AdminUser) => (
        <AdminBadge variant={row.role === 'admin' ? 'purple' : 'info'}>{row.role}</AdminBadge>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row: AdminUser) => (
        <AdminBadge variant={row.isActive !== false ? 'success' : 'danger'}>
          {row.isActive !== false ? 'Active' : 'Suspended'}
        </AdminBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (row: AdminUser) => (
        <span className="text-slate-500 text-xs">{format(new Date(row.createdAt), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: AdminUser) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedUser(row); }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" description={`${pagination.total} registered users`} />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search by name or email..." />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminTable columns={columns} data={users} loading={loading} emptyMessage="No users found" />
        <AdminPagination pagination={pagination} onPageChange={(p) => fetchUsers(p)} />
      </div>

      {/* User Detail Modal */}
      <AdminModal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details" size="md">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-xl font-bold">
                {selectedUser.profileImage ? (
                  <img src={selectedUser.profileImage} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  selectedUser.name?.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-900">{selectedUser.name}</p>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Role:</span> <span className="text-slate-900 ml-2">{selectedUser.role}</span></div>
              <div><span className="text-slate-500">Phone:</span> <span className="text-slate-900 ml-2">{selectedUser.phone}</span></div>
              <div><span className="text-slate-500">Age:</span> <span className="text-slate-900 ml-2">{selectedUser.age}</span></div>
              <div><span className="text-slate-500">Status:</span>
                <AdminBadge variant={selectedUser.isActive !== false ? 'success' : 'danger'}>
                  {selectedUser.isActive !== false ? 'Active' : 'Suspended'}
                </AdminBadge>
              </div>
              <div><span className="text-slate-500">Joined:</span> <span className="text-slate-900 ml-2">{format(new Date(selectedUser.createdAt), 'MMM d, yyyy')}</span></div>
              <div><span className="text-slate-500">Profile:</span>
                <AdminBadge variant={selectedUser.isProfileComplete ? 'success' : 'warning'}>
                  {selectedUser.isProfileComplete ? 'Complete' : 'Incomplete'}
                </AdminBadge>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                Close
              </button>
              {selectedUser.role !== 'admin' && (
                <button
                  onClick={() => handleStatusToggle(selectedUser)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    selectedUser.isActive !== false
                      ? 'bg-rose-600/15 text-rose-700 hover:bg-rose-600/25'
                      : 'bg-emerald-600/15 text-emerald-700 hover:bg-emerald-600/25'
                  }`}
                >
                  {selectedUser.isActive !== false ? 'Suspend User' : 'Activate User'}
                </button>
              )}
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminUsersPage;
