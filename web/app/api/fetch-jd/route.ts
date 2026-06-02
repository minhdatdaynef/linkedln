import { NextRequest, NextResponse } from "next/server";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|li|div|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({ url: "" }));

  if (!url?.trim())
    return NextResponse.json({ error: "Thiếu URL" }, { status: 400 });

  // ── Extract LinkedIn job ID ──────────────────────────────
  const idMatch = url.match(/\/jobs\/view\/(\d+)/);
  if (!idMatch)
    return NextResponse.json(
      { error: "URL không hợp lệ. Cần dạng: linkedin.com/jobs/view/<id>" },
      { status: 400 }
    );

  const jobId = idMatch[1];

  try {
    // LinkedIn guest API endpoint (same one the Python crawler uses)
    const res = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`,
      { headers: HEADERS }
    );

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `LinkedIn trả về ${res.status}. Họ có thể đã chặn request từ server. Vui lòng dán JD thủ công.`,
        },
        { status: 400 }
      );
    }

    const html = await res.text();

    // ── Extract fields ───────────────────────────────────────
    const descEl = html.match(
      /<div[^>]*class="[^"]*show-more-less-html__markup[^"]*"[^>]*>([\s\S]*?)<\/div>/
    );
    const titleEl = html.match(
      /<h2[^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h2>/
    );
    const companyEl = html.match(
      /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/
    );

    if (!descEl?.[1]) {
      return NextResponse.json(
        {
          error:
            "Không tìm thấy mô tả job (LinkedIn có thể đã chặn). Vui lòng dán JD thủ công.",
        },
        { status: 400 }
      );
    }

    const description = stripHtml(descEl[1]);
    const title       = stripHtml(titleEl?.[1]  || "");
    const company     = stripHtml(companyEl?.[1] || "");

    const jdText = [
      title   ? `Vị trí: ${title}`    : "",
      company ? `Công ty: ${company}` : "",
      description ? `\nMô tả công việc:\n${description}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({ jd: jdText, title, company });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Lỗi kết nối: ${msg}` }, { status: 500 });
  }
}
