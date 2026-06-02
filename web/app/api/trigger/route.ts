import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { keywords, location, date_posted, max_pages, experience, work_type, job_type } = body;

  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO || "minhdatdaynef/linkedln";

  if (!token) return NextResponse.json({ error: "Missing GITHUB_TOKEN" }, { status: 500 });

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/crawl.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          keywords:    keywords    || "marketing,truyen thong,su kien",
          location:    location    || "Hanoi",
          date_posted: date_posted || "24h",
          max_pages:   String(max_pages || "4"),
          experience:  experience  || "",
          work_type:   work_type   || "",
          job_type:    job_type    || "",
        },
      }),
    }
  );

  if (res.status === 204) return NextResponse.json({ ok: true });
  const err = await res.text();
  return NextResponse.json({ error: err }, { status: res.status });
}
