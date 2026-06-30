# -*- coding: utf-8 -*-
"""
Sinh 1 file HTML tinh (tu chua du lieu) tu ket qua job da loc.
Mo bang trinh duyet: co tim kiem / sap xep / loc theo diem / link bam duoc.
Nguon: data/jobs_filtered.json -> data/jobs_ranked.json
Chay: python gen_html.py  ->  data/jobs.html
"""
import os, sys, json
from datetime import date

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SRC_CANDIDATES = ["data/jobs_filtered.json", "data/jobs_ranked.json"]
OUT = sys.argv[1] if len(sys.argv) > 1 else "data/jobs.html"


def load():
    for p in SRC_CANDIDATES:
        if os.path.exists(p):
            return json.load(open(p, encoding="utf-8")), p
    raise SystemExit("Khong tim thay file ket qua. Chay match_jobs.py truoc.")


def prefs_summary():
    if not os.path.exists("prefs.json"):
        return ""
    p = json.load(open("prefs.json", encoding="utf-8"))
    bits = []
    if p.get("huong_cong_viec"): bits.append("🎯 " + ", ".join(p["huong_cong_viec"]))
    if p.get("dia_diem"):        bits.append("📍 " + ", ".join(p["dia_diem"]))
    if p.get("luong_toi_thieu_trieu"): bits.append(f"💰 ≥ {p['luong_toi_thieu_trieu']} triệu")
    if p.get("cap_bac"):         bits.append("📊 " + p["cap_bac"])
    return " · ".join(bits)


def slim(jobs):
    out = []
    for j in jobs:
        m = j.get("match", {})
        out.append({
            "score": m.get("match_score", 0) or 0,
            "title": j.get("title", ""),
            "company": j.get("company", ""),
            "location": j.get("work_location_detail") or j.get("location") or "",
            "salary": j.get("salary") or "",
            "posted": j.get("posted") or "",
            "url": j.get("url", ""),
            "reason": m.get("one_line_reason", ""),
            "strengths": m.get("strengths", []),
            "gaps": m.get("gaps", []),
            "keywords": m.get("keywords_missing", []),
            "flags": m.get("criteria_flags", []),
            "new": j.get("is_new", False),
        })
    return out


