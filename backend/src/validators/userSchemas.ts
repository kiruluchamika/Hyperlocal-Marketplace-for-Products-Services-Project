import { z } from "zod";

const optionalString = z.string().trim().min(1).optional();
const optionalPhone = z.string().trim().min(1).regex(/^\+?[0-9\s-()]+$/, "Invalid phone number format").optional();
const optionalProfileImage = z
  .string()
  .trim()
  .refine(
    (value) =>
      /^https?:\/\/.+/i.test(value) ||
      /^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=\s]+$/i.test(value),
    "Must be a valid image URL or encoded image data"
  )
  .optional();

export const updateProfileSchema = z
  .object({
    name: optionalString,
    phone: optionalPhone,
    age: z.number().min(18, "You must be at least 18 years old").max(120, "Invalid age").optional(),
    address: z
      .object({
        street: optionalString,
        city: optionalString,
        province: optionalString,
        postalCode: optionalString,
        country: optionalString
      })
      .partial()
      .optional(),
    profileImage: z.union([optionalProfileImage, z.null()]).optional(),
    bio: z.string().trim().max(500, "Bio cannot exceed 500 characters").optional(),
    sellerProfile: z
      .object({
        businessName: optionalString,
        serviceArea: optionalString,
        description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional()
      })
      .partial()
      .optional(),
    preferences: z
      .object({
        emailNotifications: z.boolean().optional(),
        pushNotifications: z.boolean().optional(),
        marketingEmails: z.boolean().optional()
      })
      .partial()
      .optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one profile field is required"
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: z.string().min(6, "New password must be at least 6 characters")
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"]
  });
