"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllUsers = exports.getMe = void 0;
const asyncHandler_1 = require("../utils/asyncHandler");
const userService_1 = require("../services/userService");
const AppError_1 = require("../utils/AppError");
exports.getMe = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new AppError_1.AppError("Authentication required", 401);
    }
    const user = await (0, userService_1.getUserById)(req.user.id);
    res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    });
});
exports.getAllUsers = (0, asyncHandler_1.asyncHandler)(async (_req, res) => {
    const users = await (0, userService_1.listUsers)();
    const sanitized = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    }));
    res.status(200).json(sanitized);
});
