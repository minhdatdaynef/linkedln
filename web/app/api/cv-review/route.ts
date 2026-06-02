import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ── Helpers ──────────────────────────────────────────────────────────────────

type JobData = {
  title?: string;
  company?: string;
  location?: string;
  work_location_detail?: string;
  seniority?: string;
  experience_required?: string;
  salary?: string;
  working_hours?: string;
  key_requirements?: string[];
  benefits?: string[];
};

function buildJDFromJob(job: JobData): string {
  const parts: string[] = [];
  if (job.title)   parts.push(`Vị trí: ${job.title}`);
  if (job.company) parts.push(`Công ty: ${job.company}`);
  const loc = job.work_location_detail || job.location;
  if (loc)         parts.push(`Địa điểm: ${loc}`);
  if (job.seniority)           parts.push(`Cấp độ: ${job.seniority}`);
  if (job.experience_required) parts.push(`Kinh nghiệm yêu cầu: ${job.experience_required}`);
  if (job.salary)              parts.push(`Mức lương: ${job.salary}`);
  if (job.working_hours)       parts.push(`Giờ làm việc: ${job.working_hours}`);
  if (job.key_requirements?.length)
    parts.push(`Yêu cầu chính:\n${job.key_requirements.map(r => `- ${r}`).join("\n")}`);
  if (job.benefits?.length)
    parts.push(`Quyền lợi:\n${job.benefits.map(b => `- ${b}`).join("\n")}`);
  return parts.join("\n\n");
}

async function parseCVFile(file: File): Promise<string> {
  const bytes  = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext    = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    return (data.text as string).trim();
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result  = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }

  // .txt or any other plaintext
  return buffer.toString("utf-8").trim();
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROG_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "Missing GROG_API_KEY on server" }, { status: 500 });

  try {
    let cvText = "";
    let jdText = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // ── File upload path ──
      const form   = await req.formData();
      const cvFile = form.get("cv")     as File   | null;
      const cvRaw  = form.get("cvText") as string | null;
      const jdRaw  = form.get("jd")     as string | null;
      const jobRaw = form.get("job")    as string | null;

      cvText = cvRaw?.trim() || "";
      if (cvFile && cvFile.size > 0) {
        cvText = await parseCVFile(cvFile);
      }

      jdText = jdRaw?.trim() || "";
      if (!jdText && jobRaw) {
        try { jdText = buildJDFromJob(JSON.parse(jobRaw)); } catch { /* ignore */ }
      }
    } else {
      // ── JSON path ──
      const body = await req.json();
      cvText = (body.cvText  || "").trim();
      jdText = (body.jdText  || "").trim();
      if (!jdText && body.jobData) {
        jdText = buildJDFromJob(body.jobData);
      }
    }

    if (!cvText) return NextResponse.json({ error: "Không có nội dung CV" }, { status: 400 });
    if (!jdText) return NextResponse.json({ error: "Không có thông tin JD" }, { status: 400 });

    // ── Call Groq ──────────────────────────────────────────
    const prompt = `CV của ứng viên:
---
${cvText.slice(0, 6000)}
---

Yêu cầu công việc (JD):
---
${jdText.slice(0, 4000)}
---

Phân tích CV theo JD và trả về JSON CHÍNH XÁC theo format sau (không markdown, không text ngoài JSON):
{
  "match_score": <số nguyên 0-100 thể hiện % phù hợp>,
  "summary": "<2-3 câu tóm tắt mức độ phù hợp tổng thể>",
  "strengths": ["<điểm mạnh của CV so với JD 1>", "<điểm mạnh 2>", "<điểm mạnh 3>"],
  "gaps": ["<điểm thiếu/yếu so với JD 1>", "<điểm thiếu 2>", "<điểm thiếu 3>"],
  "cv_suggestions": ["<gợi ý cụ thể để cải thiện CV cho vị trí này 1>", "<gợi ý 2>", "<gợi ý 3>", "<gợi ý 4>"],
  "keywords_to_add": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
}`;

    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
          {
            role:    "system",
            content: "Bạn là chuyên gia HR cao cấp và tư vấn nghề nghiệp. Phân tích CV của ứng viên và so sánh với yêu cầu công việc để đưa ra gợi ý cải thiện cụ thể, thực tế. Luôn dùng TIẾNG VIỆT. Chỉ trả về JSON thuần túy, không có markdown, không có bất kỳ text nào ngoài JSON.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    const groqData = await groqRes.json();
    const raw      = (groqData.choices?.[0]?.message?.content as string) || "{}";

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();

    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "AI trả về kết quả không đúng định dạng. Thử lại.", raw },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