HTML = """<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Job phu hop voi CV cua ban</title>
<style>
:root{--bg:#f6f5f2;--card:#fff;--bd:#e6e3dd;--tx:#1d1c1a;--mut:#6a665f;--pri:#0a66c2}
*{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--tx);
font-family:"Be Vietnam Pro","Segoe UI",system-ui,sans-serif;font-size:15px}
.wrap{max-width:1000px;margin:0 auto;padding:24px 16px}
h1{font-size:24px;margin:0 0 4px} .sub{color:var(--mut);margin:0 0 18px;font-size:14px}
.bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;background:var(--card);
border:1px solid var(--bd);border-radius:12px;padding:12px;margin-bottom:16px;position:sticky;top:8px;z-index:5}
.bar input,.bar select{border:1px solid var(--bd);border-radius:8px;padding:8px 10px;font:inherit;background:#fff}
.bar input{flex:1;min-width:160px}
.count{color:var(--mut);font-size:13px;margin-left:auto;font-weight:600}
.chk{font-size:13px;color:var(--mut);display:flex;align-items:center;gap:5px;cursor:pointer;white-space:nowrap}
.resetbtn{border:1px solid var(--bd);background:#fff;border-radius:8px;padding:8px 12px;font:inherit;font-size:13px;cursor:pointer;color:var(--mut)}
.resetbtn:hover{border-color:var(--pri);color:var(--pri)}
.card{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:18px 20px;margin-bottom:12px}
.row1{display:flex;gap:14px;align-items:flex-start}
.badge{flex:0 0 auto;width:58px;height:58px;border-radius:12px;display:grid;place-items:center;
font-weight:800;font-size:18px;color:#fff}
.t{font-size:17px;font-weight:700;color:var(--tx);text-decoration:none;line-height:1.3}
.t:hover{color:var(--pri)}
.meta{color:var(--mut);font-size:13.5px;margin-top:5px;display:flex;flex-wrap:wrap;gap:4px 14px}
.new{background:#0a66c2;color:#fff;font-size:10px;font-weight:800;padding:2px 7px;border-radius:6px;margin-left:8px}
.reason{margin:12px 0 8px;font-size:14px;color:#333}
.flags{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}
.flag{font-size:12px;font-weight:600;padding:3px 9px;border-radius:7px}
.ok{background:#e3f4ec;color:#15663f} .no{background:#fbe6e6;color:#9c2626}
details{margin-top:6px} summary{cursor:pointer;color:var(--pri);font-size:13px;font-weight:600}
ul{margin:6px 0;padding-left:18px;font-size:13.5px;color:#444}
.kw{display:inline-block;background:#f2e9fb;color:#6a2ea0;border-radius:6px;padding:2px 8px;font-size:12px;margin:2px}
a.open{display:inline-block;margin-top:10px;background:var(--pri);color:#fff;text-decoration:none;
padding:7px 16px;border-radius:8px;font-size:13.5px;font-weight:600}
.empty{text-align:center;color:var(--mut);padding:40px}
.navlink{display:inline-block;background:#3a35a3;color:#fff;text-decoration:none;font-weight:700;
font-size:14px;padding:9px 16px;border-radius:9px}
.navlink:hover{background:#2c2880}
</style></head><body><div class="wrap">
<h1>🎯 Job phù hợp với CV của bạn</h1>
<p class="sub">__N__ job · cập nhật __DATE__</p>
<p class="sub" style="color:#3a35a3;font-weight:600">__PREFS__</p>
<p style="margin:0 0 16px"><a class="navlink" href="cv.html">✍️ Đề xuất sửa CV theo 1 JD →</a></p>
<div class="bar">
  <input id="q" placeholder="🔍 Tìm theo vị trí / công ty..."/>
  <select id="sort">
    <option value="score">Sắp xếp: Độ phù hợp</option>
    <option value="company">Công ty (A-Z)</option>
    <option value="title">Vị trí (A-Z)</option>
  </select>
  <select id="minf">
    <option value="0">Tất cả điểm</option>
    <option value="50">≥ 50%</option>
    <option value="60">≥ 60%</option>
    <option value="70">≥ 70%</option>
  </select>
  <select id="company"><option value="">Tất cả công ty</option></select>
  <label class="chk"><input type="checkbox" id="onlyOk"/> Khớp hết tiêu chí</label>
  <label class="chk"><input type="checkbox" id="onlyNew"/> 🆕 Chỉ mới</label>
  <button id="reset" class="resetbtn">Xóa lọc</button>
  <span class="count" id="count"></span>
</div>
<div id="list"></div>
</div>
<script>
const JOBS = __DATA__;
const color = s => s>=70?'#1f8a5b':s>=50?'#c87a16':'#cf3b3b';
const esc = t => (t||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function render(){
  const q=document.getElementById('q').value.toLowerCase();
  const sort=document.getElementById('sort').value;
  const minf=+document.getElementById('minf').value;
  const comp=document.getElementById('company').value;
  const onlyOk=document.getElementById('onlyOk').checked;
  const onlyNew=document.getElementById('onlyNew').checked;
  let arr=JOBS.filter(j=> j.score>=minf
    && (j.title+' '+j.company).toLowerCase().includes(q)
    && (!comp || j.company===comp)
    && (!onlyOk || !(j.flags||[]).some(f=>f.includes('✘')))
    && (!onlyNew || j.new));
  arr.sort((a,b)=> sort==='score'? b.score-a.score :
    (a[sort]||'').localeCompare(b[sort]||''));
  document.getElementById('count').textContent=arr.length+' job';
  const L=document.getElementById('list');
  if(!arr.length){L.innerHTML='<div class="empty">'+(JOBS.length?'Không có job khớp bộ lọc.':'🕐 Chưa có job — hệ thống sẽ tự cập nhật job mới mỗi sáng.')+'</div>';return;}
  L.innerHTML=arr.map(j=>`
   <div class="card">
    <div class="row1">
     <div class="badge" style="background:${color(j.score)}">${j.score}<small style="font-size:11px">%</small></div>
     <div style="flex:1;min-width:0">
      <a class="t" href="${esc(j.url)}" target="_blank">${esc(j.title)}${j.new?'<span class="new">MOI</span>':''}</a>
      <div class="meta"><b style="color:#1d1c1a">${esc(j.company)}</b>
        ${j.location?'<span>📍 '+esc(j.location)+'</span>':''}
        ${j.salary?'<span>💰 '+esc(j.salary)+'</span>':''}
        ${j.posted?'<span>📅 '+esc(j.posted)+'</span>':''}</div>
     </div>
    </div>
    ${j.reason?'<div class="reason">💬 '+esc(j.reason)+'</div>':''}
    ${j.flags&&j.flags.length?'<div class="flags">'+j.flags.map(f=>{
      const no=f.includes('✘');return '<span class="flag '+(no?'no':'ok')+'">'+esc(f)+'</span>';}).join('')+'</div>':''}
    ${(j.strengths&&j.strengths.length)||(j.gaps&&j.gaps.length)?`<details><summary>Chi tiet khop / con thieu</summary>
      ${j.strengths&&j.strengths.length?'<b style="font-size:13px;color:#15663f">Khop:</b><ul>'+j.strengths.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':''}
      ${j.gaps&&j.gaps.length?'<b style="font-size:13px;color:#8f560d">Con thieu:</b><ul>'+j.gaps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':''}
      ${j.keywords&&j.keywords.length?'<div>'+j.keywords.map(k=>'<span class="kw">'+esc(k)+'</span>').join('')+'</div>':''}
     </details>`:''}
    ${j.url?'<a class="open" href="'+esc(j.url)+'" target="_blank">Mo job ↗</a>':''}
   </div>`).join('');
}
// nap danh sach cong ty
[...new Set(JOBS.map(j=>j.company).filter(Boolean))].sort().forEach(c=>{
  const o=document.createElement('option'); o.value=c; o.textContent=c;
  document.getElementById('company').appendChild(o);
});
['q','sort','minf','company','onlyOk','onlyNew'].forEach(id=>{
  const el=document.getElementById(id);
  el.addEventListener('input',render); el.addEventListener('change',render);
});
document.getElementById('reset').onclick=()=>{
  document.getElementById('q').value=''; document.getElementById('sort').value='score';
  document.getElementById('minf').value='0'; document.getElementById('company').value='';
  document.getElementById('onlyOk').checked=false; document.getElementById('onlyNew').checked=false;
  render();
};
render();
</script></body></html>"""


def main():
    jobs, src = load()
    data = slim(jobs)
    html = (HTML
            .replace("__DATA__", json.dumps(data, ensure_ascii=False))
            .replace("__N__", str(len(data)))
            .replace("__DATE__", date.today().isoformat())
            .replace("__PREFS__", prefs_summary()))
    outdir = os.path.dirname(OUT)
    if outdir:
        os.makedirs(outdir, exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[OK] Da sinh {OUT} ({len(data)} job). Mo bang trinh duyet de xem.")


if __name__ == "__main__":
    main()
