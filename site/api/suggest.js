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
  return `Ban la chuyen gia tuyen dung & viet CV cao cap, dang tu van 1-1 voi ung vien de chinh sua CV cho khop MOT JD cu the.

CV HIEN TAI cua ung vien:
---
${cv.slice(0, 12000)}
---

JD MUC TIEU:
---
${jd.slice(0, 6000)}
---

CACH LAM VIEC (BAT BUOC):
1. DOC KY CV truoc khi de xuat. Voi moi de xuat, muc "Hien tai" phai TRICH NGUYEN VAN doan chu DANG CO trong CV.
   - TUYET DOI KHONG viet "Khong co thong tin ve..." cho mot thu MA CV DA CO. Neu CV da co kinh nghiem/ky nang/thanh tich lien quan, hay NANG CAP cau do (lam ro tu khoa JD, them so lieu da co), KHONG duoc bao la thieu.
   - Chi ghi "(CV chua co)" khi ban thuc su chac chan CV khong he nhac toi.
2. "Sua thanh" phai la NOI DUNG CU THE, viet san de ung vien copy thang vao CV — KHONG duoc chung chung kieu "them thong tin ve X" hay "bo sung ky nang Y". Phai viet ra HAN CAU/DOAN hoan chinh.
3. KHONG bia kinh nghiem/so lieu. Can so lieu ma CV chua co thi de placeholder "[dien so lieu thuc]".
4. Uu tien 4-6 de xuat TAC DONG LON nhat (khop tu khoa quan trong cua JD), sap theo do uu tien. KHONG liet ke dan trai 7-8 y mo nhat.
5. Tra loi TIENG VIET, chuyen nghiep, suc tich. KHONG cau xa giao ("Hy vong...", "Chuc ban...").

DINH DANG moi de xuat:
**[So]. [Muc trong CV]**
**Hiện tại:** "<trich nguyen van CV, hoac (CV chưa có)>"
**Sửa thành:** "<cau/doan cu the de dan thang vao CV>"
**Lý do:** <1 cau ngan, gan voi tu khoa JD>

VI DU 1 de xuat DAT yeu cau:
**1. Kinh nghiệm — quản lý kênh**
**Hiện tại:** "Developed 2 Facebook fanpages, growing followers by 108% (46K to 96K), revenue 150M VND/month."
**Sửa thành:** "Quản lý & phát triển 2 fanpage Facebook: tăng 108% follower (46K→96K), doanh thu TB 150 triệu/tháng; lập kế hoạch nội dung đa kênh, theo dõi hiệu quả bằng Google Analytics."
**Lý do:** Lồng từ khóa JD 'lập kế hoạch nội dung', 'Google Analytics' vào thành tích CÓ THẬT.

O LUOT DAU: dua 4-6 de xuat. Cac luot sau: tinh chinh/giai dap theo yeu cau cua ung vien.`;
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
        temperature: 0.2,
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
