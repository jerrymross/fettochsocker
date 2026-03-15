"use client";

import { useState, useTransition } from "react";
import { Camera, FileText, UploadCloud } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import type { RecipeCategoryOption } from "@/lib/recipe-categories";
import type { EditableRecipe } from "@/lib/types";
import { panelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type OcrWorker = {
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  recognize: (
    image: HTMLCanvasElement,
    options?: {
      rotateAuto?: boolean;
    },
  ) => Promise<{
    data: {
      text: string;
    };
  }>;
};

type OcrModule = {
  createWorker: (languages: string[], oem: string | number) => Promise<OcrWorker>;
  OEM: {
    LSTM_ONLY: string | number;
  };
  PSM: {
    SINGLE_COLUMN: string | number;
    SPARSE_TEXT: string | number;
  };
};

type ImportResponse = {
  importId: string;
  recipe: EditableRecipe & { rawText?: string };
};

const ocrCanvasMaxDimension = 1800;
const imageUploadTimeoutMs = 45_000;
let ocrWorkerPromise: Promise<OcrWorker> | null = null;

function isImageFile(file: File) {
  return file.type.startsWith("image/");
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

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read the selected image."));
    };

    image.src = objectUrl;
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function computeOtsuThreshold(data: Uint8ClampedArray) {
  const histogram = new Array<number>(256).fill(0);
  for (let index = 0; index < data.length; index += 4) {
    histogram[data[index]] += 1;
  }

  let total = 0;
  let sum = 0;
  for (let index = 0; index < histogram.length; index += 1) {
    total += histogram[index];
    sum += index * histogram[index];
  }

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 160;

  for (let index = 0; index < histogram.length; index += 1) {
    weightBackground += histogram[index];
    if (weightBackground === 0) {
      continue;
    }

    const weightForeground = total - weightBackground;
    if (weightForeground === 0) {
      break;
    }

    sumBackground += index * histogram[index];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = index;
    }
  }

  return clamp(threshold, 110, 205);
}

function detectInkBounds(imageData: ImageData) {
  const { width, height, data } = imageData;
  const rowCounts = new Array<number>(height).fill(0);
  const columnCounts = new Array<number>(width).fill(0);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const brightness = (data[offset] + data[offset + 1] + data[offset + 2]) / 3;
      if (brightness < 172) {
        rowCounts[y] += 1;
        columnCounts[x] += 1;
      }
    }
  }

  const rowMin = Math.max(4, Math.round(width * 0.004));
  const rowMax = Math.round(width * 0.35);
  const columnMin = Math.max(3, Math.round(height * 0.003));
  const columnMax = Math.round(height * 0.38);
  const candidateRows = rowCounts
    .map((count, index) => ({ count, index }))
    .filter(({ count }) => count >= rowMin && count <= rowMax)
    .map(({ index }) => index);
  const candidateColumns = columnCounts
    .map((count, index) => ({ count, index }))
    .filter(({ count }) => count >= columnMin && count <= columnMax)
    .map(({ index }) => index);

  if (candidateRows.length === 0 || candidateColumns.length === 0) {
    return {
      left: 0,
      top: 0,
      width,
      height,
    };
  }

  const marginX = Math.round(width * 0.03);
  const marginY = Math.round(height * 0.035);
  const top = clamp(candidateRows[0] - marginY, 0, height - 1);
  const bottom = clamp(candidateRows[candidateRows.length - 1] + marginY, top + 1, height);
  const left = clamp(candidateColumns[0] - marginX, 0, width - 1);
  const right = clamp(candidateColumns[candidateColumns.length - 1] + marginX, left + 1, width);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  };
}

