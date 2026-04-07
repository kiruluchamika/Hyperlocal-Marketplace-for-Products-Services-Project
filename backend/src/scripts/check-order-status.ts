import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import models
import Order from '../models/Order';
import Payment from '../models/Payment';
import ServiceBooking from '../models/ServiceBooking';
import User from '../models/User';

const main = async () => {
  const sellerEmail = process.argv[2];

  if (!sellerEmail) {
    console.error('Usage: ts-node check-order-status.ts <seller-email>');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✓ Connected to MongoDB');

    // Find the seller user
    const seller = await User.findOne({ email: sellerEmail });
    if (!seller) {
      console.error(`✗ Seller not found: ${sellerEmail}`);
      process.exit(1);
    }
    console.log(`\n✓ Found seller: ${seller.name} (${sellerEmail})`);
    console.log(`  Seller ID: ${seller._id}`);

    // Fetch all orders for this seller
    const orders = await Order.find({ sellerId: seller._id })
      .select('_id totalAmount status createdAt paymentId')
      .lean();

    // Fetch related payments to inspect payout metadata
    const orderIds = orders.map((order: any) => order._id);
    const payments = orderIds.length
      ? await Payment.find({ orderId: { $in: orderIds } })
          .select('_id orderId status amount currency metadata updatedAt')
          .lean()
      : [];

    const paymentByOrderId = new Map<string, any>(
      payments.map((payment: any) => [String(payment.orderId), payment])
    );

    // Fetch all service bookings for this seller
    const bookings = await ServiceBooking.find({ providerId: seller._id })
      .select('_id deposit status createdAt')
      .lean();

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`PRODUCT ORDERS (${orders.length})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (orders.length === 0) {
      console.log('(No orders found)');
    } else {
      orders.forEach((order: any, idx: number) => {
        const createdDate = new Date(order.createdAt).toLocaleString();
        const status = order.status || 'UNKNOWN';
        const payment = paymentByOrderId.get(String(order._id));
        const amount = Number(order.totalAmount || 0).toFixed(2);
        const transferId = payment?.metadata?.stripeTransferId || 'NONE';
        const payoutStatus = payment?.metadata?.payoutStatus || 'NOT_SET';
        const paymentStatus = payment?.status || 'NOT_FOUND';

        console.log(`\n[${idx + 1}] Order ${order._id}`);
        console.log(`    Amount: ${amount} ${payment?.currency || 'LKR'}`);
        console.log(`    Order Status: ${status}`);
        console.log(`    Payment Status: ${paymentStatus}`);
        console.log(`    Payout Status: ${payoutStatus}`);
        console.log(`    Transfer ID: ${transferId}`);
        console.log(`    Created: ${createdDate}`);

        // Highlight issues
        if (status !== 'COMPLETED') {
          console.log(`    ⚠️  ORDER NOT COMPLETED - needs to be completed before release`);
        } else if (!payment) {
          console.log(`    ⚠️  NO PAYMENT RECORD - payout cannot be processed`);
        } else if (paymentStatus !== 'RELEASED') {
          console.log(`    ⚠️  PAYMENT NOT RELEASED - current status is ${paymentStatus}`);
        } else if (!transferId || transferId === 'NONE') {
          console.log(`    ⚠️  NO STRIPE TRANSFER - payout code may not have run`);
        }
      });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`SERVICE BOOKINGS (${bookings.length})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    if (bookings.length === 0) {
      console.log('(No bookings found)');
    } else {
      bookings.forEach((booking: any, idx: number) => {
        const createdDate = new Date(booking.createdAt).toLocaleString();
        const status = booking.status || 'UNKNOWN';
        const amount = Number(booking.deposit?.amount || 0).toFixed(2);
        const transferId = booking.deposit?.stripeTransferId || 'NONE';
        const payoutStatus = booking.deposit?.payoutStatus || 'NOT_SET';

        console.log(`\n[${idx + 1}] Booking ${booking._id}`);
        console.log(`    Deposit Amount: ${amount} ${(booking.deposit?.currency || 'LKR').toUpperCase()}`);
        console.log(`    Status: ${status}`);
        console.log(`    Payout Status: ${payoutStatus}`);
        console.log(`    Transfer ID: ${transferId}`);
        console.log(`    Created: ${createdDate}`);

        // Highlight issues
        if (status !== 'CONFIRMED') {
          console.log(`    ⚠️  BOOKING NOT CONFIRMED - needs to be confirmed before release`);
        } else if (!transferId || transferId === 'NONE') {
          console.log(`    ⚠️  NO STRIPE TRANSFER - payout code may not have run`);
        }
      });
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\nSUMMARY:`);
    console.log(`  Total Orders: ${orders.length}`);
    console.log(`  Orders with transfers: ${payments.filter((p: any) => p.metadata?.stripeTransferId).length}`);
    console.log(`  Total Bookings: ${bookings.length}`);
    console.log(`  Bookings with transfers: ${bookings.filter((b: any) => b.deposit?.stripeTransferId).length}`);

    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

main();
