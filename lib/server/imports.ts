import { IngredientUnit } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CommitImportInput } from "@/lib/schemas/imports";
import { saveRecipe } from "@/lib/server/recipes";

type ParsedRecipePreview = {
  title: string;
  description: string;
  categoryIds: string[];
  isPublic: boolean;
  ingredients: Array<{ name: string; quantity: number; unit: IngredientUnit; note?: string }>;
  steps: Array<{ instruction: string }>;
  rawText: string;
};

type UnstructuredElement = {
  text?: string;
};

type ImportFileKind = "txt" | "docx" | "pdf" | "image" | "unknown";

const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const supportedImageExtensions = [".jpg", ".jpeg", ".png", ".webp"];
const imageOcrTimeoutMs = 45_000;

const ingredientHeadings = new Set(["ingredient", "ingredients", "ingrediens", "ingredienser"]);
const methodHeadings = new Set([
  "step",
  "steps",
  "steg",
  "method",
  "instructions",
  "instruktioner",
  "metod",
  "tillagning",
  "tillvagagangssatt",
  "gorsahar",
]);
const amountHeadings = new Set(["amount", "amounts", "mangd", "mangdg", "quantity", "quantityg", "gram"]);
const yieldPrefixes = ["serves", "yield", "makes", "ger", "portioner", "ca"];
const metadataHeadings = new Set(["riktlinjer", "guidelines", "ekonomi", "economy", "naringsvarde", "nutrition"]);
function normalizeLine(line: string) {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeExtractedText(rawText: string) {
  return rawText
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function canonicalizeForMatch(line: string) {
  return normalizeLine(line)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function sanitizeTitle(line: string) {
  return line.replace(/\s*-\s*(recept|recipe)$/i, "").trim();
}

function isIngredientHeading(line: string) {
  const canonical = canonicalizeForMatch(line);
  return ingredientHeadings.has(canonical) || canonical.startsWith("ingredien");
}

function isMethodHeading(line: string) {
  const canonical = canonicalizeForMatch(line);
  return (
    methodHeadings.has(canonical) ||
    canonical.startsWith("tillv") ||
    canonical.startsWith("instrukt") ||
    canonical.startsWith("gorsa")
  );
}

function isAmountHeading(line: string) {
  const canonical = canonicalizeForMatch(line);
  return amountHeadings.has(canonical) || canonical.startsWith("mangd") || canonical.startsWith("mngd");
}

function isStepStart(line: string) {
  return /^\d+[.)]\s+/.test(line);
}

function isBareStepNumber(line: string) {
  return /^\d+[.)]?$/.test(line.trim());
}

function isYieldLine(line: string) {
  const canonical = canonicalizeForMatch(line);
  return yieldPrefixes.some((prefix) => canonical.startsWith(prefix));
}

function parseQuantityValue(line: string) {
  const normalized = line.replace(",", ".").replace(/[^\d.\- ]/g, " ").trim();
  const rangeMatch = normalized.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return Number(rangeMatch[1]);
  }

  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function parseQuantity(line: string) {
  return parseQuantityValue(line);
}

function extractIngredientName(line: string) {
  return line
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/\s+\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*(g|gram|grams|kg|ml|cl|dl|l|tsk|tsp|msk|tbsp|st|pcs)?$/i, "")
    .trim();
}

function looksLikeQuantityOnly(line: string) {
  return /^(\d+(?:[.,]\d+)?)(\s*-\s*\d+(?:[.,]\d+)?)?\s*(g|gram|grams|kg|ml|cl|dl|l|tsk|tsp|msk|tbsp|st|pcs)?$/i.test(line);
}

function isIngredientTableHeader(line: string) {
  const canonical = canonicalizeForMatch(line);
  return canonical.includes("ingredien") && (canonical.includes("mangd") || canonical.includes("quantity") || canonical.includes("vikt"));
}

function isPageBreakLine(line: string) {
  return canonicalizeForMatch(line).includes("page") && canonicalizeForMatch(line).includes("break");
}

function isMetadataHeading(line: string) {
  return metadataHeadings.has(canonicalizeForMatch(line));
}

