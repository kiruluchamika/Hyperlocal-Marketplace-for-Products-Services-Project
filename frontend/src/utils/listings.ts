import { Condition, IProductListing } from '@/types';

const conditionLabelMap: Record<Condition, string> = {
  NEW: 'Brand New',
  USED_LIKE_NEW: 'Used - Like New',
  USED_GOOD: 'Used - Good',
  USED_FAIR: 'Used - Fair',
};

const usdToLkrRate = Number(import.meta.env.VITE_USD_TO_LKR_RATE || 300);

const formatAsLkr = (amount: number) =>
  new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(amount);

export const formatCondition = (condition?: string) => {
  if (!condition) {
    return 'Not specified';
  }

  if (condition in conditionLabelMap) {
    return conditionLabelMap[condition as Condition];
  }

  return condition
    .split('_')
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/g, (value: string) => value.toUpperCase());
};

export const formatCurrency = (amount: number, currency = 'LKR') => {
  const normalizedCurrency = String(currency || 'LKR').toUpperCase();

  if (normalizedCurrency === 'USD') {
    return formatAsLkr(amount * usdToLkrRate);
  }

  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: normalizedCurrency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `LKR ${amount.toLocaleString()}`;
  }
};

export const getListingImage = (listing: IProductListing) => {
  if (Array.isArray(listing.images) && listing.images.length > 0 && listing.images[0]) {
    return listing.images[0];
  }

  return 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&w=1000&q=80';
};

export const getOwnerId = (owner: IProductListing['ownerId']) => {
  if (typeof owner === 'string') {
    return owner;
  }

  return owner?.id || (owner as { _id?: string })?._id || '';
};

export const getOwnerContact = (owner: IProductListing['ownerId']) => {
  if (typeof owner === 'string') {
    return { id: owner, name: 'Seller', email: '', phone: '' };
  }

  const detail = owner as {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };

  return {
    id: detail.id || detail._id || '',
    name: detail.name || 'Seller',
    email: detail.email || '',
    phone: detail.phone || '',
  };
};
