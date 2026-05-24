"""
LinkedIn Job Crawler - Ho tro day du filter
"""
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import json, os, time

load_dotenv()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
}

# ─────────────────────────────────────────────
#  FILTER OPTIONS (tham khao khi goi ham)
# ─────────────────────────────────────────────
DATE_POSTED = {
    "any":         "",
    "month":       "r2592000",
    "week":        "r604800",
    "24h":         "r86400",
}

EXPERIENCE_LEVEL = {
    "internship":   "1",
    "entry":        "2",
    "associate":    "3",
    "mid_senior":   "4",
    "director":     "5",
    "executive":    "6",
}

WORK_TYPE = {
    "onsite":   "1",
    "remote":   "2",
    "hybrid":   "3",
}

JOB_TYPE = {
    "fulltime":    "F",
    "parttime":    "P",
    "contract":    "C",
    "temporary":   "T",
    "internship":  "I",
    "volunteer":   "V",
    "other":       "O",
}


def crawl_jobs(
    keyword="Python Developer",
    location="Vietnam",
    max_pages=2,
    date_posted=None,       # "24h" | "week" | "month" | "any"
    experience=None,        # "entry" | "mid_senior" | "senior" | ...
    work_type=None,         # "remote" | "hybrid" | "onsite"
    job_type=None,          # "fulltime" | "parttime" | "contract" | ...
    easy_apply=False,
):
    results = []

    # Build filter params
    params = {
        "keywords": keyword,
        "location": location,
    }
    if date_posted and DATE_POSTED.get(date_posted):
        params["f_TPR"] = DATE_POSTED[date_posted]
    if experience and EXPERIENCE_LEVEL.get(experience):
        params["f_E"] = EXPERIENCE_LEVEL[experience]
    if work_type and WORK_TYPE.get(work_type):
        params["f_WT"] = WORK_TYPE[work_type]
    if job_type and JOB_TYPE.get(job_type):
        params["f_JT"] = JOB_TYPE[job_type]
    if easy_apply:
        params["f_AL"] = "true"

    print(f"[Crawl] Keyword   : {keyword}")
    print(f"[Crawl] Location  : {location}")
    print(f"[Crawl] Filters   : date={date_posted} | exp={experience} | work={work_type} | type={job_type} | easy_apply={easy_apply}")

    for page_num in range(max_pages):
        params["start"] = page_num * 25
        url = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"

        print(f"\n[Crawl] Trang {page_num + 1}/{max_pages}...")
        try:
            resp = requests.get(url, headers=HEADERS, params=params, timeout=15)
            print(f"[Crawl] Status: {resp.status_code}")

            if resp.status_code != 200:
                print(f"[Crawl] Loi HTTP {resp.status_code}. Dung lai.")
                break

            soup = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("li")
            print(f"[Crawl] Tim thay {len(cards)} jobs")

            if not cards:
                print("[Crawl] Khong con job.")
                break

            for card in cards:
                try:
                    title_el   = card.select_one("h3.base-search-card__title")
                    company_el = card.select_one("h4.base-search-card__subtitle")
                    loc_el     = card.select_one(".job-search-card__location")
                    link_el    = card.select_one("a.base-card__full-link")
                    time_el    = card.select_one("time")

                    results.append({
                        "title":    title_el.get_text(strip=True)    if title_el   else "",
                        "company":  company_el.get_text(strip=True)  if company_el else "",
                        "location": loc_el.get_text(strip=True)      if loc_el     else "",
                        "url":      link_el["href"].split("?")[0]    if link_el    else "",
                        "posted":   time_el.get("datetime", "")      if time_el    else "",
                    })
                except Exception:
                    continue

        except Exception as e:
            print(f"[Crawl] Loi: {e}")
            break

        time.sleep(1)

    print(f"\n[Crawl] Tong: {len(results)} jobs")
    return results


def filter_by_title(results, keywords):
    """
    Giu lai nhung job co title chua IT NHAT 1 tu trong danh sach keywords.
    Tu dong loai trung (theo URL).
    keywords: list cac tu can loc, khong phan biet hoa/thuong.
    """
    seen_urls = set()
    filtered  = []

    for job in results:
        title_lower = job["title"].lower()
        url         = job.get("url", "")

        # Bo qua neu trung URL
        if url and url in seen_urls:
            continue
        seen_urls.add(url)

        # Giu lai neu title chua keyword
        if any(kw.lower() in title_lower for kw in keywords):
            filtered.append(job)

    removed = len(results) - len(filtered)
    print(f"[Filter] Truoc: {len(results)} | Sau: {len(filtered)} | Da bo: {removed} (bao gom trung lap)")
    return filtered


def save_results(results, filename="data/jobs.json"):
    os.makedirs("data", exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"[Save] Da luu {len(results)} jobs -> {filename}")
    if results:
        print("\n--- Preview 3 jobs ---")
        for job in results[:3]:
            print(f"  {job['title']} @ {job['company']} | {job['location']} | {job['posted']}")


if __name__ == "__main__":
    jobs = crawl_jobs(
        keyword="Python Developer",
        location="Vietnam",
        max_pages=2,
        date_posted="week",      # chi lay job trong 1 tuan
        work_type="remote",      # chi remote
        experience="mid_senior", # mid/senior level
        easy_apply=False,
    )
    save_results(jobs)
