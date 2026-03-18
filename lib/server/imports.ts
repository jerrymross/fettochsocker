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

type ImportFileKind = "txt" | "docx" | "pdf" | "unknown";

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
const methodVerbHints = [
  "koka",
  "vispa",
  "blanda",
  "ror",
  "smalt",
  "baka",
  "sjud",
  "varm",
  "tillsatt",
  "mixa",
  "boil",
  "whisk",
  "mix",
  "stir",
  "heat",
  "bring",
];
const ingredientLineUnitPattern =
  /(kg|g|gr|gram|grams|ml|cl|dl|l|tsk|tsp|teaspoon|teaspoons|msk|tbsp|tablespoon|tablespoons|st|pcs|pc|stycken?)/i;
const ingredientUnitAliases: Array<[RegExp, IngredientUnit]> = [
  [/^(g|gr|gram|grams)$/i, IngredientUnit.G],
  [/^kg$/i, IngredientUnit.KG],
  [/^ml$/i, IngredientUnit.ML],
  [/^cl$/i, IngredientUnit.CL],
  [/^dl$/i, IngredientUnit.DL],
  [/^l$/i, IngredientUnit.L],
  [/^(tsk|tsp|teaspoon|teaspoons)$/i, IngredientUnit.TSP],
  [/^(msk|tbsp|tablespoon|tablespoons)$/i, IngredientUnit.TBSP],
  [/^(st|pcs|pc|stycken?)$/i, IngredientUnit.PCS],
];
const recipeWordReplacements: Array<[RegExp, string]> = [
  [/\bganache\s+\d{1,2}\b/gi, "ganache"],
  [/\bkaffegr[a-z\u00e5\u00e4\u00f6]{2,8}\b/gi, "kaffegradde"],
  [/\bgr[a-z\u00e5\u00e4\u00f6]{2,6}dde\b/gi, "gradde"],
  [/\baggen\b/gi, "aggen"],
  [/\bagg\b/gi, "agg"],
  [/\b(?:f|ph)?l?[o0]r?socker\b/gi, "florsocker"],
  [/\b(?:g[il1]y?[kmu][o0]s|glukos)\b/gi, "glykos"],
  [/\b(?:smor|smon|spon|smoor)\b\.?/gi, "smor"],
  [/\bhall\b/gi, "hall"],
  [/\bvand\b/gi, "vand"],
  [/\b(?:kaf+egr[ae]dde)\b/gi, "kaffegradde"],
  [/\bsv[a-z]{3,6}\b(?=.*koka)/gi, "gradde"],
  [/\bgimus\b/gi, "glykos"],
  [/\bluks\b/gi, "glykos"],
  [/\baorsocker\b/gi, "florsocker"],
  [/\bsme\b/gi, "smor"],
];
const commonRecipeTerms = [
  "ganache",
  "kaffegradde",
  "vispgradde",
  "gradde",
  "gradda",
  "ugn",
  "ugnen",
  "grad",
  "grader",
  "minut",
  "minuter",
  "smor",
  "florsocker",
  "strosocker",
  "socker",
  "glykos",
  "choklad",
  "aggen",
  "agg",
  "mjolk",
  "vanilj",
  "kakao",
  "koka",
  "blanda",
  "vispa",
  "satt",
  "forvarm",
  "smalt",
  "ror",
  "tillsatt",
  "hall",
  "vand",
];
const extraMethodVerbHints = ["sikta", "rora", "hall", "lat", "vand", "satt", "forvarm", "gradda", "stek", "rosta", "pensla"];
const ingredientNameHints = [
  "mjol",
  "vetemjol",
  "bakpulver",
  "vaniljkram",
  "smorkram",
  "mousse",
  "fyllning",
  "salt",
  "socker",
  "florsocker",
  "strosocker",
  "glykos",
  "choklad",
  "smor",
  "gradde",
  "kaffegradde",
  "mjolk",
  "kakao",
  "vanilj",
  "agg",
  "olja",
  "jast",
];
const extraCommonRecipeTerms = ["mjol", "vetemjol", "bakpulver", "salt", "kaka", "vaniljkram", "smorkram", "mousse", "fyllning"];
function normalizeLine(line: string) {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[|]/g, "\n")
    .replace(/\s+/g, " ")
    .replace(/\s*[=:]+$/g, "")
    .trim();
}