function looksLikeInstruction(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized || normalized.length < 6) {
    return false;
  }

  if (isIngredientHeading(normalized) || isMethodHeading(normalized) || isAmountHeading(normalized)) {
    return false;
  }

  if (looksLikeQuantityOnly(normalized) || parseInlineIngredientLine(normalized)) {
    return false;
  }

  return /[.!?]$/.test(normalized) || normalized.includes(",");
}

function isLikelyMethodTransition(lines: string[], index: number) {
  const line = normalizeLine(lines[index] ?? "");
  const nextLine = normalizeLine(lines[index + 1] ?? "");

  if (!line) {
    return false;
  }

  if (isMethodHeading(line) || isStepStart(line)) {
    return true;
  }

  if (isBareStepNumber(line) && looksLikeInstruction(nextLine)) {
    return true;
  }

  return false;
}

function parseInlineIngredientLine(line: string) {
  const match = line.match(/^(.*\D)\s+(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*(?:g|gram|grams|kg|ml|cl|dl|l|tsk|tsp|msk|tbsp|st|pcs)?$/i);
  if (!match) {
    return null;
  }

  return {
    name: extractIngredientName(match[1]).trim(),
    quantity: parseQuantity(match[2]) || 1,
    unit: IngredientUnit.G,
  };
}

function isLikelySectionTitle(line: string) {
  if (isIngredientHeading(line) || isMethodHeading(line) || isAmountHeading(line)) {
    return false;
  }

  if (isStepStart(line) || looksLikeQuantityOnly(line) || isYieldLine(line)) {
    return false;
  }

  return /^[\p{L}0-9][\p{L}0-9 ,()/'’&+-]{2,80}$/u.test(line) && !line.endsWith(":") && !line.endsWith(".");
}

function findNextSectionIndex(lines: string[], startIndex: number) {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (isLikelySectionTitle(lines[index])) {
      const lookahead = lines.slice(index + 1, index + 4);
      if (lookahead.some((line) => isIngredientHeading(line))) {
        return index;
      }
    }
  }

  return lines.length;
}

function parseIngredientLines(lines: string[]) {
  const ingredients: ParsedRecipePreview["ingredients"] = [];
  let pendingName: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = normalizeLine(rawLine);
    if (!line) {
      continue;
    }

    if (isAmountHeading(line) || isIngredientHeading(line) || isMethodHeading(line) || isIngredientTableHeader(line) || isPageBreakLine(line) || isMetadataHeading(line)) {
      continue;
    }

    if (isLikelyMethodTransition(lines, index)) {
      break;
    }

    if (looksLikeQuantityOnly(line) && pendingName) {
      ingredients.push({
        name: pendingName,
        quantity: parseQuantity(line) || 1,
        unit: IngredientUnit.G,
      });
      pendingName = null;
      continue;
    }

    const parsedInlineIngredient = parseInlineIngredientLine(line);
    if (parsedInlineIngredient) {
      ingredients.push({
        name: parsedInlineIngredient.name || "Ingredient",
        quantity: parsedInlineIngredient.quantity,
        unit: IngredientUnit.G,
      });
      pendingName = null;
      continue;
    }

    if (pendingName) {
      ingredients.push({
        name: pendingName,
        quantity: 1,
        unit: IngredientUnit.G,
      });
    }

    pendingName = line;
  }

  if (pendingName) {
    ingredients.push({
      name: pendingName,
      quantity: 1,
      unit: IngredientUnit.G,
    });
  }

  return ingredients.filter((ingredient) => ingredient.name.length > 0);
}

