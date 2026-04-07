import cron from 'node-cron';
import Payment, { PaymentStatus } from '../models/Payment';
import ServiceBooking from '../models/ServiceBooking';
import { env } from '../config/env';
import { StripeConnectService } from './stripeConnectService';

const stripeConnectService = new StripeConnectService();

const normalizePayoutAmount = (amount: number, sourceCurrency?: string) => {
  const transferCurrency = env.STRIPE_PAYMENT_CURRENCY.toUpperCase();
  const normalizedSource = String(sourceCurrency || transferCurrency).toUpperCase();

  if (normalizedSource === transferCurrency) {
    return amount;
  }

  if (normalizedSource === 'LKR' && transferCurrency === 'USD') {
    return Math.round((amount / env.STRIPE_BALANCE_TO_LKR_RATE) * 100) / 100;
  }

  if (normalizedSource === 'USD' && transferCurrency === 'LKR') {
    return Math.round(amount * env.STRIPE_BALANCE_TO_LKR_RATE * 100) / 100;
  }

  return amount;
};

const reconcileProductPayout = async (payment: any) => {
  const metadata = payment.metadata || {};

  if (metadata.stripeTransferId || metadata.payoutStatus === 'TRANSFER_CREATED') {
    return false;
  }

  if (payment.status !== PaymentStatus.RELEASED) {
    return false;
  }

  const eligible = await stripeConnectService.isUserEligibleForPayout(payment.sellerId.toString());
  if (metadata.payoutStatus === 'SKIPPED_NOT_ELIGIBLE' && !eligible) {
    return false;
  }

  if (!eligible) {
    payment.metadata = {
      ...metadata,
      payoutStatus: 'SKIPPED_NOT_ELIGIBLE',
      payoutAttemptedAt: new Date().toISOString(),
    };
    await payment.save();
    return true;
  }

  const grossAmount = Number(payment.amount || 0);
  const transferGrossAmount = normalizePayoutAmount(grossAmount, payment.currency);
  const feePercent = env.STRIPE_TRANSFER_FEE_PERCENT;
  const feeAmount = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
  const netAmount = Math.max(0, grossAmount - feeAmount);

  if (netAmount <= 0) {
    payment.metadata = {
      ...metadata,
      payoutGrossAmount: grossAmount,
      payoutFeePercent: feePercent,
      payoutFeeAmount: feeAmount,
      payoutNetAmount: netAmount,
      payoutStatus: 'SKIPPED_NOT_ELIGIBLE',
      payoutAttemptedAt: new Date().toISOString(),
    };
    await payment.save();
    return true;
  }

  const sourceTransaction =
    typeof metadata.stripeChargeId === 'string'
      ? metadata.stripeChargeId
      : await stripeConnectService.resolveLatestChargeId(payment.providerPaymentId);

  try {
    const transferAmount = normalizePayoutAmount(netAmount, payment.currency);
    const transfer = await stripeConnectService.createTransferToUser({
      userId: payment.sellerId.toString(),
      amount: transferAmount,
      currency: env.STRIPE_PAYMENT_CURRENCY,
      description: `Order ${payment.orderId.toString()} payout`,
      transferGroup: `ORDER_${payment.orderId.toString()}`,
      metadata: {
        orderId: payment.orderId.toString(),
        paymentId: payment._id.toString(),
        sellerId: payment.sellerId.toString(),
      },
      idempotencyKey: `order-reconcile-${payment._id.toString()}-${env.STRIPE_PAYMENT_CURRENCY}-${transferAmount.toFixed(2)}`,
      sourceTransaction,
    });

    payment.metadata = {
      ...metadata,
      stripeChargeId: sourceTransaction || metadata.stripeChargeId,
      payoutGrossAmount: grossAmount,
      payoutStripeGrossAmount: transferGrossAmount,
      payoutStripeCurrency: env.STRIPE_PAYMENT_CURRENCY,
      payoutFeePercent: feePercent,
      payoutFeeAmount: feeAmount,
      payoutNetAmount: netAmount,
      payoutAttemptedAt: new Date().toISOString(),
      payoutStatus: 'TRANSFER_CREATED',
      stripeTransferId: transfer.id,
      payoutError: null,
    };
  } catch (error: any) {
    payment.metadata = {
      ...metadata,
      stripeChargeId: sourceTransaction || metadata.stripeChargeId,
      payoutGrossAmount: grossAmount,
      payoutStripeGrossAmount: transferGrossAmount,
      payoutStripeCurrency: env.STRIPE_PAYMENT_CURRENCY,
      payoutFeePercent: feePercent,
      payoutFeeAmount: feeAmount,
      payoutNetAmount: netAmount,
      payoutAttemptedAt: new Date().toISOString(),
      payoutStatus: 'TRANSFER_FAILED',
      payoutError: error?.message || 'Unknown transfer error',
    };
  }

  await payment.save();
  return true;
};

