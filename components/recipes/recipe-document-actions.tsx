"use client";

import type { ReactNode } from "react";
import { useState, useTransition } from "react";
import { Download, Printer } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { buildPrintableRecipeHtml, type PrintableRecipeDocument } from "@/lib/printable-recipe";
import { primaryButtonClass, secondaryButtonClass } from "@/lib/ui";

export function RecipeDocumentActions({
  recipeDocument,
  fileName,
  pdfEnabled = true,
  compact = false,
  trailingActions,
}: {
  recipeDocument: PrintableRecipeDocument;
  fileName: string;
  pdfEnabled?: boolean;
  compact?: boolean;
  trailingActions?: ReactNode;
}) {
  const { dictionary, locale } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPrinting, setIsPrinting] = useState(false);
  const sharedClass = compact ? "px-4 py-2.5 text-sm" : "";

  function handlePrint() {
    setError(null);
    setIsPrinting(true);

    const html = buildPrintableRecipeHtml(recipeDocument, {
      locale,
      ingredientsLabel: dictionary.common.ingredients,
      stepsLabel: dictionary.common.steps,
      totalWeightLabel: dictionary.common.totalWeight,
      generatedAtLabel: dictionary.common.generated,
    });

    const iframe = window.document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    iframe.srcdoc = html;

    let hasPrinted = false;

    const cleanup = () => {
      iframe.remove();
      setIsPrinting(false);
    };

    iframe.onload = () => {
      if (hasPrinted) {
        return;
      }

      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        setError(dictionary.common.printFailed);
        cleanup();
        return;
      }

      hasPrinted = true;
      frameWindow.focus();
      frameWindow.print();
      window.setTimeout(cleanup, 1000);
    };

    window.document.body.appendChild(iframe);
  }

  function handlePdfExport() {
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/exports/recipe-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          locale,
          document: recipeDocument,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        setError(payload.error ?? dictionary.common.exportFailed);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = fileName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button className={`${secondaryButtonClass} ${sharedClass}`} disabled={isPrinting} onClick={handlePrint} type="button">
            <Printer className="mr-2 size-4" />
            {isPrinting ? dictionary.common.printing : dictionary.common.print}
          </button>
          {pdfEnabled ? (
            <button className={`${primaryButtonClass} ${sharedClass}`} disabled={isPending} onClick={handlePdfExport} type="button">
              <Download className="mr-2 size-4" />
              {isPending ? dictionary.common.exportingPdf : dictionary.common.exportPdf}
            </button>
          ) : null}
        </div>
        {trailingActions ? (
          <div className="flex flex-wrap justify-end gap-3">
            {trailingActions}
          </div>
        ) : null}
      </div>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