function parseStepLines(lines: string[]) {
  const steps: ParsedRecipePreview["steps"] = [];
  let currentStep: string | null = null;
  let waitingForBareStepInstruction = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = normalizeLine(lines[index]);
    if (!line) {
      continue;
    }

    if (isMetadataHeading(line) || isPageBreakLine(line)) {
      break;
    }

    if (isLikelySectionTitle(line)) {
      const lookahead = lines.slice(index + 1, index + 4).map(normalizeLine);
      if (lookahead.some((entry) => isIngredientHeading(entry))) {
        break;
      }
    }

    if (isStepStart(line)) {
      if (currentStep) {
        steps.push({ instruction: currentStep });
      }

      currentStep = line.replace(/^\d+[.)]\s+/, "").trim();
      waitingForBareStepInstruction = false;
      continue;
    }

    if (isBareStepNumber(line)) {
      if (currentStep) {
        steps.push({ instruction: currentStep });
      }

      currentStep = null;
      waitingForBareStepInstruction = true;
      continue;
    }

    if (isMethodHeading(line) || isIngredientHeading(line) || isAmountHeading(line)) {
      continue;
    }

    if (waitingForBareStepInstruction) {
      currentStep = line;
      waitingForBareStepInstruction = false;
      continue;
    }

    if (currentStep) {
      currentStep = `${currentStep} ${line}`.trim();
    } else {
      currentStep = line;
    }
  }

  if (currentStep) {
    steps.push({ instruction: currentStep });
  }

  return steps.filter((step) => step.instruction.length > 0);
}

function detectFileKind(file: File): ImportFileKind {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  if (mimeType === "text/plain" || fileName.endsWith(".txt")) {
    return "txt";
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    return "docx";
  }

  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) {
    return "pdf";
  }

  if (
    supportedImageMimeTypes.has(mimeType) ||
    supportedImageExtensions.some((extension) => fileName.endsWith(extension))
  ) {
    return "image";
  }

  return "unknown";
}

export function mapRecipeFromText(rawText: string): ParsedRecipePreview {
  const lines = rawText
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const title = sanitizeTitle(lines[0] || "Imported recipe") || "Imported recipe";
  const ingredientIndex = lines.findIndex((line) => isIngredientHeading(line));
  const stepIndex = lines.findIndex((line, index) => index > ingredientIndex && (isMethodHeading(line) || isStepStart(line) || isBareStepNumber(line)));
  const descriptionLines = lines
    .slice(1, ingredientIndex > 0 ? ingredientIndex : 3)
    .filter((line) => !isAmountHeading(line) && !isIngredientHeading(line) && !isMethodHeading(line) && !isIngredientTableHeader(line));
  const ingredientSectionEnd =
    stepIndex > ingredientIndex
      ? stepIndex
      : findNextSectionIndex(lines, ingredientIndex > -1 ? ingredientIndex + 1 : 1);
  const ingredientLines =
    ingredientIndex >= 0
      ? lines.slice(ingredientIndex + 1, ingredientSectionEnd)
      : lines.filter((line) => looksLikeQuantityOnly(line) || /\b(g|kg|ml|cl|dl|l|tsk|tsp|msk|tbsp|st|pcs)\b/i.test(line));
  const stepLines =
    stepIndex >= 0
      ? lines.slice(isMethodHeading(lines[stepIndex]) ? stepIndex + 1 : stepIndex, findNextSectionIndex(lines, stepIndex + 1))
      : lines.filter((line) => isStepStart(line));

  const ingredients = parseIngredientLines(ingredientLines);
  const steps = parseStepLines(stepLines);

  return {
    title,
    description: descriptionLines.join(" ") || "Imported from source document.",
    categoryIds: [],
    isPublic: false,
    ingredients: ingredients.length > 0 ? ingredients : [{ name: "Ingredient", quantity: 1, unit: IngredientUnit.G }],
    steps: steps.length > 0 ? steps : [{ instruction: "Review and complete the imported procedure." }],
    rawText,
  };
}

