import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiPackage, FiX } from 'react-icons/fi';
import { useAuthStore } from '@/store/authStore';
import { useSiteSettingsStore } from '@/store/siteSettingsStore';
import { listingsApi } from '@/api/listings';
import GifLoader from '@/components/ui/GifLoader';
import type { DeliveryMethod, OrderStatus } from '@/types/order';
import type { PaymentStatus } from '@/types/payment';
import type { IProductListing } from '@/types/listing';
import { formatCurrency } from '@/utils/listings';
import { orderManagementApi } from './orders/orderManagementApi';
import OrderStripeCheckoutModal from './orders/OrderStripeCheckoutModal';
import type {
  ManagedOrder,
  ManagedPayment,
  OrderAction,
} from './orders/orderManagementTypes';

const ITEMS_PER_PAGE = 8;
const PRODUCT_ITEMS_PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 400;
const RECENT_SEARCH_KEY = 'orders.product.recentSearches';
const MAX_RECENT_SEARCHES = 6;

const TRENDING_SEARCHES = ['iphone', 'samsung', 'laptop', 'headphones', 'sofa', 'bike'];

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
  CONFIRM_RECEIVED_WITH_OTP: 'Confirm Received (OTP)',
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

const ORDER_JOURNEY: Array<{ status: OrderStatus; label: string }> = [
  { status: 'PENDING', label: 'Requested' },
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'IN_PROGRESS', label: 'In Progress' },
  { status: 'COMPLETED', label: 'Completed' },
];

const ORDER_JOURNEY_ICON: Record<OrderStatus, React.ComponentType<{ size?: number }>> = {
  PENDING: FiClock,
  ACCEPTED: FiCheckCircle,
  IN_PROGRESS: FiPackage,
  COMPLETED: FiCheckCircle,
  REJECTED: FiX,
  CANCELLED: FiX,
};

const getPrimaryAction = (actions: OrderAction[]): OrderAction | null => {
  const priority: OrderAction[] = [
    'INITIATE_PAYMENT',
    'CONFIRM_RECEIVED_WITH_OTP',
    'ACCEPT',
    'START',
    'COMPLETE_WITH_OTP',
    'CONFIRM_RECEIVED',
    'CANCEL',
    'REJECT',
  ];

  for (const action of priority) {
    if (actions.includes(action)) {
      return action;
    }
  }

  return actions[0] ?? null;
};

const uniqueStrings = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

const normalizeText = (value: string) => value.trim().toLowerCase();

const levenshteinDistance = (first: string, second: string) => {
  const a = normalizeText(first);
  const b = normalizeText(second);

  if (!a) return b.length;
  if (!b) return a.length;

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, () => 0)
  );

  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
};

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
  source: 'listing-detail' | 'orders-page-selector';
  listingTitle?: string;
};

