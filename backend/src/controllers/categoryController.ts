import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
} from "../services/categoryService";

const toCategoryResponse = (category: any) => ({
  _id: category.id,
  name: category.name,
  type: category.type,
  description: category.description,
  image: category.image,
  attributes: category.attributes,
  isActive: category.isActive,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt
});

export const createCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const category = await createCategory(req.body);
  res.status(201).json(toCategoryResponse(category));
});

export const getCategoriesHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await getAllCategories(req.query as any);
  
  res.status(200).json({
    data: result.data.map(toCategoryResponse),
    pagination: result.pagination
  });
});

export const getCategoryByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  const category = await getCategoryById(req.params.id);
  res.status(200).json(toCategoryResponse(category));
});

export const updateCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const category = await updateCategory(req.params.id, req.body);
  res.status(200).json(toCategoryResponse(category));
});

export const deleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteCategory(req.params.id);
  res.status(200).json({ 
    message: "Category deleted successfully" 
  });
});
