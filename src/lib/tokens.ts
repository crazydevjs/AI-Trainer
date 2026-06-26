import "server-only";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { TokenType } from "@prisma/client";

/** Create a single-use token row and return its value. */
export async function createToken(
  userId: string,
  type: TokenType,
  ttlMs: number
): Promise<string> {
  // Invalidate previous tokens of the same type.
  await prisma.token.deleteMany({ where: { userId, type } });
  const token = randomBytes(32).toString("hex");
  await prisma.token.create({
    data: { userId, type, token, expiresAt: new Date(Date.now() + ttlMs) },
  });
  return token;
}

/** Consume a token if valid; returns the userId or null. */
export async function consumeToken(
  token: string,
  type: TokenType
): Promise<string | null> {
  const row = await prisma.token.findUnique({ where: { token } });
  if (!row || row.type !== type || row.expiresAt < new Date()) return null;
  await prisma.token.delete({ where: { id: row.id } });
  return row.userId;
}
