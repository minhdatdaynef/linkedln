# -*- coding: utf-8 -*-
"""
Rut 5-6 gach dau dong CHINH cho TOP N job (phu hop nhat + moi nhat) tu description,
bang MOT lan goi Groq duy nhat (batch ca N job) -> nhanh, it token.
Cache vao data/jobs_db.json (theo url), ghi lai file dang hien.
Chay: python gen_highlights.py [data/jobs_filtered.json]
"""
import os, sys, json, time
import requests

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = os.getenv("HIGHLIGHT_MODEL", "llama-3.3-70b-versatile")   # 1 call -> dung model tot
DB = "data/jobs_db.json"
TARGET = sys.argv[1] if len(sys.argv) > 1 else "data/jobs_filtered.json"
TOP_N = int(os.getenv("HIGHLIGHT_TOP_N", "10"))

SYSTEM = ("Ban rut gon tin tuyen dung thanh vai gach dau dong ngan, chi dua tren JD that, "
          "khong bia. Tra ve JSON thuan tuy.")


def extract_batch(jobs, api_key):
    """1 lan goi cho nhieu job. Tra ve dict {index_0based: [highlights]}."""
    blocks = []
    for i, j in enumerate(jobs, 1):
        desc = " ".join((j.get("description") or "").split())[:1500]
        blocks.append(f"[{i}] Vi tri: {j.get('title','')}\nMo ta: {desc}")
    body = "\n\n".join(blocks)
    prompt = f"""Duoi day la {len(jobs)} tin tuyen dung. Voi MOI tin, rut 5-6 GACH DAU DONG chinh, NGAN (moi gach <= 14 tu), uu tien theo thu tu:
1) Luong/thu nhap (neu JD ghi ro, vd "Thu nhap toi 20 trieu"); khong co thi bo qua.
2) 2-3 yeu cau / ky nang cot loi.
3) 1-2 phuc loi hoac trach nhiem chinh.
Tieng Viet, khong bia.

{body}

Tra ve JSON DUNG format: {{"jobs":[{{"i":1,"highlights":["...","..."]}}, {{"i":2,"highlights":[...]}}]}}"""
    payload = {"model": MODEL, "temperature": 0,
               "messages": [{"role": "system", "content": SYSTEM},
                            {"role": "user", "content": prompt}]}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    for attempt in range(3):
        try:
            r = requests.post(GROQ_URL, headers=headers, json=payload, timeout=90)
            if r.status_code == 429:
                time.sleep(12 * (attempt + 1)); continue
            if r.status_code != 200:
                print(f"[Highlights] Groq {r.status_code}: {r.text[:120]}"); return {}
            raw = r.json()["choices"][0]["message"]["content"].strip()
            raw = raw.replace("```json", "").replace("```", "").strip()
            s, e = raw.find("{"), raw.rfind("}")
            if s < 0 or e <= s:
                print(f"[Highlights] khong thay JSON. Raw dau: {raw[:150]!r}"); return {}
            data = json.loads(raw[s:e + 1])
            out = {}
            for item in data.get("jobs", []):
                try:
                    idx = int(item.get("i")) - 1
                    hl = [str(x).strip() for x in (item.get("highlights") or []) if str(x).strip()][:6]
                    if 0 <= idx < len(jobs) and hl:
                        out[idx] = hl
                except Exception:
                    continue
            return out
        except Exception as e:
            print(f"[Highlights] loi: {str(e)[:80]}"); time.sleep(3)
    return {}


def main():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass
    api_key = os.getenv("GROQ_API_KEY") or os.getenv("GROG_API_KEY")
    if not api_key:
        print("[Highlights] Thieu GROQ key. Bo qua."); return
    if not os.path.exists(TARGET):
        print(f"[Highlights] Khong thay {TARGET}. Bo qua."); return

    jobs = json.load(open(TARGET, encoding="utf-8"))
    db = json.load(open(DB, encoding="utf-8")) if os.path.exists(DB) else {}
    cache = {rec.get("url"): rec for rec in db.values() if rec.get("url")}

    # TOP N job phu hop nhat + moi nhat
    ranked = sorted(jobs, key=lambda j: (j.get("match", {}).get("match_score", 0) or 0,
                                         (j.get("posted") or "")), reverse=True)[:TOP_N]

    # dung cache neu co, chi rut cho job chua co
    need = []
    for j in ranked:
        c = cache.get(j.get("url"), {})
        if c.get("highlights"):
            j["highlights"] = c["highlights"]
        else:
            need.append(j)

    if need:
        print(f"[Highlights] Goi Groq 1 lan cho {len(need)} job...")
        res = extract_batch(need, api_key)
        for idx, hl in res.items():
            need[idx]["highlights"] = hl
            u = need[idx].get("url")
            if u in cache:
                cache[u]["highlights"] = hl
    else:
        print("[Highlights] Tat ca top job da co cache.")

    json.dump(jobs, open(TARGET, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    if db:
        json.dump(db, open(DB, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    got = sum(1 for j in ranked if j.get("highlights"))
    print(f"[OK] Highlights cho {got}/{len(ranked)} top job (1 call). Ghi {TARGET}.")


if __name__ == "__main__":
    main()
