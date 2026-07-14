import { NextResponse } from "next/server";
import { verifySignedPayload } from "@/lib/platform/security";
import { getStorageProvider } from "@/lib/platform/storage";

export async function GET(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await params;
  const key = keyParts.map(decodeURIComponent).join("/");

  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const verified = verifySignedPayload<{ key: string }>(token);
  if (!verified || verified.key !== key) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 403 });
  }

  const data = await getStorageProvider().get(key);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
