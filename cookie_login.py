"""
Cach lay cookie li_at tu browser that (khong can CAPTCHA):

1. Mo Chrome -> Dang nhap LinkedIn binh thuong
2. Bam F12 -> Application -> Cookies -> https://www.linkedin.com
3. Tim cookie ten "li_at" -> copy gia tri
4. Dan vao bien LI_AT ben duoi
"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from playwright.sync_api import sync_playwright
import json

# =============================================
#  DAN COOKIE li_at CUA BAN VAO DAY
# =============================================
LI_AT = "DAN_COOKIE_LI_AT_VAO_DAY"
# =============================================


def save_session_from_cookie(li_at: str):
    if li_at == "DAN_COOKIE_LI_AT_VAO_DAY":
        print("Loi: Chua dien cookie li_at vao file cookie_login.py!")
        return

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            )
        )

        # Gan cookie li_at vao context
        context.add_cookies([
            {
                "name": "li_at",
                "value": li_at,
                "domain": ".linkedin.com",
                "path": "/",
                "httpOnly": True,
                "secure": True,
            }
        ])

        page = context.new_page()
        print("Dang kiem tra session voi cookie...")
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3000)

        print(f"URL: {page.url}")

        if "/feed" in page.url:
            context.storage_state(path="linkedin_session.json")
            print("Session hop le! Da luu -> linkedin_session.json")
        else:
            print("Cookie het han hoac sai. Hay lay lai cookie li_at moi.")

        browser.close()


if __name__ == "__main__":
    save_session_from_cookie(LI_AT)