async function prepareImageForOcr(file: File) {
  const image = await loadImage(file);
  const longestSide = Math.max(image.width, image.height);
  const sourceScale = Math.min(1, ocrCanvasMaxDimension / longestSide);
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = Math.max(1, Math.round(image.width * sourceScale));
  sourceCanvas.height = Math.max(1, Math.round(image.height * sourceScale));
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!sourceContext) {
    throw new Error("Unable to prepare the image for OCR.");
  }

  sourceContext.fillStyle = "#ffffff";
  sourceContext.fillRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceContext.drawImage(image, 0, 0, sourceCanvas.width, sourceCanvas.height);

  const sourceImageData = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
  const bounds = detectInkBounds(sourceImageData);
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = bounds.width;
  cropCanvas.height = bounds.height;
  const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });

  if (!cropContext) {
    throw new Error("Unable to prepare the image for OCR.");
  }

  cropContext.fillStyle = "#ffffff";
  cropContext.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropContext.drawImage(
    sourceCanvas,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    0,
    0,
    cropCanvas.width,
    cropCanvas.height,
  );

  const grayscaleCanvas = document.createElement("canvas");
  grayscaleCanvas.width = cropCanvas.width;
  grayscaleCanvas.height = cropCanvas.height;
  const grayscaleContext = grayscaleCanvas.getContext("2d", { willReadFrequently: true });

  if (!grayscaleContext) {
    throw new Error("Unable to prepare the image for OCR.");
  }

  const processedImage = cropContext.getImageData(0, 0, cropCanvas.width, cropCanvas.height);
  for (let index = 0; index < processedImage.data.length; index += 4) {
    const red = processedImage.data[index];
    const green = processedImage.data[index + 1];
    const blue = processedImage.data[index + 2];
    const grayscale = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);
    const contrasted = clamp(Math.round((grayscale - 128) * 1.35 + 128), 0, 255);
    processedImage.data[index] = contrasted;
    processedImage.data[index + 1] = contrasted;
    processedImage.data[index + 2] = contrasted;
    processedImage.data[index + 3] = 255;
  }

  grayscaleContext.putImageData(processedImage, 0, 0);

  const binaryCanvas = document.createElement("canvas");
  binaryCanvas.width = cropCanvas.width;
  binaryCanvas.height = cropCanvas.height;
  const binaryContext = binaryCanvas.getContext("2d", { willReadFrequently: true });

  if (!binaryContext) {
    throw new Error("Unable to prepare the image for OCR.");
  }

  const binaryImage = grayscaleContext.getImageData(0, 0, grayscaleCanvas.width, grayscaleCanvas.height);
  const threshold = computeOtsuThreshold(binaryImage.data);
  for (let index = 0; index < binaryImage.data.length; index += 4) {
    const inkPixel = binaryImage.data[index] < threshold ? 0 : 255;
    binaryImage.data[index] = inkPixel;
    binaryImage.data[index + 1] = inkPixel;
    binaryImage.data[index + 2] = inkPixel;
    binaryImage.data[index + 3] = 255;
  }

  binaryContext.putImageData(binaryImage, 0, 0);

  return {
    grayscaleCanvas,
    binaryCanvas,
  };
}

function scoreOcrText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const ingredientLikeLines = lines.filter((line) => /\d/.test(line) && /[a-zA-ZåäöÅÄÖ]/.test(line)).length;
  const methodLikeLines = lines.filter((line) => /(koka|blanda|vispa|smält|ror|rör|boil|mix|stir|heat)/i.test(line)).length;
  const noisePenalty = (text.match(/[=%|_]{2,}|[^\w\s.,:()/+-]{2,}/g) ?? []).length * 4;

  return ingredientLikeLines * 12 + methodLikeLines * 8 + lines.length * 2 - noisePenalty;
}

async function getOcrWorker() {
  const tesseractModule = (await import("tesseract.js")).default as OcrModule;

  if (!ocrWorkerPromise) {
    ocrWorkerPromise = tesseractModule.createWorker(["swe", "eng"], tesseractModule.OEM.LSTM_ONLY);
  }

  const worker = await ocrWorkerPromise;
  return { worker, tesseractModule };
}

