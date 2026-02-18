"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listUsers = exports.getUserById = void 0;
const User_1 = __importDefault(require("../models/User"));
const AppError_1 = require("../utils/AppError");
const getUserById = async (userId) => {
    const user = await User_1.default.findById(userId);
    if (!user) {
        throw new AppError_1.AppError("User not found", 404);
    }
    return user;
};
exports.getUserById = getUserById;
const listUsers = async () => {
    return User_1.default.find();
};
exports.listUsers = listUsers;