type OrderView = 'BUYING' | 'SELLING';

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
  const runtimeSettings = useSiteSettingsStore((state) => state.settings);
  const currentUserId = user?.id ?? '';

  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ManagedOrder | null>(null);
  const [paymentByOrderId, setPaymentByOrderId] = useState<Record<string, ManagedPayment | null>>({});

  const [statusFilter, setStatusFilter] = useState<'' | OrderStatus>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [orderView, setOrderView] = useState<OrderView>('BUYING');

  const [listError, setListError] = useState('');
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [isSavingDelivery, setIsSavingDelivery] = useState(false);
  const [activeActionKey, setActiveActionKey] = useState<string | null>(null);

  const [listingId, setListingId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<IProductListing | null>(null);
  const [previewProduct, setPreviewProduct] = useState<IProductListing | null>(null);
  const [productSearchInput, setProductSearchInput] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [products, setProducts] = useState<IProductListing[]>([]);
  const [productDiscoveryPool, setProductDiscoveryPool] = useState<IProductListing[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productPagination, setProductPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedSuggestionIndex, setHighlightedSuggestionIndex] = useState(0);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [note, setNote] = useState('');
  const [prefillContext, setPrefillContext] = useState<PrefillContext | null>(null);
  const [recentOrderForPaymentId, setRecentOrderForPaymentId] = useState<string | null>(null);

  const [otpModal, setOtpModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
    mode: 'BUYER_CONFIRM' | 'SELLER_CONFIRM';
    otp: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    orderId: null,
    mode: 'BUYER_CONFIRM',
    otp: '',
    isSubmitting: false,
  });

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
  const productsListSectionRef = useRef<HTMLDivElement | null>(null);
  const hasConsumedRedirectRef = useRef(false);

  const preferredCity = useMemo(() => user?.address?.city?.trim() || '', [user?.address?.city]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProductSearchTerm(productSearchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [productSearchInput]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(RECENT_SEARCH_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const saveRecentSearch = useCallback((term: string) => {
    const clean = term.trim();
    if (!clean) return;

    setRecentSearches((prev) => {
      const next = uniqueStrings([clean, ...prev]).slice(0, MAX_RECENT_SEARCHES);
      try {
        window.localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      } catch {
        // ignore storage errors in private mode
      }
      return next;
    });
  }, []);

  const categoryChipOptions = useMemo(() => {
    const categories = productDiscoveryPool
      .map((product) => {
        if (typeof product.categoryId === 'string') {
          return { id: product.categoryId, label: 'Category' };
        }

        return {
          id: product.categoryId?._id || '',
          label: product.categoryId?.name || 'Category',
        };
      })
      .filter((entry) => entry.id);

    const seen = new Set<string>();
    return categories.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }, [productDiscoveryPool]);

  const suggestionOptions = useMemo(() => {
    const query = normalizeText(productSearchInput);
    if (!query) {
      return uniqueStrings([...recentSearches, ...TRENDING_SEARCHES]).slice(0, 8);
    }

    const titleCandidates = productDiscoveryPool.map((product) => product.title);
    const pool = uniqueStrings([...recentSearches, ...TRENDING_SEARCHES, ...titleCandidates]);

    return pool
      .filter((term) => normalizeText(term).includes(query))
      .sort((first, second) => {
        const firstStarts = normalizeText(first).startsWith(query) ? 0 : 1;
        const secondStarts = normalizeText(second).startsWith(query) ? 0 : 1;
        return firstStarts - secondStarts;
      })
      .slice(0, 8);
  }, [productDiscoveryPool, productSearchInput, recentSearches]);

  const getSellerDisplay = useCallback((product: IProductListing) => {
    if (typeof product.ownerId === 'string') {
      return 'Seller';
    }

    return product.ownerId?.name || product.ownerId?.email || 'Seller';
  }, []);

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
      toast.success(
        product.title ? `Order workflow started for ${product.title}.` : 'Order workflow started.'
      );
    },
    []
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

  const loadProducts = useCallback(async () => {
    setIsProductsLoading(true);
    setProductsError('');
    setDidYouMean(null);

    try {
      const { data } = await listingsApi.getAll({
        page: productPage,
        limit: PRODUCT_ITEMS_PER_PAGE,
        searchTerm: productSearchTerm.trim() || undefined,
        transactionMode: 'BUY_NOW',
        categoryId: selectedCategoryId || undefined,
        city: preferredCity || undefined,
      });

      const visibleProducts = (data.data || []).filter((product) => {
        if (!currentUserId) {
          return true;
        }

        if (typeof product.ownerId === 'string') {
          return product.ownerId !== currentUserId;
        }

        return product.ownerId?._id !== currentUserId && product.ownerId?.id !== currentUserId;
      });

      setProducts(visibleProducts);
      setProductPagination({
        page: data.pagination?.page ?? productPage,
        totalPages: Math.max(1, data.pagination?.totalPages ?? 1),
        total: data.pagination?.total ?? visibleProducts.length,
      });

      if (!productDiscoveryPool.length) {
        const fallback = await listingsApi.getAll({
          page: 1,
          limit: 60,
          transactionMode: 'BUY_NOW',
        });

        setProductDiscoveryPool(fallback.data.data || []);
      }

      if (productSearchTerm && visibleProducts.length === 0) {
        const candidateTitles = uniqueStrings(
          productDiscoveryPool.length
            ? productDiscoveryPool.map((product) => product.title)
            : (data.data || []).map((product) => product.title)
        );

        if (candidateTitles.length > 0) {
          const ranked = candidateTitles
            .map((title) => ({
              title,
              distance: levenshteinDistance(productSearchTerm, title),
            }))
            .sort((first, second) => first.distance - second.distance);

          if (ranked[0] && ranked[0].distance <= 4) {
            setDidYouMean(ranked[0].title);
          }
        }
      }
    } catch {
      setProducts([]);
      setProductPagination({ page: 1, totalPages: 1, total: 0 });
      setProductsError('Unable to load products right now. Please try again.');
    } finally {
      setIsProductsLoading(false);
    }
  }, [
    currentUserId,
    productDiscoveryPool,
    productPage,
    productSearchTerm,
    preferredCity,
    selectedCategoryId,
  ]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    setProductPage(1);
  }, [productSearchTerm, selectedCategoryId]);

  useEffect(() => {
    setHighlightedSuggestionIndex(0);
  }, [suggestionOptions]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    setStatusFilter('');
    setSearchTerm('');
    setPage(1);
  }, [orderView]);

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

    navigate(location.pathname, { replace: true, state: null });
  }, [beginOrderWorkflow, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!listingId.trim()) {
      setSelectedProduct(null);
      return;
    }

    if (selectedProduct?._id === listingId) {
      return;
    }

    let mounted = true;

    void listingsApi
      .getById(listingId)
      .then(({ data }) => {
        if (!mounted) return;
        setSelectedProduct(data.data ?? null);
      })
      .catch(() => {
        if (!mounted) return;
        setSelectedProduct(null);
      });

    return () => {
      mounted = false;
    };
  }, [listingId, selectedProduct?._id]);

  const handleSelectProduct = (product: IProductListing) => {
    setSelectedProduct(product);
    setPreviewProduct(null);
    saveRecentSearch(product.title);
    beginOrderWorkflow({
      id: product._id,
      title: product.title,
      quantity: 1,
      deliveryMethod: 'PICKUP',
      source: 'orders-page-selector',
    });
  };

  const handleOpenProductPreview = (product: IProductListing) => {
    setPreviewProduct(product);
  };

  const handleCloseProductPreview = () => {
    setPreviewProduct(null);
  };

  const handleViewAvailableProducts = () => {
    setProductSearchInput('');
    setProductPage(1);
    setSelectedCategoryId('');
    setDidYouMean(null);
    setShowSuggestions(false);

    window.setTimeout(() => {
      productsListSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  };

  const applySearchTerm = (term: string) => {
    setProductSearchInput(term);
    setShowSuggestions(false);
    setHighlightedSuggestionIndex(0);
    saveRecentSearch(term);
  };

  const handleProductSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestionOptions.length === 0) {
      if (event.key === 'Enter' && productSearchInput.trim()) {
        saveRecentSearch(productSearchInput.trim());
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) => Math.min(suggestionOptions.length - 1, prev + 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedSuggestionIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selectedSuggestion = suggestionOptions[highlightedSuggestionIndex] || suggestionOptions[0];
      if (selectedSuggestion) {
        applySearchTerm(selectedSuggestion);
      }
      return;
    }

    if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const viewScopedOrders = useMemo(() => {
    if (!currentUserId) {
      return [];
    }

    if (orderView === 'BUYING') {
      return orders.filter((order) => order.buyerId === currentUserId);
    }

    return orders.filter((order) => order.sellerId === currentUserId);
  }, [currentUserId, orderView, orders]);

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return viewScopedOrders;
    }

    return viewScopedOrders.filter((order) => {
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
  }, [currentUserId, searchTerm, viewScopedOrders]);

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

  useEffect(() => {
    setSelectedOrderId((current) => {
      if (current && sortedOrders.some((order) => order.id === current)) {
        return current;
      }

      return sortedOrders[0]?.id ?? null;
    });
  }, [sortedOrders]);

  const selectedFromList = useMemo(
    () => sortedOrders.find((order) => order.id === selectedOrderId) ?? null,
    [sortedOrders, selectedOrderId]
  );

  const activeOrder =
    selectedOrder && selectedOrder.id === selectedOrderId ? selectedOrder : selectedFromList;

  const activePayment = activeOrder ? paymentByOrderId[activeOrder.id] ?? null : null;

  const orderStats = useMemo(() => {
    const total = viewScopedOrders.length;
    const pending = viewScopedOrders.filter((order) => order.status === 'PENDING').length;
    const inProgress = viewScopedOrders.filter((order) => order.status === 'IN_PROGRESS').length;
    const completed = viewScopedOrders.filter((order) => order.status === 'COMPLETED').length;

    return { total, pending, inProgress, completed };
  }, [viewScopedOrders]);

  const actionMetrics = useMemo(() => {
    const actionNeeded = viewScopedOrders.filter((order) => order.actionsAllowed.length > 0).length;
    const awaitingPayment = viewScopedOrders.filter((order) =>
      order.actionsAllowed.includes('INITIATE_PAYMENT')
    ).length;
    const recentlyUpdated = viewScopedOrders.filter((order) => {
      const updatedAt = new Date(order.updatedAt).getTime();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return updatedAt >= oneDayAgo;
    }).length;

    return { actionNeeded, awaitingPayment, recentlyUpdated };
  }, [viewScopedOrders]);

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

    if (!selectedProduct || !listingId.trim()) {
      toast.error('Select a product to start your order.');
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

  const resetPrefill = () => {
    setListingId('');
    setSelectedProduct(null);
    setQuantity(1);
    setDeliveryMethod('PICKUP');
    setDeliveryAddress('');
    setNote('');
    setPrefillContext(null);
    toast.success('Prefill cleared.');
  };

  const handleOpenOtpModal = (orderId: string, mode: 'BUYER_CONFIRM' | 'SELLER_CONFIRM') => {
    setOtpModal({ isOpen: true, orderId, mode, otp: '', isSubmitting: false });
  };

  const handleCloseOtpModal = () => {
    if (otpModal.isSubmitting) return;
    setOtpModal({ isOpen: false, orderId: null, mode: 'BUYER_CONFIRM', otp: '', isSubmitting: false });
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
      if (otpModal.mode === 'BUYER_CONFIRM') {
        await orderManagementApi.confirmReceivedWithOtp(otpModal.orderId, cleanOtp);
      } else {
        await orderManagementApi.confirmDeliveryWithOtp(otpModal.orderId, cleanOtp);
      }

      await refreshOrders(otpModal.orderId);
      await loadOrderDetails(otpModal.orderId);
      setOtpModal({ isOpen: false, orderId: null, mode: 'BUYER_CONFIRM', otp: '', isSubmitting: false });

      const successAction =
        otpModal.mode === 'BUYER_CONFIRM' ? 'CONFIRM_RECEIVED_WITH_OTP' : 'COMPLETE_WITH_OTP';
      toast.success(`${ACTION_LABELS[successAction]} completed.`);
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
    if (!runtimeSettings.paymentsEnabled) {
      toast.error(runtimeSettings.paymentsDisabledMessage);
      return;
    }

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

      if (action === 'CONFIRM_RECEIVED_WITH_OTP') {
        handleOpenOtpModal(order.id, 'BUYER_CONFIRM');
        return;
      }

      if (action === 'COMPLETE_WITH_OTP') {
        handleOpenOtpModal(order.id, 'SELLER_CONFIRM');
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

  const handleCheckoutSuccess = async (paymentIntentId?: string) => {
    if (!checkoutState.orderId) return;

    try {
      await orderManagementApi.confirmPayment(checkoutState.orderId, paymentIntentId);
    } catch {
      // Fallback to polling/webhook path if confirm endpoint fails.
    }

    await pollPaymentStatus(checkoutState.orderId);
    await refreshOrders(checkoutState.orderId);
    await loadOrderDetails(checkoutState.orderId);

    toast.success('Payment confirmed and moved to HELD.');
  };

  const visibleActions = (activeOrder?.actionsAllowed ?? []).filter(
    (action) => action !== 'INITIATE_PAYMENT'
  );

  const sellerWaitingForBuyerOtp =
    !!activeOrder &&
    !isBuyerSide(activeOrder, currentUserId) &&
    activeOrder.status === 'IN_PROGRESS' &&
    !visibleActions.includes('COMPLETE_WITH_OTP') &&
    !visibleActions.includes('MARK_COMPLETED');

  const recentOrderForPayment = useMemo(() => {
    if (!recentOrderForPaymentId) return null;
    return orders.find((order) => order.id === recentOrderForPaymentId) ?? null;
  }, [orders, recentOrderForPaymentId]);

  const canContinuePayment =
    !!recentOrderForPayment &&
    runtimeSettings.paymentsEnabled &&
    recentOrderForPayment.actionsAllowed.includes('INITIATE_PAYMENT');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-7 shadow-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-20 h-56 w-56 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">Marketplace Workspace</p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Order Management</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">
              Track purchases and sales, act on priority tasks, and complete payments with confidence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {orderView === 'BUYING' ? 'My Purchases' : 'Sales'}
            </span>
            <span className="rounded-full border border-amber-300/40 bg-amber-300/20 px-3 py-1 text-xs font-semibold text-amber-100">
              {actionMetrics.actionNeeded} Action Needed
            </span>
            {preferredCity && (
              <span className="rounded-full border border-cyan-300/40 bg-cyan-300/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                Near {preferredCity}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current View</p>
          <p className="mt-2 text-lg font-semibold text-slate-800">
            {orderView === 'BUYING' ? 'My Purchases' : 'Sales'}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Action Needed</p>
          <p className="mt-2 text-2xl font-bold text-amber-800">{actionMetrics.actionNeeded}</p>
        </div>
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Awaiting Payment</p>
          <p className="mt-2 text-2xl font-bold text-indigo-800">{actionMetrics.awaitingPayment}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Updated In 24h</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800">{actionMetrics.recentlyUpdated}</p>
        </div>
      </div>

      <div ref={productsListSectionRef} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Start With A Product</h2>
            <p className="mt-1 text-sm text-slate-500">
              Search products and select one to auto-fill order details.
              {preferredCity ? ` Showing results near ${preferredCity}.` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleViewAvailableProducts}
            className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            View Products ({productPagination.total})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3 relative">
            <input
              value={productSearchInput}
              onChange={(event) => {
                setProductSearchInput(event.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => setShowSuggestions(false), 120);
              }}
              onKeyDown={handleProductSearchKeyDown}
              placeholder="Search products by title, category, or keyword"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-all focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />

            {showSuggestions && suggestionOptions.length > 0 && (
              <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                {suggestionOptions.map((suggestion, index) => (
                  <button
                    key={`${suggestion}-${index}`}
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      applySearchTerm(suggestion);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      highlightedSuggestionIndex === index
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              setProductSearchInput('');
              setProductPage(1);
              setSelectedCategoryId('');
            }}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Reset
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent</span>
            {recentSearches.length === 0 && <span className="text-xs text-slate-400">No recent searches</span>}
            {recentSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => applySearchTerm(term)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                {term}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trending</span>
            {TRENDING_SEARCHES.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => applySearchTerm(term)}
                className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                {term}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
            <button
              type="button"
              onClick={() => setSelectedCategoryId('')}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                !selectedCategoryId
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              All
            </button>
            {categoryChipOptions.slice(0, 8).map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategoryId(category.id)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  selectedCategoryId === category.id
                    ? 'border-primary-300 bg-primary-50 text-primary-700'
                    : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {didYouMean && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Did you mean{' '}
            <button
              type="button"
              onClick={() => applySearchTerm(didYouMean)}
              className="font-semibold underline decoration-amber-400 underline-offset-2"
            >
              {didYouMean}
            </button>
            ?
          </div>
        )}

        {productsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {productsError}
          </div>
        )}

        {isProductsLoading && (
          <div className="flex items-center justify-center py-10">
            <GifLoader size="md" label="Loading products..." />
          </div>
        )}

        {!isProductsLoading && !productsError && products.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No products found. Try another search term.
          </div>
        )}

        {!isProductsLoading && products.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {products.map((product) => {
                const isSelected = selectedProduct?._id === product._id;

                return (
                  <div
                    key={product._id}
                    onClick={() => handleOpenProductPreview(product)}
                    className={`rounded-xl border p-4 ${
                      isSelected
                        ? 'border-primary-300 bg-primary-50/60 shadow-md shadow-primary-500/10'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p className="truncate font-semibold text-slate-800">{product.title}</p>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-[2.25rem]">{product.description}</p>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="font-semibold text-slate-800">{formatCurrency(product.price, product.currency)}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {getSellerDisplay(product)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenProductPreview(product);
                      }}
                      className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      View Product
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleSelectProduct(product);
                      }}
                      className={`mt-3 w-full rounded-xl px-4 py-2 text-sm font-semibold ${
                        isSelected
                          ? 'bg-primary-700 text-white'
                          : 'bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:from-primary-700 hover:to-indigo-700'
                      }`}
                    >
                      {isSelected ? 'Selected' : 'Select Product'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setProductPage((prev) => Math.max(1, prev - 1))}
                disabled={productPage <= 1}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page {productPagination.page} of {Math.max(1, productPagination.totalPages)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setProductPage((prev) => Math.min(Math.max(1, productPagination.totalPages), prev + 1))
                }
                disabled={productPage >= Math.max(1, productPagination.totalPages)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {previewProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">{previewProduct.title}</h3>
                <p className="mt-1 text-sm text-slate-500">Seller: {getSellerDisplay(previewProduct)}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseProductPreview}
                className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close product preview"
              >
                <FiX size={16} />
              </button>
            </div>

            {previewProduct.images?.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={previewProduct.images[0]}
                  alt={previewProduct.title}
                  className="h-56 w-full object-cover"
                />
              </div>
            )}

            <p className="mt-4 text-sm text-slate-600">{previewProduct.description}</p>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-sm">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Price</p>
                <p className="font-semibold text-slate-800">
                  {formatCurrency(previewProduct.price, previewProduct.currency)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Category</p>
                <p className="font-semibold text-slate-800">
                  {typeof previewProduct.categoryId === 'string'
                    ? 'Category'
                    : previewProduct.categoryId?.name || 'Category'}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Location</p>
                <p className="font-semibold text-slate-800">{previewProduct.location?.city || 'N/A'}</p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseProductPreview}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleSelectProduct(previewProduct)}
                className="rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-primary-700 hover:to-indigo-700"
              >
                Select Product
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={createOrderSectionRef} className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleCreateOrder} className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-slate-800">Create Order</h2>
          <p className="mt-1 text-sm text-slate-500">Create an order from your selected product.</p>

          {prefillContext && (
            <div className="mt-4 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-primary-800">
                  Prefilled from {prefillContext.source === 'listing-detail' ? 'listing detail' : 'orders page selector'}
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

          {!selectedProduct && (
            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
              Select a product to start your order.
            </div>
          )}

          {selectedProduct && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Selected Product</p>
              <p className="mt-1 font-semibold text-slate-800">{selectedProduct.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>{formatCurrency(selectedProduct.price, selectedProduct.currency)}</span>
                <span>Seller: {getSellerDisplay(selectedProduct)}</span>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              disabled={isCreatingOrder || !selectedProduct}
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
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setOrderView('BUYING')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              orderView === 'BUYING'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            My Purchases
          </button>
          <button
            type="button"
            onClick={() => setOrderView('SELLING')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              orderView === 'SELLING'
                ? 'bg-primary-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Sales
          </button>
        </div>

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
            <h3 className="font-semibold text-slate-800">
              {orderView === 'BUYING' ? 'My Purchases' : 'Sales'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Showing {paginatedOrders.length} of {sortedOrders.length} matching orders
            </p>
          </div>

          <div className="max-h-[760px] overflow-y-auto p-4 space-y-3">
            {isListLoading && (
              <div className="flex items-center justify-center py-12">
                <GifLoader size="md" label="Loading orders..." />
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
                const roleLabel = isBuyerSide(order, currentUserId) ? 'You are Buyer' : 'You are Seller';
                const primaryAction = getPrimaryAction(order.actionsAllowed);

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

                    {primaryAction && (
                      <div className="mt-2 inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700">
                        Next: {ACTION_LABELS[primaryAction]}
                      </div>
                    )}
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
              <GifLoader size="md" label="Loading order details..." />
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

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-sm font-semibold text-slate-800">Order Journey</p>
                {(activeOrder.status === 'REJECTED' || activeOrder.status === 'CANCELLED') ? (
                  <p className="mt-2 text-sm text-slate-600">
                    This order is {activeOrder.status.toLowerCase()} and no longer in active fulfillment.
                  </p>
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                    {ORDER_JOURNEY.map((step, index) => {
                      const currentIndex = ORDER_JOURNEY.findIndex(
                        (item) => item.status === activeOrder.status
                      );
                      const isReached = currentIndex >= index;
                      const StepIcon = ORDER_JOURNEY_ICON[step.status];

                      return (
                        <div
                          key={step.status}
                          className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            isReached
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <StepIcon size={12} />
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
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

                {activeOrder.actionsAllowed.includes('INITIATE_PAYMENT') && runtimeSettings.paymentsEnabled && (
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

                {activeOrder.actionsAllowed.includes('INITIATE_PAYMENT') && !runtimeSettings.paymentsEnabled && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {runtimeSettings.paymentsDisabledMessage}
                  </p>
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
                      const isPrimaryAction = action === getPrimaryAction(visibleActions);

                      return (
                        <button
                          key={action}
                          type="button"
                          onClick={() => void runOrderAction(activeOrder, action)}
                          disabled={isBusy}
                          className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                            isPrimaryAction
                              ? 'bg-primary-600 text-white hover:bg-primary-700'
                              : dangerAction
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

              {sellerWaitingForBuyerOtp && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-800">Waiting For Buyer OTP Confirmation</p>
                  <p className="mt-1 text-sm text-amber-700">
                    The seller has started this order. Buyer must enter the email OTP to confirm receipt,
                    complete the order, and release payment.
                  </p>
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
            <h3 className="text-lg font-semibold text-slate-800">
              {otpModal.mode === 'BUYER_CONFIRM' ? 'Confirm Receipt With OTP' : 'Confirm Delivery With OTP'}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {otpModal.mode === 'BUYER_CONFIRM'
                ? 'Enter the 6-digit OTP sent to your email after seller acceptance.'
                : 'Ask the buyer for the 6-digit OTP and enter it below.'}
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
