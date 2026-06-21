# -*- coding: utf-8 -*-
"""
Loc danh sach job da xep hang (data/jobs_ranked.json) theo CAP BAC:
chi giu Executive / Specialist, BO Manager / Director / Head / Lead / Leader /
Truong nhom / Chief / CMO / Giam doc va CTV / Cong tac vien / Intern / Thuc tap.

Khong crawl, khong cham lai — chi loc tu ket qua co san.
Chay: python filter_jobs.py
"""
import sys, json, re, os

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SRC = "data/jobs_ranked.json"
OUT_MD = "data/jobs_filtered.md"
OUT_JSON = "data/jobs_filtered.json"

# Tu khoa trong TITLE -> loai bo (cap quan ly hoac CTV/intern)
EXCLUDE = re.compile(
    r"\bmanager\b|\bdirector\b|\bhead\b|head of|\blead\b|\bleader\b|"
    r"trưởng nhóm|trưởng phòng|\bchief\b|\bcmo\b|giám đốc|"
    r"\bctv\b|cộng tác viên|collaborator|\bintern\b|thực tập",
    re.IGNORECASE,
)


def main():
    if not os.path.exists(SRC):
        print(f"Khong thay {SRC}. Hay chay match_jobs.py truoc.")
        sys.exit(1)
    jobs = json.load(open(SRC, encoding="utf-8"))

    kept, removed = [], []
    for j in jobs:
        title = j.get("title", "")
        if EXCLUDE.search(title):
            removed.append(j)
        else:
            kept.append(j)

    # Ghi file
    lines = [
        "# Job phu hop — DA LOC theo cap bac (chi Executive / Specialist)",
        "",
        f"> Nguon: `{SRC}`  ·  Giu {len(kept)} job  ·  Da bo {len(removed)} job (Manager/Lead/Head/CTV...)",
        "",
    ]
    for rank, j in enumerate(kept, 1):
        m = j.get("match", {})
        loc = j.get("work_location_detail") or j.get("location") or ""
        lines.append(f"## {rank}. [{m.get('match_score','?')}%] {j.get('title','')} — {j.get('company','')}")
        meta = "  ·  ".join(x for x in [loc, j.get("salary") or "", j.get("posted") or ""] if x)
        if meta:
            lines.append(f"*{meta}*")
        if j.get("url"):
            lines.append(f"\n🔗 {j['url']}")
        if m.get("one_line_reason"):
            lines.append(f"\n**Nhan xet:** {m['one_line_reason']}")
        if m.get("criteria_flags"):
            lines.append("\n**Tieu chi:** " + "  ".join(m["criteria_flags"]))
        if m.get("strengths"):
            lines.append("\n**Khop:** " + "; ".join(m["strengths"]))
        if m.get("gaps"):
            lines.append("\n**Con thieu:** " + "; ".join(m["gaps"]))
        lines.append("")
    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    json.dump(kept, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # In ra man hinh
    print("=" * 76)
    print(f" DA LOC: giu {len(kept)} job (Executive/Specialist) | bo {len(removed)} job")
    print("=" * 76)
    print(f"{'#':<3}{'%':<5}{'Vi tri':<42}{'Cong ty':<24}")
    print("-" * 76)
    for i, j in enumerate(kept, 1):
        print(f"{i:<3}{j.get('match',{}).get('match_score','?'):<5}{j.get('title','')[:40]:<42}{j.get('company','')[:22]:<24}")
    print("=" * 76)
    print("\n[Da bo] " + " | ".join(f"{j.get('title','')[:34]}" for j in removed))
    print(f"\n[OK] Luu: {OUT_MD}  va  {OUT_JSON}")


if __name__ == "__main__":
    main()
