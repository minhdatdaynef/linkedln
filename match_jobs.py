# -*- coding: utf-8 -*-
"""
Personal Job Matcher
====================
Quet job (LinkedIn) -> cham do phu hop voi 1 CV duy nhat cua ban -> tra ra danh sach
job da xep hang theo % phu hop.

Chay:  python match_jobs.py
       python match_jobs.py --use-cached      # dung data/jobs.json co san, khong crawl
       python match_jobs.py --min 60 --max 15 --cv cv/cv_cua_toi.pdf
"""
import os
import re
import sys
import json
import argparse
from datetime import date
from dotenv import load_dotenv

from cv_loader import load_cv_text
from matcher import score_match

# Windows console hay la cp1252 -> ep UTF-8 de in tieng Viet khong loi
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

load_dotenv()

DATA_DIR = "data"
CACHE_FILE = os.path.join(DATA_DIR, "jobs.json")
OUT_JSON = os.path.join(DATA_DIR, "jobs_ranked.json")
OUT_MD = os.path.join(DATA_DIR, "jobs_ranked.md")
DB_FILE = os.path.join(DATA_DIR, "jobs_db.json")   # kho tich luy (append)
PREFS_FILE = "prefs.json"


def job_id(job) -> str:
    """Khoa duy nhat: ID so cuoi cung trong URL LinkedIn (vd ...-4424355731)."""
    url = job.get("url", "") or ""
    m = re.search(r"(\d{6,})(?:[/?].*)?$", url)
    return m.group(1) if m else url


