/**
 * Listing Interface Contract
 * 
 * This interface defines the minimum fields that the Order module expects
 * from the Listing module. The ProductListing Mongoose model is now integrated.
 * 
 * Purpose: Ensures type safety and documents the dependency contract
 * 
 * INTEGRATION STATUS: ✅ Integrated with ProductListing model
 */

import { Document, Types } from "mongoose";
import ProductListing from "../models/ProductListing";

export type ListingType = "PRODUCT";
export type TransactionMode = "BUY_NOW" | "NEGOTIABLE";

/**
 * Minimum listing fields required for order creation and validation
 */
export interface IListing extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;  // Seller's user ID
  type: ListingType;        // Must be "PRODUCT" for orders
  transactionMode: TransactionMode; // Must be "BUY_NOW" for orders
  title: string;
  price: number;
  isActive: boolean;        // Listing must be active (true)
  location?: {
    address?: string;
    city?: string;
    district?: string;
    province?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}

/**
 * Business Rules for Order Module:
 * 
 * 1. Only listings with type="PRODUCT" can be ordered
 * 2. Only listings with transactionMode="BUY_NOW" can be ordered
 * 3. Listing must have isActive=true (replaces old status="ACTIVE")
 * 4. Buyer cannot order their own listing (buyerId !== listing.ownerId)
 */

/**
 * Export ProductListing model for order module usage
 */
export const ListingModel = ProductListing;