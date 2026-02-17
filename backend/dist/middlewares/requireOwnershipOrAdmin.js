"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOwnershipOrAdmin = void 0;
const AppError_1 = require("../utils/AppError");
const listingService_1 = require("../services/listingService");
const requireOwnershipOrAdmin = async (req, _res, next) => {
    if (!req.user) {
        return next(new AppError_1.AppError("Authentication required", 401));
    }
    const allowed = await (0, listingService_1.canModifyListing)(req.params.id, req.user.id, req.user.role);
    if (!allowed) {
        return next(new AppError_1.AppError("Forbidden", 403));
    }
    return next();
};
exports.requireOwnershipOrAdmin = requireOwnershipOrAdmin;
