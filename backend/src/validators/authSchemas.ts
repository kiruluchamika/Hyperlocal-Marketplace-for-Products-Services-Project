import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format"),
  age: z.number().min(18, "You must be at least 18 years old").max(120, "Invalid age"),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(2, "City is required"),
    province: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().min(2, "Country is required").default("Sri Lanka")
  }),
  profileImage: z.string().url("Must be a valid URL").optional(),
  bio: z.string().max(500, "Bio cannot exceed 500 characters").optional()
});

export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
