import { NextResponse } from "next/server";
import { getLiveness } from "@/lib/platform/monitoring";

export async function GET() {
  return NextResponse.json(getLiveness(), { status: 200 });
}
