"""
Dung LinkedIn public guest API - KHONG can dang nhap, KHONG can cookie.
LinkedIn dung API nay cho nguoi chua dang nhap xem job listings.
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


def crawl_jobs(keyword="Python Developer", location="Vietnam", max_pages=2):
    results = []

    for page_num in range(max_pages):
        start = page_num * 25
        url = (
            "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search"
            f"?keywords={keyword.replace(' ', '%20')}"
            f"&location={location.replace(' ', '%20')}"
            f"&start={start}"
        )

        print(f"[Crawl] Trang {page_num + 1}/{max_pages} (start={start})...")
        try:
            resp = requests.get(url, headers=HEADERS, timeout=15)
            print(f"[Crawl] Status: {resp.status_code}")

            if resp.status_code != 200:
                print(f"[Crawl] Loi {resp.status_code}. Dung lai.")
                break

            soup = BeautifulSoup(resp.text, "html.parser")
            cards = soup.select("li")
            print(f"[Crawl] Tim thay {len(cards)} cards")

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
                        "title":    title_el.get_text(strip=True)   if title_el   else "",
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


def save_results(results, filename="data/jobs.json"):
    os.makedirs("data", exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"[Save] Da luu {len(results)} jobs -> {filename}")
    if results:
        print("\n--- Preview 3 jobs ---")
        for job in results[:3]:
            print(f"  {job['title']} @ {job['company']} | {job['location']}")


if __name__ == "__main__":
    jobs = crawl_jobs(keyword="Python Developer", location="Vietnam", max_pages=2)
    save_results(jobs)
