import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { bookingsApi } from '@/api/services';
import GifLoader from '@/components/ui/GifLoader';
import type { IServiceBooking } from '@/types/service';
import { formatCurrency } from '@/utils/listings';
import { orderManagementApi } from './orders/orderManagementApi';
import type { ManagedOrder, ManagedPayment } from './orders/orderManagementTypes';

type PaymentTab = 'PAID' | 'EARNINGS';
type SourceFilter = 'ALL' | 'PRODUCT' | 'SERVICE';

const usdToLkrRate = Number(import.meta.env.VITE_USD_TO_LKR_RATE || 300);

type UnifiedRecord = {
  id: string;
  source: 'PRODUCT' | 'SERVICE';
  side: PaymentTab;
  title: string;
  counterpartyName?: string;
  counterpartyEmail?: string;
  amount: number;
  currency: string;
  paymentStatus: string;
  payoutStatus: 'NOT_APPLICABLE' | 'PENDING' | 'AVAILABLE' | 'PAID_OUT' | 'REVERSED' | 'FAILED';
  payoutTransferId?: string;
  payoutError?: string;
  payoutAttemptedAt?: string;
  payoutGrossAmount?: number;
  payoutFeePercent?: number;
  payoutFeeAmount?: number;
  payoutNetAmount?: number;
  referenceId: string;
  createdAt: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const badgeClassByStatus = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized === 'RELEASED' || normalized === 'CONFIRMED' || normalized === 'PAID_OUT') {
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }

  if (normalized === 'HELD' || normalized === 'INITIATED' || normalized === 'PENDING') {
    return 'bg-amber-100 text-amber-800 border-amber-200';
  }

  if (normalized === 'FAILED') {
    return 'bg-rose-100 text-rose-800 border-rose-200';
  }

  if (normalized === 'REFUNDED' || normalized === 'REVERSED' || normalized === 'REJECTED' || normalized === 'CANCELLED') {
    return 'bg-slate-100 text-slate-700 border-slate-200';
  }

  return 'bg-blue-100 text-blue-800 border-blue-200';
};

const payoutStatusFromPayment = (payment: ManagedPayment): UnifiedRecord['payoutStatus'] => {
  if (payment.payoutStatus === 'TRANSFER_CREATED') return 'PAID_OUT';
  if (payment.payoutStatus === 'TRANSFER_FAILED') return 'FAILED';
  if (payment.payoutStatus === 'SKIPPED_NOT_ELIGIBLE') return 'PENDING';

  if (payment.status === 'FAILED') return 'FAILED';
  if (payment.status === 'REFUNDED') return 'REVERSED';
  if (payment.status === 'RELEASED') return 'PENDING';
  if (payment.status === 'HELD' || payment.status === 'INITIATED') return 'PENDING';
  return 'NOT_APPLICABLE';
};

const payoutStatusFromBooking = (booking: IServiceBooking): UnifiedRecord['payoutStatus'] => {
  if (booking.deposit?.payoutStatus === 'TRANSFER_CREATED') return 'PAID_OUT';
  if (booking.deposit?.payoutStatus === 'TRANSFER_FAILED') return 'FAILED';
  if (booking.deposit?.payoutStatus === 'SKIPPED_NOT_ELIGIBLE') return 'PENDING';

  if (booking.status === 'REJECTED' || booking.status === 'CANCELLED') return 'REVERSED';
  if (booking.status === 'CONFIRMED') return 'PAID_OUT';
  if (booking.status === 'PROVIDER_ACCEPTED') return 'AVAILABLE';
  if (booking.status === 'PENDING') return 'PENDING';
  return 'NOT_APPLICABLE';
};

const toDisplayLkrAmount = (amount: number, currency = 'LKR') => {
  if (String(currency || 'LKR').toUpperCase() === 'USD') {
    return amount * usdToLkrRate;
  }

  return amount;
};

const MyPaymentsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id || '';

  const [tab, setTab] = useState<PaymentTab>('PAID');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [paymentByOrderId, setPaymentByOrderId] = useState<Record<string, ManagedPayment | null>>({});
  const [buyerBookings, setBuyerBookings] = useState<IServiceBooking[]>([]);
  const [providerBookings, setProviderBookings] = useState<IServiceBooking[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!currentUserId) return;

    setIsLoading(true);
    setError('');

    try {
      const [ordersResult, buyerRes, providerRes] = await Promise.all([
        orderManagementApi.listOrders({ page: 1, limit: 100 }),
        bookingsApi.getMyBookings(),
        bookingsApi.getProviderBookings(),
      ]);

      const myOrders = ordersResult.orders.filter(
        (order) => order.buyerId === currentUserId || order.sellerId === currentUserId
      );
      setOrders(myOrders);

      const paymentEntries = await Promise.all(
        myOrders.map(async (order) => {
          try {
            const payment = await orderManagementApi.getPaymentByOrder(order.id);
            return [order.id, payment] as const;
          } catch {
            return [order.id, null] as const;
          }
        })
      );

      const mapped = paymentEntries.reduce<Record<string, ManagedPayment | null>>((acc, [orderId, payment]) => {
        acc[orderId] = payment;
        return acc;
      }, {});

      setPaymentByOrderId(mapped);
      setBuyerBookings(buyerRes.data.data || []);
      setProviderBookings(providerRes.data.data || []);
    } catch {
      setError('Unable to load payment history right now. Please try again later.');
      setOrders([]);
      setPaymentByOrderId({});
      setBuyerBookings([]);
      setProviderBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const refreshPayments = () => {
      void loadData();
    };

    window.addEventListener('focus', refreshPayments);
    document.addEventListener('visibilitychange', refreshPayments);

    return () => {
      window.removeEventListener('focus', refreshPayments);
      document.removeEventListener('visibilitychange', refreshPayments);
    };
  }, [loadData]);

  const unifiedRecords = useMemo<UnifiedRecord[]>(() => {
    const productRecords: UnifiedRecord[] = [];

    for (const order of orders) {
      const payment = paymentByOrderId[order.id];
      if (!payment) continue;

      const isBuyer = order.buyerId === currentUserId;
      const side: PaymentTab = isBuyer ? 'PAID' : 'EARNINGS';
      const counterparty = isBuyer ? order.seller : order.buyer;

      productRecords.push({
        id: `product-${payment.id || order.id}`,
        source: 'PRODUCT',
        side,
        title: order.titleSnapshot || 'Product Order',
        counterpartyName: counterparty?.name,
        counterpartyEmail: counterparty?.email,
        amount: payment.amount,
        currency: payment.currency,
        paymentStatus: payment.status,
        payoutStatus: side === 'EARNINGS' ? payoutStatusFromPayment(payment) : 'NOT_APPLICABLE',
        payoutTransferId: payment.stripeTransferId,
        payoutError: payment.payoutError,
        payoutAttemptedAt: payment.payoutAttemptedAt,
        payoutGrossAmount: payment.payoutGrossAmount,
        payoutFeePercent: payment.payoutFeePercent,
        payoutFeeAmount: payment.payoutFeeAmount,
        payoutNetAmount: payment.payoutNetAmount,
        referenceId: order.id,
        createdAt: payment.createdAt || order.createdAt,
      });
    }

    const toServiceRecord = (
      booking: IServiceBooking,
      side: PaymentTab,
      counterparty: { name?: string; email?: string } | undefined
    ): UnifiedRecord | null => {
      if (!booking.deposit?.amount) {
        return null;
      }

      const serviceTitle =
        typeof booking.serviceId === 'string'
          ? 'Service Booking'
          : booking.serviceId?.title || 'Service Booking';

      return {
        id: `service-${booking._id}`,
        source: 'SERVICE',
        side,
        title: serviceTitle,
        counterpartyName: counterparty?.name,
        counterpartyEmail: counterparty?.email,
        amount: booking.deposit.amount,
        currency: booking.deposit.currency || 'LKR',
        paymentStatus: booking.status,
        payoutStatus: side === 'EARNINGS' ? payoutStatusFromBooking(booking) : 'NOT_APPLICABLE',
        payoutTransferId: booking.deposit.stripeTransferId,
        payoutError: booking.deposit.payoutError,
        payoutAttemptedAt: booking.deposit.payoutAttemptedAt,
        payoutGrossAmount: booking.deposit.payoutGrossAmount,
        payoutFeePercent: booking.deposit.payoutFeePercent,
        payoutFeeAmount: booking.deposit.payoutFeeAmount,
        payoutNetAmount: booking.deposit.payoutNetAmount,
        referenceId: booking._id,
        createdAt: booking.deposit.paidAt || booking.createdAt,
      };
    };

    const servicePaid: UnifiedRecord[] = [];
    for (const booking of buyerBookings) {
      const provider = typeof booking.providerId === 'string' ? undefined : booking.providerId;
      const record = toServiceRecord(booking, 'PAID', provider);
      if (record) servicePaid.push(record);
    }

    const serviceEarnings: UnifiedRecord[] = [];
    for (const booking of providerBookings) {
      const buyer = typeof booking.buyerId === 'string' ? undefined : booking.buyerId;
      const record = toServiceRecord(booking, 'EARNINGS', buyer);
      if (record) serviceEarnings.push(record);
    }

    return [...productRecords, ...servicePaid, ...serviceEarnings].sort(
      (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    );
  }, [buyerBookings, currentUserId, orders, paymentByOrderId, providerBookings]);

  const visibleRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return unifiedRecords.filter((record) => {
      if (record.side !== tab) return false;
      if (sourceFilter !== 'ALL' && record.source !== sourceFilter) return false;

      if (!query) return true;

      const searchable = [
        record.title,
        record.paymentStatus,
        record.referenceId,
        record.counterpartyName,
        record.counterpartyEmail,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [searchTerm, sourceFilter, tab, unifiedRecords]);

  const summary = useMemo(() => {
    const paid = unifiedRecords.filter((record) => record.side === 'PAID');
    const earnings = unifiedRecords.filter((record) => record.side === 'EARNINGS');
    const payoutAmount = (record: UnifiedRecord) =>
      typeof record.payoutNetAmount === 'number' ? record.payoutNetAmount : record.amount;

    const totalPaid = paid.reduce((sum, record) => sum + toDisplayLkrAmount(record.amount, record.currency), 0);
    const totalEarnings = earnings.reduce(
      (sum, record) => sum + toDisplayLkrAmount(record.amount, record.currency),
      0
    );
    const pendingPayoutCount = earnings.filter((record) => record.payoutStatus === 'PENDING').length;
    const availablePayout = earnings
      .filter((record) => record.payoutStatus === 'AVAILABLE' || record.payoutStatus === 'PAID_OUT')
      .reduce((sum, record) => sum + toDisplayLkrAmount(payoutAmount(record), record.currency), 0);

    return {
      totalPaid,
      totalEarnings,
      pendingPayoutCount,
      availablePayout,
      totalRecords: unifiedRecords.length,
    };
  }, [unifiedRecords]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">My Payments</h1>
        <p className="mt-1 text-slate-500">
          Clear breakdown of what you paid and what you earned, across products and services.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <p className="text-xs uppercase tracking-wide text-indigo-700">Total Paid</p>
          <p className="mt-1 text-lg font-semibold text-indigo-900">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Total Earnings</p>
          <p className="mt-1 text-lg font-semibold text-emerald-900">{formatCurrency(summary.totalEarnings)}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Payout Pending</p>
          <p className="mt-1 text-lg font-semibold text-amber-900">{summary.pendingPayoutCount}</p>
        </div>
        <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
          <p className="text-xs uppercase tracking-wide text-cyan-700">Payout Available</p>
          <p className="mt-1 text-lg font-semibold text-cyan-900">{formatCurrency(summary.availablePayout)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('PAID')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'PAID' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Payments Made
          </button>
          <button
            type="button"
            onClick={() => setTab('EARNINGS')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              tab === 'EARNINGS'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Earnings & Payouts
          </button>

          <span className="ml-auto rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {summary.totalRecords} total records
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title, reference, or person"
            className="md:col-span-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />

          <select
            value={sourceFilter}
            onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="ALL">All Sources</option>
            <option value="PRODUCT">Products</option>
            <option value="SERVICE">Services</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSourceFilter('ALL');
            }}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <GifLoader size="md" label="Loading payments..." />
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No payment records found for the selected filters.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecords.map((record) => (
              <div key={record.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{record.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Ref #{record.referenceId.slice(-8)} · {formatDateTime(record.createdAt)}
                    </p>
                    {(record.counterpartyName || record.counterpartyEmail) && (
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {record.side === 'PAID' ? 'Paid to' : 'From'} {record.counterpartyName || record.counterpartyEmail}
                      </p>
                    )}
                    {record.side === 'EARNINGS' && record.payoutTransferId && (
                      <p className="mt-1 truncate text-xs text-emerald-700">
                        Transfer: {record.payoutTransferId}
                      </p>
                    )}
                    {record.side === 'EARNINGS' && record.payoutStatus === 'FAILED' && record.payoutError && (
                      <p className="mt-1 text-xs text-rose-600">Payout error: {record.payoutError}</p>
                    )}
                    {record.side === 'EARNINGS' && record.payoutAttemptedAt && (
                      <p className="mt-1 text-xs text-slate-500">
                        Last payout attempt: {formatDateTime(record.payoutAttemptedAt)}
                      </p>
                    )}
                    {record.side === 'EARNINGS' && typeof record.payoutGrossAmount === 'number' && (
                      <p className="mt-1 text-xs text-slate-600">
                        Gross {formatCurrency(record.payoutGrossAmount, record.currency)} · Fee{' '}
                        {typeof record.payoutFeeAmount === 'number'
                          ? formatCurrency(record.payoutFeeAmount, record.currency)
                          : 'N/A'}
                        {typeof record.payoutFeePercent === 'number' ? ` (${record.payoutFeePercent}%)` : ''} · Net{' '}
                        {typeof record.payoutNetAmount === 'number'
                          ? formatCurrency(record.payoutNetAmount, record.currency)
                          : 'N/A'}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-slate-800">{formatCurrency(record.amount, record.currency)}</p>
                    <div className="mt-1 flex items-center justify-end gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        {record.source}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClassByStatus(
                          record.paymentStatus
                        )}`}
                      >
                        {record.paymentStatus}
                      </span>
                      {record.side === 'EARNINGS' && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${badgeClassByStatus(
                            record.payoutStatus
                          )}`}
                        >
                          {record.payoutStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPaymentsPage;
