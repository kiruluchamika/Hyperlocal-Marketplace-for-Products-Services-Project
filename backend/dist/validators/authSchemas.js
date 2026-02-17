"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, "Name is required"),
    email: zod_1.z.string().email("Valid email required"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters"),
    role: zod_1.z.enum(["admin", "seller", "buyer"]).optional()
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email("Valid email required"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters")
});
