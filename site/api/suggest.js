// Vercel serverless: TRO CHUYEN giup sua CV theo 1 JD (paste JD hoac link LinkedIn).
// CV lay tu env CV_TEXT. Groq key tu env GROQ_API_KEY / GROG_API_KEY.
// Body: { jd?, url?, messages:[{role,content}] }
// Tra ve: { reply, jd_source, resolved_jd } hoac { error }.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.SUGGEST_MODEL || "llama-3.3-70b-versatile";

function stripHtml(s) {
  return (s || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|div|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function fetchJdFromLinkedIn(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept-Language": "vi,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error("LinkedIn tra ve HTTP " + res.status + " (co the bi chan) - hay paste JD truc tiep.");
  const html = await res.text();
  const blocks = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi) || [];
  for (const b of blocks) {
    try {
      const j = JSON.parse(b.replace(/<script[^>]*>/i, "").replace(/<\/script>/i, ""));
      const arr = Array.isArray(j) ? j : [j];
      for (const o of arr) {
        if (o && o.description) {
          const title = o.title ? "Vi tri: " + o.title + "\n\n" : "";
          return title + stripHtml(o.description);
        }
      }
    } catch (_) {}
  }
  const m = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/i);
  if (m) {
    const t = stripHtml(m[1]);
    if (t.length > 60) return t;
  }
  throw new Error("Khong doc duoc JD tu link - hay paste noi dung JD vao o ben duoi.");
}

function systemPrompt(cv, jd) {
  return `Ban la chuyen gia tuyen dung & viet CV, dang TRO CHUYEN voi ung vien de giup ho chinh sua CV cho khop MOT tin tuyen dung cu the.

CV HIEN TAI cua ung vien:
---
${cv.slice(0, 12000)}
---

Tin tuyen dung (JD) muc tieu:
---
${jd.slice(0, 6000)}
---

QUY TAC:
- CHI DE XUAT, TUYET DOI KHONG bia kinh nghiem/so lieu ung vien khong co. Thieu so lieu thi de placeholder "[dien so lieu thuc]".
- Khi de xuat sua mot cho, trinh bay ro: "**Hien tai:** <chu hien tai trong CV>" roi "**Sua thanh:** <de xuat>" roi "_Ly do:_ <1 cau>".
- Tra loi bang TIENG VIET, ngan gon, bam dung cau hoi cua ung vien.
- O LUOT DAU: dua ra 5-8 de xuat sua CV quan trong nhat de khop JD nay. Cac luot sau: tinh chinh/giai dap theo yeu cau cua ung vien.`;
}

function sanitizeMessages(arr) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-14)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Chi ho tro POST" }); return; }

  const apiKey = process.env.GROQ_API_KEY || process.env.GROG_API_KEY;
  const cvText = (process.env.CV_TEXT || "").trim();
  if (!apiKey) { res.status(500).json({ error: "Server chua cau hinh GROQ_API_KEY" }); return; }
  if (!cvText) { res.status(500).json({ error: "Server chua cau hinh CV_TEXT" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const jdInput = (body?.jd || "").trim();
  const url = (body?.url || "").trim();
  const messages = sanitizeMessages(body?.messages);
  if (!messages.length) { res.status(200).json({ error: "Thieu noi dung tin nhan" }); return; }

  try {
    let jd = jdInput;
    let jdSource = "JD đã dán";
    if (!jd && url) {
      if (!/linkedin\.com/i.test(url)) throw new Error("Link khong phai LinkedIn - hay paste JD truc tiep.");
      jd = await fetchJdFromLinkedIn(url);
      jdSource = "JD lấy từ link";
    }
    if (!jd || jd.length < 40) throw new Error("JD qua ngan hoac trong - hay paste day du noi dung JD.");

    const r = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        messages: [{ role: "system", content: systemPrompt(cvText, jd) }, ...messages],
      }),
    });
    if (r.status === 429) throw new Error("Groq dang qua tai (rate limit) - thu lai sau vai giay.");
    if (!r.ok) throw new Error("Groq loi HTTP " + r.status);
    const data = await r.json();
    const reply = (data.choices?.[0]?.message?.content || "").trim();

    res.status(200).json({ reply, jd_source: jdSource, resolved_jd: jd });
  } catch (e) {
    res.status(200).json({ error: e.message || "Loi khong xac dinh" });
  }
}
