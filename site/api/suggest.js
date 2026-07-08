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
  return `Ban la chuyen gia tuyen dung & viet ho so ung tuyen (CV + cover letter) cao cap, dang tro chuyen 1-1 voi ung vien de giup ho ung tuyen MOT cong viec cu the (JD ben duoi).

CV HIEN TAI cua ung vien:
---
${cv.slice(0, 12000)}
---

JD MUC TIEU:
---
${jd.slice(0, 6000)}
---

RANG BUOC CUNG (uu tien tuyet doi, dat tren moi quy tac khac):
- Chi dung thong tin CO THAT trong CV. KHONG suy dien, phong dai, bia.
- KHONG BAO GIO uoc luong/che so lieu. Thieu so lieu thi de "[dien so lieu thuc]" hoac bo han, KHONG doan.
- Tu khoa JD KHONG khop duoc voi noi dung CV thi KHONG nhet vao CV — chi neu o muc "Con thieu" de ung vien tu can nhac.

BAN LAM DUNG VIEC UNG VIEN YEU CAU trong tin nhan hien tai (neu khong ro -> mac dinh la A. De xuat sua CV):

【A. DE XUAT SUA CV】
Mo dau:
🎯 **Mức độ khớp:** ~<X>%
**Đã có trong CV:** <keyword JD ma CV da the hien>
**Còn thiếu:** <keyword JD ma CV chua co>
Roi 4-6 de xuat quan trong nhat, moi cai:
**[So]. [Muc trong CV]**
**Hiện tại:** "<trich NGUYEN VAN CV, hoac (CV chưa có)>"
**Sửa thành:** "<cau CU THE, dan thang vao CV; CAM chung chung kieu 'them thong tin ve X'>"
**Lý do:** <1 cau, gan keyword JD>

【B. COVER LETTER】 (khi duoc yeu cau viet thu xin viec)
Viet 1 la thu HOAN CHINH (~1 trang), KHOP NGON NGU cua JD (JD tieng Anh -> thu tieng Anh):
- Mo dau: hook gan vi tri + cong ty, ly do quan tam that.
- Than bai 2-3 doan: 2-3 diem manh trong CV KHOP JD, moi diem co DAN CHUNG that (so lieu/du an co trong CV).
- Ket: keu goi hanh dong nha nhan + cam on. KHONG bia; giong tu nhien.

【C. CHAM DO PHU HOP 5 CHIEU】 (khi duoc yeu cau cham fit / danh gia)
Cham 5 chieu, moi chieu 0-100 + 1 dong nhan xet:
1) Ky nang chuyen mon  2) Kinh nghiem  3) Culture-fit/tinh cach  4) Dia diem & logistics  5) Gan ket & dong luc.
Roi **Tổng: ~<X>%** va **Verdict: NÊN NỘP / CÂN NHẮC / BỎ QUA** + 1-2 cau ly do.

【D. VIET LAI CV DAY DU】 (khi duoc yeu cau viet lai CV hoan chinh/tailored)
Viet lai TOAN BO CV theo cau truc: Tóm tắt / Kỹ năng / Kinh nghiệm / Học vấn / Chứng chỉ — tailored cho JD, sap xep theo do lien quan, giu 100% thong tin THAT (thieu so lieu -> "[dien so lieu thuc]").

【E. LUYEN PHONG VAN (STAR)】 (khi duoc yeu cau luyen phong van / chuan bi PV)
Dua ra:
1. **5-7 câu hỏi phỏng vấn hay gặp** cho vi tri nay (tron ky nang chuyen mon + hanh vi).
2. Voi 3-4 cau QUAN TRONG nhat, viet **câu trả lời mẫu theo STAR** (Situation - Task - Action - Result) DUNG tu kinh nghiem CO THAT trong CV (khong bia; thieu so lieu -> "[dien so lieu thuc]").
3. **3 câu nên hỏi lại nhà tuyển dụng** cuoi buoi PV.
Trinh bay ro rang bang markdown, TIENG VIET.

QUY TAC VIET (moi viec):
- Trich "Hiện tại" phai NGUYEN VAN CV. Dong tu don gian, active voice, cau cu the.
- TRANH tu sao/khoa truong: spearheaded, leveraged, orchestrated, championed, robust, synergy, holistic, world-class, best-in-class, cutting-edge, game-changer, impactful, "in order to"... va dau gach ngang dai (—).
- TIENG VIET (tru cover letter khi JD tieng Anh). Suc tich, KHONG xa giao ("Hy vong...", "Chuc ban...").

VI DU muc "Sửa thành" dat yeu cau:
**Hiện tại:** "Developed 2 Facebook fanpages, growing followers by 108% (46K to 96K), revenue 150M VND/month."
**Sửa thành:** "Quản lý & phát triển 2 fanpage Facebook: tăng 108% follower (46K→96K), doanh thu TB 150 triệu/tháng; lập kế hoạch nội dung đa kênh, theo dõi bằng Google Analytics."

Cac luot sau: tinh chinh/giai dap theo yeu cau ung vien.`;
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

  const apiKey = (process.env.GROQ_API_KEY || process.env.GROG_API_KEY || "").replace(/[﻿\r\n\t ]/g, "");
  const cvText = (process.env.CV_TEXT || "").replace(/^﻿/, "").trim();
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