function sanitizeIngredientName(name: string) {
  const normalized = repairRecipeText(
    extractIngredientName(name)
      .replace(/\b[il1]\b/gi, " ")
      .replace(/\b[a-z]{1,2}\b(?=\s+(kaffegradde|gradde|smor|florsocker|strosocker|socker|glykos|choklad)\b)/gi, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

  if (/^c[.\-]?$/i.test(normalized)) {
    return "Choklad";
  }

  return normalized
    .replace(/\bfe\b$/i, "")
    .replace(/\b(?:od|ool)\b$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanupOcrLineArtifacts(line: string) {
  return repairRecipeText(
    normalizeLine(line)
      .replace(/(\d)\s*%/g, "$15")
      .replace(/(\d{1,4})\s*9(?=\s+[A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6])/g, "$1 g")
      .replace(/(\d{1,4})g(?=\s*[A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6])/gi, "$1 g ")
      .replace(/^\s*sx\s+([A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6. ]+?)\s*[.:]?\s*\d?\s*$/i, "40 g $1")
      .replace(/^\s*oop\s+c(?:[.\-\s]|$).*$/i, "300 g c.")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeExtractedText(rawText: string) {
  return rawText
    .replace(/\r/g, "")
    .replace(/([A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6])\s+(?=(ingredienser|ingredients|steg|steps|method|metod|instructions|instruktioner)\b)/gi, "$1\n")
    .replace(/\b(ingredienser|ingredients|steg|steps|method|metod|instructions|instruktioner)\s*:/gi, "$1\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function canonicalizeForMatch(line: string) {
  return normalizeLine(line)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function toAsciiWord(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (!left.length) {
    return right.length;
  }

  if (!right.length) {
    return left.length;
  }

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 0; row < left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row + 1;

    for (let column = 0; column < right.length; column += 1) {
      const saved = previous[column + 1];
      const cost = left[row] === right[column] ? 0 : 1;
      previous[column + 1] = Math.min(previous[column + 1] + 1, previous[column] + 1, diagonal + cost);
      diagonal = saved;
    }
  }

  return previous[right.length];
}

function restoreNordicWord(value: string) {
  return value
    .replace(/gradde/gi, "grädde")
    .replace(/gradda/gi, "grädda")
    .replace(/mjol/gi, "mjöl")
    .replace(/smor/gi, "smör")
    .replace(/vaniljkram/gi, "vaniljkräm")
    .replace(/smorkram/gi, "smörkräm")
    .replace(/strosocker/gi, "strösocker")
    .replace(/satt/gi, "sätt")
    .replace(/forvarm/gi, "förvärm")
    .replace(/mjolk/gi, "mjölk")
    .replace(/tillsatt/gi, "tillsätt")
    .replace(/ror/gi, "rör")
    .replace(/smalt/gi, "smält");
}

function restoreNordicWordSafe(value: string) {
  return value
    .replace(/gradde/gi, "grädde")
    .replace(/gradda/gi, "grädda")
    .replace(/mjol/gi, "mjöl")
    .replace(/smor/gi, "smör")
    .replace(/vaniljkram/gi, "vaniljkräm")
    .replace(/smorkram/gi, "smörkräm")
    .replace(/strosocker/gi, "strösocker")
    .replace(/satt/gi, "sätt")
    .replace(/forvarm/gi, "förvärm")
    .replace(/mjolk/gi, "mjölk")
    .replace(/tillsatt/gi, "tillsätt")
    .replace(/ror/gi, "rör")
    .replace(/smalt/gi, "smält")
    .replace(/aggen/gi, "äggen")
    .replace(/agg/gi, "ägg")
    .replace(/hall/gi, "häll")
    .replace(/vand/gi, "vänd");
}

function repairRecipeToken(token: string) {
  const prefix = token.match(/^[^A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6]*/u)?.[0] ?? "";
  const suffix = token.match(/[^A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f60-9.]*$/u)?.[0] ?? "";
  const core = token.slice(prefix.length, token.length - suffix.length || token.length);
  const asciiCore = toAsciiWord(core);

  if (asciiCore.length < 3) {
    return token;
  }

  let candidate = asciiCore;
  for (const [pattern, replacement] of recipeWordReplacements) {
    pattern.lastIndex = 0;
    if (pattern.test(candidate)) {
      candidate = replacement;
    }
  }

  let bestMatch = candidate;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const term of [...commonRecipeTerms, ...extraCommonRecipeTerms]) {
    const distance = levenshteinDistance(candidate, term);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = term;
    }
  }

  const allowedDistance = candidate.length >= 8 ? 3 : candidate.length >= 5 ? 2 : 1;
  const normalized = bestDistance <= allowedDistance ? bestMatch : candidate;
  return `${prefix}${restoreNordicWordSafe(restoreNordicWord(normalized))}${suffix}`;
}

function repairRecipeText(line: string) {
  return normalizeLine(line)
    .split(/\s+/)
    .map((token) => repairRecipeToken(token))
    .join(" ")
    .replace(/\s+([.,:;])/g, "$1")
    .trim();
}

function toDisplayTitle(value: string) {
  return value
    .split(/\s+/)
    .map((token) => (token ? `${token.slice(0, 1).toUpperCase()}${token.slice(1).toLowerCase()}` : token))
    .join(" ")
    .trim();
}

function sanitizeTitle(line: string) {
  return toDisplayTitle(
    repairRecipeText(line)
    .replace(/\s*-\s*(recept|recipe)$/i, "")
    .replace(/\s+\d{1,2}$/i, "")
    .trim(),
  );
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

function detectIngredientUnit(value?: string | null) {
  if (!value) {
    return IngredientUnit.G;
  }

  const normalized = value.trim().toLowerCase();
  for (const [pattern, unit] of ingredientUnitAliases) {
    if (pattern.test(normalized)) {
      return unit;
    }
  }

  return IngredientUnit.G;
}

function extractIngredientUnitFromLine(line: string) {
  const match = normalizeLine(line).match(
    /(\bkg\b|\bg\b|\bgr\b|\bgram\b|\bgrams\b|\bml\b|\bcl\b|\bdl\b|\bl\b|\btsk\b|\btsp\b|\bteaspoon(?:s)?\b|\bmsk\b|\btbsp\b|\btablespoon(?:s)?\b|\bst\b|\bpcs\b|\bpc\b|\bstycken?\b)/i,
  );

  return detectIngredientUnit(match?.[0]);
}

function extractIngredientName(line: string) {
  return line
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/\s+\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*(g|gram|grams|kg|ml|cl|dl|l|tsk|tsp|msk|tbsp|st|pcs)?$/i, "")
    .trim();
}

function looksLikeQuantityOnly(line: string) {
  return /^(\d+(?:[.,]\d+)?)(\s*-\s*\d+(?:[.,]\d+)?)?\s*(kg|g|gr|gram|grams|ml|cl|dl|l|tsk|tsp|teaspoon|teaspoons|msk|tbsp|tablespoon|tablespoons|st|pcs|pc|stycken?)?$/i.test(line);
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

  return /[.!?]$/.test(normalized) || normalized.includes(",") || startsWithMethodVerb(normalized) || looksLikeTemperatureOrOvenInstruction(normalized);
}

function sanitizeInstruction(line: string) {
  return repairRecipeText(
    normalizeLine(line)
      .replace(/^[=\-*>:.\s]+/, "")
      .replace(/^[A-Za-z]\s+(?=(koka|blanda|vispa|smält|smalt|rör|ror|tillsätt|tillsatt|häll|hall|vänd|vand|sätt|satt|förvärm|forvarm|grädda|gradda)\b)/i, "")
      .replace(/\s*[=:]+$/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function containsIngredientHint(line: string) {
  const canonical = canonicalizeForMatch(line);
  return ingredientNameHints.some((hint) => canonical.includes(hint));
}

function looksLikeTemperatureOrOvenInstruction(line: string) {
  const normalized = normalizeLine(line);
  const canonical = canonicalizeForMatch(normalized);

  if (!normalized) {
    return false;
  }

  const startsWithOvenInstruction =
    canonical.startsWith("sattugnen") ||
    canonical.startsWith("forvarmugnen") ||
    canonical.startsWith("varmugnen") ||
    canonical.startsWith("graddaiugnen");
  const hasOvenCue = canonical.includes("ugn") || canonical.includes("gradda") || canonical.includes("stek");
  const hasTempCue = /\d{2,3}(?:grader|grad|c)|\d{1,3}(?:min|minuter|tim|timmar)/.test(canonical);

  return startsWithOvenInstruction || (hasOvenCue && hasTempCue);
}

function startsWithMethodVerb(line: string) {
  const canonical = canonicalizeForMatch(line);
  return [...methodVerbHints, ...extraMethodVerbHints].some((verb) => canonical.startsWith(verb));
}

function isLikelyDescriptionLine(line: string) {
  const normalized = sanitizeInstruction(line);
  if (!normalized || isLikelyNoiseLine(normalized) || looksLikeIngredientLine(normalized) || looksLikeMethodLine(normalized)) {
    return false;
  }

  const wordCount = normalized.split(/\s+/).length;
  return wordCount >= 4 && !/\d/.test(normalized) && !containsIngredientHint(normalized);
}

function isLikelyNoiseLine(line: string) {
  const normalized = normalizeLine(line);
  const letterCount = (normalized.match(/[A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6]/g) ?? []).length;
  const symbolCount = (normalized.match(/[^A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f60-9\s]/g) ?? []).length;

  if (!normalized || letterCount < 2) {
    return true;
  }

  if (normalized.length <= 3 && letterCount <= 2) {
    return true;
  }

  return symbolCount >= Math.max(3, Math.ceil(normalized.length * 0.25));
}

function looksLikeMethodLine(line: string) {
  const normalized = normalizeLine(line);
  const canonical = canonicalizeForMatch(normalized);

  if (!normalized || isLikelyNoiseLine(normalized)) {
    return false;
  }

  if (looksLikeTemperatureOrOvenInstruction(normalized)) {
    return true;
  }

  if (looksLikeInstruction(normalized) || normalized.includes("=")) {
    return true;
  }

  if (startsWithMethodVerb(normalized)) {
    return true;
  }

  return [...methodVerbHints, ...extraMethodVerbHints].some((verb) => canonical.includes(verb));
}

function splitCompoundLine(line: string) {
  return line
    .replace(/\b(ingredienser|ingredients|steg|steps|method|metod|instructions|instruktioner)\b/gi, "\n$1\n")
    .replace(/\s+(?=\d+[.)]\s+[A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6])/g, "\n")
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);
}

function buildRecipeLines(rawText: string) {
  return normalizeExtractedText(rawText)
    .split(/\r?\n/)
    .map((line) => cleanupOcrLineArtifacts(line))
    .flatMap((line) => splitCompoundLine(line))
    .map(normalizeLine)
    .filter(Boolean);
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
  if (looksLikeTemperatureOrOvenInstruction(line)) {
    return null;
  }

  const amountFirstMatch = line.match(
    /^\s*[-*â€¢]?\s*(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*(kg|g|gr|gram|grams|ml|cl|dl|l|tsk|tsp|teaspoon|teaspoons|msk|tbsp|tablespoon|tablespoons|st|pcs|pc|stycken?)?\s+(.+)$/i,
  );

  if (amountFirstMatch) {
    return {
      name: sanitizeIngredientName(amountFirstMatch[3]),
      quantity: parseQuantity(amountFirstMatch[1]) || 1,
      unit: detectIngredientUnit(amountFirstMatch[2]),
    };
  }

  const amountLastMatch = line.match(
    /^(.*\D)\s+(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?)\s*(kg|g|gr|gram|grams|ml|cl|dl|l|tsk|tsp|teaspoon|teaspoons|msk|tbsp|tablespoon|tablespoons|st|pcs|pc|stycken?)?$/i,
  );

  if (!amountLastMatch) {
    return null;
  }

  const amountLastName = sanitizeIngredientName(amountLastMatch[1]);
  if (
    !amountLastMatch[3] &&
    parseQuantity(amountLastMatch[2]) <= 10 &&
    amountLastName.split(/\s+/).length === 1 &&
    /^[A-Z\u00c5\u00c4\u00d6a-z\u00e5\u00e4\u00f60-9-]+$/u.test(amountLastName)
  ) {
    return null;
  }

  if (!amountLastMatch[3] && !containsIngredientHint(amountLastName) && amountLastName.split(/\s+/).length > 4) {
    return null;
  }

  return {
    name: amountLastName,
    quantity: parseQuantity(amountLastMatch[2]) || 1,
    unit: detectIngredientUnit(amountLastMatch[3]),
  };
}

function looksLikeIngredientLine(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized) {
    return false;
  }

  if (
    isIngredientHeading(normalized) ||
    isMethodHeading(normalized) ||
    isAmountHeading(normalized) ||
    isYieldLine(normalized) ||
    isStepStart(normalized) ||
    isBareStepNumber(normalized)
  ) {
    return false;
  }

  if (looksLikeTemperatureOrOvenInstruction(normalized) || startsWithMethodVerb(normalized)) {
    return false;
  }

  if (parseInlineIngredientLine(normalized) || looksLikeQuantityOnly(normalized)) {
    return true;
  }

  if (looksLikeMethodLine(normalized) || normalized.includes("=") || isLikelyNoiseLine(normalized)) {
    return false;
  }

  if (!/\d/.test(normalized)) {
    return false;
  }

  if (ingredientLineUnitPattern.test(normalized)) {
    return true;
  }

  return containsIngredientHint(normalized) && normalized.split(/\s+/).length <= 5;
}

function isLikelyTitleCandidate(line: string) {
  const normalized = normalizeLine(line);
  if (!normalized || normalized.length < 3 || normalized.length > 90) {
    return false;
  }

  if (
    isIngredientHeading(normalized) ||
    isMethodHeading(normalized) ||
    isAmountHeading(normalized) ||
    isYieldLine(normalized) ||
    looksLikeIngredientLine(normalized) ||
    isStepStart(normalized) ||
    looksLikeInstruction(normalized)
  ) {
    return false;
  }

  return (normalized.match(/[A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6]/g) ?? []).length >= 3;
}

function inferIngredientLines(lines: string[], startIndex: number, endIndex: number) {
  const collected: string[] = [];

  for (let index = startIndex; index < endIndex; index += 1) {
    const line = lines[index];
    if (isLikelyNoiseLine(line)) {
      continue;
    }

    if (looksLikeIngredientLine(line) || looksLikeQuantityOnly(line)) {
      collected.push(line);
      continue;
    }

    if (collected.length > 0 && (looksLikeMethodLine(line) || isStepStart(line) || isMethodHeading(line))) {
      break;
    }
  }

  return collected;
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

function shouldStartNewStep(currentStep: string | null, line: string) {
  if (!currentStep) {
    return false;
  }

  return startsWithMethodVerb(line) || looksLikeTemperatureOrOvenInstruction(line);
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

    if (isLikelyNoiseLine(line) || looksLikeMethodLine(line)) {
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
        name: sanitizeIngredientName(pendingName),
        quantity: parseQuantity(line) || 1,
        unit: extractIngredientUnitFromLine(line),
      });
      pendingName = null;
      continue;
    }

    const parsedInlineIngredient = parseInlineIngredientLine(line);
    if (parsedInlineIngredient) {
      ingredients.push({
        name: sanitizeIngredientName(parsedInlineIngredient.name) || "Ingredient",
        quantity: parsedInlineIngredient.quantity,
        unit: parsedInlineIngredient.unit,
      });
      pendingName = null;
      continue;
    }

    if (pendingName) {
      ingredients.push({
        name: sanitizeIngredientName(pendingName),
        quantity: 1,
        unit: IngredientUnit.G,
      });
    }

    pendingName = line;
  }

  if (pendingName) {
    ingredients.push({
      name: sanitizeIngredientName(pendingName),
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

    if (isLikelyNoiseLine(line)) {
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
        steps.push({ instruction: sanitizeInstruction(currentStep) });
      }

      currentStep = line.replace(/^\d+[.)]\s+/, "").trim();
      waitingForBareStepInstruction = false;
      continue;
    }

    if (isBareStepNumber(line)) {
      if (currentStep) {
        steps.push({ instruction: sanitizeInstruction(currentStep) });
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

    if (currentStep && shouldStartNewStep(currentStep, line)) {
      steps.push({ instruction: sanitizeInstruction(currentStep) });
      currentStep = line;
      continue;
    }

    if (!currentStep && !looksLikeMethodLine(line) && !looksLikeInstruction(line)) {
      continue;
    }

    if (currentStep) {
      currentStep = `${currentStep} ${line}`.trim();
    } else {
      currentStep = line;
    }
  }

  if (currentStep) {
    steps.push({ instruction: sanitizeInstruction(currentStep) });
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

  return "unknown";
}

export function mapRecipeFromText(rawText: string): ParsedRecipePreview {
  const sourceLines = normalizeExtractedText(rawText)
    .split(/\r?\n/)
    .map((line) => cleanupOcrLineArtifacts(line))
    .map(normalizeLine)
    .filter(Boolean);
  const lines = buildRecipeLines(rawText);
  const ingredientIndex = lines.findIndex((line) => isIngredientHeading(line));
  const stepIndex = lines.findIndex((line, index) => index > ingredientIndex && (isMethodHeading(line) || isStepStart(line) || isBareStepNumber(line)));
  const firstSectionIndex =
    [ingredientIndex, stepIndex].filter((value) => value >= 0).sort((left, right) => left - right)[0] ?? lines.length;
  const preferredLeadingTitle =
    sourceLines[0] &&
    !isLikelyNoiseLine(sourceLines[0]) &&
    !looksLikeMethodLine(sourceLines[0]) &&
    !looksLikeIngredientLine(sourceLines[0])
      ? sourceLines[0]
      : null;
  const titleCandidate =
    preferredLeadingTitle ??
    sourceLines.slice(0, 4).find((line) => isLikelyTitleCandidate(line)) ??
    lines.slice(0, Math.min(firstSectionIndex > 0 ? firstSectionIndex : 1, 6)).find((line) => isLikelyTitleCandidate(line)) ??
    lines[0] ??
    "Imported recipe";
  const title = sanitizeTitle(titleCandidate) || "Imported recipe";
  const titleIndex = Math.max(lines.findIndex((line) => line === titleCandidate), 0);
  const sourceTitleIndex = Math.max(sourceLines.findIndex((line) => line === titleCandidate), 0);
  const sourceStepIndex = sourceLines.findIndex((line, index) => index > sourceTitleIndex && (isMethodHeading(line) || isStepStart(line) || looksLikeMethodLine(line)));
  const sourceIngredientStart = sourceLines.findIndex((line, index) => index > sourceTitleIndex && looksLikeIngredientLine(line));
  const sourceDescriptionEndCandidates = [sourceIngredientStart, sourceStepIndex].filter((value) => value >= 0);
  const sourceDescriptionEnd =
    sourceDescriptionEndCandidates.length > 0
      ? Math.min(...sourceDescriptionEndCandidates)
      : Math.min(sourceTitleIndex + 3, sourceLines.length);
  const descriptionLines = sourceLines
    .slice(sourceTitleIndex + 1, sourceDescriptionEnd)
    .map((line) => sanitizeInstruction(line))
    .filter((line) => isLikelyDescriptionLine(line));
  const ingredientSectionEnd =
    stepIndex > ingredientIndex
      ? stepIndex
      : findNextSectionIndex(lines, ingredientIndex > -1 ? ingredientIndex + 1 : 1);
  const ingredientLines =
    ingredientIndex >= 0
      ? lines.slice(ingredientIndex + 1, ingredientSectionEnd)
      : inferIngredientLines(lines, titleIndex + 1, stepIndex >= 0 ? stepIndex : lines.length);
  const fallbackSourceIngredientLines =
    ingredientLines.length > 0
      ? ingredientLines
      : inferIngredientLines(sourceLines, sourceTitleIndex + 1, sourceStepIndex >= 0 ? sourceStepIndex : sourceLines.length);
  const lastIngredientIndex =
    fallbackSourceIngredientLines.length > 0
      ? lines.findIndex((line) => line === fallbackSourceIngredientLines[fallbackSourceIngredientLines.length - 1])
      : -1;
  const stepLines =
    stepIndex >= 0
      ? lines.slice(isMethodHeading(lines[stepIndex]) ? stepIndex + 1 : stepIndex, findNextSectionIndex(lines, stepIndex + 1))
      : lines
          .slice(lastIngredientIndex >= 0 ? lastIngredientIndex + 1 : titleIndex + 1)
          .filter((line) => !isLikelyNoiseLine(line) && (isStepStart(line) || looksLikeMethodLine(line) || looksLikeInstruction(line)));

  const ingredients = parseIngredientLines(fallbackSourceIngredientLines);
  const steps = parseStepLines(stepLines);
  const description = descriptionLines.join(" ") || "Imported from source document.";
  const safeIngredients = ingredients.length > 0 ? ingredients : [{ name: "Ingredient", quantity: 1, unit: IngredientUnit.G }];
  const safeSteps = steps.length > 0 ? steps : [{ instruction: "Review and complete the imported procedure." }];

  return {
    title,
    description,
    categoryIds: [],
    isPublic: false,
    ingredients: safeIngredients,
    steps: safeSteps,
    rawText,
  };
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

  throw new Error("Unsupported file type.");
}

async function parseFileToText(file: File) {
  const rawText = await parseLocally(file);

  if (!rawText.trim()) {
    if (detectFileKind(file) === "pdf") {
      throw new Error("The PDF could not be parsed locally. Scanned PDFs are not supported.");
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
  const rawText = input.rawText;

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
