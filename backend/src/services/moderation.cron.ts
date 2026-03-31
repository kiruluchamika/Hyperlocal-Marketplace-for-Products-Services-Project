import cron from 'node-cron';
import ProductListing from '../models/ProductListing';
import { createUserNotification } from '../services/notificationService';
import { getEmail, sendEmail } from '../services/emailNotifications';

// This job runs every 15 minutes to check for expired suspensions
export const initModerationCron = () => {
  cron.schedule('*/15 * * * *', async () => {
    try {
      console.log('[Moderation Cron] Checking for expired product suspensions...');
      
      const now = new Date();
      
      // Find all products that are suspended and their deadline has passed
      const expiredProducts = await ProductListing.find({
        status: 'SUSPENDED',
        suspendDeadline: { $lte: now }
      });

      if (expiredProducts.length === 0) {
        return; // Nothing to clean up
      }

      console.log(`[Moderation Cron] Found ${expiredProducts.length} expired product(s). Initiating cleanup.`);

      for (const product of expiredProducts) {
        // Soft delete the product
        product.status = 'DELETED';
        // Clear the suspend fields to clean up DB space
        product.suspendReason = undefined;
        product.suspendDeadline = undefined;
        
        await product.save();

        // Notify the owner via in-app notification
        await createUserNotification(
          product.ownerId.toString(),
          {
            title: 'Listing Deleted',
            message: `Your listing "${product.title}" has been permanently deleted because the 3-hour moderation deadline was exceeded.`,
            type: 'SYSTEM' as any,
          }
        );

        // Send Email
        try {
          const email = await getEmail(product.ownerId.toString());
          await sendEmail(
            email,
            'Listing Permanently Deleted - Bazaaro Moderation',
            `<p>Hello,</p>
             <p>Your listing <b>${product.title}</b> has been deleted because you did not appeal or edit the listing within the required 3-hour window.</p>
             <p>If you believe this was in error, please contact Bazaaro support.</p>`
          );
        } catch (e) {
          console.error('[Moderation Cron] Failed to send email:', e);
        }
        
        console.log(`[Moderation Cron] Product ${product._id} deleted successfully.`);
      }

    } catch (error) {
      console.error('[Moderation Cron] Error running cleanup job:', error);
    }
  });

  console.log('[Moderation Cron] Scheduled: Running every 15 minutes.');
};
