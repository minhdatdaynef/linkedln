# -*- coding: utf-8 -*-
"""
Sinh trang UPSKILL (skill-gap) tinh: gom `keywords_missing` qua cac job da loc ->
heatmap ky nang thieu (theo tan suat) + goi Groq sinh lo trinh hoc co goi y tai nguyen.
Ket qua: site/upskill.html  (link tu trang job chinh).
Chay: python gen_upskill.py [out.html]
"""
import os, sys, json, time, collections
import requests
from datetime import date

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from cv_loader import load_cv_text

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = os.getenv("SUGGEST_MODEL", "llama-3.3-70b-versatile")
SRC = ["data/jobs_filtered.json", "data/jobs_ranked.json"]
OUT = sys.argv[1] if len(sys.argv) > 1 else "site/upskill.html"
SITE_URL = os.getenv("SITE_URL", "https://emchicolennha.vercel.app")


def load_jobs():
    for p in SRC:
        if os.path.exists(p):
            return json.load(open(p, encoding="utf-8"))
    return []


def aggregate(jobs):
    """Gom keywords_missing (khong phan biet hoa thuong) -> {ten_dai_dien: so_job}."""
    counter = collections.Counter()
    label = {}
    for j in jobs:
        seen = set()
        for k in (j.get("match", {}).get("keywords_missing") or []):
            k = (k or "").strip()
            if not k:
                continue
            key = k.lower()
            label.setdefault(key, k)
            if key not in seen:          # moi job dem 1 lan/keyword
                counter[key] += 1
                seen.add(key)
    return [(label[k], n) for k, n in counter.most_common()]


def priority(n, total):
    r = n / total if total else 0
    if r >= 0.30: return ("Rất cần", "#cf3b3b")
    if r >= 0.15: return ("Cần", "#e07b1a")
    if r >= 0.07: return ("Nên có", "#c8a415")
    return ("Bổ sung", "#5a9")


def learning_plan(cv_text, top_skills):
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROG_API_KEY")
    if not api_key or not top_skills:
        return ""
    skills_block = "\n".join(f"- {name} (xuat hien {n} job)" for name, n in top_skills)
    prompt = f"""Ung vien marketing co CV nhu sau (rut gon):
---
{cv_text[:6000]}
---

Qua nhieu tin tuyen dung phu hop, day la cac KY NANG/TU KHOA CV con THIEU (kem so job yeu cau):
{skills_block}

Hay lap LO TRINH HOC ngan gon giup ung vien lap cac khoang trong nay. Voi 5-8 ky nang quan trong nhat:
- Ten ky nang
- 1 cau: vi sao quan trong voi vi tri marketing dang nham
- 1 tai nguyen hoc CU THE, pho bien (vd Google Analytics Academy, Meta Blueprint, HubSpot Academy, Coursera...)
- Uoc luong thoi gian dat co ban
Cuoi cung: THU TU HOC de nghi (hoc gi truoc). Tra loi TIENG VIET, dung markdown, suc tich, khong xa giao."""
    payload = {"model": MODEL, "temperature": 0.3,
               "messages": [
                   {"role": "system", "content": "Ban la co van phat trien su nghiep. Tra loi tieng Viet, suc tich, khong bia. Chi goi y tai nguyen co that, pho bien."},
                   {"role": "user", "content": prompt}]}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    for attempt in range(3):
        try:
            r = requests.post(GROQ_URL, headers=headers, json=payload, timeout=90)
            if r.status_code == 429:
                time.sleep(15 * (attempt + 1)); continue
            if r.status_code != 200:
                return ""
            return r.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            time.sleep(3)
    return ""


def md_to_html(t):
    import re, html
    h = html.escape(t or "")
    h = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", h)
    h = re.sub(r"(?m)^#{1,6}\s*(.+)$", r"<h3>\1</h3>", h)
    h = re.sub(r"(?m)^\s*[-*]\s+(.*)$", r"• \1", h)
    return h.replace("\n", "<br>")


