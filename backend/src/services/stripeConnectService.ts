import Stripe from "stripe";
import { env } from "../config/env";
import User, { StripeConnectOnboardingStatus } from "../models/User";
import { AppError } from "../utils/AppError";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia" as any,
});

const getDefaultReturnUrl = () => env.STRIPE_CONNECT_RETURN_URL;
const getDefaultRefreshUrl = () => env.STRIPE_CONNECT_REFRESH_URL;

export class StripeConnectService {
  isEnabled() {
    return env.STRIPE_CONNECT_ENABLED;
  }

  private ensureEnabled() {
    if (!env.STRIPE_CONNECT_ENABLED) {
      throw new AppError("Stripe Connect payouts are disabled", 400);
    }
  }

  async createOnboardingLink(params: {
    userId: string;
    returnUrl?: string;
    refreshUrl?: string;
  }) {
    this.ensureEnabled();

    const user = await User.findById(params.userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.email) {
      throw new AppError("User email is required to create Stripe Connect account", 400);
    }

    let accountId = user.stripeConnect?.accountId;

    if (!accountId) {
      try {
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email,
          metadata: {
            userId: user._id.toString(),
          },
        });

        accountId = account.id;

        user.stripeConnect = {
          accountId,
          onboardingStatus: "IN_PROGRESS",
          chargesEnabled: Boolean(account.charges_enabled),
          payoutsEnabled: Boolean(account.payouts_enabled),
          updatedAt: new Date(),
        };

        await user.save();
      } catch (error: any) {
        const message = String(error?.message || error?.raw?.message || "");

        if (message.includes("sign up for Connect") || message.includes("Connect")) {
          throw new AppError(
            "Your Stripe account is not enabled for Connect yet. Open the Stripe Dashboard, enable Connect, then try onboarding again.",
            400
          );
        }

        throw new AppError(
          message || "Unable to create Stripe Connect account right now",
          400
        );
      }
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      return_url: params.returnUrl || getDefaultReturnUrl(),
      refresh_url: params.refreshUrl || getDefaultRefreshUrl(),
    });

    if (!user.stripeConnect) {
      user.stripeConnect = {
        accountId,
        onboardingStatus: "IN_PROGRESS",
        chargesEnabled: false,
        payoutsEnabled: false,
        updatedAt: new Date(),
      };
    } else {
      user.stripeConnect.onboardingStatus = "IN_PROGRESS";
      user.stripeConnect.updatedAt = new Date();
    }

    await user.save();

    return {
      onboardingUrl: link.url,
      expiresAt: link.expires_at,
      accountId,
    };
  }

  async getUserConnectStatus(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!user.stripeConnect?.accountId) {
      return {
        status: "NOT_STARTED" as StripeConnectOnboardingStatus,
        accountId: null,
        chargesEnabled: false,
        payoutsEnabled: false,
      };
    }

    try {
      const account = await stripe.accounts.retrieve(user.stripeConnect.accountId);

      const chargesEnabled = Boolean(account.charges_enabled);
      const payoutsEnabled = Boolean(account.payouts_enabled);

      let onboardingStatus: StripeConnectOnboardingStatus = "IN_PROGRESS";
      if (chargesEnabled && payoutsEnabled) {
        onboardingStatus = "COMPLETED";
      } else if (account.requirements?.disabled_reason) {
        onboardingStatus = "VERIFICATION_FAILED";
      }

      user.stripeConnect = {
        accountId: user.stripeConnect.accountId,
        onboardingStatus,
        chargesEnabled,
        payoutsEnabled,
        updatedAt: new Date(),
      };

      await user.save();
    } catch (error: any) {
      const message = String(error?.message || error?.raw?.message || "");
      throw new AppError(message || "Unable to fetch Stripe Connect status right now", 400);
    }

    return {
      status: user.stripeConnect.onboardingStatus,
      accountId: user.stripeConnect.accountId,
      chargesEnabled: Boolean(user.stripeConnect.chargesEnabled),
      payoutsEnabled: Boolean(user.stripeConnect.payoutsEnabled),
      updatedAt: user.stripeConnect.updatedAt,
    };
  }

  async getUserConnectBalance(userId: string) {
    const user = await User.findById(userId).select("stripeConnect");
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const accountId = user.stripeConnect?.accountId;
    if (!accountId) {
      return {
        accountId: null,
        available: [],
        pending: [],
      };
    }

    try {
      const balance = await stripe.balance.retrieve({}, { stripeAccount: accountId });

      return {
        accountId,
        available: (balance.available || []).map((entry) => ({
          currency: (entry.currency || "usd").toUpperCase(),
          amount: entry.amount / 100,
        })),
        pending: (balance.pending || []).map((entry) => ({
          currency: (entry.currency || "usd").toUpperCase(),
          amount: entry.amount / 100,
        })),
      };
    } catch (error: any) {
      const message = String(error?.message || error?.raw?.message || "");
      throw new AppError(message || "Unable to fetch Stripe Connect balance right now", 400);
    }
  }

  async handleAccountUpdated(account: Stripe.Account) {
    const user = await User.findOne({ "stripeConnect.accountId": account.id });

    if (!user) {
      return;
    }

    const chargesEnabled = Boolean(account.charges_enabled);
    const payoutsEnabled = Boolean(account.payouts_enabled);

    let onboardingStatus: StripeConnectOnboardingStatus = "IN_PROGRESS";
    if (chargesEnabled && payoutsEnabled) {
      onboardingStatus = "COMPLETED";
    } else if (account.requirements?.disabled_reason) {
      onboardingStatus = "VERIFICATION_FAILED";
    }

    user.stripeConnect = {
      accountId: account.id,
      onboardingStatus,
      chargesEnabled,
      payoutsEnabled,
      updatedAt: new Date(),
    };

    await user.save();
  }

  async isUserEligibleForPayout(userId: string) {
    const user = await User.findById(userId).select("stripeConnect");
    if (!user?.stripeConnect?.accountId) {
      return false;
    }

    return Boolean(
      user.stripeConnect.onboardingStatus === "COMPLETED" &&
      user.stripeConnect.chargesEnabled &&
      user.stripeConnect.payoutsEnabled
    );
  }

  async createTransferToUser(params: {
    userId: string;
    amount: number; // main unit, eg 1000.50
    currency: string;
    description: string;
    transferGroup: string;
    metadata?: Record<string, string>;
    idempotencyKey: string;
    sourceTransaction?: string;
  }) {
    this.ensureEnabled();

    const user = await User.findById(params.userId).select("stripeConnect");

    if (!user?.stripeConnect?.accountId) {
      throw new AppError("Seller/provider has no Stripe Connect account", 400);
    }

    const amountSmallestUnit = Math.round(params.amount * 100);

    if (amountSmallestUnit <= 0) {
      throw new AppError("Transfer amount must be greater than zero", 400);
    }

    const transfer = await stripe.transfers.create(
      {
        amount: amountSmallestUnit,
        currency: params.currency.toLowerCase(),
        destination: user.stripeConnect.accountId,
        description: params.description,
        transfer_group: params.transferGroup,
        metadata: params.metadata,
        source_transaction: params.sourceTransaction,
      },
      {
        idempotencyKey: params.idempotencyKey,
      }
    );

    return transfer;
  }

  async findTransferToUser(params: {
    userId: string;
    transferGroup: string;
    sourceTransaction?: string;
    paymentId?: string;
  }) {
    this.ensureEnabled();

    const user = await User.findById(params.userId).select("stripeConnect");

    if (!user?.stripeConnect?.accountId) {
      return null;
    }

    const transfers = await stripe.transfers.list({
      transfer_group: params.transferGroup,
      limit: 100,
    } as any);

    return (
      transfers.data.find((transfer: any) => {
        const destination =
          typeof transfer.destination === "string"
            ? transfer.destination
            : transfer.destination?.id;
        const source =
          typeof transfer.source_transaction === "string"
            ? transfer.source_transaction
            : transfer.source_transaction?.id;

        return (
          destination === user.stripeConnect?.accountId &&
          (!params.sourceTransaction || source === params.sourceTransaction) &&
          (!params.paymentId || transfer.metadata?.paymentId === params.paymentId)
        );
      }) || null
    );
  }

  async resolveLatestChargeId(paymentIntentId: string): Promise<string | undefined> {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const latestCharge = paymentIntent.latest_charge;

    if (typeof latestCharge === "string") {
      return latestCharge;
    }

    if (latestCharge && typeof latestCharge === "object" && "id" in latestCharge) {
      return String((latestCharge as any).id);
    }

    return undefined;
  }
}
