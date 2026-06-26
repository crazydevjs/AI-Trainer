import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resetSchema } from "@/lib/validators";
import { consumeToken } from "@/lib/tokens";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const parsed = resetSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const { token, password } = parsed.data;

    const userId = await consumeToken(token, "PASSWORD_RESET");
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(password) },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("reset-password error", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
