"use client";

import { useState, useTransition } from "react";
import { Camera, FileText, UploadCloud } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import type { RecipeCategoryOption } from "@/lib/recipe-categories";
import type { EditableRecipe } from "@/lib/types";
import { panelClass, primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

type ImportResponse = {
  importId: string;
  recipe: EditableRecipe & { rawText?: string };
};

const imageUploadMaxDimension = 1800;
const imageUploadQuality = 0.82;
const imageUploadTimeoutMs = 45_000;

function isImageFile(file: File) {
  return file.type.startsWith("image/");
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

async function optimizeImageForUpload(file: File) {
  const image = await loadImage(file);
  const longestSide = Math.max(image.width, image.height);
  const scale = Math.min(1, imageUploadMaxDimension / longestSide);

  if (scale === 1 && file.size <= 2_000_000 && (file.type === "image/jpeg" || file.type === "image/webp")) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Unable to prepare the image for OCR.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Unable to prepare the image for OCR."));
          return;
        }

        resolve(result);
      },
      "image/jpeg",
      imageUploadQuality,
    );
  });

  const normalizedName = file.name.replace(/\.[^.]+$/, "") || "recipe-photo";
  return new File([blob], `${normalizedName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
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
        const uploadFile = isImageFile(file) ? await optimizeImageForUpload(file) : file;
        const formData = new FormData();
        formData.set("file", uploadFile);

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
