import { NextResponse } from "next/server";
import { isModuleEnabled } from "@/lib/server/modules";
import { searchRecipeItems } from "@/lib/server/recipes";
import { getSession } from "@/lib/server/session";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!(await isModuleEnabled("RECIPES"))) {
    return NextResponse.json({ error: "Recipes module is disabled." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";

  if (query.trim().length < 2) {
    return NextResponse.json({ recipes: [] });
  }

  const recipes = await searchRecipeItems(session.userId, session.role, query, 6);
  return NextResponse.json({ recipes });
}
