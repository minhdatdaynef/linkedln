# -*- coding: utf-8 -*-
"""Cham do phu hop giua CV cua ban va 1 JD bang AI (Groq REST API)."""
import os
import json
import time
import requests

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
# 8B-instant: nhanh + gioi han rate cao hon nhieu (tranh nghen free tier).
# Doi lai 70b bang env MATCH_MODEL=llama-3.3-70b-versatile neu can chinh xac hon.
MODEL = os.getenv("MATCH_MODEL", "llama-3.1-8b-instant")

# Trong so diem tong (theo lua chon cua ung vien): 60% CV + 40% Tieu chi
CV_W = 0.6
CRIT_W = 0.4

SYSTEM = (
    "Ban la chuyen gia tuyen dung. Cham muc do phu hop giua CV ung vien va mot tin tuyen dung (JD). "
    "TUYET DOI KHONG bia thong tin ve CV: chi danh gia dua tren noi dung CV that. "
    "Luon tra loi bang TIENG VIET. Chi tra ve JSON thuan tuy, khong markdown, khong giai thich."
)


def _build_jd(job: dict) -> str:
    parts = []
    if job.get("title"):       parts.append(f"Vi tri: {job['title']}")
    if job.get("company"):     parts.append(f"Cong ty: {job['company']}")
    loc = job.get("work_location_detail") or job.get("location")
    if loc:                    parts.append(f"Dia diem: {loc}")
    if job.get("experience_required"): parts.append(f"Kinh nghiem yeu cau: {job['experience_required']}")
    if job.get("salary"):      parts.append(f"Muc luong: {job['salary']}")
    if job.get("key_requirements"):
        parts.append("Yeu cau chinh:\n" + "\n".join(f"- {r}" for r in job["key_requirements"]))
    desc = (job.get("description") or "").strip()
    if desc:
        parts.append("Mo ta cong viec:\n" + desc[:4000])
    return "\n\n".join(parts)


def _min_salary_m() -> int:
    """Nguong luong toi thieu (trieu/thang) — lay tu prefs.json (mac dinh 12)."""
    try:
        p = json.load(open("prefs.json", encoding="utf-8"))
        return int(p.get("luong_toi_thieu_trieu") or 12)
    except Exception:
        return 12


