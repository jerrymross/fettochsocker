import { z } from "zod";
import { UserRole } from "@prisma/client";

export const updateRecipeVisibilitySchema = z.object({
  recipeId: z.string().cuid(),
  isPublic: z.boolean(),
});

export const recipePackageInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  recipeIds: z.array(z.string().cuid()).max(200).default([]),
  userIds: z.array(z.string().cuid()).max(200).default([]),
});

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export type UpdateRecipeVisibilityInput = z.infer<typeof updateRecipeVisibilitySchema>;
export type RecipePackageInput = z.infer<typeof recipePackageInputSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
