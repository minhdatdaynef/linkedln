"""
LinkedIn Job Crawler - Ho tro day du filter
"""
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import json, os, time, re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from groq import Groq

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


def crawl_job_detail(url):
    """
    Vao trang chi tiet 1 job, lay mo ta day du.
    Tra ve dict: {description, seniority, employment_type, job_function, industries}
    """
    detail = {
        "description":     "",
        "seniority":       "",
        "employment_type": "",
        "job_function":    "",
        "industries":      "",
    }
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  [Detail] Loi HTTP {resp.status_code}: {url}")
            return detail

        soup = BeautifulSoup(resp.text, "html.parser")

        # Mo ta chinh
        desc_el = soup.select_one("div.show-more-less-html__markup")
        if desc_el:
            detail["description"] = desc_el.get_text(separator="\n", strip=True)

        # Criteria (Seniority, Employment type, Job function, Industries)
        criteria_items = soup.select("ul.description__job-criteria-list li")
        for item in criteria_items:
            header_el = item.select_one("h3.description__job-criteria-subheader")
            value_el  = item.select_one("span.description__job-criteria-text")
            if not header_el or not value_el:
                continue
            header = header_el.get_text(strip=True).lower()
            value  = value_el.get_text(strip=True)
            if "seniority" in header:
                detail["seniority"] = value
            elif "employment" in header:
                detail["employment_type"] = value
            elif "function" in header:
                detail["job_function"] = value
            elif "industr" in header:
                detail["industries"] = value

    except Exception as e:
        print(f"  [Detail] Loi: {e}")

    return detail


def enrich_with_details(jobs, delay=1.5):
    """
    Them truong description + criteria cho tung job trong danh sach.
    delay: giay cho giua moi request de tranh bi block.
    """
    total = len(jobs)
    for i, job in enumerate(jobs, 1):
        url = job.get("url", "")
        if not url:
            continue
        print(f"  [Detail] {i}/{total} {job['title'][:50]}...")
        detail = crawl_job_detail(url)
        job.update(detail)
        time.sleep(delay)
    return jobs


def extract_with_ai(jobs):
    """
    Gui BATCH tat ca descriptions len Gemini 1 lan duy nhat.
    Gemini tra ve JSON array, moi phan tu tuong ung 1 job.
    Cac truong extract: salary, working_hours, experience_required,
                        key_requirements, benefits, work_location_detail
    """
    api_key = os.getenv("GROG_API_KEY")
    if not api_key:
        print("[AI] Khong co GROG_API_KEY, bo qua buoc extract.")
        return jobs

    client = Groq(api_key=api_key)

    # Xay dung prompt batch
    jobs_text = ""
    for idx, job in enumerate(jobs):
        desc = job.get("description", "").strip()
        if not desc:
            desc = "(khong co mo ta)"
        jobs_text += f"\n---JOB_{idx}---\n{desc}\n"

    prompt = f"""
Bạn là trợ lý phân tích tin tuyển dụng. QUAN TRỌNG: Toàn bộ giá trị trong JSON phải viết bằng TIẾNG VIỆT. Dưới đây là {len(jobs)} mô tả công việc, mỗi mục được đánh dấu ---JOB_0---, ---JOB_1---, ...

Hãy trích xuất thông tin cho TỪNG job và trả về JSON array (đúng thứ tự, đủ {len(jobs)} phần tử).

Mỗi phần tử có cấu trúc:
{{
  "salary": "mức lương (string, ví dụ: 12-15 triệu, Thỏa thuận, null nếu không có)",
  "working_hours": "giờ làm việc hoặc ca (ví dụ: T2-T6 8h-17h30, null nếu không có)",
  "experience_required": "số năm kinh nghiệm yêu cầu (ví dụ: 2 năm, Không yêu cầu, null)",
  "key_requirements": ["tối đa 4 yêu cầu chính ngắn gọn"],
  "benefits": ["tối đa 4 quyền lợi nổi bật ngắn gọn"],
  "work_location_detail": "địa chỉ hoặc khu vực làm việc cụ thể (null nếu không có)"
}}

Chỉ trả về JSON array thuần túy, không markdown, không giải thích.

{jobs_text}
"""

    print(f"\n[AI] Dang extract {len(jobs)} jobs trong 1 request...")

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            response = client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "Bạn là trợ lý phân tích tuyển dụng. Luôn trả lời bằng TIẾNG VIỆT, kể cả khi mô tả công việc gốc bằng tiếng Anh hãy dịch sang tiếng Việt. Chỉ trả về JSON array thuần túy, không có markdown, không có giải thích."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
            )
            raw = response.choices[0].message.content.strip()

            # Loai bo markdown code block neu co
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            ai_results = json.loads(raw)

            if len(ai_results) != len(jobs):
                print(f"[AI] Canh bao: Gemini tra ve {len(ai_results)} phan tu, can {len(jobs)}")

            for idx, job in enumerate(jobs):
                if idx < len(ai_results):
                    job.update(ai_results[idx])

            print(f"[AI] Extract xong {len(jobs)} jobs.")
            break  # thanh cong, thoat vong lap

        except json.JSONDecodeError as e:
            print(f"[AI] Loi parse JSON: {e}")
            print(f"[AI] Raw response:\n{raw[:500]}")
            break  # loi parse khong can retry

        except Exception as e:
            err_str = str(e)
            # Lay retry delay tu thong bao loi neu co
            retry_match = re.search(r"retry in (\d+)", err_str)
            wait = int(retry_match.group(1)) + 5 if retry_match else 60

            if "429" in err_str and attempt < max_retries:
                print(f"[AI] Rate limit (lan {attempt}/{max_retries}). Cho {wait}s roi thu lai...")
                time.sleep(wait)
            else:
                print(f"[AI] Loi Gemini: {err_str[:200]}")
                break

    return jobs


