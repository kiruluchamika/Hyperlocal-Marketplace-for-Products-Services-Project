import { Router } from "express";
import { register, login } from "../controllers/authController";
import { validate } from "../middlewares/validate";
import { registerSchema, loginSchema } from "../validators/authSchemas";

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user with complete profile information
 *     description: Creates a new user account with 'user' role. All users can both buy and sell products. Requires age 18+.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phone, age, address]
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *               phone:
 *                 type: string
 *                 minLength: 10
 *                 example: "+94771234567"
 *               age:
 *                 type: number
 *                 minimum: 18
 *                 maximum: 120
 *                 example: 25
 *               address:
 *                 type: object
 *                 required: [city, country]
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "123 Main Street"
 *                   city:
 *                     type: string
 *                     example: "Colombo"
 *                   province:
 *                     type: string
 *                     example: "Western"
 *                   postalCode:
 *                     type: string
 *                     example: "00100"
 *                   country:
 *                     type: string
 *                     default: "Sri Lanka"
 *                     example: "Sri Lanka"
 *               profileImage:
 *                 type: string
 *                 format: uri
 *                 example: "https://example.com/profile.jpg"
 *               bio:
 *                 type: string
 *                 maxLength: 500
 *                 example: "I love buying and selling products locally!"
 *     responses:
 *       201:
 *         description: User registered successfully with JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *                     phone:
 *                       type: string
 *                     age:
 *                       type: number
 *                     address:
 *                       type: object
 *                     profileImage:
 *                       type: string
 *                     bio:
 *                       type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error or age restriction
 *       409:
 *         description: Email already in use
 */
router.post("/register", validate(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     description: Authenticates user and returns JWT token for API access
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
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *             required: [email, password]
 *     responses:
 *       200:
 *         description: Logged in successfully with JWT token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [user, admin]
 *                 token:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), login);

export default router;
