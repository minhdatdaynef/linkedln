# LinkedIn Crawler

Crawl job listings từ LinkedIn bằng Playwright.

## Cài đặt

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
```

## Cấu hình

```bash
cp .env.example .env
# Sửa file .env với email/password LinkedIn của bạn
```

## Sử dụng

**Bước 1: Login 1 lần để lưu session**
```bash
python login.py
```

**Bước 2: Crawl jobs**
```bash
python crawler.py
```

Kết quả lưu tại `data/jobs.json`

## Cấu trúc project

```
linkedin-crawler/
├── .env                  # credentials (không commit)
├── linkedin_session.json # session sau login (tự tạo)
├── login.py              # login và lưu session
├── crawler.py            # crawl job listings
├── utils/
│   └── helpers.py        # export JSON/CSV
└── data/                 # kết quả crawl
```