def save_results(results, filename="data/jobs.json"):
    os.makedirs("data", exist_ok=True)
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"[Save] Da luu {len(results)} jobs -> {filename}")
    if results:
        print("\n--- Preview 3 jobs ---")
        for job in results[:3]:
            print(f"  {job['title']} @ {job['company']} | {job['location']} | {job['posted']}")


def send_email(jobs, crawl_date=None):
    """
    Gui email HTML tom tat danh sach jobs den EMAIL_TO.
    Yeu cau .env: GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO
    """
    gmail_user = os.getenv("GMAIL_USER")
    gmail_pass = os.getenv("GMAIL_APP_PASSWORD")
    email_to   = os.getenv("EMAIL_TO")

    if not all([gmail_user, gmail_pass, email_to]):
        print("[Email] Thieu config (GMAIL_USER / GMAIL_APP_PASSWORD / EMAIL_TO). Bo qua.")
        return

    if not jobs:
        print("[Email] Khong co job nao de gui.")
        return

    date_str = crawl_date or time.strftime("%d/%m/%Y")

    # ── Build HTML ──────────────────────────────────────────
    cards_html = ""
    for job in jobs:
        salary  = job.get("salary") or "Không hiển thị"
        hours   = job.get("working_hours") or "Không hiển thị"
        exp     = job.get("experience_required") or "Không yêu cầu"
        address = job.get("work_location_detail") or job.get("location", "")
        reqs    = "".join(f"<li>{r}</li>" for r in (job.get("key_requirements") or []))
        bens    = "".join(f"<li>{b}</li>" for b in (job.get("benefits") or []))

        cards_html += f"""
        <div style="background:#fff;border:1px solid #e0e0e0;border-radius:10px;
                    padding:20px;margin-bottom:20px;font-family:Arial,sans-serif;">
          <h2 style="margin:0 0 4px;color:#0a66c2;font-size:17px;">
            <a href="{job.get('url','')}" style="color:#0a66c2;text-decoration:none;">
              {job.get('title','')}
            </a>
          </h2>
          <p style="margin:0 0 12px;color:#555;font-size:14px;">
            🏢 {job.get('company','')} &nbsp;|&nbsp;
            📍 {address} &nbsp;|&nbsp;
            📅 {job.get('posted','')}
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px;">
            <tr>
              <td style="padding:4px 8px;background:#f3f6fb;border-radius:4px;width:50%;">
                💰 <b>Lương:</b> {salary}
              </td>
              <td style="padding:4px 8px;background:#f3f6fb;border-radius:4px;width:50%;">
                🕐 <b>Giờ làm:</b> {hours}
              </td>
            </tr>
            <tr>
              <td colspan="2" style="padding:4px 8px;background:#f3f6fb;border-radius:4px;margin-top:4px;">
                🎓 <b>Kinh nghiệm:</b> {exp}
              </td>
            </tr>
          </table>
          <div style="font-size:13px;">
            <b>Yêu cầu chính:</b>
            <ul style="margin:4px 0 8px;padding-left:18px;color:#333;">{reqs}</ul>
            <b>Quyền lợi:</b>
            <ul style="margin:4px 0 0;padding-left:18px;color:#333;">{bens}</ul>
          </div>
          <div style="margin-top:12px;">
            <a href="{job.get('url','')}"
               style="background:#0a66c2;color:#fff;padding:7px 16px;border-radius:5px;
                      text-decoration:none;font-size:13px;">
              Xem chi tiết →
            </a>
          </div>
        </div>
        """

    html_body = f"""
    <html><body style="background:#f4f4f4;padding:20px;">
      <div style="max-width:640px;margin:auto;">
        <h1 style="font-family:Arial;color:#0a66c2;font-size:20px;margin-bottom:4px;">
          📋 LinkedIn Jobs — {date_str}
        </h1>
        <p style="font-family:Arial;color:#666;font-size:13px;margin-top:0;">
          Tìm thấy <b>{len(jobs)}</b> việc làm Marketing tại Hà Nội trong 24h qua
        </p>
        {cards_html}
        <p style="font-family:Arial;color:#aaa;font-size:11px;text-align:center;">
          Gửi tự động bởi LinkedIn Crawler · minhdat31502@gmail.com
        </p>
      </div>
    </body></html>
    """

    # ── Send ─────────────────────────────────────────────────
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[LinkedIn Jobs] {len(jobs)} việc Marketing HN · {date_str}"
    msg["From"]    = gmail_user
    msg["To"]      = email_to
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(gmail_user, gmail_pass)
            server.sendmail(gmail_user, email_to, msg.as_string())
        print(f"[Email] Da gui {len(jobs)} jobs -> {email_to}")
    except Exception as e:
        print(f"[Email] Loi: {e}")


