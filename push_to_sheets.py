# -*- coding: utf-8 -*-
"""
Tu dong APPEND job da loc len Google Sheets (chi them job MOI - dedup theo link).

Setup 1 lan (xem README phia duoi cung file):
  1. Tao Service Account tren Google Cloud, tai file service_account.json ve thu muc nay.
  2. Chia se Google Sheet (quyen Editor) voi email cua service account.
  3. python push_to_sheets.py

Nguon du lieu: data/jobs_filtered.json -> data/jobs_ranked.json
"""
import os, sys, json
from datetime import date

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

import gspread

# ── Cau hinh Sheet (lay tu URL ban gui) ──────────────────────────────
SHEET_ID = os.getenv("SHEET_ID", "18GYvmcraMJfrhb922Hj8XhdFQHxW-__0c_fk8Gw-tH0")
WORKSHEET_GID = int(os.getenv("SHEET_GID", "796318168"))
CRED_FILE = os.getenv("GOOGLE_CRED", "service_account.json")

SRC_CANDIDATES = ["data/jobs_filtered.json", "data/jobs_ranked.json"]

HEADER = ["Ngay them", "Phu hop %", "Vi tri", "Cong ty", "Dia diem", "Luong",
          "Dang", "Link", "Nhan xet", "Diem khop", "Con thieu", "Keyword nen them", "Tieu chi"]
LINK_COL = HEADER.index("Link")  # de dedup


def load_jobs():
    for p in SRC_CANDIDATES:
        if os.path.exists(p):
            return json.load(open(p, encoding="utf-8")), p
    raise SystemExit("Khong tim thay file ket qua. Chay match_jobs.py truoc.")


def job_to_row(j):
    m = j.get("match", {})
    loc = j.get("work_location_detail") or j.get("location") or ""
    return [
        date.today().isoformat(),
        m.get("match_score", ""),
        j.get("title", ""),
        j.get("company", ""),
        loc,
        j.get("salary") or "",
        j.get("posted") or "",
        j.get("url", ""),
        m.get("one_line_reason", ""),
        "; ".join(m.get("strengths", [])),
        "; ".join(m.get("gaps", [])),
        ", ".join(m.get("keywords_missing", [])),
        "  ".join(m.get("criteria_flags", [])),
    ]


def get_worksheet(gc):
    sh = gc.open_by_key(SHEET_ID)
    for ws in sh.worksheets():
        if ws.id == WORKSHEET_GID:
            return ws
    return sh.sheet1


def main():
    if not os.path.exists(CRED_FILE):
        print(f"[!] Khong thay {CRED_FILE}.")
        print("    -> Lam theo huong dan setup (cuoi file push_to_sheets.py) de tao & tai ve.")
        sys.exit(1)

    jobs, src = load_jobs()
    gc = gspread.service_account(filename=CRED_FILE)
    ws = get_worksheet(gc)

    # Lay du lieu hien co
    existing = ws.get_all_values()
    if not existing:
        ws.append_row(HEADER, value_input_option="USER_ENTERED")
        existing_urls = set()
    else:
        # Neu dong dau chua phai header thi them header? -> gia su dong 1 la header neu khop
        existing_urls = set()
        for row in existing[1:]:
            if len(row) > LINK_COL and row[LINK_COL].strip():
                existing_urls.add(row[LINK_COL].strip())

    # Chi append job co link CHUA co trong sheet
    new_rows, skipped = [], 0
    for j in jobs:
        url = (j.get("url") or "").strip()
        if url and url in existing_urls:
            skipped += 1
            continue
        new_rows.append(job_to_row(j))

    if new_rows:
        ws.append_rows(new_rows, value_input_option="USER_ENTERED")

    print(f"[OK] Nguon: {src}")
    print(f"[OK] Da APPEND {len(new_rows)} job MOI len Google Sheet | bo qua {skipped} job da co.")
    print(f"     Sheet: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit?gid={WORKSHEET_GID}")


if __name__ == "__main__":
    main()

# ─────────────────────────────────────────────────────────────────────
# HUONG DAN SETUP 1 LAN (cap quyen ghi Google Sheet)
# ─────────────────────────────────────────────────────────────────────
# 1) Vao https://console.cloud.google.com/  -> tao 1 Project (hoac dung project san co).
# 2) Bat 2 API: "Google Sheets API" va "Google Drive API"
#    (APIs & Services -> Library -> tim ten -> Enable).
# 3) Tao Service Account:
#    IAM & Admin -> Service Accounts -> Create Service Account -> dat ten -> Done.
# 4) Tao key JSON:
#    Bam vao service account vua tao -> tab "Keys" -> Add Key -> Create new key -> JSON.
#    -> tai file ve, doi ten thanh service_account.json, dat vao thu muc du an nay.
# 5) Mo file service_account.json, copy gia tri "client_email"
#    (dang xxx@yyy.iam.gserviceaccount.com).
# 6) Mo Google Sheet cua ban -> nut Share -> dan email do vao -> chon "Editor" -> Send.
# 7) Chay:  python push_to_sheets.py
# ─────────────────────────────────────────────────────────────────────
