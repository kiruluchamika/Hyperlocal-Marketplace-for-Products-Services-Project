import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import {
  createCategoryHandler,
  getCategoriesHandler,
  getCategoryByIdHandler,
  updateCategoryHandler,
  deleteCategoryHandler
} from "../controllers/categoryController";
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  getCategoriesQuerySchema
} from "../validators/categorySchemas";

const router = Router();

/**
 * @openapi
 * /categories:
 *   post:
 *     tags: [Categories]
 *     summary: Create a new category (admin only)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [PRODUCT, SERVICE]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fieldName:
 *                       type: string
 *                     fieldType:
 *                       type: string
 *                       enum: [string, number, boolean, select]
 *                     required:
 *                       type: boolean
 *                       default: false
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *               isActive:
 *                 type: boolean
 *                 default: true
 *             required: [name, type]
 *     responses:
 *       201:
 *         description: Category created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - Admin only
 *       409:
 *         description: Category name already exists
 */
router.post("/", auth, requireRole(["admin"]), validate(createCategorySchema), createCategoryHandler);

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Categories]
 *     summary: Get all categories (public)
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [PRODUCT, SERVICE]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: string
 *           enum: [true, false]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get("/", validate(getCategoriesQuerySchema, "query"), getCategoriesHandler);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Categories]
 *     summary: Get a category by ID (public)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category details
 *       404:
 *         description: Category not found
 */
router.get("/:id", validate(categoryIdParamSchema, "params"), getCategoryByIdHandler);

/**
 * @openapi
 * /categories/{id}:
 *   put:
 *     tags: [Categories]
 *     summary: Update a category (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *               type:
 *                 type: string
 *                 enum: [PRODUCT, SERVICE]
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               attributes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fieldName:
 *                       type: string
 *                     fieldType:
 *                       type: string
 *                       enum: [string, number, boolean, select]
 *                     required:
 *                       type: boolean
 *                     options:
 *                       type: array
 *                       items:
 *                         type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Category updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category name already exists
 */
router.put(
  "/:id",
  auth,
  requireRole(["admin"]),
  validate(categoryIdParamSchema, "params"),
  validate(updateCategorySchema),
  updateCategoryHandler
);

/**
 * @openapi
 * /categories/{id}:
 *   delete:
 *     tags: [Categories]
 *     summary: Delete a category (admin only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Category not found
 */
router.delete(
  "/:id",
  auth,
  requireRole(["admin"]),
  validate(categoryIdParamSchema, "params"),
  deleteCategoryHandler
);

export default router;