if __name__ == "__main__":
    SEARCH_KEYWORDS = ["marketing", "truyen thong", "su kien"]
    TITLE_FILTER    = ["marketing", "truyen thong", "truyền thông", "su kien", "sự kiện", "event"]
    LOCATION        = "Hanoi"
    MAX_PAGES       = 4

    all_jobs = []
    for kw in SEARCH_KEYWORDS:
        jobs = crawl_jobs(
            keyword=kw,
            location=LOCATION,
            max_pages=MAX_PAGES,
            date_posted="24h",
        )
        all_jobs.extend(jobs)

    print(f"\n[Main] Tong raw: {len(all_jobs)} jobs tu {len(SEARCH_KEYWORDS)} keywords")

    # Luu raw truoc khi filter
    save_results(all_jobs, "data/raw_jobs.json")

    # Filter theo title + dedup theo URL
    filtered = filter_by_title(all_jobs, TITLE_FILTER)

    # Lay mo ta chi tiet tung job
    print(f"\n[Main] Dang lay chi tiet {len(filtered)} jobs...")
    enrich_with_details(filtered, delay=1.5)

    # Dung AI extract salary, working_hours, requirements...
    extract_with_ai(filtered)

    # Bo cac field khong can thiet sau khi AI da xu ly xong
    for job in filtered:
        for field in ("description", "employment_type", "job_function", "industries"):
            job.pop(field, None)

    save_results(filtered, "data/jobs.json")

    # Gui email ket qua
    send_email(filtered)
