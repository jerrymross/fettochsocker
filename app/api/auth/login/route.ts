import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas/auth";
import { createUserSession, verifyPassword } from "@/lib/server/auth";
import { setSessionCookie } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { email: payload.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user || !(await verifyPassword(payload.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = await createUserSession(user);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid login request." },
      { status: 400 },
    );
  }
}
