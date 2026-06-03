import { NextRequest, NextResponse } from "next/server";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  BorderStyle, AlignmentType, WidthType, ShadingType, convertMillimetersToTwip,
} from "docx";

export const runtime = "nodejs";

// ── Types matching <cv_json> from cv-chat ──────────────────────────────────────

type Contact = { email?: string; phone?: string; linkedin?: string; location?: string };
type Exp     = { role?: string; company?: string; period?: string; location?: string; bullets?: string[] };
type Edu     = { degree?: string; school?: string; period?: string; detail?: string };
type Skill   = { group?: string; items?: string };
type CVJson  = {
  name?: string; title?: string; contact?: Contact; objective?: string;
  experience?: Exp[]; education?: Edu[]; skills?: Skill[];
  certifications?: string[]; languages?: string; activities?: string[];
};

const BLUE  = "0A66C2";
const GRAY  = "888888";
const DARK  = "444444";
const FONT  = "Arial";
const hp    = (pt: number) => pt * 2; // docx sizes are in half-points

// ── Building blocks ────────────────────────────────────────────────────────────

function divider(): Paragraph {
  return new Paragraph({
    spacing: { before: 60, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
    children: [],
  });
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 200, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 1 } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: hp(10.5), color: BLUE, font: FONT })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { before: 20, after: 20 },
    children: [new TextRun({ text, size: hp(10.5), font: FONT })],
  });
}

function jobHeader(role: string, company: string, period: string, location: string): Paragraph[] {
  const line1 = new Paragraph({
    spacing: { before: 120, after: 20 },
    children: [
      new TextRun({ text: role, bold: true, size: hp(11), font: FONT }),
      ...(company ? [
        new TextRun({ text: "  |  ", size: hp(10), color: GRAY, font: FONT }),
        new TextRun({ text: company, size: hp(10.5), color: BLUE, font: FONT }),
      ] : []),
    ],
  });
  const meta = [period, location].filter(Boolean).join("  ·  ");
  const line2 = new Paragraph({
    spacing: { before: 0, after: 40 },
    children: meta ? [new TextRun({ text: meta, italics: true, size: hp(9.5), color: GRAY, font: FONT })] : [],
  });
  return [line1, line2];
}

function skillsTable(skills: Skill[]): Table {
  const rows = skills.map(s => new TableRow({
    children: [
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        shading: { fill: "EFF4FB", type: ShadingType.CLEAR, color: "auto" },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: s.group || "", bold: true, size: hp(10), font: FONT })] })],
      }),
      new TableCell({
        width: { size: 68, type: WidthType.PERCENTAGE },
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: s.items || "", size: hp(10), font: FONT })] })],
      }),
    ],
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: "E8E8E8" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "E8E8E8" },
      left:   { style: BorderStyle.SINGLE, size: 4, color: "E8E8E8" },
      right:  { style: BorderStyle.SINGLE, size: 4, color: "E8E8E8" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "E8E8E8" },
      insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: "E8E8E8" },
    },
    rows,
  });
}

// ── Build doc from structured CV ────────────────────────────────────────────────

function buildFromJson(cv: CVJson): (Paragraph | Table)[] {
  const kids: (Paragraph | Table)[] = [];

  // Header
  kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: (cv.name || "HỌ VÀ TÊN").toUpperCase(), bold: true, size: hp(22), color: BLUE, font: FONT })],
  }));
  if (cv.title) kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: cv.title, size: hp(12), color: DARK, font: FONT })],
  }));
  const c = cv.contact || {};
  const contactStr = [c.email, c.phone, c.linkedin, c.location].filter(Boolean).join("  ·  ");
  if (contactStr) kids.push(new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { after: 40 },
    children: [new TextRun({ text: contactStr, size: hp(9.5), color: "555555", font: FONT })],
  }));
  kids.push(divider());

  // Objective
  if (cv.objective) {
    kids.push(sectionTitle("Mục tiêu nghề nghiệp"));
    kids.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: cv.objective, size: hp(10.5), font: FONT })] }));
  }

  // Experience
  if (cv.experience?.length) {
    kids.push(sectionTitle("Kinh nghiệm làm việc"));
    cv.experience.forEach(e => {
      kids.push(...jobHeader(e.role || "", e.company || "", e.period || "", e.location || ""));
      (e.bullets || []).forEach(b => kids.push(bullet(b)));
    });
  }

  // Education
  if (cv.education?.length) {
    kids.push(sectionTitle("Học vấn"));
    cv.education.forEach(e => {
      kids.push(...jobHeader(e.degree || "", e.school || "", e.period || "", ""));
      if (e.detail) kids.push(new Paragraph({
        spacing: { before: 20, after: 40 },
        children: [new TextRun({ text: e.detail, italics: true, size: hp(10), color: "555555", font: FONT })],
      }));
    });
  }

  // Skills
  if (cv.skills?.length) {
    kids.push(sectionTitle("Kỹ năng"));
    kids.push(skillsTable(cv.skills));
    kids.push(new Paragraph({ spacing: { after: 80 }, children: [] }));
  }

  // Certifications
  if (cv.certifications?.length) {
    kids.push(sectionTitle("Chứng chỉ"));
    cv.certifications.forEach(x => kids.push(bullet(x)));
  }

  // Languages
  if (cv.languages) {
    kids.push(sectionTitle("Ngoại ngữ"));
    kids.push(new Paragraph({ children: [new TextRun({ text: cv.languages, size: hp(10.5), font: FONT })] }));
  }

  // Activities
  if (cv.activities?.length) {
    kids.push(sectionTitle("Hoạt động & Dự án nổi bật"));
    cv.activities.forEach(x => kids.push(bullet(x)));
  }

  return kids;
}

// ── Fallback: build from plain text ─────────────────────────────────────────────

function buildFromText(text: string): Paragraph[] {
  return text.split("\n").map(line =>
    new Paragraph({
      spacing: { after: line.trim() === "" ? 80 : 20 },
      children: [new TextRun({ text: line, size: hp(10.5), font: FONT })],
    })
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body     = await req.json();
    const cvJson   = body.cvJson as CVJson | null;
    const text     = (body.text as string) || "";
    const fileName = ((body.fileName as string) || "CV").replace(/[^\w\-. ]/g, "").trim() || "CV";

    const hasStructured = cvJson && (cvJson.name || cvJson.experience?.length || cvJson.objective);
    if (!hasStructured && !text)
      return NextResponse.json({ error: "Không có dữ liệu CV để xuất" }, { status: 400 });

    const children = hasStructured ? buildFromJson(cvJson as CVJson) : buildFromText(text);

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top:    convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(18),
              left:   convertMillimetersToTwip(20),
              right:  convertMillimetersToTwip(20),
            },
          },
        },
        children,
      }],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}.docx"`,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
