"""
Dung Chrome profile that cua ban (da dang nhap LinkedIn san)
de lay full session state -> luu vao linkedin_session.json
Chi can chay 1 lan, sau do crawler.py dung session file nay.
"""
from playwright.sync_api import sync_playwright
import os, sys

CHROME_PROFILE = os.path.join(
    os.environ["LOCALAPPDATA"],
    "Google", "Chrome", "User Data"
)

def save_session():
    print(f"Dung Chrome profile: {CHROME_PROFILE}")
    with sync_playwright() as p:
        # Mo Chrome voi profile that - khong can dang nhap
        context = p.chromium.launch_persistent_context(
            user_data_dir=CHROME_PROFILE,
            channel="chrome",
            headless=False,
            args=["--profile-directory=Default"],
        )
        page = context.new_page()

        print("Dang mo LinkedIn Jobs...")
        try:
            page.goto("https://www.linkedin.com/jobs/search/?keywords=Python+Developer&location=Vietnam",
                      wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            print(f"Loi: {e}")

        page.wait_for_timeout(4000)
        print(f"URL: {page.url}")

        if "jobs" in page.url:
            print("Vao duoc trang jobs! Dang luu session...")
            context.storage_state(path="linkedin_session.json")
            print("Da luu -> linkedin_session.json")
            print("\nBan co the dong browser.")
        else:
            print(f"Chua vao duoc jobs. URL: {page.url}")
            print("Hay dang nhap LinkedIn tren browser nay roi chay lai.")

        page.wait_for_timeout(3000)
        context.close()

if __name__ == "__main__":
    save_session()
