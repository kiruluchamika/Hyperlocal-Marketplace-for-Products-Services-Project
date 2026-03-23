import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { listingsApi } from '@/api/listings';
import type { DeliveryMethod, OrderStatus } from '@/types/order';
import type { PaymentStatus } from '@/types/payment';
import type { IProductListing } from '@/types/listing';
import { orderManagementApi } from './orders/orderManagementApi';
import OrderStripeCheckoutModal from './orders/OrderStripeCheckoutModal';
import type {
  ManagedOrder,
  ManagedPayment,
  OrderAction,
} from './orders/orderManagementTypes';

const ITEMS_PER_PAGE = 8;
const BUY_NOW_ITEMS_PER_PAGE = 6;

const STATUS_OPTIONS: Array<{ label: string; value: '' | OrderStatus }> = [
  { label: 'All Status', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Accepted', value: 'ACCEPTED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const ACTION_LABELS: Record<OrderAction, string> = {
  CANCEL: 'Cancel Order',
  INITIATE_PAYMENT: 'Pay Now',
  CONFIRM_RECEIVED: 'Confirm Received',
  ACCEPT: 'Accept',
  REJECT: 'Reject',
  START: 'Start Fulfillment',
  COMPLETE_WITH_OTP: 'Confirm Delivery (OTP)',
  MARK_COMPLETED: 'Mark Completed',
  OVERRIDE_STATUS: 'Override Status',
};

const ORDER_STATUS_CLASS: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  ACCEPTED: 'bg-blue-100 text-blue-800 border-blue-200',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
  CANCELLED: 'bg-slate-100 text-slate-700 border-slate-200',
};

const PAYMENT_STATUS_CLASS: Record<PaymentStatus, string> = {
  INITIATED: 'bg-amber-100 text-amber-800 border-amber-200',
  HELD: 'bg-violet-100 text-violet-800 border-violet-200',
  RELEASED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REFUNDED: 'bg-slate-100 text-slate-700 border-slate-200',
  FAILED: 'bg-rose-100 text-rose-800 border-rose-200',
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

const formatCurrency = (amount: number, currency = 'LKR') =>
  `${currency.toUpperCase()} ${amount.toLocaleString()}`;

const isBuyerSide = (order: ManagedOrder, currentUserId: string) =>
  order.buyerId === currentUserId;

type BuyNowRedirectState = {
  source?: string;
  listingId?: string;
  listingTitle?: string;
  quantity?: number;
  deliveryMethod?: DeliveryMethod;
  deliveryAddress?: string;
  note?: string;
};

type PrefillContext = {
  source: 'listing-detail' | 'orders-buy-now-panel';
  listingTitle?: string;
};

const OrderStatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ORDER_STATUS_CLASS[status]}`}
  >
    {status}
  </span>
);

const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_CLASS[status]}`}
  >
    {status}
  </span>
);

const MyOrdersPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?.id ?? '';

  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ManagedOrder | null>(null);
  const [paymentByOrderId, setPaymentByOrderId] = useState<Record<string, ManagedPayment | null>>({});

  const [statusFilter, setStatusFilter] = useState<'' | OrderStatus>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [listError, setListError] = useState('');
  const [buyNowError, setBuyNowError] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);
  const [isBuyNowLoading, setIsBuyNowLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);

  const [listingId, setListingId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');
  const [prefillContext, setPrefillContext] = useState<PrefillContext | null>(null);
  const [recentOrderForPaymentId, setRecentOrderForPaymentId] = useState<string | null>(null);

  const [otpModal, setOtpModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
    otp: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    orderId: null,
    otp: '',
    isSubmitting: false,
  });

  const [buyNowProducts, setBuyNowProducts] = useState<IProductListing[]>([]);
  const [buyNowSearchTerm, setBuyNowSearchTerm] = useState('');
  const [buyNowPage, setBuyNowPage] = useState(1);
  const [buyNowPagination, setBuyNowPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [focusedBuyNowListingId, setFocusedBuyNowListingId] = useState<string | null>(null);
  const [focusedBuyNowProduct, setFocusedBuyNowProduct] = useState<IProductListing | null>(null);
  const [isFocusedBuyNowLoading, setIsFocusedBuyNowLoading] = useState(false);

  const [deliveryDraftMethod, setDeliveryDraftMethod] = useState<DeliveryMethod>('PICKUP');
  const [deliveryDraftAddress, setDeliveryDraftAddress] = useState('');

  const [checkoutState, setCheckoutState] = useState<{
    isOpen: boolean;
    orderId: string | null;
    clientSecret: string | null;
    amount: number;
    currency: string;
  }>({
    isOpen: false,
    orderId: null,
    clientSecret: null,
    amount: 0,
    currency: 'LKR',
  });

  const createOrderSectionRef = useRef<HTMLDivElement | null>(null);
  const listingIdInputRef = useRef<HTMLInputElement | null>(null);
  const hasConsumedRedirectRef = useRef(false);

  const beginOrderWorkflow = useCallback(
    (product: {
      id: string;
      title?: string;
      quantity?: number;
      deliveryMethod?: DeliveryMethod;
      deliveryAddress?: string;
      note?: string;
      source?: PrefillContext['source'];
    }) => {
      setListingId(product.id);
      setQuantity(Math.max(1, product.quantity ?? 1));

      const safeDeliveryMethod =
        product.deliveryMethod === 'DELIVERY' || product.deliveryMethod === 'PICKUP'
          ? product.deliveryMethod
          : 'PICKUP';

      setDeliveryMethod(safeDeliveryMethod);
      setDeliveryAddress(safeDeliveryMethod === 'DELIVERY' ? product.deliveryAddress ?? '' : '');
      setNote(product.note ?? '');
      setPrefillContext(product.source ? { source: product.source, listingTitle: product.title } : null);

      createOrderSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.setTimeout(() => listingIdInputRef.current?.focus(), 250);
      toast.success(
        product.title ? `Order workflow started for ${product.title}.` : 'Order workflow started.'
      );
    },
    []
  );

  const refreshBuyNowProducts = useCallback(
    async (targetPage?: number) => {
      const pageToLoad = targetPage ?? buyNowPage;
      setIsBuyNowLoading(true);
      setBuyNowError('');

      try {
        const { data } = await listingsApi.getAll({
          page: pageToLoad,
          limit: BUY_NOW_ITEMS_PER_PAGE,
          transactionMode: 'BUY_NOW',
          searchTerm: buyNowSearchTerm.trim() || undefined,
        });

        setBuyNowProducts(data.data || []);
        setBuyNowPagination({
          page: data.pagination?.page ?? pageToLoad,
          totalPages: data.pagination?.totalPages ?? 1,
          total: data.pagination?.total ?? (data.data?.length || 0),
        });
      } catch {
        setBuyNowProducts([]);
        setBuyNowError('Unable to load Buy Now products right now.');
      } finally {
        setIsBuyNowLoading(false);
      }
    },
    [buyNowPage, buyNowSearchTerm]
  );

  const fetchPaymentForOrder = useCallback(async (orderId: string) => {
    try {
      const payment = await orderManagementApi.getPaymentByOrder(orderId);
      setPaymentByOrderId((prev) => ({ ...prev, [orderId]: payment }));
      return payment;
    } catch {
      setPaymentByOrderId((prev) => ({ ...prev, [orderId]: null }));
      return null;
    }
  }, []);

  const loadOrderDetails = useCallback(
    async (orderId: string) => {
      setIsDetailsLoading(true);
      try {
        const detailedOrder = await orderManagementApi.getOrderById(orderId);

        setSelectedOrder(detailedOrder);
        setOrders((prev) =>
          prev.map((order) =>
            order.id === detailedOrder.id
              ? { ...order, ...detailedOrder, actionsAllowed: detailedOrder.actionsAllowed }
              : order
          )
        );

        if (detailedOrder.paymentId) {
          await fetchPaymentForOrder(detailedOrder.id);
        } else {
          setPaymentByOrderId((prev) => ({ ...prev, [detailedOrder.id]: null }));
        }
      } catch {
        setSelectedOrder(null);
      } finally {
        setIsDetailsLoading(false);
      }
    },
    [fetchPaymentForOrder]
  );

  const refreshOrders = useCallback(
    async (preferredOrderId?: string) => {
      setIsListLoading(true);
      setListError('');

      try {
        const result = await orderManagementApi.listOrders({
          status: statusFilter || undefined,
          page: 1,
          limit: 100,
        });

        const relevantOrders =
          user?.role === 'admin'
            ? result.orders
            : result.orders.filter(
                (order) => order.buyerId === currentUserId || order.sellerId === currentUserId
              );

        setOrders(relevantOrders);

        setSelectedOrderId((current) => {
          const candidateId = preferredOrderId ?? current;
          if (candidateId && relevantOrders.some((order) => order.id === candidateId)) {
            return candidateId;
          }
          return relevantOrders[0]?.id ?? null;
        });
      } catch {
        setListError('Unable to load orders right now. Please refresh and try again.');
        setOrders([]);
        setSelectedOrderId(null);
        setSelectedOrder(null);
      } finally {
        setIsListLoading(false);
      }
    },
    [currentUserId, statusFilter, user?.role]
  );

  useEffect(() => {
    void refreshOrders();
  }, [refreshOrders]);

  useEffect(() => {
    void refreshBuyNowProducts();
  }, [refreshBuyNowProducts]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    setBuyNowPage(1);
  }, [buyNowSearchTerm]);

  useEffect(() => {
    void refreshBuyNowProducts(buyNowPage);
  }, [buyNowPage, refreshBuyNowProducts]);

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrder(null);
      return;
    }

    void loadOrderDetails(selectedOrderId);
  }, [loadOrderDetails, selectedOrderId]);

  useEffect(() => {
    if (!selectedOrder) return;

    setDeliveryDraftMethod(selectedOrder.deliveryMethod);
    setDeliveryDraftAddress(selectedOrder.deliveryAddress ?? '');
  }, [selectedOrder]);

  useEffect(() => {
    if (hasConsumedRedirectRef.current) {
      return;
    }

    const state = (location.state ?? null) as BuyNowRedirectState | null;
    if (!state || state.source !== 'listing-detail-buy-now' || !state.listingId) {
      return;
    }

    hasConsumedRedirectRef.current = true;

    beginOrderWorkflow({
      id: state.listingId,
      title: state.listingTitle,
      quantity: state.quantity,
      deliveryMethod: state.deliveryMethod,
      deliveryAddress: state.deliveryAddress,
      note: state.note,
      source: 'listing-detail',
    });
    setFocusedBuyNowListingId(state.listingId);

    navigate(location.pathname, { replace: true, state: null });
  }, [beginOrderWorkflow, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!focusedBuyNowListingId) {
      setFocusedBuyNowProduct(null);
      return;
    }

    const existing = buyNowProducts.find((product) => product._id === focusedBuyNowListingId);
    if (existing) {
      setFocusedBuyNowProduct(existing);
      return;
    }

    let mounted = true;
    setIsFocusedBuyNowLoading(true);

    void listingsApi
      .getById(focusedBuyNowListingId)
      .then(({ data }) => {
        if (!mounted) return;
        setFocusedBuyNowProduct(data.data ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setFocusedBuyNowProduct(null);
        setBuyNowError('Unable to load selected Buy Now product.');
      })
      .finally(() => {
        if (!mounted) return;
        setIsFocusedBuyNowLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [buyNowProducts, focusedBuyNowListingId]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      const otherParty = isBuyerSide(order, currentUserId) ? order.seller : order.buyer;
      const searchableValues = [
        order.titleSnapshot,
        order.status,
        order.id,
        otherParty?.name,
        otherParty?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableValues.includes(query);
    });
  }, [currentUserId, orders, searchTerm]);

  const sortedOrders = useMemo(
    () =>
      [...filteredOrders].sort(
        (first, second) =>
          new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      ),
    [filteredOrders]
  );

  const totalPages = Math.max(1, Math.ceil(sortedOrders.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return sortedOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [page, sortedOrders]);

  const selectedFromList = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId]
  );

  const activeOrder =
    selectedOrder && selectedOrder.id === selectedOrderId ? selectedOrder : selectedFromList;

  const activePayment = activeOrder ? paymentByOrderId[activeOrder.id] ?? null : null;

  const orderStats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((order) => order.status === 'PENDING').length;
    const inProgress = orders.filter((order) => order.status === 'IN_PROGRESS').length;
    const completed = orders.filter((order) => order.status === 'COMPLETED').length;

    return { total, pending, inProgress, completed };
  }, [orders]);

  const pollPaymentStatus = useCallback(
    async (orderId: string) => {
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const payment = await fetchPaymentForOrder(orderId);
        if (!payment) {
          await sleep(2000);
          continue;
        }

        if (payment.status !== 'INITIATED') {
          return payment;
        }

        await sleep(2000);
      }

      return null;
    },
    [fetchPaymentForOrder]
  );

  const handleCreateOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!listingId.trim()) {
      toast.error('Listing ID is required.');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantity must be at least 1.');
      return;
    }

    if (deliveryMethod === 'DELIVERY' && deliveryAddress.trim().length < 10) {
      toast.error('Delivery address must be at least 10 characters.');
      return;
    }

    setIsCreatingOrder(true);

    try {
      const created = await orderManagementApi.createOrder({
        listingId: listingId.trim(),
        quantity,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'DELIVERY' ? deliveryAddress.trim() : undefined,
        note: note.trim() || undefined,
      });

      setListingId('');
      setQuantity(1);
      setDeliveryMethod('PICKUP');
      setDeliveryAddress('');
      setNote('');
      setPrefillContext(null);
      setRecentOrderForPaymentId(created.order.id);

      await refreshOrders(created.order.id);
      setSelectedOrderId(created.order.id);
      toast.success('Order created successfully. Continue with payment if required.');
    } catch {
      // Error toast is handled globally by apiClient interceptor.
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const beginOrderFromProduct = (product: IProductListing) => {
    setFocusedBuyNowListingId(null);
    beginOrderWorkflow({
      id: product._id,
      title: product.title,
      quantity: 1,
      deliveryMethod: 'PICKUP',
      source: 'orders-buy-now-panel',
    });
  };

  const resetPrefill = () => {
    setListingId('');
    setQuantity(1);
    setDeliveryMethod('PICKUP');
    setDeliveryAddress('');
    setNote('');
    setPrefillContext(null);
    toast.success('Prefill cleared.');
  };

  const handleOpenOtpModal = (orderId: string) => {
    setOtpModal({ isOpen: true, orderId, otp: '', isSubmitting: false });
  };

  const handleCloseOtpModal = () => {
    if (otpModal.isSubmitting) return;
    setOtpModal({ isOpen: false, orderId: null, otp: '', isSubmitting: false });
  };

  const handleSubmitOtp = async () => {
    if (!otpModal.orderId) return;

    const cleanOtp = otpModal.otp.trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      toast.error('OTP must be exactly 6 digits.');
      return;
    }

    setOtpModal((prev) => ({ ...prev, isSubmitting: true }));

    try {
      await orderManagementApi.confirmDeliveryWithOtp(otpModal.orderId, cleanOtp);
      await refreshOrders(otpModal.orderId);
      await loadOrderDetails(otpModal.orderId);
      setOtpModal({ isOpen: false, orderId: null, otp: '', isSubmitting: false });
      toast.success(`${ACTION_LABELS.COMPLETE_WITH_OTP} completed.`);
    } catch {
      setOtpModal((prev) => ({ ...prev, isSubmitting: false }));
      // Error toast is handled globally by apiClient interceptor.
    }
  };

  const handleSaveDeliveryDetails = async () => {
    if (!activeOrder) return;

    if (deliveryDraftMethod === 'DELIVERY' && deliveryDraftAddress.trim().length < 10) {
      toast.error('Delivery address must be at least 10 characters.');
      return;
    }

    setIsSavingDelivery(true);

    try {
      await orderManagementApi.updateDeliveryDetails(activeOrder.id, {
        deliveryMethod: deliveryDraftMethod,
        deliveryAddress: deliveryDraftMethod === 'DELIVERY' ? deliveryDraftAddress.trim() : undefined,
      });

      await refreshOrders(activeOrder.id);
      await loadOrderDetails(activeOrder.id);
      toast.success('Delivery details updated.');
    } catch {
      // Error toast is handled globally by apiClient interceptor.
    } finally {
      setIsSavingDelivery(false);
    }
  };

  const handleInitiatePayment = async (order: ManagedOrder) => {
    setActiveActionKey(`${order.id}:INITIATE_PAYMENT`);

    try {
      const paymentStart = await orderManagementApi.initiatePayment(order.id);

      setPaymentByOrderId((prev) => ({
        ...prev,
        [order.id]: {
          id: paymentStart.paymentId,
          orderId: order.id,
          amount: paymentStart.amount,
          currency: paymentStart.currency,
          status: paymentStart.status,
        },
      }));

      setCheckoutState({
        isOpen: true,
        orderId: order.id,
        clientSecret: paymentStart.clientSecret,
        amount: paymentStart.amount,
        currency: paymentStart.currency,
      });

      toast.success('Stripe test checkout is ready.');
    } catch {
      // Error toast is handled globally by apiClient interceptor.
    } finally {
      setActiveActionKey(null);
    }
  };

  const runOrderAction = async (order: ManagedOrder, action: OrderAction) => {
    const actionKey = `${order.id}:${action}`;
    setActiveActionKey(actionKey);

    try {
      if (action === 'INITIATE_PAYMENT') {
        await handleInitiatePayment(order);
        return;
      }

      if (action === 'CANCEL') {
        const shouldCancel = window.confirm('Cancel this order? This can only be done while pending.');
        if (!shouldCancel) return;
        const reason = window.prompt('Optional cancellation reason (min 10 chars):') ?? '';
        const cleanReason = reason.trim();
        await orderManagementApi.cancelOrder(order.id, cleanReason.length >= 10 ? cleanReason : undefined);
      }

      if (action === 'CONFIRM_RECEIVED') {
        await orderManagementApi.confirmReceived(order.id);
      }

      if (action === 'ACCEPT') {
        await orderManagementApi.acceptOrder(order.id);
      }

      if (action === 'REJECT') {
        const reason = window.prompt('Optional rejection reason (min 10 chars):') ?? '';
        const cleanReason = reason.trim();
        await orderManagementApi.rejectOrder(order.id, cleanReason.length >= 10 ? cleanReason : undefined);
      }

      if (action === 'START') {
        await orderManagementApi.startOrder(order.id);
      }

      if (action === 'COMPLETE_WITH_OTP') {
        handleOpenOtpModal(order.id);
        return;
      }

      if (action === 'MARK_COMPLETED') {
        toast('Completion without OTP is not exposed by the current backend route set.');
        return;
      }

      if (action === 'OVERRIDE_STATUS') {
        toast('Admin status override is not exposed in this dashboard module.');
        return;
      }

      await refreshOrders(order.id);
      await loadOrderDetails(order.id);

      toast.success(`${ACTION_LABELS[action]} completed.`);
    } catch {
      // Error toast is handled globally by apiClient interceptor.
    } finally {
      setActiveActionKey(null);
    }
  };

  const handleCheckoutSuccess = async () => {
    if (!checkoutState.orderId) return;

    await pollPaymentStatus(checkoutState.orderId);
    await refreshOrders(checkoutState.orderId);
    await loadOrderDetails(checkoutState.orderId);

    toast.success('Payment submitted. Waiting for Stripe webhook confirmation.');
  };

  const visibleActions = (activeOrder?.actionsAllowed ?? []).filter(
    (action) => action !== 'INITIATE_PAYMENT'
  );

  const recentOrderForPayment = useMemo(() => {
    if (!recentOrderForPaymentId) return null;
    return orders.find((order) => order.id === recentOrderForPaymentId) ?? null;
  }, [orders, recentOrderForPaymentId]);

  const canContinuePayment =
    !!recentOrderForPayment && recentOrderForPayment.actionsAllowed.includes('INITIATE_PAYMENT');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Order Management</h1>
        <p className="mt-1 text-slate-500">
          Create orders, track status, manage delivery details, and complete Stripe test payments.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Buy Now Products</h2>
            <p className="mt-1 text-sm text-slate-500">
              {focusedBuyNowListingId
                ? 'Showing only the product selected from listing detail.'
                : 'Only BUY_NOW products are listed here. Click Begin Order to start the order workflow.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {focusedBuyNowListingId && (
              <button
                type="button"
                onClick={() => setFocusedBuyNowListingId(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Show All Products
              </button>
            )}
            <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
              {focusedBuyNowListingId ? '1 product' : `${buyNowPagination.total} products`}
            </span>
          </div>
        </div>

        {!focusedBuyNowListingId && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={buyNowSearchTerm}
              onChange={(event) => setBuyNowSearchTerm(event.target.value)}
              placeholder="Search Buy Now products"
              className="md:col-span-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="button"
              onClick={() => {
                setBuyNowSearchTerm('');
                setBuyNowPage(1);
              }}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Reset
            </button>
          </div>
        )}

        {buyNowError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {buyNowError}
          </div>
        )}

        {!focusedBuyNowListingId && isBuyNowLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        )}

        {focusedBuyNowListingId && isFocusedBuyNowLoading && (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        )}

        {!focusedBuyNowListingId && !isBuyNowLoading && !buyNowError && buyNowProducts.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No BUY_NOW products found.
          </div>
        )}

        {focusedBuyNowListingId && !isFocusedBuyNowLoading && focusedBuyNowProduct && (
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4">
              <p className="font-semibold text-slate-800 truncate">{focusedBuyNowProduct.title}</p>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{focusedBuyNowProduct.description}</p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-800">
                  {formatCurrency(focusedBuyNowProduct.price, focusedBuyNowProduct.currency)}
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  BUY_NOW
                </span>
              </div>
              <button
                type="button"
                onClick={() => beginOrderFromProduct(focusedBuyNowProduct)}
                className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-primary-700 hover:to-indigo-700"
              >
                Begin Order
              </button>
            </div>
          </div>
        )}

        {!focusedBuyNowListingId && !isBuyNowLoading && buyNowProducts.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {buyNowProducts.map((product) => (
                <div key={product._id} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-800 truncate">{product.title}</p>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-[2.25rem]">{product.description}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-800">{formatCurrency(product.price, product.currency)}</span>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      BUY_NOW
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => beginOrderFromProduct(product)}
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-primary-700 hover:to-indigo-700"
                  >
                    Begin Order
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setBuyNowPage((prev) => Math.max(1, prev - 1))}
                disabled={buyNowPage <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {buyNowPage} of {Math.max(1, buyNowPagination.totalPages)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setBuyNowPage((prev) => Math.min(Math.max(1, buyNowPagination.totalPages), prev + 1))
                }
                disabled={buyNowPage >= Math.max(1, buyNowPagination.totalPages)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      <div ref={createOrderSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleCreateOrder} className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Create Order</h2>
          <p className="mt-1 text-sm text-slate-500">Use this panel to create a new product order.</p>

          {prefillContext && (
            <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-primary-800">
                  Prefilled from {prefillContext.source === 'listing-detail' ? 'listing detail' : 'Buy Now panel'}
                  {prefillContext.listingTitle ? `: ${prefillContext.listingTitle}` : ''}
                </p>
                <button
                  type="button"
                  onClick={resetPrefill}
                  className="rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100"
                >
                  Clear Prefill
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Listing ID</label>
              <input
                ref={listingIdInputRef}
                value={listingId}
                onChange={(event) => setListingId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="Enter listing ObjectId"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Math.max(1, Number(event.target.value || 1)))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Method</label>
              <select
                value={deliveryMethod}
                onChange={(event) => setDeliveryMethod(event.target.value as DeliveryMethod)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="PICKUP">Pickup</option>
                <option value="DELIVERY">Delivery</option>
              </select>
            </div>

            {deliveryMethod === 'DELIVERY' && (
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Delivery Address</label>
                <input
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                  placeholder="Full address (min 10 chars)"
                  required
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Note (Optional)</label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder="Add a note for the seller"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              disabled={isCreatingOrder}
              className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/20 hover:from-primary-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCreatingOrder ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Quick Stats</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <span className="text-slate-600">Total Orders</span>
              <span className="font-semibold text-slate-800">{orderStats.total}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3">
              <span className="text-amber-700">Pending</span>
              <span className="font-semibold text-amber-800">{orderStats.pending}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-3">
              <span className="text-indigo-700">In Progress</span>
              <span className="font-semibold text-indigo-800">{orderStats.inProgress}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3">
              <span className="text-emerald-700">Completed</span>
              <span className="font-semibold text-emerald-800">{orderStats.completed}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search by title, order ID, status, or user"
            className="md:col-span-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as '' | OrderStatus)}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || 'ALL'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {listError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {listError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-card">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-800">Orders</h3>
            <p className="text-xs text-slate-500 mt-1">
              Showing {paginatedOrders.length} of {sortedOrders.length} matching orders
            </p>
          </div>

          <div className="max-h-[760px] overflow-y-auto p-4 space-y-3">
            {isListLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
              </div>
            )}

            {!isListLoading && paginatedOrders.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No orders match your current filters.
              </div>
            )}

            {!isListLoading &&
              paginatedOrders.map((order) => {
                const selected = order.id === selectedOrderId;
                const otherParty = isBuyerSide(order, currentUserId) ? order.seller : order.buyer;
                const roleLabel = isBuyerSide(order, currentUserId) ? 'Buyer View' : 'Seller View';

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selected
                        ? 'border-primary-300 bg-primary-50/60 shadow-md shadow-primary-500/10'
                        : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-primary-50/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{order.titleSnapshot || 'Untitled Order'}</p>
                        <p className="mt-1 text-xs text-slate-500">#{order.id.slice(-8)}</p>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{formatCurrency(order.totalAmount)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {roleLabel}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-500 truncate">
                      {otherParty?.name || 'Unknown party'} · {formatDateTime(order.createdAt)}
                    </p>
                  </button>
                );
              })}
          </div>

          <div className="border-t border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-6">
          {!activeOrder && !isDetailsLoading && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Select an order to view details and manage actions.
            </div>
          )}

          {isDetailsLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            </div>
          )}

          {activeOrder && !isDetailsLoading && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-800">{activeOrder.titleSnapshot}</h3>
                  <p className="text-sm text-slate-500 mt-1">Order #{activeOrder.id}</p>
                </div>
                <OrderStatusBadge status={activeOrder.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Buyer</p>
                  <p className="mt-1 font-medium text-slate-800">{activeOrder.buyer?.name || 'N/A'}</p>
                  <p className="text-slate-500">{activeOrder.buyer?.email || 'N/A'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Seller</p>
                  <p className="mt-1 font-medium text-slate-800">{activeOrder.seller?.name || 'N/A'}</p>
                  <p className="text-slate-500">{activeOrder.seller?.email || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Quantity</p>
                  <p className="font-semibold text-slate-800">{activeOrder.quantity}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Unit Price</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(activeOrder.unitPriceSnapshot)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="font-semibold text-slate-800">{formatCurrency(activeOrder.totalAmount)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">Delivery</p>
                <p className="mt-2 text-sm text-slate-600">Method: {activeOrder.deliveryMethod}</p>
                {activeOrder.deliveryMethod === 'DELIVERY' && (
                  <p className="text-sm text-slate-600">Address: {activeOrder.deliveryAddress || 'N/A'}</p>
                )}
                {activeOrder.deliveryMethod === 'PICKUP' && (
                  <p className="text-sm text-slate-600">
                    Pickup Location: {activeOrder.pickupLocationSnapshot || 'N/A'}
                  </p>
                )}
                {activeOrder.note && (
                  <p className="mt-2 text-sm text-slate-600">Note: {activeOrder.note}</p>
                )}
                <p className="mt-2 text-xs text-slate-500">Updated: {formatDateTime(activeOrder.updatedAt)}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Payment</p>
                  {activePayment?.status && <PaymentStatusBadge status={activePayment.status} />}
                </div>

                {!activePayment && (
                  <p className="text-sm text-slate-500">No payment record found for this order yet.</p>
                )}

                {activePayment && (
                  <div className="text-sm text-slate-600 space-y-1">
                    <p>Amount: {formatCurrency(activePayment.amount, activePayment.currency)}</p>
                    {activePayment.providerPaymentId && (
                      <p className="truncate">Stripe Intent: {activePayment.providerPaymentId}</p>
                    )}
                  </div>
                )}

                {activeOrder.actionsAllowed.includes('INITIATE_PAYMENT') && (
                  <button
                    type="button"
                    onClick={() => void handleInitiatePayment(activeOrder)}
                    disabled={activeActionKey === `${activeOrder.id}:INITIATE_PAYMENT`}
                    className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/20 hover:from-primary-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {activeActionKey === `${activeOrder.id}:INITIATE_PAYMENT`
                      ? 'Preparing Checkout...'
                      : 'Pay with Stripe (Test)'}
                  </button>
                )}
              </div>

              {isBuyerSide(activeOrder, currentUserId) && activeOrder.status === 'PENDING' && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Update Delivery Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      value={deliveryDraftMethod}
                      onChange={(event) => setDeliveryDraftMethod(event.target.value as DeliveryMethod)}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                    >
                      <option value="PICKUP">Pickup</option>
                      <option value="DELIVERY">Delivery</option>
                    </select>

                    {deliveryDraftMethod === 'DELIVERY' && (
                      <input
                        value={deliveryDraftAddress}
                        onChange={(event) => setDeliveryDraftAddress(event.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        placeholder="Delivery address"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleSaveDeliveryDetails()}
                    disabled={isSavingDelivery}
                    className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 hover:bg-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingDelivery ? 'Saving...' : 'Save Delivery Details'}
                  </button>
                </div>
              )}

              {visibleActions.length > 0 && (
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-800">Available Actions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visibleActions.map((action) => {
                      const key = `${activeOrder.id}:${action}`;
                      const isBusy = activeActionKey === key;
                      const dangerAction = action === 'CANCEL' || action === 'REJECT';

                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => void runOrderAction(activeOrder, action)}
                          disabled={isBusy}
                          className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            dangerAction
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isBusy ? 'Working...' : ACTION_LABELS[action]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <OrderStripeCheckoutModal
        isOpen={checkoutState.isOpen}
        clientSecret={checkoutState.clientSecret}
        amount={checkoutState.amount}
        currency={checkoutState.currency}
        onClose={() =>
          setCheckoutState({
            isOpen: false,
            orderId: null,
            clientSecret: null,
            amount: 0,
            currency: 'LKR',
          })
        }
        onSuccess={handleCheckoutSuccess}
      />

      {recentOrderForPayment && (
        <div className="fixed bottom-4 right-4 left-4 z-40 mx-auto max-w-3xl rounded-2xl border border-primary-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Order created successfully</p>
              <p className="text-xs text-slate-500">
                {canContinuePayment
                  ? `Order #${recentOrderForPayment.id.slice(-8)} is ready for payment.`
                  : `Order #${recentOrderForPayment.id.slice(-8)} created. Waiting for the next available step.`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canContinuePayment && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrderId(recentOrderForPayment.id);
                    void handleInitiatePayment(recentOrderForPayment);
                  }}
                  className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-primary-500/20 hover:from-primary-700 hover:to-indigo-700"
                >
                  Continue to Payment
                </button>
              )}

              <button
                type="button"
                onClick={() => setRecentOrderForPaymentId(null)}
                className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Dismiss payment prompt"
              >
                <FiX size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {otpModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800">Confirm Delivery With OTP</h3>
            <p className="mt-1 text-sm text-slate-500">
              Ask the buyer for the 6-digit OTP and enter it below.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">OTP Code</label>
              <input
                value={otpModal.otp}
                onChange={(event) => setOtpModal((prev) => ({ ...prev, otp: event.target.value }))}
                inputMode="numeric"
                maxLength={6}
                placeholder="Enter 6 digits"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseOtpModal}
                disabled={otpModal.isSubmitting}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitOtp()}
                disabled={otpModal.isSubmitting}
                className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-primary-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {otpModal.isSubmitting ? 'Verifying...' : 'Confirm OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersPage;
