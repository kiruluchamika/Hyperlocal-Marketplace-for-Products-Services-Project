import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { FiMail, FiMessageCircle, FiPhone } from 'react-icons/fi';
import { adminApi } from '@/api/admin';
import type { ContactMessage, ContactMessageStatus } from '@/types/contact';
import type { Pagination } from '@/types/admin';
import AdminBadge from '@/components/admin/AdminBadge';
import AdminModal from '@/components/admin/AdminModal';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminPagination from '@/components/admin/AdminPagination';
import AdminSearchBar from '@/components/admin/AdminSearchBar';
import AdminTable from '@/components/admin/AdminTable';
import { Button } from '@/components/ui';

const statusLabelMap: Record<ContactMessageStatus, string> = {
  PENDING: 'Pending',
  REVIEWED_NO_REPLY: 'Reviewed No Reply',
  REPLIED: 'Replied',
};

const statusVariantMap: Record<ContactMessageStatus, 'warning' | 'info' | 'success'> = {
  PENDING: 'warning',
  REVIEWED_NO_REPLY: 'info',
  REPLIED: 'success',
};

const AdminContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedContact, setSelectedContact] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchContacts = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await adminApi.getContactRequests({
          page,
          limit: 15,
          search: search || undefined,
          status: (statusFilter || undefined) as ContactMessageStatus | undefined,
        });

        setContacts(res.data.messages);
        setPagination(res.data.pagination);
      } catch {
        // Global error handler
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContacts(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchContacts]);

  useEffect(() => {
    if (!selectedContact) {
      setReplyText('');
      return;
    }

    setReplyText(selectedContact.adminReplyMessage || '');
  }, [selectedContact]);

  const handleMarkReviewed = async (contactId: string) => {
    setActionLoading(true);
    try {
      await adminApi.markContactReviewed(contactId);
      toast.success('Request moved to Reviewed No Reply');
      await fetchContacts(pagination.page);
      setSelectedContact((prev) => {
        if (!prev || prev._id !== contactId) return prev;
        return { ...prev, status: 'REVIEWED_NO_REPLY' };
      });
    } catch {
      // global handler
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReply = async (contactId: string) => {
    const cleanedReply = replyText.trim();
    if (cleanedReply.length < 5) {
      toast.error('Reply must be at least 5 characters');
      return;
    }

    setActionLoading(true);

    try {
      const res = await adminApi.replyToContact(contactId, cleanedReply);
      toast.success('Reply sent to user email');
      await fetchContacts(pagination.page);
      setSelectedContact(res.data.contact);
    } catch {
      // global handler
    } finally {
      setActionLoading(false);
    }
  };

  const whatsappLink = useMemo(() => {
    const raw = selectedContact?.senderWhatsapp || selectedContact?.senderPhone || '';
    const digits = raw.replace(/[^0-9]/g, '');
    if (!digits) return null;
    return `https://wa.me/${digits}`;
  }, [selectedContact]);

  const columns = [
    {
      key: 'senderName',
      header: 'Sender',
      render: (row: ContactMessage) => (
        <div>
          <p className="font-medium text-slate-900">{row.senderName}</p>
          <p className="text-xs text-slate-500">{row.senderEmail}</p>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row: ContactMessage) => (
        <p className="max-w-[240px] truncate text-slate-700" title={row.subject}>
          {row.subject}
        </p>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: ContactMessage) => (
        <AdminBadge variant={statusVariantMap[row.status]}>{statusLabelMap[row.status]}</AdminBadge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Received',
      render: (row: ContactMessage) => (
        <span className="text-xs text-slate-500">{format(new Date(row.createdAt), 'MMM d, yyyy HH:mm')}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row: ContactMessage) => (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedContact(row);
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          View
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Contact Requests" description={`${pagination.total} user requests`} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="w-full max-w-sm">
          <AdminSearchBar value={search} onChange={setSearch} placeholder="Search sender, email, subject..." />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500/50"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="REVIEWED_NO_REPLY">Reviewed No Reply</option>
          <option value="REPLIED">Replied</option>
        </select>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <AdminTable columns={columns} data={contacts} loading={loading} emptyMessage="No contact requests found" />
        <AdminPagination pagination={pagination} onPageChange={(page) => fetchContacts(page)} />
      </div>

      <AdminModal
        isOpen={!!selectedContact}
        onClose={() => setSelectedContact(null)}
        title="Contact Request"
        size="lg"
      >
        {selectedContact && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-slate-500">Sender</p>
                <p className="text-sm font-semibold text-slate-900">{selectedContact.senderName}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Status</p>
                <AdminBadge variant={statusVariantMap[selectedContact.status]}>
                  {statusLabelMap[selectedContact.status]}
                </AdminBadge>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Email</p>
                <a href={`mailto:${selectedContact.senderEmail}`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
                  <FiMail className="h-3.5 w-3.5" />
                  {selectedContact.senderEmail}
                </a>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Phone</p>
                <p className="inline-flex items-center gap-1 text-sm text-slate-700">
                  <FiPhone className="h-3.5 w-3.5" />
                  {selectedContact.senderPhone || 'Not provided'}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium text-slate-500">WhatsApp follow-up</p>
                {whatsappLink ? (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    <FiMessageCircle className="h-3.5 w-3.5" />
                    Open WhatsApp Chat
                  </a>
                ) : (
                  <p className="text-sm text-slate-700">No WhatsApp number provided</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Subject</p>
              <p className="text-sm font-semibold text-slate-900">{selectedContact.subject}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">User message</p>
              <p className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                {selectedContact.message}
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Reply via Email</label>
              <textarea
                rows={5}
                value={replyText}
                onChange={(event) => setReplyText(event.target.value)}
                placeholder="Write your reply to the user..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-blue-500/50"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <Button
                type="button"
                variant="secondary"
                disabled={selectedContact.status === 'REPLIED' || actionLoading}
                onClick={() => handleMarkReviewed(selectedContact._id)}
              >
                Mark Reviewed No Reply
              </Button>

              <Button
                type="button"
                isLoading={actionLoading}
                onClick={() => handleSendReply(selectedContact._id)}
              >
                Send Reply Email
              </Button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};

export default AdminContactsPage;
