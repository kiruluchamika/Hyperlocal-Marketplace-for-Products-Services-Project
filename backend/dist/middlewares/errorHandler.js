"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const AppError_1 = require("../utils/AppError");
const errorHandler = (err, _req, res, _next) => {
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            message: "Validation error",
            errors: err.issues
        });
    }
    if (err instanceof AppError_1.AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            errors: err.details
        });
    }
    console.error(err);
    return res.status(500).json({ message: "Server error" });
};
exports.errorHandler = errorHandler;