def build_html(rows, plan_md, n_jobs):
    total = n_jobs or 1
    chips = []
    for name, n in rows[:30]:
        lab, col = priority(n, total)
        chips.append(
            f'<div class="chip"><span class="dot" style="background:{col}"></span>'
            f'<b>{name}</b> <span class="cnt">{n} job · {lab}</span></div>')
    plan_html = f'<div class="plan">{md_to_html(plan_md)}</div>' if plan_md else \
        '<div class="plan"><i>Chưa tạo được lộ trình (thiếu Groq key hoặc không có dữ liệu).</i></div>'
    return f"""<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Kỹ năng cần bổ sung · Upskill</title>
<style>
:root{{--bg:#f6f5f2;--card:#fff;--bd:#e6e3dd;--tx:#1d1c1a;--mut:#6a665f;--acc:#3a35a3}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--tx);
font-family:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif;font-size:15px}}
.wrap{{max-width:900px;margin:0 auto;padding:22px 16px}}
.back{{display:inline-block;color:var(--mut);text-decoration:none;font-size:13.5px;margin-bottom:8px}}
.back:hover{{color:var(--acc)}}
h1{{font-size:23px;margin:0 0 4px}} .sub{{color:var(--mut);margin:0 0 16px;font-size:14px}}
.box{{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;margin-bottom:16px}}
.h2{{font-size:16px;font-weight:700;margin:0 0 12px}}
.chips{{display:flex;flex-wrap:wrap;gap:8px}}
.chip{{display:flex;align-items:center;gap:7px;border:1px solid var(--bd);border-radius:20px;padding:6px 12px;font-size:13px;background:#fbfaf8}}
.dot{{width:9px;height:9px;border-radius:50%}} .cnt{{color:var(--mut);font-size:12px}}
.plan{{font-size:14px;line-height:1.6}} .plan h3{{font-size:15px;margin:14px 0 4px;color:var(--acc)}}
.note{{font-size:12px;color:var(--mut);font-style:italic;margin-top:10px}}
</style></head><body><div class="wrap">
<a class="back" href="index.html">← Danh sách job phù hợp</a>
<h1>📈 Kỹ năng cần bổ sung (Upskill)</h1>
<p class="sub">Tổng hợp từ khóa/kỹ năng mà <b>{n_jobs} job phù hợp</b> hay yêu cầu nhưng CV của bạn chưa thể hiện · cập nhật {date.today().isoformat()}</p>
<div class="box"><div class="h2">🔥 Kỹ năng thiếu, xếp theo mức độ hay bị yêu cầu</div>
  <div class="chips">{''.join(chips) or '<i>Không có dữ liệu.</i>'}</div>
  <div class="note">Rất cần ≥30% job · Cần ≥15% · Nên có ≥7% · còn lại: bổ sung.</div>
</div>
<div class="box"><div class="h2">🎓 Lộ trình học đề xuất</div>
  {plan_html}
  <div class="note">Gợi ý bởi AI — tài nguyên/thời gian mang tính tham khảo, bạn tự kiểm chứng.</div>
</div>
<p class="sub">👉 <a href="{SITE_URL}/cv.html" style="color:var(--acc);font-weight:600">Sửa CV / viết cover letter theo JD</a></p>
</div></body></html>"""


def main():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass
    jobs = load_jobs()
    rows = aggregate(jobs)
    print(f"[Upskill] {len(jobs)} job · {len(rows)} keyword thieu (unique).")
    plan = ""
    if rows:
        try:
            cv_text, _ = load_cv_text()
            plan = learning_plan(cv_text, rows[:15])
        except Exception as e:
            print(f"[Upskill] Bo qua lo trinh: {e}")
    html = build_html(rows, plan, len(jobs))
    os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(html)
    print(f"[OK] Da sinh {OUT} (plan: {'co' if plan else 'khong'}).")


if __name__ == "__main__":
    main()
