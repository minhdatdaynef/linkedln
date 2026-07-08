# -*- coding: utf-8 -*-
"""
Crawl job tu VietnamWorks qua API JSON cong khai (ms.vietnamworks.com).
Tra ve job da CHUAN HOA giong LinkedIn crawler: {title, company, location, url,
posted, description, seniority, employment_type, job_function, industries, salary}.
De match_jobs gop chung vao pipeline (cham diem + append).
Chay test: python crawl_vietnamworks.py
"""
import re
import time
import requests
from datetime import datetime, date, timedelta

API = "https://ms.vietnamworks.com/job-search/v1.0/search"
UA = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36",
    "Accept-Language": "vi",
    "Content-Type": "application/json",
}
HANOI_CITY_ID = 24


def _strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    s = s.replace("&nbsp;", " ").replace("&amp;", "&")
    return re.sub(r"\s+", " ", s).strip()


def _posted(j: dict) -> str:
    for k in ("onlineOn", "approvedOn", "createdOn", "lastUpdatedOn"):
        v = j.get(k)
        if not v:
            continue
        try:
            if isinstance(v, (int, float)):
                ts = v / 1000 if v > 1e12 else v
                return datetime.utcfromtimestamp(ts).date().isoformat()
            return str(v)[:10]  # ISO string 'YYYY-MM-DD...'
        except Exception:
            continue
    return ""


def _salary(j: dict) -> str:
    ps = j.get("prettySalary") or j.get("salary")
    if isinstance(ps, str) and ps.strip() and ps.strip().lower() not in ("negotiable", "thương lượng"):
        return ps.strip()
    lo, hi = j.get("salaryMin") or 0, j.get("salaryMax") or 0
    if hi:
        cur = j.get("salaryCurrency") or "VND"
        return f"{lo:,}-{hi:,} {cur}" if lo else f"Up to {hi:,} {cur}"
    return ""


def _in_hanoi(j: dict) -> bool:
    for w in (j.get("workingLocations") or []):
        if w.get("cityId") == HANOI_CITY_ID:
            return True
    return "hà nội" in (j.get("address") or "").lower() or "ha noi" in (j.get("address") or "").lower()


def _normalize(j: dict) -> dict:
    desc = _strip_html(j.get("jobDescription", ""))
    req = _strip_html(j.get("jobRequirement", ""))
    full = (desc + ("\n\nYêu cầu:\n" + req if req else "")).strip()
    inds = j.get("industriesV3") or j.get("industries") or []
    ind_name = ""
    if isinstance(inds, list) and inds:
        ind_name = (inds[0].get("name") if isinstance(inds[0], dict) else str(inds[0])) or ""
    return {
        "title": j.get("jobTitle", "").strip(),
        "company": j.get("companyName", "").strip(),
        "location": (j.get("address") or "").strip(),
        "url": j.get("jobUrl", "").strip(),
        "posted": _posted(j),
        "description": full,
        "seniority": (j.get("jobLevelVI") or j.get("jobLevel") or "").strip(),
        "employment_type": "",
        "job_function": (j.get("jobFunction") or "").strip() if isinstance(j.get("jobFunction"), str) else "",
        "industries": ind_name,
        "salary": _salary(j),
        "source": "vietnamworks",
    }


def fetch(keywords, city_hanoi_only=True, pages=2, hits=30, within_days=7):
    """Lay job tu VNW theo tu khoa. Tra ve list job da chuan hoa (loc Ha Noi + moi <= within_days)."""
    if isinstance(keywords, str):
        keywords = [k.strip() for k in keywords.split(",") if k.strip()]
    cutoff = (date.today() - timedelta(days=within_days)).isoformat()
    seen, out = set(), []
    for kw in keywords:
        for page in range(pages):
            payload = {"userInputKeyword": kw, "query": kw, "hitsPerPage": hits, "page": page,
                       "retrieveFields": []}
            try:
                r = requests.post(API, headers=UA, json=payload, timeout=25)
                if r.status_code != 200:
                    print(f"  [VNW] '{kw}' p{page}: HTTP {r.status_code}"); break
                data = r.json().get("data") or []
            except Exception as e:
                print(f"  [VNW] '{kw}' p{page} loi: {str(e)[:60]}"); break
            if not data:
                break
            for j in data:
                nj = _normalize(j)
                if not nj["url"] or nj["url"] in seen:
                    continue
                if city_hanoi_only and not _in_hanoi(j):
                    continue
                if nj["posted"] and nj["posted"] < cutoff:
                    continue
                seen.add(nj["url"])
                out.append(nj)
            time.sleep(0.4)
    return out


if __name__ == "__main__":
    import sys
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    jobs = fetch("marketing,social,communication,event,content", pages=2)
    print(f"[VNW] Lay {len(jobs)} job Ha Noi (7 ngay).")
    for j in jobs[:5]:
        print(f"  • [{j['posted']}] {j['title'][:45]} — {j['company'][:25]} | 💰 {j['salary'] or '-'} | {j['seniority']}")
