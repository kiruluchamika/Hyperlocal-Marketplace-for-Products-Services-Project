"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = void 0;
const notFound = (req, res, _next) => {
    res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};
exports.notFound = notFound;
