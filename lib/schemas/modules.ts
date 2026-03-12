import { ModuleKey } from "@prisma/client";
import { z } from "zod";

export const updateModuleSchema = z.object({
  key: z.nativeEnum(ModuleKey),
  enabled: z.boolean(),
});
