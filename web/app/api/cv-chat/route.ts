import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ── Types ─────────────────────────────────────────────────────────────────────

type Role    = "user" | "assistant";
type Message = { role: Role; content: string };

// ── Config ────────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXT    = ["pdf", "docx", "txt"];
const CV_LIMIT       = 14000; // chars of CV sent to model (llama-3.3-70b ~128k ctx)
const JD_LIMIT       = 7000;

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `Bạn là HR Consultant AI — chuyên gia giúp ứng viên tối ưu CV để phù hợp với công việc mong muốn.

NHIỆM VỤ:
- Phân tích CV so với JD, chỉ ra điểm mạnh, điểm thiếu và gợi ý cải thiện cụ thể
- Trả lời câu hỏi follow-up: viết lại từng section, thêm keywords, rút gọn, dịch, viết cover letter, gợi ý câu hỏi phỏng vấn, v.v.
- Đặt câu hỏi làm rõ khi cần (ví dụ: số năm kinh nghiệm, mức lương mong muốn, kỹ năng bổ sung)
- Luôn dùng TIẾNG VIỆT, thân thiện và chuyên nghiệp

⛔ NGUYÊN TẮC TRUNG THỰC (RẤT QUAN TRỌNG):
- TUYỆT ĐỐI KHÔNG được bịa ra: con số/thành tích, tên công ty, chức danh, mốc thời gian, bằng cấp, chứng chỉ mà CV gốc KHÔNG có.
- Khi một câu cần số liệu định lượng để mạnh hơn nhưng CV gốc không cung cấp → KHÔNG tự bịa số, hãy chèn placeholder dạng [điền số liệu của bạn, vd: tăng __%] để ứng viên tự điền.
- Bạn được phép: viết lại câu chữ cho mạnh hơn, sắp xếp lại, bổ sung keyword phù hợp với kỹ năng đã có, gợi ý động từ hành động. KHÔNG được phép phát minh kinh nghiệm mới.

QUY TRÌNH KHI BẮT ĐẦU:
1. Nếu chưa có CV → hỏi người dùng cung cấp (dán text hoặc upload)
2. Nếu chưa có JD → hỏi xin JD hoặc link LinkedIn
3. Khi có đủ cả hai → phân tích ngay, kèm các block bên dưới

FORMAT ĐẶC BIỆT — khi thực hiện phân tích (lần đầu hoặc cập nhật CV), kèm các block sau ở CUỐI tin nhắn:

Block 1 — điểm phân tích (ats_checks: tối thiểu 4 mục kiểm tra tính tương thích ATS như độ phủ keyword, dùng động từ hành động, có số liệu định lượng, độ dài hợp lý, có đủ section chuẩn):
<analysis>
{"match_score":<0-100>,"summary":"<2-3 câu>","strengths":["..."],"gaps":["..."],"cv_suggestions":["..."],"keywords_to_add":["..."],"ats_checks":[{"label":"<tên kiểm tra>","pass":<true|false>,"hint":"<gợi ý ngắn nếu chưa đạt>"}]}
</analysis>

Block 2 — danh sách thay đổi chính bạn đã thực hiện so với CV gốc (mỗi dòng 1 thay đổi, ngắn gọn):
<changes>
- <thay đổi 1>
- <thay đổi 2>
</changes>

Block 3 — phiên bản CV đã cải thiện hoàn chỉnh dạng text (giữ nguyên sự thật trong CV gốc, thêm keyword phù hợp, làm rõ thành tích, dùng placeholder cho số liệu chưa có):
<improved_cv>
[Toàn bộ CV dạng text đã cải thiện — rõ ràng, đầy đủ các section, sẵn sàng để dùng]
</improved_cv>

Block 4 — CHÍNH CV đó nhưng ở dạng JSON có cấu trúc để xuất file Word (BẮT BUỘC đúng schema, không thêm field lạ, để chuỗi rỗng "" hoặc mảng rỗng [] nếu thiếu):
<cv_json>
{"name":"","title":"","contact":{"email":"","phone":"","linkedin":"","location":""},"objective":"","experience":[{"role":"","company":"","period":"","location":"","bullets":[""]}],"education":[{"degree":"","school":"","period":"","detail":""}],"skills":[{"group":"","items":""}],"certifications":[""],"languages":"","activities":[""]}
</cv_json>

Khi người dùng yêu cầu viết lại / cập nhật CV → kèm lại cả 4 block trên với nội dung mới.
Khi người dùng yêu cầu viết THƯ XIN VIỆC (cover letter) → kèm block:
<cover_letter>
[Nội dung thư xin việc hoàn chỉnh theo JD, 3-4 đoạn]
</cover_letter>
Khi người dùng chỉ hỏi thông thường (không cần cập nhật CV) → KHÔNG cần kèm các block trên.`;