async function extractPhotoText(file: File, timeoutMessage: string) {
  const preparedCanvases = await prepareImageForOcr(file);
  const { worker, tesseractModule } = await getOcrWorker();

  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖabcdefghijklmnopqrstuvwxyzåäö0123456789 .,:%=()/-",
    tessedit_pageseg_mode: String(tesseractModule.PSM.SINGLE_COLUMN),
    user_defined_dpi: "300",
  });

  const primaryResult = await withTimeout(
    worker.recognize(preparedCanvases.grayscaleCanvas, { rotateAuto: true }),
    imageUploadTimeoutMs,
    timeoutMessage,
  );

  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖabcdefghijklmnopqrstuvwxyzåäö0123456789 .,:%=()/-",
    tessedit_pageseg_mode: String(tesseractModule.PSM.SPARSE_TEXT),
    user_defined_dpi: "300",
  });

  const fallbackResult = await withTimeout(
    worker.recognize(preparedCanvases.binaryCanvas, { rotateAuto: true }),
    imageUploadTimeoutMs,
    timeoutMessage,
  );

  const primaryText = primaryResult.data.text.trim();
  const fallbackText = fallbackResult.data.text.trim();
  return scoreOcrText(primaryText) >= scoreOcrText(fallbackText) ? primaryText : fallbackText;
}

export function ImportPreviewBuilder({
  availableCategories,
  canManageVisibility = false,
}: {
  availableCategories: RecipeCategoryOption[];
  canManageVisibility?: boolean;
}) {
  const { dictionary } = useLanguage();
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparingPhoto, setIsPreparingPhoto] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), imageUploadTimeoutMs);

      try {
        const formData = new FormData();

        if (isImageFile(file)) {
          const rawText = await extractPhotoText(file, dictionary.importBuilder.parseTimedOut);
          formData.set("rawText", rawText);
          formData.set("sourceFileName", file.name);
          formData.set("mimeType", "text/plain");
        } else {
          formData.set("file", file);
        }

        const response = await fetch("/api/imports/parse", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const payload = (await response.json()) as ImportResponse & { error?: string };

        if (!response.ok) {
          setError(payload.error ?? dictionary.importBuilder.parseFailed);
          return;
        }

        setPreview(payload);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setError(dictionary.importBuilder.parseTimedOut);
        } else {
          setError(error instanceof Error ? error.message : dictionary.importBuilder.parseFailed);
        }
      } finally {
        if (isImageFile(file)) {
          setIsPreparingPhoto(false);
        }
        window.clearTimeout(timeoutId);
        event.target.value = "";
      }
    });
  }

  function handlePhotoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.[0]) {
      setIsPreparingPhoto(true);
    }

    handleUpload(event);
  }

  const actionLabel = isPreparingPhoto
    ? dictionary.importBuilder.preparingPhoto
    : isPending
      ? dictionary.importBuilder.parsing
      : null;

  return (
    <div className="space-y-6">
      <div className={`${panelClass} flex flex-col items-center justify-center gap-4 border-dashed text-center`}>
        <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <UploadCloud className="size-8" />
        </div>
        <div>
          <p className="text-xl font-semibold text-slate-950">{dictionary.importBuilder.title}</p>
          <p className="mt-2 text-sm text-slate-700">{dictionary.importBuilder.description}</p>
        </div>
        <div className="flex w-full flex-col justify-center gap-3 sm:flex-row">
          <label className={`${primaryButtonClass} cursor-pointer gap-2`}>
            <FileText className="size-4" />
            <span>{actionLabel ?? dictionary.importBuilder.chooseDocument}</span>
            <input
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={handleUpload}
              type="file"
            />
          </label>
          <label className={`${secondaryButtonClass} cursor-pointer gap-2`}>
            <Camera className="size-4" />
            <span>{actionLabel ?? dictionary.importBuilder.choosePhoto}</span>
            <input
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelection}
              type="file"
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">{dictionary.importBuilder.supportedFormats}</p>
      </div>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      {preview ? (
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
          <RecipeEditor
            availableCategories={availableCategories}
            canManageVisibility={canManageVisibility}
            endpoint="/api/imports/commit"
            importId={preview.importId}
            initialRecipe={preview.recipe}
            method="POST"
            submitLabel={dictionary.importBuilder.importRecipe}
          />

          <div className={`${panelClass} space-y-3`}>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-800">{dictionary.importBuilder.rawPreview}</p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">{dictionary.importBuilder.parsedSourceText}</h2>
            </div>
            <pre className="max-h-[900px] overflow-auto whitespace-pre-wrap rounded-[22px] bg-slate-950 p-4 text-sm text-slate-100">
              {preview.recipe.rawText}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
}
