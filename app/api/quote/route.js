import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("https://zenquotes.io/api/today", {
      next: { revalidate: 86400 },
    });

    if (!response.ok) throw new Error("Quote fetch failed");

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      q: "The secret of getting ahead is getting started",
      a: "Mark Twain",
    });
  }
}