def load_db() -> dict:
    if os.path.exists(DB_FILE):
        try:
            return json.load(open(DB_FILE, encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_db(db: dict):
    os.makedirs(DATA_DIR, exist_ok=True)
    json.dump(db, open(DB_FILE, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def load_prefs() -> dict:
    if os.path.exists(PREFS_FILE):
        with open(PREFS_FILE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def build_prefs_text(prefs: dict) -> str:
    if not prefs:
        return ""
    lines = []
    if prefs.get("huong_cong_viec"):  lines.append("- Huong cong viec: " + ", ".join(prefs["huong_cong_viec"]))
    if prefs.get("dia_diem"):         lines.append("- Dia diem / hinh thuc: " + ", ".join(prefs["dia_diem"]))
    if prefs.get("luong_toi_thieu_trieu"): lines.append(f"- Luong toi thieu mong muon: {prefs['luong_toi_thieu_trieu']} trieu/thang")
    if prefs.get("cap_bac"):          lines.append("- Cap bac nham toi: " + prefs["cap_bac"])
    if prefs.get("loai_cong_ty"):     lines.append("- Loai cong ty: " + ", ".join(prefs["loai_cong_ty"]))
    if prefs.get("nganh_uu_tien"):    lines.append("- Nganh uu tien: " + ", ".join(prefs["nganh_uu_tien"]))
    if prefs.get("tranh"):            lines.append("- CAN TRANH: " + ", ".join(prefs["tranh"]))
    return "\n".join(lines)


def get_jobs(use_cached: bool, prefs: dict = None) -> list:
    """Lay danh sach job: tu cache hoac crawl LinkedIn."""
    if use_cached:
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, encoding="utf-8") as f:
                jobs = json.load(f)
            print(f"[Jobs] Dung cache: {len(jobs)} jobs tu {CACHE_FILE}")
            return jobs
        print(f"[Jobs] Khong co cache {CACHE_FILE}, se crawl.")

    # Crawl bang ha tang san co. Uu tien: env > prefs.crawl > mac dinh
    crawl_cfg = (prefs or {}).get("crawl", {})
    def cfg(env_key, pref_key, default):
        return os.getenv(env_key) or crawl_cfg.get(pref_key) or default

    import crawler
    keywords = [k.strip() for k in str(cfg("CRAWL_KEYWORDS", "keywords", "marketing,truyen thong,su kien")).split(",") if k.strip()]
    location = cfg("CRAWL_LOCATION", "location", "Hanoi")
    max_pages = int(cfg("CRAWL_MAX_PAGES", "max_pages", 3))
    date_posted = cfg("CRAWL_DATE_POSTED", "date_posted", "week") or "week"
    experience = os.getenv("CRAWL_EXPERIENCE", "") or None
    work_type = os.getenv("CRAWL_WORK_TYPE", "") or None

    all_jobs = []
    for kw in keywords:
        all_jobs.extend(crawler.crawl_jobs(
            keyword=kw, location=location, max_pages=max_pages,
            date_posted=date_posted, experience=experience, work_type=work_type,
        ))
    print(f"[Jobs] Tong raw: {len(all_jobs)} tu {len(keywords)} keyword")

    filtered = crawler.filter_by_title(all_jobs, list(set(keywords)))
    if not filtered:
        print("[Jobs] Khong co job sau filter.")
        return []

    print(f"[Jobs] Lay mo ta chi tiet {len(filtered)} job...")
    crawler.enrich_with_details(filtered, delay=1.5)

    # + Nguon VietnamWorks (API JSON, da co san mo ta/luong) — dedup theo url
    if os.getenv("VNW_ENABLED", "1").lower() in ("1", "true", "yes"):
        try:
            import crawl_vietnamworks as vnw
            vnw_kw = os.getenv("VNW_KEYWORDS", "marketing,social media,communication,PR,event,content")
            vnw_jobs = vnw.fetch(vnw_kw, pages=int(os.getenv("VNW_PAGES", "2")), within_days=7)
            have = {j.get("url") for j in filtered}
            add = [j for j in vnw_jobs if j.get("url") and j.get("url") not in have]
            # bo title cap quan ly (khoi ton diem cham), uu tien moi nhat, cap so luong
            add = [j for j in add if not _BAD_LEVEL_TITLE.search(j.get("title", ""))]
            add.sort(key=lambda j: j.get("posted") or "", reverse=True)
            add = add[:int(os.getenv("VNW_MAX", "25"))]
            filtered += add
            print(f"[Jobs] VietnamWorks: +{len(add)} job (tong {len(filtered)})")
        except Exception as e:
            print(f"[Jobs] VNW bo qua ({str(e)[:70]})")

    # luu lai de lan sau dung --use-cached
    crawler.save_results(filtered, CACHE_FILE)
    return filtered


# Tu khoa title -> cap quan ly / CTV (an toan, bat sot truong hop AI bo qua)
_BAD_LEVEL_TITLE = re.compile(
    r"\bmanager\b|\bdirector\b|\bhead\b|\blead\b|\bleader\b|trưởng nhóm|trưởng phòng|"
    r"\bchief\b|\bcmo\b|giám đốc|\bctv\b|cộng tác viên|collaborator|\bintern\b|thực tập",
    re.IGNORECASE,
)

# Title PHAI thuoc marketing/truyen thong (hoac dong nghia) moi giu lai
_MKT_TITLE = re.compile(
    r"marketing|mkt|truyền thông|truyen thong|communication|comms|\bpr\b|"
    r"thương hiệu|thuong hieu|\bbrand\b|content|nội dung|noi dung|social|\bmedia\b|"
    r"event|sự kiện|su kien|activation|digital|\bseo\b|\bsem\b|quảng cáo|quang cao|"
    r"\bads?\b|advertising|copywrit|creative|sáng tạo|community|\bkol\b|\bkoc\b|influencer|marcom",
    re.IGNORECASE,
)
# Title co dau hieu SALES/kinh doanh -> loai (ung vien tranh sale)
_SALES_TITLE = re.compile(
    r"\bsales?\b|\bsale\b|bán hàng|ban hang|kinh doanh|business development|\bbd\b|"
    r"telesales|tuyển sinh|tuyen sinh|account executive|account manager",
    re.IGNORECASE,
)


def hard_exclude_reason(job):
    """Tra ve ly do LOAI THANG (None neu giu lai). Theo lua chon: loai toan bo."""
    m = job.get("match", {})
    lvl = (m.get("level") or "").lower()
    title = job.get("title", "")
    if not _MKT_TITLE.search(title) or _SALES_TITLE.search(title):
        return "Title không thuộc marketing/truyền thông (hoặc là sales)"
    if "quản lý" in lvl or "quan ly" in lvl or "ctv" in lvl or "intern" in lvl or _BAD_LEVEL_TITLE.search(title):
        return "Sai cấp bậc (Manager/Lead/CTV)"
    if m.get("in_hanoi") is False:
        return "Ngoài Hà Nội"
    if m.get("salary_below_min", m.get("salary_below_12m")):
        return "Lương rõ ràng thấp hơn mong muốn"
    if m.get("requires_travel"):
        return "Phải đi tỉnh / công tác nhiều"
    return None


def _score_print(i, total, job, res):
    print(f"  [{i}/{total}] tong{res.get('match_score',-1):>3} "
          f"(CV {res.get('cv_fit','?')} / TC {res.get('criteria_fit','?')})  {job.get('title','')[:46]}")


def score_all(jobs, cv_text, prefs_text=""):
    """Che do FULL: cham lai TAT CA job (khong dung kho)."""
    scored = []
    for i, job in enumerate(jobs, 1):
        res = score_match(cv_text, job, prefs_text=prefs_text)
        job["match"] = res
        job["is_new"] = True
        job["date_added"] = date.today().isoformat()
        _score_print(i, len(jobs), job, res)
        if res.get("match_score", -1) >= 0:
            scored.append(job)
    return scored


def merge_with_db(crawled, cv_text, prefs_text=""):
    """
    Che do APPEND: chi cham job MOI (chua co trong kho), giu nguyen diem job cu.
    Tra ve toan bo job trong kho (da gan is_new cho job them hom nay).
    """
    db = load_db()
    today = date.today().isoformat()

    # Bat dau out = toan bo kho cu (giu lich su); cap nhat is_new theo ngay
    out = {}
    for jid, rec in db.items():
        rec["is_new"] = (rec.get("date_added") == today)
        out[jid] = rec

    to_score = []
    for job in crawled:
        jid = job_id(job)
        old = out.get(jid)
        if old and old.get("match", {}).get("match_score", -1) >= 0:
            # da co -> giu diem cu, chi lam tuoi field co ban
            for k, v in job.items():
                if v and k not in ("match", "date_added", "is_new"):
                    old[k] = v
        else:
            to_score.append((jid, job))

    print(f"[Append] Kho hien co {len(db)} job | crawl {len(crawled)} | MOI can cham: {len(to_score)}")
    for i, (jid, job) in enumerate(to_score, 1):
        res = score_match(cv_text, job, prefs_text=prefs_text)
        job["match"] = res
        job["date_added"] = today
        job["is_new"] = True
        _score_print(i, len(to_score), job, res)
        if res.get("match_score", -1) >= 0:
            out[jid] = job
            save_db(out)   # luu NGAY sau moi job -> bi ngat van khong mat tien do

    save_db(out)
    print(f"[Append] Kho sau khi gop: {len(out)} job | moi hom nay: {sum(1 for j in out.values() if j.get('is_new'))}")
    return list(out.values())


def finalize(scored, min_score, max_results):
    """Loc cung (loai thang) + xep hang + lay top. Tra ve (kept, excluded)."""
    scored = sorted(scored, key=lambda j: j["match"]["match_score"], reverse=True)
    survivors, excluded = [], []
    for j in scored:
        reason = hard_exclude_reason(j)
        if reason:
            j["exclude_reason"] = reason
            excluded.append(j)
        else:
            survivors.append(j)
    kept = [j for j in survivors if j["match"]["match_score"] >= min_score][:max_results]
    return kept, excluded


def write_outputs(kept, cv_path, min_score):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(kept, f, ensure_ascii=False, indent=2)

    lines = [
        f"# Job phu hop voi CV cua ban",
        f"",
        f"> CV: `{cv_path}`  ·  Nguong phu hop: >= {min_score}%  ·  {len(kept)} job",
        f"",
    ]
    for rank, job in enumerate(kept, 1):
        m = job["match"]
        loc = job.get("work_location_detail") or job.get("location") or ""
        lines.append(f"## {rank}. [{m['match_score']}%] {job.get('title','')} — {job.get('company','')}")
        sub = f"CV: {m.get('cv_fit','?')}%  ·  Tieu chi: {m.get('criteria_fit','?')}%"
        meta = "  ·  ".join(x for x in [sub, loc, job.get("salary") or "", job.get("posted") or ""] if x)
        if meta:
            lines.append(f"*{meta}*")
        if job.get("url"):
            lines.append(f"\n🔗 {job['url']}")
        if m.get("one_line_reason"):
            lines.append(f"\n**Nhan xet:** {m['one_line_reason']}")
        if m.get("criteria_flags"):
            lines.append("\n**Tieu chi:** " + "  ".join(m["criteria_flags"]))
        if m.get("strengths"):
            lines.append("\n**Khop:** " + "; ".join(m["strengths"]))
        if m.get("gaps"):
            lines.append("\n**Con thieu:** " + "; ".join(m["gaps"]))
        if m.get("keywords_missing"):
            lines.append("\n**Keyword nen them:** " + ", ".join(m["keywords_missing"]))
        lines.append("")
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def print_table(kept):
    if not kept:
        print("\n(Khong co job nao dat nguong phu hop)")
        return
    print("\n" + "=" * 84)
    print(f"{'#':<3}{'Tong':<6}{'CV':<5}{'TC':<5}{'Vi tri':<38}{'Cong ty':<22}")
    print("-" * 84)
    for i, job in enumerate(kept, 1):
        m = job["match"]
        print(f"{i:<3}{m['match_score']:<6}{m.get('cv_fit','?'):<5}{m.get('criteria_fit','?'):<5}{job.get('title','')[:36]:<38}{job.get('company','')[:20]:<22}")
    print("=" * 84)
    print("Tong = diem tong hop  |  CV = ky nang khop JD  |  TC = khop tieu chi cua ban")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--use-cached", action="store_true", help="Dung data/jobs.json thay vi crawl")
    ap.add_argument("--min", type=int, default=int(os.getenv("MIN_SCORE", "70")))
    ap.add_argument("--max", type=int, default=int(os.getenv("MAX_RESULTS", "20")))
    ap.add_argument("--cv", default=None, help="Duong dan file CV (mac dinh: tu dong tim trong cv/)")
    ap.add_argument("--full", action="store_true", help="Cham lai TAT CA (khong dung kho append)")
    args = ap.parse_args()

    print("=" * 72)
    print(" PERSONAL JOB MATCHER — quet job & cham do phu hop voi CV cua ban")
    print("=" * 72)

    cv_text, cv_path = load_cv_text(args.cv)

    prefs = load_prefs()
    prefs_text = build_prefs_text(prefs)
    if prefs_text:
        print("[Prefs] Da nap tieu chi tu prefs.json (xet khi cham diem).")

    jobs = get_jobs(args.use_cached, prefs)
    if not jobs:
        print("\n[!] Khong co job de cham. LinkedIn co the da chan — thu lai sau hoac dung --use-cached.")
        sys.exit(1)

    print(f"\n[Match] Cham do phu hop (60% CV + 40% Tieu chi)...")
    if args.full:
        scored = score_all(jobs, cv_text, prefs_text)          # cham lai tat ca
    else:
        scored = merge_with_db(jobs, cv_text, prefs_text)       # APPEND: chi cham job moi
    kept, excluded = finalize(scored, args.min, args.max)

    write_outputs(kept, cv_path, args.min)
    print_table(kept)
    if excluded:
        print(f"\n[Loai thang] {len(excluded)} job (vi pham tieu chi cung):")
        for j in excluded:
            print(f"   ✘ {j.get('exclude_reason','')}: {j.get('title','')[:46]} ({j.get('company','')[:18]})")
    print(f"\n[OK] Da luu: {OUT_MD}  va  {OUT_JSON}")
    print(f"[OK] Giu {len(kept)} job (>= {args.min}%) | loai thang {len(excluded)} | tong cham {len(scored)}")


if __name__ == "__main__":
    main()
