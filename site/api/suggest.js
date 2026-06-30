// Vercel serverless: de xuat sua CV theo 1 JD (paste JD hoac link LinkedIn).
// CV lay tu env CV_TEXT (giong CI). Groq key tu env GROQ_API_KEY / GROG_API_KEY.
// Tra ve: { suggestions: [{muc,truoc,sau,ly_do}], jd_source } hoac { error }.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = process.env.SUGGEST_MODEL || "llama-3.3-70b-versatile";

const SYSTEM =
  "Ban la chuyen gia tuyen dung & viet CV. Dua tren CV that cua ung vien va MOT tin " +
  "tuyen dung (JD), hay DE XUAT cach sua CV de khop hon. TUYET DOI KHONG bia kinh nghiem/" +
  "so lieu ung vien khong co. Luon tra loi bang TIENG VIET. Chi tra ve JSON thuan tuy, khong markdown.";

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

// Lay JD tu trang LinkedIn job (best-effort; LinkedIn co the chan 999 -> nem loi).
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

  // 1) JSON-LD JobPosting
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
  // 2) markup div cua trang guest
  const m = html.match(/show-more-less-html__markup[^>]*>([\s\S]*?)<\/div>/i);
  if (m) {
    const t = stripHtml(m[1]);
    if (t.length > 60) return t;
  }
  throw new Error("Khong doc duoc JD tu link - hay paste noi dung JD vao o ben duoi.");
}

function buildPrompt(cvText, jd) {
  return `CV HIEN TAI cua ung vien:
---
${cvText.slice(0, 12000)}
---

Tin tuyen dung (JD) muc tieu:
---
${jd.slice(0, 6000)}
---

NHIEM VU: De xuat 5-8 chinh sua CU THE cho CV de khop hon voi JD tren.
QUY TAC BAT BUOC:
- CHI DE XUAT, KHONG bia kinh nghiem/so lieu ung vien khong co. Neu goi y them so lieu thi de placeholder "[dien so lieu thuc]".
- "truoc" = trich dung/gan dung cau CHU HIEN TAI trong CV. Neu CV chua co thi ghi "(CV chua co muc nay)".
- "sau" = cau/doan viet lai, long tu khoa JD mot cach TU NHIEN, khong sao rong.
- Uu tien: tich hop tu khoa JD con thieu, dinh luong thanh tich, lam ro ky nang.

Tra ve JSON DUNG format (tieng Viet, khong markdown):
{"suggestions":[{"muc":"<sua o muc nao>","truoc":"<chu hien tai hoac '(CV chua co muc nay)'>","sau":"<de xuat viet lai>","ly_do":"<1 cau: vi sao nen sua>"}]}`;
}

async function callGroq(apiKey, cvText, jd) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: buildPrompt(cvText, jd) },
      ],
    }),
  });
  if (res.status === 429) throw new Error("Groq dang qua tai (rate limit) - thu lai sau vai giay.");
  if (!res.ok) throw new Error("Groq loi HTTP " + res.status);
  const data = await res.json();
  let raw = (data.choices?.[0]?.message?.content || "").trim();
  raw = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  return list
    .filter((s) => s && typeof s === "object")
    .map((s) => ({
      muc: String(s.muc || "").trim(),
      truoc: String(s.truoc || "").trim(),
      sau: String(s.sau || "").trim(),
      ly_do: String(s.ly_do || "").trim(),
    }))
    .filter((s) => s.sau);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Chi ho tro POST" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.GROG_API_KEY;
  const cvText = (process.env.CV_TEXT || "").trim();
  if (!apiKey) { res.status(500).json({ error: "Server chua cau hinh GROQ_API_KEY" }); return; }
  if (!cvText) { res.status(500).json({ error: "Server chua cau hinh CV_TEXT" }); return; }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const jdInput = (body?.jd || "").trim();
  const url = (body?.url || "").trim();

  try {
    let jd = jdInput;
    let jdSource = "JD đã dán";
    if (!jd && url) {
      if (!/linkedin\.com/i.test(url)) throw new Error("Link khong phai LinkedIn - hay paste JD truc tiep.");
      jd = await fetchJdFromLinkedIn(url);
      jdSource = "JD lấy từ link";
    }
    if (!jd || jd.length < 40) throw new Error("JD qua ngan hoac trong - hay paste day du noi dung JD.");

    const suggestions = await callGroq(apiKey, cvText, jd);
    res.status(200).json({ suggestions, jd_source: jdSource });
  } catch (e) {
    res.status(200).json({ error: e.message || "Loi khong xac dinh", suggestions: [] });
  }
}