// ── File parsing (shared) ─────────────────────────────────────────────────────

async function parseFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_BYTES)
    throw new Error(`File quá lớn (tối đa ${MAX_FILE_BYTES / 1024 / 1024}MB)`);

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (!ALLOWED_EXT.includes(ext))
    throw new Error(`Định dạng .${ext} không hỗ trợ. Chỉ nhận: ${ALLOWED_EXT.join(", ")}`);

  const bytes = await file.arrayBuffer();
  const buf   = Buffer.from(bytes);

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
  const apiKey = process.env.GROQ_API_KEY || process.env.GROG_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "Thiếu GROQ_API_KEY trên server" }, { status: 500 });

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
      if (cvText) ctx += `\n[CV ứng viên]\n${cvText.slice(0, CV_LIMIT)}\n`;
      if (jdText) ctx += `\n[Mô tả công việc (JD)]\n${jdText.slice(0, JD_LIMIT)}\n`;
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
        temperature: 0.3,
        max_tokens:  6000,
        messages: [
          { role: "system", content: SYSTEM },
          ...contextParts,
          ...messages,
        ],
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => "");
      return NextResponse.json(
        { error: `Groq trả về ${groqRes.status}. ${errText.slice(0, 300)}` },
        { status: 502 }
      );
    }

    const groqData = await groqRes.json();
    const raw      = (groqData.choices?.[0]?.message?.content as string) || "";

    // ── Parse <analysis> block ────────────────────────────────────────────────
    let analysis: Record<string, unknown> | null = null;
    const aMatch = raw.match(/<analysis>([\s\S]*?)<\/analysis>/i);
    if (aMatch) {
      try { analysis = JSON.parse(aMatch[1].trim()); } catch { /* ignore */ }
    }

    // ── Parse <improved_cv> block ─────────────────────────────────────────────
    let improvedCV: string | null = null;
    const cvMatch = raw.match(/<improved_cv>([\s\S]*?)<\/improved_cv>/i);
    if (cvMatch) improvedCV = cvMatch[1].trim();

    // ── Parse <cv_json> block (structured, for DOCX export) ───────────────────
    let cvJson: Record<string, unknown> | null = null;
    const jMatch = raw.match(/<cv_json>([\s\S]*?)<\/cv_json>/i);
    if (jMatch) {
      try { cvJson = JSON.parse(jMatch[1].trim()); } catch { /* ignore */ }
    }

    // ── Parse <changes> block ─────────────────────────────────────────────────
    let changes: string[] = [];
    const chMatch = raw.match(/<changes>([\s\S]*?)<\/changes>/i);
    if (chMatch) {
      changes = chMatch[1]
        .split("\n")
        .map(l => l.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);
    }

    // ── Parse <cover_letter> block ────────────────────────────────────────────
    let coverLetter: string | null = null;
    const clMatch = raw.match(/<cover_letter>([\s\S]*?)<\/cover_letter>/i);
    if (clMatch) coverLetter = clMatch[1].trim();

    // Strip all special blocks from the visible reply
    const reply = raw
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
      .replace(/<improved_cv>[\s\S]*?<\/improved_cv>/gi, "")
      .replace(/<cv_json>[\s\S]*?<\/cv_json>/gi, "")
      .replace(/<changes>[\s\S]*?<\/changes>/gi, "")
      .replace(/<cover_letter>[\s\S]*?<\/cover_letter>/gi, "")
      .trim();

    return NextResponse.json({
      reply, analysis, improvedCV, cvJson, changes, coverLetter, cvText, jdText,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
