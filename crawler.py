import sys, io
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from playwright.sync_api import sync_playwright
from session_manager import get_context
import json, os


def crawl_jobs(keyword="Python Developer", location="Vietnam", max_pages=3):
    results = []

    with sync_playwright() as p:
        # get_context tu dong:
        #   - Dung session cu neu con han
        #   - Login lai neu het han
        #   - Xu ly CAPTCHA neu co
        browser, context = get_context(p, headless=True)
        page = context.new_page()

        try:
            for page_num in range(max_pages):
                offset = page_num * 25
                url = (
                    f"https://www.linkedin.com/jobs/search/"
                    f"?keywords={keyword.replace(' ', '%20')}"
                    f"&location={location.replace(' ', '%20')}"
                    f"&start={offset}"
                )

                print(f"[Crawl] Trang {page_num + 1}/{max_pages}...")
                page.goto(url, wait_until="domcontentloaded", timeout=30000)
                page.wait_for_timeout(2000)

                job_cards = page.query_selector_all(".job-card-container")
                if not job_cards:
                    print("[Crawl] Khong tim thay job cards (co the bi block).")
                    break

                for card in job_cards:
                    try:
                        title    = card.query_selector(".job-card-list__title")
                        company  = card.query_selector(".job-card-container__company-name")
                        loc_el   = card.query_selector(".job-card-container__metadata-item")
                        link     = card.query_selector("a.job-card-container__link")

                        results.append({
                            "title":    title.inner_text().strip()   if title    else "",
                            "company":  company.inner_text().strip()  if company  else "",
                            "location": loc_el.inner_text().strip()   if loc_el   else "",
                            "url": "https://www.linkedin.com" + link.get_attribute("href") if link else "",
                        })
                    except Exception as e:
                        print(f"[Crawl] Loi parse card: {e}")
                        continue

                print(f"[Crawl] Tong: {len(results)} jobs")

        finally:
            page.close()
            context.close()
            browser.close()

    return results


def save_results(results, filename="data/jobs.json"):
    os.makedirs("data", exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"[Save] Da luu {len(results)} jobs -> {filename}")


if __name__ == "__main__":
    jobs = crawl_jobs(keyword="Python Developer", location="Vietnam", max_pages=2)
    save_results(jobs)
