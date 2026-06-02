import { NextResponse } from "next/server";

export async function GET() {
  const repo = process.env.GITHUB_REPO || "minhdatdaynef/linkedln";
  const url  = `https://raw.githubusercontent.com/${repo}/main/data/jobs.json`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return NextResponse.json([], { status: 200 });

  const jobs = await res.json();
  return NextResponse.json(jobs);
}
