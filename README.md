# Personal Job Matcher

Quét job tuyển dụng (LinkedIn) → **chấm độ phù hợp với CV của bạn** bằng AI → trả ra
danh sách job đã **xếp hạng theo % phù hợp**. Dùng đúng **1 CV duy nhất** của bạn.

## Cài đặt

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

## Cấu hình

```bash
cp .env.example .env
```
Sửa `.env`:
- `GROQ_API_KEY` — lấy tại https://console.groq.com/keys (bắt buộc, để chấm điểm).
- `LI_AT`, `JSESSIONID`, `BCOOKIE`, `BSCOOKIE` — cookie LinkedIn (để crawl; lấy từ Chrome DevTools).
- `CRAWL_KEYWORDS`, `CRAWL_LOCATION`, … — bộ lọc tìm việc.
- `MIN_SCORE` (mặc định 70), `MAX_RESULTS` (mặc định 20).

Đặt **CV của bạn** vào thư mục `cv/` (xem `cv/README.md`). Hỗ trợ `.pdf` / `.docx` / `.txt`.

## Sử dụng

```bash
# Quét LinkedIn rồi chấm độ phù hợp với CV của bạn
python match_jobs.py

# Không crawl lại — chấm trên job đã lưu (data/jobs.json)
python match_jobs.py --use-cached

# Tuỳ chỉnh ngưỡng / số lượng / file CV
python match_jobs.py --min 60 --max 15 --cv cv/cv_cua_toi.pdf
```

Kết quả:
- Bảng xếp hạng in ra màn hình.
- `data/jobs_ranked.md` — danh sách job kèm % phù hợp, lý do, điểm khớp / còn thiếu, keyword nên thêm.
- `data/jobs_ranked.json` — dữ liệu đầy đủ.

## Cấu trúc

```
linkedin-crawler/
├── match_jobs.py        # ★ Entry point: crawl → match → xếp hạng
├── cv_loader.py         # Đọc CV (.pdf/.docx/.txt) → text
├── matcher.py           # Chấm độ phù hợp CV ↔ JD (Groq AI)
├── crawler.py           # Hạ tầng crawl LinkedIn (tái dùng)
├── session_manager.py   # Quản lý session/cookie LinkedIn
├── cv/                  # CV của bạn (1 file, không commit)
└── data/                # jobs.json (cache) + jobs_ranked.{md,json}
```

## Lưu ý
- LinkedIn có cơ chế chống bot — nếu crawl bị chặn (HTTP 999/429), chạy lại sau hoặc dùng
  `--use-cached` để chấm trên dữ liệu đã có.
- CV thật không được commit (đã `.gitignore`) để bảo vệ thông tin cá nhân.
