import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/server/session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getCurrentUser() {
  const session = await getSession();

  if (!session) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createUserSession(user: {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
}) {
  return createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
