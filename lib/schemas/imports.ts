import { z } from "zod";
import { recipeInputSchema } from "@/lib/schemas/recipe";

export const allowedImportMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const commitImportSchema = z.object({
  importId: z.string().cuid(),
  recipe: recipeInputSchema,
});

export type CommitImportInput = z.infer<typeof commitImportSchema>;
