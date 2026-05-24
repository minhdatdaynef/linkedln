import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from playwright.sync_api import sync_playwright
from dotenv import load_dotenv
import os

load_dotenv()


def login():
    email = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")

    if not email or not password:
        raise ValueError("Thieu LINKEDIN_EMAIL hoac LINKEDIN_PASSWORD trong file .env")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/125.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 800},
            locale="vi-VN",
        )
        page = context.new_page()
        page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        print("Dang mo LinkedIn...")
        page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(3000)
        page.wait_for_selector("#username", timeout=30000)

        page.fill("#username", email)
        page.wait_for_timeout(800)
        page.fill("#password", password)
        page.wait_for_timeout(500)
        page.click("button[type='submit']")

        page.wait_for_timeout(3000)
        print(f"URL hien tai: {page.url}")

        # Neu LinkedIn hien CAPTCHA hoac challenge
        if "checkpoint" in page.url or "/feed" not in page.url:
            print("")
            print("=" * 55)
            print("  LinkedIn yeu cau xac minh bao mat (CAPTCHA)")
            print("  --> Hay click 'Toi khong phai la nguoi may'")
            print("       tren cua so browser vua mo")
            print("  --> Script se tu dong tiep tuc sau khi xong")
            print("=" * 55)
            print("")

            # Cho toi 3 phut de user xu ly thu cong
            page.wait_for_url("**/feed**", timeout=180000)

        print("Login thanh cong!")
        context.storage_state(path="linkedin_session.json")
        print("Da luu session -> linkedin_session.json")
        print("Ban co the dong browser.")

        browser.close()


if __name__ == "__main__":
    login()
