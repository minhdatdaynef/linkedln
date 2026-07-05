# -*- coding: utf-8 -*-
"""
Email digest "Top N job nen nop hom nay" — ngan gon cho nguoi ban ron.
Doc data/jobs_filtered.json (fallback jobs_ranked.json) -> lay N job diem cao nhat
-> gui 1 email HTML gon: %khop + 1 dong vi sao + link mo job.

Bat bang env SEND_EMAIL=1. Can env: GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_TO.
  python send_digest.py         # gui that (neu SEND_EMAIL bat)
  python send_digest.py --dry   # chi dung HTML ra data/digest_preview.html, KHONG gui
"""
import os, sys, json, smtplib
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SITE_URL = os.getenv("SITE_URL", "https://linchicolen.vercel.app")
SRC = ["data/jobs_filtered.json", "data/jobs_ranked.json"]
TOP_N = int(os.getenv("DIGEST_TOP_N", "3"))


def load_jobs():
    for p in SRC:
        if os.path.exists(p):
            return json.load(open(p, encoding="utf-8"))
    return []


def top_jobs(jobs, n):
    return sorted(jobs, key=lambda j: j.get("match", {}).get("match_score", 0) or 0, reverse=True)[:n]


def _color(s):
    return "#1f8a5b" if s >= 70 else "#c87a16" if s >= 50 else "#cf3b3b"


def build_html(jobs):
    cards = []
    for j in jobs:
        m = j.get("match", {})
        score = m.get("match_score", 0) or 0
        loc = j.get("work_location_detail") or j.get("location") or ""
        salary = j.get("salary") or ""
        reason = m.get("one_line_reason", "")
        meta = "  ·  ".join(x for x in [j.get("company", ""), loc, salary] if x)
        cards.append(f"""
      <tr><td style="padding:0 0 14px">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6e3dd;border-radius:12px;background:#fff">
          <tr><td style="padding:14px 16px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:{_color(score)};color:#fff;font-weight:800;font-size:16px;
                  width:52px;height:52px;text-align:center;border-radius:10px">{score}%</td>
              <td style="padding-left:12px">
                <a href="{j.get('url','#')}" style="font-size:16px;font-weight:700;color:#1d1c1a;text-decoration:none">{j.get('title','')}</a>
                <div style="color:#6a665f;font-size:13px;margin-top:3px">{meta}</div>
              </td>
            </tr></table>
            {f'<div style="font-size:13.5px;color:#333;margin-top:10px">💬 {reason}</div>' if reason else ''}
            <a href="{j.get('url','#')}" style="display:inline-block;margin-top:11px;background:#0a66c2;color:#fff;
               text-decoration:none;padding:7px 15px;border-radius:8px;font-size:13px;font-weight:600">Mở job ↗</a>
          </td></tr>
        </table>
      </td></tr>""")
    return f"""<!DOCTYPE html><html><body style="margin:0;background:#f6f5f2;
  font-family:'Segoe UI',Arial,sans-serif;color:#1d1c1a">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:22px 12px">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px">
      <tr><td style="padding:0 4px 6px">
        <div style="font-size:20px;font-weight:800">🎯 Top {len(jobs)} job nên nộp hôm nay</div>
        <div style="color:#6a665f;font-size:13px;margin-top:2px">{date.today().isoformat()} · đã chấm khớp với CV của bạn</div>
      </td></tr>
      <tr><td style="height:10px"></td></tr>
      {''.join(cards)}
      <tr><td style="padding:6px 4px 0;font-size:13px;color:#6a665f">
        👉 <a href="{SITE_URL}" style="color:#3a35a3;font-weight:600">Xem tất cả job</a>
        &nbsp;·&nbsp; ✍️ <a href="{SITE_URL}/cv.html" style="color:#3a35a3;font-weight:600">Sửa CV theo JD</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>"""


def main():
    dry = "--dry" in sys.argv
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    if not dry and os.getenv("SEND_EMAIL", "0").lower() not in ("1", "true", "yes"):
        print("[Digest] SEND_EMAIL chua bat (dat SEND_EMAIL=1 de gui). Bo qua.")
        return

    jobs = top_jobs(load_jobs(), TOP_N)
    if not jobs:
        print("[Digest] Khong co job de gui. Bo qua.")
        return

    html = build_html(jobs)

    if dry:
        out = "data/digest_preview.html"
        os.makedirs("data", exist_ok=True)
        open(out, "w", encoding="utf-8").write(html)
        print(f"[Digest] (dry) Da dung preview {len(jobs)} job -> {out} (KHONG gui email).")
        for j in jobs:
            print(f"   - {j.get('match',{}).get('match_score','?')}%  {j.get('title','')[:50]}")
        return

    user = os.getenv("GMAIL_USER"); pw = os.getenv("GMAIL_APP_PASSWORD"); to = os.getenv("EMAIL_TO")
    if not all([user, pw, to]):
        print("[Digest] Thieu GMAIL_USER / GMAIL_APP_PASSWORD / EMAIL_TO. Bo qua.")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🎯 Top {len(jobs)} job nên nộp hôm nay · {date.today().isoformat()}"
    msg["From"] = user
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
            s.login(user, pw)
            s.sendmail(user, [x.strip() for x in to.split(",")], msg.as_string())
        print(f"[Digest] Da gui Top {len(jobs)} job -> {to}")
    except Exception as e:
        print(f"[Digest] Loi gui email: {e}")


if __name__ == "__main__":
    main()