const reconcileServicePayout = async (booking: any) => {
  const deposit = booking.deposit || {};

  if (deposit.stripeTransferId || deposit.payoutStatus === 'TRANSFER_CREATED') {
    return false;
  }

  if (booking.status !== 'CONFIRMED') {
    return false;
  }

  const eligible = await stripeConnectService.isUserEligibleForPayout(String(booking.providerId));
  if (deposit.payoutStatus === 'SKIPPED_NOT_ELIGIBLE' && !eligible) {
    return false;
  }

  if (!eligible) {
    booking.deposit = {
      ...deposit,
      payoutStatus: 'SKIPPED_NOT_ELIGIBLE',
      payoutAttemptedAt: new Date(),
    };
    await booking.save();
    return true;
  }

  const grossAmount = Number(deposit.amount || 0);
  const transferGrossAmount = normalizePayoutAmount(grossAmount, deposit.currency);
  const feePercent = env.STRIPE_TRANSFER_FEE_PERCENT;
  const feeAmount = Math.round(grossAmount * (feePercent / 100) * 100) / 100;
  const netAmount = Math.max(0, grossAmount - feeAmount);

  if (netAmount <= 0) {
    booking.deposit = {
      ...deposit,
      payoutGrossAmount: grossAmount,
      payoutFeePercent: feePercent,
      payoutFeeAmount: feeAmount,
      payoutNetAmount: netAmount,
      payoutStatus: 'SKIPPED_NOT_ELIGIBLE',
      payoutAttemptedAt: new Date(),
    };
    await booking.save();
    return true;
  }

  const sourceTransaction = await stripeConnectService.resolveLatestChargeId(deposit.stripePaymentIntentId || '');

  try {
    const transferAmount = normalizePayoutAmount(netAmount, deposit.currency);
    const transfer = await stripeConnectService.createTransferToUser({
      userId: String(booking.providerId),
      amount: transferAmount,
      currency: env.STRIPE_PAYMENT_CURRENCY,
      description: `Service booking ${booking._id.toString()} payout`,
      transferGroup: `BOOKING_${booking._id.toString()}`,
      metadata: {
        bookingId: booking._id.toString(),
        providerId: String(booking.providerId),
        paymentIntentId: deposit.stripePaymentIntentId || '',
      },
      idempotencyKey: `booking-reconcile-${booking._id.toString()}-${env.STRIPE_PAYMENT_CURRENCY}-${transferAmount.toFixed(2)}`,
      sourceTransaction,
    });

    booking.deposit = {
      ...deposit,
      payoutGrossAmount: grossAmount,
      payoutStripeGrossAmount: transferGrossAmount,
      payoutStripeCurrency: env.STRIPE_PAYMENT_CURRENCY,
      payoutFeePercent: feePercent,
      payoutFeeAmount: feeAmount,
      payoutNetAmount: netAmount,
      payoutAttemptedAt: new Date(),
      payoutStatus: 'TRANSFER_CREATED',
      stripeTransferId: transfer.id,
      payoutError: undefined,
    };
  } catch (error: any) {
    booking.deposit = {
      ...deposit,
      payoutGrossAmount: grossAmount,
      payoutStripeGrossAmount: transferGrossAmount,
      payoutStripeCurrency: env.STRIPE_PAYMENT_CURRENCY,
      payoutFeePercent: feePercent,
      payoutFeeAmount: feeAmount,
      payoutNetAmount: netAmount,
      payoutAttemptedAt: new Date(),
      payoutStatus: 'TRANSFER_FAILED',
      payoutError: error?.message || 'Unknown transfer error',
    };
  }

  await booking.save();
  return true;
};

export const reconcileMissingPayoutTransfers = async () => {
  const releasedPayments = await Payment.find({
    status: PaymentStatus.RELEASED,
    $or: [
      { 'metadata.stripeTransferId': { $exists: false } },
      { 'metadata.stripeTransferId': null },
      { 'metadata.payoutStatus': { $nin: ['TRANSFER_CREATED'] } },
    ],
  }).sort({ updatedAt: 1 }).limit(50);

  const confirmedBookings = await ServiceBooking.find({
    status: 'CONFIRMED',
    $or: [
      { 'deposit.stripeTransferId': { $exists: false } },
      { 'deposit.stripeTransferId': null },
      { 'deposit.payoutStatus': { $nin: ['TRANSFER_CREATED'] } },
    ],
  }).sort({ updatedAt: 1 }).limit(50);

  let productUpdated = 0;
  let serviceUpdated = 0;

  for (const payment of releasedPayments) {
    try {
      const changed = await reconcileProductPayout(payment);
      if (changed) productUpdated += 1;
    } catch (error) {
      console.error('[Payout Cron] Failed to reconcile product payout:', payment._id, error);
    }
  }

  for (const booking of confirmedBookings) {
    try {
      const changed = await reconcileServicePayout(booking);
      if (changed) serviceUpdated += 1;
    } catch (error) {
      console.error('[Payout Cron] Failed to reconcile service payout:', booking._id, error);
    }
  }

  return { productUpdated, serviceUpdated };
};

export const initStripePayoutsCron = () => {
  cron.schedule('*/10 * * * *', async () => {
    try {
      console.log('[Payout Cron] Checking for missing Stripe transfers...');
      const result = await reconcileMissingPayoutTransfers();
      console.log(`[Payout Cron] Reconciled ${result.productUpdated} product payout(s) and ${result.serviceUpdated} service payout(s).`);
    } catch (error) {
      console.error('[Payout Cron] Error running payout reconciliation job:', error);
    }
  });

  console.log('[Payout Cron] Scheduled: Running every 10 minutes.');
};