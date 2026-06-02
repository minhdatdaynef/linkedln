import { NextResponse } from "next/server";

export async function GET() {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO || "minhdatdaynef/linkedln";

  if (!token) return NextResponse.json({ error: "Missing GITHUB_TOKEN" }, { status: 500 });

  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/crawl.yml/runs?per_page=1`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
      cache: "no-store",
    }
  );

  const data = await res.json();
  const run  = data.workflow_runs?.[0];
  if (!run) return NextResponse.json({ status: "idle" });

  return NextResponse.json({
    status:     run.status,        // queued | in_progress | completed
    conclusion: run.conclusion,    // success | failure | null
    started_at: run.run_started_at,
    html_url:   run.html_url,
    run_number: run.run_number,
  });
}
