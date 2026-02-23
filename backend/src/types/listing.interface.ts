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
import ProductListing from "../models/ProductListing";

export type ListingType = "PRODUCT";
export type TransactionMode = "BUY_NOW" | "NEGOTIABLE";
export type ListingStatus = "ACTIVE" | "SOLD" | "HIDDEN" | "DELETED";

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
  status: ListingStatus;    // Listing must be ACTIVE
}

/**
 * Business Rules for Order Module:
 * 
 * 1. Only listings with type="PRODUCT" can be ordered
 * 2. Only listings with transactionMode="BUY_NOW" can be ordered
 * 3. Listing must have status="ACTIVE"
 * 5. Buyer cannot order their own listing (buyerId !== listing.ownerId)
 */

export const ListingModel = ProductListing;
