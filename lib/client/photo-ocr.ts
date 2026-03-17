"use client";

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
    AUTO: string | number;
    SINGLE_BLOCK: string | number;
    SPARSE_TEXT: string | number;
  };
};

const ocrCanvasMaxDimension = 1800;
let ocrWorkerPromise: Promise<OcrWorker> | null = null;
const recipeOcrHints = [
  "ganache",
  "kaffegr\u00E4dde",
  "gr\u00E4dde",
  "sm\u00F6r",
  "florsocker",
  "glykos",
  "choklad",
  "koka",
  "blanda",
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

  const originalCanvas = document.createElement("canvas");
  originalCanvas.width = cropCanvas.width;
  originalCanvas.height = cropCanvas.height;
  const originalContext = originalCanvas.getContext("2d");

  if (!originalContext) {
    throw new Error("Unable to prepare the image for OCR.");
  }

  originalContext.fillStyle = "#ffffff";
  originalContext.fillRect(0, 0, originalCanvas.width, originalCanvas.height);
  originalContext.drawImage(cropCanvas, 0, 0);

  return {
    originalCanvas,
    grayscaleCanvas,
    binaryCanvas,
  };
}

function scoreOcrText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const ingredientLikeLines = lines.filter((line) => /\d/.test(line) && /[a-zA-Z\u00E5\u00E4\u00F6\u00C5\u00C4\u00D6]/.test(line)).length;
  const methodLikeLines = lines.filter((line) => /(koka|blanda|vispa|sm\u00E4lt|ror|r\u00F6r|boil|mix|stir|heat)/i.test(line)).length;
  const noisePenalty = (text.match(/[=%|_]{2,}|[^\w\s.,:()/+-]{2,}/g) ?? []).length * 4;

  return ingredientLikeLines * 12 + methodLikeLines * 8 + lines.length * 2 - noisePenalty;
}

function scoreStructuredOcrText(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const normalized = text.toLowerCase();
  const quantityLines = lines.filter((line) => /^\s*\d{1,4}\s*(g|kg|ml|cl|dl|l)?\s*[A-Za-z\u00C5\u00C4\u00D6\u00E5\u00E4\u00F6]/i.test(line)).length;
  const knownTerms = recipeOcrHints.filter((hint) => normalized.includes(hint)).length;
  const shortLines = lines.filter((line) => line.length <= 3).length;
  const fragmentedTokens = (text.match(/\b[A-Za-z\u00C5\u00C4\u00D6\u00E5\u00E4\u00F6]{1,2}\b/g) ?? []).length;

  return scoreOcrText(text) + quantityLines * 14 + knownTerms * 20 - shortLines * 5 - fragmentedTokens * 2;
}

function isUnreliableOcrText(text: string) {
  const normalized = text.toLowerCase();
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const quantityLines = lines.filter((line) => /^\s*\d{1,4}\s*(g|kg|ml|cl|dl|l)?\s*[A-Za-z\u00C5\u00C4\u00D6\u00E5\u00E4\u00F6]/i.test(line)).length;
  const knownTerms = recipeOcrHints.filter((hint) => normalized.includes(hint)).length;
  const fragmentedTokens = (text.match(/\b[A-Za-z\u00C5\u00C4\u00D6\u00E5\u00E4\u00F6]{1,2}\b/g) ?? []).length;

  return scoreStructuredOcrText(text) < 24 || (quantityLines === 0 && knownTerms < 2) || fragmentedTokens >= 8;
}

async function getOcrWorker() {
  const tesseractModule = (await import("tesseract.js")).default as OcrModule;

  if (!ocrWorkerPromise) {
    ocrWorkerPromise = tesseractModule.createWorker(["swe", "eng"], tesseractModule.OEM.LSTM_ONLY);
  }

  const worker = await ocrWorkerPromise;
  return { worker, tesseractModule };
}

export async function extractPhotoText(
  file: File,
  {
    timeoutMs,
    timeoutMessage,
  }: {
    timeoutMs: number;
    timeoutMessage: string;
  },
) {
  const preparedCanvases = await prepareImageForOcr(file);
  const { worker, tesseractModule } = await getOcrWorker();
  const characterWhitelist =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ\u00C5\u00C4\u00D6abcdefghijklmnopqrstuvwxyz\u00E5\u00E4\u00F60123456789 .,:%=()/-";

  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: characterWhitelist,
    tessedit_pageseg_mode: String(tesseractModule.PSM.AUTO),
    user_defined_dpi: "300",
  });

  const primaryResult = await withTimeout(
    worker.recognize(preparedCanvases.originalCanvas, { rotateAuto: true }),
    timeoutMs,
    timeoutMessage,
  );

  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: characterWhitelist,
    tessedit_pageseg_mode: String(tesseractModule.PSM.SINGLE_BLOCK),
    user_defined_dpi: "300",
  });

  const fallbackResult = await withTimeout(
    worker.recognize(preparedCanvases.grayscaleCanvas, { rotateAuto: true }),
    timeoutMs,
    timeoutMessage,
  );

  await worker.setParameters({
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: characterWhitelist,
    tessedit_pageseg_mode: String(tesseractModule.PSM.SPARSE_TEXT),
    user_defined_dpi: "300",
  });

  const binaryResult = await withTimeout(
    worker.recognize(preparedCanvases.binaryCanvas, { rotateAuto: true }),
    timeoutMs,
    timeoutMessage,
  );

  const primaryText = primaryResult.data.text.trim();
  const fallbackText = fallbackResult.data.text.trim();
  const binaryText = binaryResult.data.text.trim();
  const bestText =
    [primaryText, fallbackText, binaryText].sort(
      (left, right) => scoreStructuredOcrText(right) - scoreStructuredOcrText(left),
    )[0] ?? "";

  if (isUnreliableOcrText(bestText)) {
    throw new Error(
      "Fotot gick inte att läsa tillräckligt tydligt. Beskär närmare receptet och ta bilden rakt ovanifrån.",
    );
  }

  return bestText;
}
