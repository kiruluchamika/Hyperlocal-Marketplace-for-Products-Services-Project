"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../utils/AppError");
const env_1 = require("../config/env");
const signToken = (userId, role) => {
    return jsonwebtoken_1.default.sign({ role }, env_1.env.JWT_SECRET, {
        expiresIn: env_1.env.JWT_EXPIRES_IN,
        subject: userId
    });
};
const sanitizeUser = (user) => ({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role
});
const registerUser = async (input) => {
    const existing = await User_1.default.findOne({ email: input.email });
    if (existing) {
        throw new AppError_1.AppError("Email already in use", 409);
    }
    const hashed = await bcryptjs_1.default.hash(input.password, 10);
    const user = await User_1.default.create({
        name: input.name,
        email: input.email,
        password: hashed,
        role: input.role ?? "buyer"
    });
    const token = signToken(user.id, user.role);
    return { user: sanitizeUser(user), token };
};
exports.registerUser = registerUser;
const loginUser = async (input) => {
    const user = await User_1.default.findOne({ email: input.email }).select("+password");
    if (!user) {
        throw new AppError_1.AppError("Invalid credentials", 401);
    }
    const matched = await bcryptjs_1.default.compare(input.password, user.password);
    if (!matched) {
        throw new AppError_1.AppError("Invalid credentials", 401);
    }
    const token = signToken(user.id, user.role);
    return { user: sanitizeUser(user), token };
};
exports.loginUser = loginUser;
