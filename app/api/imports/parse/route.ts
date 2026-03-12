import { NextResponse } from "next/server";
import { allowedImportMimeTypes } from "@/lib/schemas/imports";
import { createImportPreview } from "@/lib/server/imports";
import { isModuleEnabled } from "@/lib/server/modules";
import { getSession } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (!(await isModuleEnabled("IMPORT"))) {
      return NextResponse.json({ error: "Import module is disabled." }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    if (!allowedImportMimeTypes.includes(file.type as (typeof allowedImportMimeTypes)[number])) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 });
    }

    const preview = await createImportPreview(session.userId, file);
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to parse file." },
      { status: 400 },
    );
  }
}
