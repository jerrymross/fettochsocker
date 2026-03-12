export const defaultRecipeCategoryNames = [
  "Konditori",
  "Bageri",
  "Kräm",
  "Fyllning",
  "Dessert",
  "Laminerat",
] as const;

export type RecipeCategoryOption = {
  id: string;
  name: string;
};

export function normalizeRecipeCategoryName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
