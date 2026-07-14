import { NextResponse } from "next/server";
import { getReadiness } from "@/lib/platform/monitoring";

export async function GET() {
  const report = await getReadiness();
  return NextResponse.json(report, { status: report.status === "down" ? 503 : 200 });
}
