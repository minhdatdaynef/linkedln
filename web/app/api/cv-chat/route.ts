import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role    = "user" | "assistant";
type Message = { role: Role; content: string };

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `Bạn là HR Consultant AI — chuyên gia giúp ứng viên tối ưu CV để phù hợp với công việc mong muốn.

NHIỆM VỤ:
- Phân tích CV so với JD, chỉ ra điểm mạnh, điểm thiếu và gợi ý cải thiện cụ thể
- Trả lời câu hỏi follow-up: viết lại từng section, thêm keywords, rút gọn, dịch, v.v.
- Đặt câu hỏi làm rõ khi cần (ví dụ: số năm kinh nghiệm, mức lương mong muốn, kỹ năng bổ sung)
- Luôn dùng TIẾNG VIỆT, thân thiện và chuyên nghiệp

QUY TRÌNH KHI BẮT ĐẦU:
1. Nếu chưa có CV → hỏi người dùng cung cấp (dán text hoặc upload)
2. Nếu chưa có JD → hỏi xin JD hoặc link LinkedIn
3. Khi có đủ cả hai → phân tích ngay và kèm <analysis> block bên dưới

FORMAT ĐẶC BIỆT — Mỗi khi bạn thực hiện phân tích (lần đầu hoặc cập nhật), hãy kèm JSON trong thẻ sau ở CUỐI tin nhắn (không có markdown/backtick bọc ngoài):
<analysis>
{"match_score":<0-100>,"summary":"<2-3 câu tóm tắt>","strengths":["..."],"gaps":["..."],"cv_suggestions":["..."],"keywords_to_add":["..."]}
</analysis>

Nếu người dùng chỉ hỏi câu hỏi thông thường (không cần cập nhật phân tích) thì KHÔNG cần kèm <analysis>.`;

// ── File parsing (reused from cv-review) ─────────────────────────────────────

async function parseFile(file: File): Promise<string> {
  const bytes  = await file.arrayBuffer();
  const buf    = Buffer.from(bytes);
  const ext    = file.name.split(".").pop()?.toLowerCase();
  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    return ((await pdfParse(buf)).text as string).trim();
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    return (await mammoth.extractRawText({ buffer: buf })).value.trim();
  }
  return buf.toString("utf-8").trim();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROG_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "Missing GROG_API_KEY" }, { status: 500 });

  try {
    const contentType = req.headers.get("content-type") || "";
    let messages: Message[] = [];
    let cvText  = "";
    let jdText  = "";

    if (contentType.includes("multipart/form-data")) {
      const form   = await req.formData();
      messages     = JSON.parse((form.get("messages") as string) || "[]");
      cvText       = (form.get("cvText")  as string) || "";
      jdText       = (form.get("jdText")  as string) || "";

      // Handle newly attached files
      const cvFile = form.get("cvFile") as File | null;
      const jdFile = form.get("jdFile") as File | null;
      if (cvFile && cvFile.size > 0) cvText = await parseFile(cvFile);
      if (jdFile && jdFile.size > 0) jdText = await parseFile(jdFile);
    } else {
      const body = await req.json();
      messages   = body.messages || [];
      cvText     = body.cvText   || "";
      jdText     = body.jdText   || "";
    }

    // ── Build context block injected before conversation ──────────────────────
    const contextParts: Message[] = [];
    if (cvText || jdText) {
      let ctx = "=== THÔNG TIN HIỆN CÓ ===\n";
      if (cvText) ctx += `\n[CV ứng viên]\n${cvText.slice(0, 5000)}\n`;
      if (jdText) ctx += `\n[Mô tả công việc (JD)]\n${jdText.slice(0, 3500)}\n`;
      // Inject as a hidden user/assistant exchange so the model "knows" the docs
      contextParts.push({ role: "user",      content: ctx });
      contextParts.push({ role: "assistant", content: "Đã nhận. Tôi đã đọc toàn bộ CV và JD, sẵn sàng hỗ trợ bạn." });
    }

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        temperature: 0.4,
        max_tokens:  2048,
        messages: [
          { role: "system", content: SYSTEM },
          ...contextParts,
          ...messages,
        ],
      }),
    });

    const groqData = await groqRes.json();
    const raw      = (groqData.choices?.[0]?.message?.content as string) || "";

    // ── Parse <analysis> block out of the reply ───────────────────────────────
    let analysis: Record<string, unknown> | null = null;
    const aMatch = raw.match(/<analysis>([\s\S]*?)<\/analysis>/i);
    if (aMatch) {
      try {
        analysis = JSON.parse(aMatch[1].trim());
      } catch { /* ignore malformed JSON */ }
    }

    // Strip the <analysis> tag from the visible reply
    const reply = raw.replace(/<analysis>[\s\S]*?<\/analysis>/gi, "").trim();

    return NextResponse.json({ reply, analysis, cvText, jdText });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
