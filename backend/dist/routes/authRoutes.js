"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validate_1 = require("../middlewares/validate");
const authSchemas_1 = require("../validators/authSchemas");
const router = (0, express_1.Router)();
/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *               role:
 *                 type: string
 *                 enum: [admin, seller, buyer]
 *             required: [name, email, password]
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation error
 */
router.post("/register", (0, validate_1.validate)(authSchemas_1.registerSchema), authController_1.register);
/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Logged in
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", (0, validate_1.validate)(authSchemas_1.loginSchema), authController_1.login);
exports.default = router;
