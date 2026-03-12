import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas/auth";
import { hashPassword, createUserSession } from "@/lib/server/auth";
import { setSessionCookie } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        passwordHash: await hashPassword(payload.password),
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const token = await createUserSession(user);
    await setSessionCookie(token);

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid registration request." },
      { status: 400 },
    );
  }
}