def score_match(cv_text: str, job: dict, api_key: str = None, retries: int = 3, prefs_text: str = "") -> dict:
    """
    Tra ve dict:
      {match_score:int, one_line_reason, strengths[], gaps[], keywords_missing[], criteria_flags[]}
    Neu loi -> match_score = -1 (de loc bo).
    prefs_text: tieu chi mong muon cua ung vien (neu co) -> duoc xet khi cham diem.
    """
    api_key = api_key or os.getenv("GROQ_API_KEY") or os.getenv("GROG_API_KEY")
    if not api_key:
        return {"match_score": -1, "one_line_reason": "Thieu GROQ_API_KEY", "strengths": [], "gaps": [], "keywords_missing": [], "criteria_flags": []}

    jd = _build_jd(job)
    min_sal = _min_salary_m()

    prefs_block = ""
    if prefs_text:
        prefs_block = f"""

TIEU CHI MONG MUON CUA UNG VIEN:
{prefs_text}

RUBRIC cham "criteria_fit" (0-100) — do khop giua JOB va TIEU CHI tren (KHONG xet ky nang CV o day):
- 85-100: dung huong cong viec + dung cap bac (Executive/Specialist/nhan vien) + dia diem Ha Noi + thuoc nganh/loai cong ty uu tien + KHONG dinh dieu can tranh.
- 55-80: dung huong nhung lech 1-2 yeu to (vd cap Senior, nganh khac, chua ro luong).
- 25-50: lech vua: vi tri Senior cao / 1 dieu can tranh nhe / dia diem chua ro.
- 0-20: LECH NANG, loai ngay: cap Manager/Director/Head/Lead/Truong nhom/CMO/Giam doc (ung vien chi muon Executive); HOAC nang KPI doanh so/sale; HOAC phai di tinh/cong tac; HOAC ngoai Ha Noi; HOAC luong ro rang thap hon muc mong muon.
"""

    crit_field = (
        '"criteria_fit": <so nguyen 0-100 theo rubric tren>,'
        if prefs_text else '"criteria_fit": 100,'
    )

    prompt = f"""CV cua ung vien:
---
{cv_text[:12000]}
---

Tin tuyen dung (JD):
---
{jd[:5000]}
---{prefs_block}

Tra ve JSON DUNG format sau (tieng Viet, khong markdown):
{{
  "cv_fit": <so nguyen 0-100: muc do KY NANG/KINH NGHIEM trong CV dap ung yeu cau JD>,
  {crit_field}
  "level": "<mot trong: 'Executive/Specialist' | 'Senior' | 'Quan ly' (Manager/Lead/Head/Truong nhom/Director/CMO) | 'CTV/Intern' (cong tac vien/thuc tap) | 'Khong ro'>",
  "in_hanoi": <true neu job lam tai Ha Noi HOAC remote/WFH; false neu o tinh/thanh khac>,
  "salary_below_min": <true CHI khi JD ghi RO muc luong va muc do < {min_sal} trieu/thang; nguoc lai false>,
  "requires_travel": <true neu JD yeu cau di cong tac/di tinh thuong xuyen; nguoc lai false>,
  "one_line_reason": "<1 cau ngan: vi sao phu hop / khong>",
  "strengths": ["<diem manh CV khop JD 1>", "<2>", "<3>"],
  "gaps": ["<diem CV con thieu HOAC job lech tieu chi 1>", "<2>"],
  "keywords_missing": ["<tu khoa JD ma CV chua co 1>", "<2>", "<3>"],
  "criteria_flags": ["<✔ tieu chi KHOP vd ✔ Executive, ✔ Ha Noi>", "<✘ tieu chi LECH vd ✘ Vi tri Manager>"]
}}"""

    payload = {
        "model": MODEL,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": prompt},
        ],
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    for attempt in range(1, retries + 1):
        try:
            r = requests.post(GROQ_URL, headers=headers, json=payload, timeout=60)
            if r.status_code == 429:
                wait = 20 * attempt
                print(f"  [Match] Rate limit, cho {wait}s...")
                time.sleep(wait)
                continue
            if r.status_code != 200:
                return {"match_score": -1, "one_line_reason": f"Groq {r.status_code}", "strengths": [], "gaps": [], "keywords_missing": []}
            raw = r.json()["choices"][0]["message"]["content"].strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            data = json.loads(raw)
            cv_fit = max(0, min(100, int(data.get("cv_fit", data.get("match_score", 0)) or 0)))
            crit_fit = max(0, min(100, int(data.get("criteria_fit", 100) or 100)))
            # Diem tong = 60% CV + 40% Tieu chi (khi co tieu chi); khong co tieu chi -> chi CV
            final = round(CV_W * cv_fit + CRIT_W * crit_fit) if prefs_text else cv_fit
            data["cv_fit"] = cv_fit
            data["criteria_fit"] = crit_fit
            data["match_score"] = int(final)
            # Cac co hard-filter (chuan hoa)
            data["level"] = str(data.get("level", "Khong ro"))
            data["in_hanoi"] = bool(data.get("in_hanoi", True))
            data["salary_below_min"] = bool(data.get("salary_below_min", data.get("salary_below_12m", False)))
            data["requires_travel"] = bool(data.get("requires_travel", False))
            for k in ("strengths", "gaps", "keywords_missing", "criteria_flags"):
                if not isinstance(data.get(k), list):
                    data[k] = []
            data.setdefault("one_line_reason", "")
            return data
        except Exception as e:
            if attempt == retries:
                return {"match_score": -1, "one_line_reason": f"Loi: {str(e)[:80]}", "strengths": [], "gaps": [], "keywords_missing": []}
            time.sleep(3)
    return {"match_score": -1, "one_line_reason": "Het luot thu", "strengths": [], "gaps": [], "keywords_missing": []}
