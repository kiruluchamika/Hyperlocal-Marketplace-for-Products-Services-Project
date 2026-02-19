"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listListingsQuerySchema = exports.listingIdParamSchema = exports.updateListingSchema = exports.createListingSchema = void 0;
const zod_1 = require("zod");
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const coordinatesSchema = zod_1.z
    .array(zod_1.z.number())
    .length(2, "coordinates must be [lng, lat]")
    .refine((coords) => coords[0] >= -180 && coords[0] <= 180, {
    message: "longitude out of range"
})
    .refine((coords) => coords[1] >= -90 && coords[1] <= 90, {
    message: "latitude out of range"
});
const pointSchema = zod_1.z.object({
    type: zod_1.z.literal("Point").default("Point"),
    coordinates: coordinatesSchema
});
const imageUrlSchema = zod_1.z.string().url("images must contain valid URLs");
exports.createListingSchema = zod_1.z.object({
    type: zod_1.z.literal("PRODUCT").default("PRODUCT"),
    transactionMode: zod_1.z.enum(["BUY_NOW", "NEGOTIABLE"]).default("BUY_NOW"),
    title: zod_1.z.string().min(3, "title is required").max(120),
    description: zod_1.z.string().min(10, "description is required").max(3000),
    categoryId: zod_1.z.string().min(1, "categoryId is required"),
    price: zod_1.z.number().min(0),
    currency: zod_1.z.string().min(3).max(3).default("LKR"),
    isNegotiable: zod_1.z.boolean().optional().default(false),
    condition: zod_1.z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]),
    images: zod_1.z.array(imageUrlSchema).min(1).max(10),
    location: zod_1.z.object({
        city: zod_1.z.string().min(1, "city is required"),
        address: zod_1.z.string().optional(),
        coordinates: pointSchema
    }),
    tags: zod_1.z.array(zod_1.z.string().min(1)).max(20).optional()
});
exports.updateListingSchema = zod_1.z
    .object({
    transactionMode: zod_1.z.enum(["BUY_NOW", "NEGOTIABLE"]).optional(),
    title: zod_1.z.string().min(3).max(120).optional(),
    description: zod_1.z.string().min(10).max(3000).optional(),
    categoryId: zod_1.z.string().min(1).optional(),
    price: zod_1.z.number().min(0).optional(),
    currency: zod_1.z.string().min(3).max(3).optional(),
    isNegotiable: zod_1.z.boolean().optional(),
    condition: zod_1.z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]).optional(),
    images: zod_1.z.array(imageUrlSchema).min(1).max(10).optional(),
    location: zod_1.z
        .object({
        city: zod_1.z.string().min(1).optional(),
        address: zod_1.z.string().optional(),
        coordinates: pointSchema.optional()
    })
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().min(1)).max(20).optional(),
    status: zod_1.z.enum(["ACTIVE", "SOLD", "HIDDEN"]).optional()
})
    .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field is required for update"
});
exports.listingIdParamSchema = zod_1.z.object({
    id: zod_1.z.string().regex(objectIdRegex, "Invalid listing id")
});
exports.listListingsQuerySchema = zod_1.z
    .object({
    search: zod_1.z.string().min(1).optional(),
    categoryId: zod_1.z.string().optional(),
    minPrice: zod_1.z.coerce.number().min(0).optional(),
    maxPrice: zod_1.z.coerce.number().min(0).optional(),
    condition: zod_1.z.enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "USED_FAIR"]).optional(),
    lat: zod_1.z.coerce.number().min(-90).max(90).optional(),
    lng: zod_1.z.coerce.number().min(-180).max(180).optional(),
    radiusKm: zod_1.z.coerce.number().min(0.1).max(200).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
    sort: zod_1.z.enum(["recent", "priceAsc", "priceDesc"]).default("recent")
})
    .refine((query) => (query.lat === undefined && query.lng === undefined && query.radiusKm === undefined) ||
    (query.lat !== undefined && query.lng !== undefined), {
    message: "lat and lng are required for radius filtering"
})
    .refine((query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice, {
    message: "minPrice must be less than or equal to maxPrice"
});
