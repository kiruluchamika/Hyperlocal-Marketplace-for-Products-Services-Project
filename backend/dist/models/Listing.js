"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const listingSchema = new mongoose_1.Schema({
    ownerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    type: {
        type: String,
        enum: ["PRODUCT"],
        default: "PRODUCT",
        required: true
    },
    transactionMode: {
        type: String,
        enum: ["BUY_NOW", "NEGOTIABLE"],
        default: "BUY_NOW",
        required: true
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    categoryId: { type: String, required: true, trim: true, index: true },
    price: { type: Number, required: true, min: 0, index: true },
    currency: { type: String, required: true, trim: true, uppercase: true, default: "LKR" },
    isNegotiable: { type: Boolean, default: false },
    condition: {
        type: String,
        enum: ["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"],
        required: true,
        default: "USED_GOOD"
    },
    images: {
        type: [String],
        required: true,
        validate: {
            validator: (urls) => urls.length >= 1 && urls.length <= 10,
            message: "images must contain between 1 and 10 URLs"
        }
    },
    location: {
        city: { type: String, required: true, trim: true, index: true },
        address: { type: String, trim: true },
        coordinates: {
            type: {
                type: String,
                enum: ["Point"],
                required: true,
                default: "Point"
            },
            coordinates: {
                type: [Number],
                required: true,
                validate: {
                    validator: (value) => value.length === 2,
                    message: "coordinates must be [lng, lat]"
                }
            }
        }
    },
    status: {
        type: String,
        enum: ["ACTIVE", "SOLD", "HIDDEN", "DELETED"],
        default: "ACTIVE",
        index: true
    },
    tags: { type: [String], default: [] },
    viewsCount: { type: Number, default: 0, min: 0 },
    savedCount: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
listingSchema.index({ title: "text", description: "text" });
listingSchema.index({ "location.coordinates": "2dsphere" });
const Listing = mongoose_1.default.model("Listing", listingSchema);
exports.default = Listing;
