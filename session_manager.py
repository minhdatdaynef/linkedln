import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

from playwright.sync_api import sync_playwright, BrowserContext
from dotenv import load_dotenv
import os, json
from pathlib import Path

load_dotenv()

SESSION_FILE = "linkedin_session.json"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/125.0.0.0 Safari/537.36"
)


# ─────────────────────────────────────────────
#  KIEM TRA SESSION
# ─────────────────────────────────────────────

def is_session_file_valid() -> bool:
    if not Path(SESSION_FILE).exists():
        return False
    try:
        data = json.loads(Path(SESSION_FILE).read_text())
        return any(c["name"] == "li_at" for c in data.get("cookies", []))
    except Exception:
        return False


def verify_session_online(context: BrowserContext) -> bool:
    page = context.new_page()
    try:
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
        valid = "/feed" in page.url
        status = "HOP LE" if valid else "HET HAN"
        print(f"[Session] Online check: {status} | url={page.url}")
        return valid
    except Exception as e:
        print(f"[Session] Loi check online: {e}")
        return False
    finally:
        page.close()


# ─────────────────────────────────────────────
#  LOGIN THU CONG (may tinh ca nhan)
# ─────────────────────────────────────────────

def do_login(context: BrowserContext):
    email    = os.getenv("LINKEDIN_EMAIL")
    password = os.getenv("LINKEDIN_PASSWORD")
    if not email or not password:
        raise ValueError("Thieu LINKEDIN_EMAIL / LINKEDIN_PASSWORD trong .env")

    page = context.new_page()
    page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    print("[Login] Mo trang login...")
    page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(3000)
    page.wait_for_selector("#username", timeout=30000)

    page.fill("#username", email)
    page.wait_for_timeout(800)
    page.fill("#password", password)
    page.wait_for_timeout(500)
    page.click("button[type='submit']")
    page.wait_for_timeout(3000)

    if "checkpoint" in page.url or "/feed" not in page.url:
        print("\n" + "=" * 55)
        print("  LinkedIn yeu cau CAPTCHA!")
        print("  --> Click 'Toi khong phai la nguoi may' tren browser")
        print("  --> Script tu dong tiep tuc sau khi xong")
        print("=" * 55 + "\n")
        page.wait_for_url("**/feed**", timeout=180000)

    print("[Login] Thanh cong!")
    page.close()


# ─────────────────────────────────────────────
#  GET CONTEXT — tu dong chon cach phu hop
# ─────────────────────────────────────────────

def get_context(playwright, headless=True):
    """
    Thu tu uu tien:
      1. LI_AT tu bien moi truong (GitHub Actions / .env)
      2. Session file con han (chay may tinh ca nhan)
      3. Login lai (mo browser, xu ly CAPTCHA thu cong)
    """

    # ── 1. LI_AT cookie tu env (GitHub Actions hoac .env) ──
    li_at = os.getenv("LI_AT")
    if li_at:
        print("[Session] Dung LI_AT cookie tu environment.")
        browser = playwright.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = browser.new_context(user_agent=UA, viewport={"width": 1280, "height": 800})
        context.add_cookies([{
            "name":     "li_at",
            "value":    li_at,
            "domain":   ".linkedin.com",
            "path":     "/",
            "httpOnly": True,
            "secure":   True,
        }])
        if verify_session_online(context):
            return browser, context
        print("[Session] LI_AT het han hoac sai!")
        context.close()
        browser.close()

    # ── 2. Session file con han ──
    if is_session_file_valid():
        print("[Session] Dung session file cu.")
        browser = playwright.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = browser.new_context(
            storage_state=SESSION_FILE,
            user_agent=UA,
            viewport={"width": 1280, "height": 800},
        )
        if verify_session_online(context):
            return browser, context
        print("[Session] Session file het han, se login lai.")
        context.close()
        browser.close()

    # ── 3. Login lai (phai hien browser de xu ly CAPTCHA) ──
    print("[Session] Can login lai...")
    browser = playwright.chromium.launch(
        headless=False,   # bat buoc mo browser
        args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
    )
    context = browser.new_context(
        user_agent=UA,
        viewport={"width": 1280, "height": 800},
        locale="vi-VN",
    )
    do_login(context)
    context.storage_state(path=SESSION_FILE)
    print(f"[Session] Da luu session moi -> {SESSION_FILE}")
    return browser, context
