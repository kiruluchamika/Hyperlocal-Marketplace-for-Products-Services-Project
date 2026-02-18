/**
 * Listing Interface Contract
 * 
 * This interface defines the minimum fields that the Order module expects
 * from the Listing module. The actual Listing Mongoose model will be implemented
 * by another team member.
 * 
 * Purpose: Ensures type safety and documents the dependency contract
 * 
 * INTEGRATION INSTRUCTIONS:
 * When the listing module is ready, import the actual model and use it.
 * For now, this provides type safety during development.
 */

import { Document, Types } from "mongoose";

export type ListingType = "PRODUCT" | "SERVICE";
export type TransactionMode = "BUY_NOW" | "REQUEST_QUOTE";

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
  isActive: boolean;        // Listing must be active
  isAvailable: boolean;     // Listing must be available
}

/**
 * Business Rules for Order Module:
 * 
 * 1. Only listings with type="PRODUCT" can be ordered
 * 2. Only listings with transactionMode="BUY_NOW" can be ordered
 * 3. Listing must have isActive=true
 * 4. Listing must have isAvailable=true
 * 5. Buyer cannot order their own listing (buyerId !== listing.ownerId)
 */

/**
 * INTEGRATED: Using actual Listing model from teammate's implementation
 */

import ListingModelImport from '../models/Listing';
export const ListingModel = ListingModelImport;