async function parseWithUnstructured(file: File) {
  const apiUrl = process.env.UNSTRUCTURED_API_URL;
  const apiKey = process.env.UNSTRUCTURED_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("Unstructured is not configured.");
  }

  const formData = new FormData();
  formData.set("files", file, file.name);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Unstructured parsing failed: ${message}`);
  }

  const payload = (await response.json()) as UnstructuredElement[];
  return payload
    .map((element) => element.text?.trim())
    .filter(Boolean)
    .join("\n");
}

async function parseLocally(file: File) {
  const fileKind = detectFileKind(file);

  if (fileKind === "txt") {
    return file.text();
  }

  if (fileKind === "docx") {
    const mammoth = await import("mammoth");
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  if (fileKind === "pdf") {
    const pdf2jsonModule = await import("pdf2json");
    const PDFParser = pdf2jsonModule.default;
    const buffer = Buffer.from(await file.arrayBuffer());

    const rawText = await new Promise<string>((resolve, reject) => {
      const parser = new PDFParser(null, true);

      parser.on("pdfParser_dataReady", () => {
        try {
          resolve(parser.getRawTextContent().trim());
        } catch (error) {
          reject(error);
        } finally {
          parser.destroy();
        }
      });

      parser.on("pdfParser_dataError", (error) => {
        parser.destroy();
        if (error instanceof Error) {
          reject(error);
          return;
        }

        reject(error.parserError);
      });

      parser.parseBuffer(buffer, 0);
    });

    return rawText;
  }

  if (fileKind === "image") {
    const tesseractModule = await import("tesseract.js");
    const recognize = tesseractModule.default.recognize;
    const buffer = Buffer.from(await file.arrayBuffer());

    try {
      const result = await withTimeout(
        recognize(buffer, "swe+eng"),
        imageOcrTimeoutMs,
        "Photo import timed out. Try cropping the photo tighter around the recipe.",
      );
      return result.data.text.trim();
    } catch (error) {
      console.warn("Image OCR with swe+eng failed, retrying with eng.", error);
      const fallbackResult = await withTimeout(
        recognize(buffer, "eng"),
        imageOcrTimeoutMs,
        "Photo import timed out. Try cropping the photo tighter around the recipe.",
      );
      return fallbackResult.data.text.trim();
    }
  }

  throw new Error("Unsupported file type.");
}

async function parseFileToText(file: File) {
  const apiUrl = process.env.UNSTRUCTURED_API_URL;
  const apiKey = process.env.UNSTRUCTURED_API_KEY;

  if (apiUrl && apiKey) {
    try {
      return normalizeExtractedText(await parseWithUnstructured(file));
    } catch (error) {
      console.warn("Unstructured parsing failed, falling back to local parser.", error);
    }
  }

  const rawText = normalizeExtractedText(await parseLocally(file));

  if (!rawText.trim()) {
    if (detectFileKind(file) === "image") {
      throw new Error("No readable text was found in the photo. Try a sharper image with better contrast.");
    }

    if (detectFileKind(file) === "pdf") {
      throw new Error("The PDF could not be parsed locally. If it is scanned, configure Unstructured OCR support.");
    }

    throw new Error("No readable text could be extracted from the uploaded file.");
  }

  return rawText;
}

export async function createImportPreview(userId: string, file: File) {
  const rawText = await parseFileToText(file);
  return createImportPreviewFromText(userId, {
    mimeType: file.type || "application/octet-stream",
    rawText,
    sourceFileName: file.name,
  });
}

export async function createImportPreviewFromText(
  userId: string,
  input: {
    rawText: string;
    sourceFileName: string;
    mimeType?: string;
  },
) {
  const rawText = normalizeExtractedText(input.rawText);

  if (!rawText.trim()) {
    throw new Error("No readable text could be extracted from the uploaded file.");
  }

  const mapped = mapRecipeFromText(rawText);

  const importJob = await prisma.importJob.create({
    data: {
      userId,
      sourceFileName: input.sourceFileName,
      mimeType: input.mimeType || "application/octet-stream",
      rawText,
      parsedTitle: mapped.title,
      parsedDescription: mapped.description,
      mappedRecipeJson: mapped,
      status: "PARSED",
    },
  });

  return {
    importId: importJob.id,
    recipe: mapped,
  };
}

export async function commitImport(userId: string, input: CommitImportInput) {
  const importJob = await prisma.importJob.findUnique({
    where: { id: input.importId },
  });

  if (!importJob || importJob.userId !== userId) {
    throw new Error("Import job not found.");
  }

  const recipe = await saveRecipe(input.recipe, userId);

  await prisma.importJob.update({
    where: { id: input.importId },
    data: {
      importedRecipeId: recipe.id,
      status: "IMPORTED",
      mappedRecipeJson: input.recipe,
    },
  });

  return recipe;
}
