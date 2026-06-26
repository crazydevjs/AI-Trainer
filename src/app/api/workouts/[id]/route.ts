import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function ownWorkout(id: string, userId: string) {
  const w = await prisma.customWorkout.findUnique({
    where: { id },
    select: { userId: true, isFavorite: true },
  });
  return w && w.userId === userId ? w : null;
}

// Toggle favorite (PATCH { isFavorite?: boolean }) — defaults to toggle.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await ownWorkout(id, session.sub);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const next =
    typeof body.isFavorite === "boolean" ? body.isFavorite : !existing.isFavorite;

  await prisma.customWorkout.update({
    where: { id },
    data: { isFavorite: next },
  });
  return NextResponse.json({ ok: true, isFavorite: next });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await ownWorkout(id, session.sub);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.customWorkout.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
