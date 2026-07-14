# -*- coding: utf-8 -*-
"""
Sinh 1 file HTML tinh (tu chua du lieu) tu ket qua job da loc.
Mo bang trinh duyet: co tim kiem / sap xep / loc theo diem / link bam duoc.
Nguon: data/jobs_filtered.json -> data/jobs_ranked.json
Chay: python gen_html.py  ->  data/jobs.html
"""
import os, sys, json, re
from datetime import date, timedelta

# Chi hien job CO LUONG (ro rang tu trường salary cua VNW HOAC tu mo ta JD)
_SAL_SKIP = ("", "negotiable", "thương lượng", "thoả thuận", "thỏa thuận", "cạnh tranh", "competitive")
_SAL_PATS = [
    re.compile(r"(?:thu nhập|lương|mức lương|income|salary)[:\s]{0,4}(?:up ?to |upto |tới |từ |khoảng )?\d[\d.,]*\s*(?:[-–~]|đến|to)?\s*\d*[\d.,]*\s*(?:triệu|tr|m\b|vnđ|vnd|₫|đ|000\.000|usd|\$)", re.I),
    re.compile(r"(?:up ?to|upto|tới|từ)\s*\d[\d.,]*\s*(?:triệu|tr|m\b|million)", re.I),
    re.compile(r"\d{1,3}\s*(?:[-–~]|đến)\s*\d{1,3}\s*(?:triệu|tr|m\b|million)", re.I),
    re.compile(r"\d{1,2}[.,]\d{3}[.,]\d{3}\s*(?:[-–~]|đến)?\s*\d{0,2}[.,]?\d{0,3}[.,]?\d{0,3}", re.I),
    re.compile(r"\$\s?\d[\d,.]*\s*[-–~]\s*\d[\d,.]*", re.I),
]


def extract_salary(job):
    """Tra ve chuoi luong RUT DUOC (tu truong salary hoac tu mo ta); '' neu khong co."""
    s = str(job.get("salary") or "").strip()
    if s and s.lower() not in _SAL_SKIP:
        return s[:45]
    t = " ".join(((job.get("title", "") or "") + "  " + (job.get("description", "") or "")).split())
    for p in _SAL_PATS:
        m = p.search(t)
        if m:
            return re.sub(r"\s+", " ", m.group(0)).strip(" :.-–~")[:45]
    return ""

# Chi hien thi job co posted trong DUNG 7 ngay gan nhat (current - 7).
POSTED_WINDOW_DAYS = int(os.getenv("POSTED_WINDOW_DAYS", "7"))

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


def within_posted_window(jobs):
    """Bo job co posted CU HON current - POSTED_WINDOW_DAYS. Giu job posted trong khoang,
    hoac posted rong/khong ro (khong du can cu de loai)."""
    cutoff = (date.today() - timedelta(days=POSTED_WINDOW_DAYS)).isoformat()
    kept = []
    for j in jobs:
        p = (j.get("posted") or "").strip()[:10]
        if len(p) == 10 and p < cutoff:
            continue  # cu hon 7 ngay -> an han
        kept.append(j)
    return kept, cutoff


def cap_per_source(jobs, n=30):
    """Moi nguon toi da N job, sort theo (diem cao nhat, ngay dang gan hien tai nhat)."""
    groups = {}
    for j in jobs:
        groups.setdefault(j.get("source") or "linkedin", []).append(j)
    out = []
    for src, lst in groups.items():
        lst.sort(key=lambda j: (j.get("match", {}).get("match_score", 0) or 0, j.get("posted") or ""),
                 reverse=True)
        out.extend(lst[:n])
    return out


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
            "posted": j.get("posted") or "",
            "added": j.get("date_added") or "",
            "source": j.get("source") or "linkedin",
            "salary": extract_salary(j),
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
.srcb{font-size:10.5px;font-weight:700;padding:1px 7px;border-radius:5px}
.srcb.li{background:#e8f1fb;color:#0a66c2} .srcb.vnw{background:#eafaf0;color:#0a8f4f}
.sal{color:#0a8f4f;font-weight:700}
.tabs{display:flex;gap:8px;margin-bottom:14px}
.tab{border:1px solid var(--bd);background:#fff;border-radius:10px;padding:9px 16px;font:inherit;font-size:14px;font-weight:600;color:var(--mut);cursor:pointer}
.tab.on{background:var(--acc,#3a35a3);color:#fff;border-color:var(--acc,#3a35a3)}
.tab .cnt{font-weight:800}
.star{flex:0 0 auto;border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:#c9c4bb;padding:0 2px}
.star.on{color:#f5b301}
.summary{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 14px;font-size:13px;color:var(--mut)}
.summary b{color:var(--tx)}
.tl{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 4px}
.st{font-size:12px;font-weight:600;padding:5px 10px;border-radius:8px;border:1px solid var(--bd);background:#fff;color:var(--mut);cursor:pointer}
.st.on{border-color:transparent;color:#fff}
.st.on[data-st="quan_tam"]{background:#b58a00} .st.on[data-st="da_nop"]{background:#0a66c2}
.st.on[data-st="phong_van"]{background:#7a2ea0} .st.on[data-st="offer"]{background:#1f8a5b}
.st.on[data-st="reject"]{background:#cf3b3b}
.note{width:100%;border:1px solid var(--bd);border-radius:8px;padding:7px 10px;font:inherit;font-size:13px;margin-top:8px;min-height:38px;resize:vertical}
.upd{font-size:11.5px;color:var(--mut);margin-top:6px}
.pager{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:18px 0 6px}
.pg{border:1px solid var(--bd);background:#fff;color:var(--tx);border-radius:8px;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer}
.pg:hover:not(:disabled){border-color:var(--pri);color:var(--pri)} .pg.on{background:var(--pri);color:#fff;border-color:var(--pri)}
.pg:disabled{opacity:.4;cursor:default}
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
<p style="margin:0 0 16px;display:flex;gap:10px;flex-wrap:wrap">
  <a class="navlink" href="cv.html">✍️ Sửa CV · Cover letter · Chấm fit</a>
  <a class="navlink" href="upskill.html">📈 Kỹ năng cần bổ sung</a></p>
<div class="tabs">
  <button class="tab on" data-view="all">Tất cả job</button>
  <button class="tab" data-view="saved">⭐ Quan tâm <span class="cnt" id="savedCount">0</span></button>
</div>
<div class="bar" id="bar">
  <input id="q" placeholder="🔍 Tìm theo vị trí / công ty..."/>
  <select id="sort">
    <option value="score">💰 Ưu tiên có lương + phù hợp</option>
    <option value="posted">Mới đăng nhất</option>
    <option value="company">Công ty (A-Z)</option>
    <option value="title">Vị trí (A-Z)</option>
  </select>
  <select id="minf">
    <option value="0">Tất cả điểm</option>
    <option value="50">≥ 50%</option>
    <option value="60">≥ 60%</option>
    <option value="70">≥ 70%</option>
  </select>
  <select id="src">
    <option value="">🌐 Tất cả nguồn</option>
    <option value="linkedin">LinkedIn</option>
    <option value="vietnamworks">VietnamWorks</option>
  </select>
  <select id="company"><option value="">Tất cả công ty</option></select>
  <label class="chk"><input type="checkbox" id="onlyOk"/> Khớp hết tiêu chí</label>
  <label class="chk"><input type="checkbox" id="onlyNew"/> 🆕 Chỉ mới</label>
  <button id="reset" class="resetbtn">Xóa lọc</button>
  <span class="count" id="count"></span>
</div>
<div id="list"></div>
<div id="pager" class="pager"></div>
<div id="saved"></div>
</div>
<script>
const JOBS = __DATA__;
const color = s => s>=70?'#1f8a5b':s>=50?'#c87a16':'#cf3b3b';
const SAL_BONUS = 8;  // job co luong duoc cong nhe khi sap xep; match van la chinh
const effScore = j => (j.score||0) + (j.salary ? SAL_BONUS : 0);
// ===== Quan tam + timeline (localStorage) =====
const SKEY='saved_jobs_v1';
let SAVED={}; try{ SAVED=JSON.parse(localStorage.getItem(SKEY)||'{}')||{}; }catch(e){ SAVED={}; }
const saveSt=()=>{ try{ localStorage.setItem(SKEY,JSON.stringify(SAVED)); }catch(e){} };
const STAGES=[['quan_tam','💛 Quan tâm'],['da_nop','📤 Đã nộp'],['phong_van','🗓️ Phỏng vấn'],['offer','✅ Offer'],['reject','❌ Từ chối']];
const today10=()=>{ try{return new Date().toISOString().slice(0,10);}catch(e){return '';} };
let view='all';
const esc = t => (t||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
let page=1; const PER=10;
function render(){
  const q=document.getElementById('q').value.toLowerCase();
  const sort=document.getElementById('sort').value;
  const minf=+document.getElementById('minf').value;
  const comp=document.getElementById('company').value;
  const src=document.getElementById('src').value;
  const onlyOk=document.getElementById('onlyOk').checked;
  const onlyNew=document.getElementById('onlyNew').checked;
  let arr=JOBS.filter(j=> j.score>=minf
    && (j.title+' '+j.company).toLowerCase().includes(q)
    && (!comp || j.company===comp)
    && (!src || j.source===src)
    && (!onlyOk || !(j.flags||[]).some(f=>f.includes('✘')))
    && (!onlyNew || j.new));
  arr.sort((a,b)=> sort==='score'? ((effScore(b)-effScore(a)) || (b.posted||'').localeCompare(a.posted||'')) :
    sort==='posted'? (b.posted||'').localeCompare(a.posted||'') :
    (a[sort]||'').localeCompare(b[sort]||''));
  const total=arr.length;
  const totalPages=Math.max(1,Math.ceil(total/PER));
  if(page>totalPages)page=totalPages; if(page<1)page=1;
  const pageArr=arr.slice((page-1)*PER, page*PER);
  document.getElementById('count').textContent=total+' job'+(totalPages>1?' · trang '+page+'/'+totalPages:'');
  const L=document.getElementById('list'), P=document.getElementById('pager');
  if(!total){L.innerHTML='<div class="empty">'+(JOBS.length?'Không có job khớp bộ lọc.':'🕐 Chưa có job — hệ thống sẽ tự cập nhật job mới mỗi sáng.')+'</div>';P.innerHTML='';return;}
  const dd=s=>s&&s.length>=10?s.slice(8,10)+'/'+s.slice(5,7):'';
  L.innerHTML=pageArr.map(j=>`
   <div class="card">
    <div class="row1">
     <div class="badge" style="background:${color(j.score)}">${j.score}<small style="font-size:11px">%</small></div>
     <div style="flex:1;min-width:0">
      <a class="t" href="${esc(j.url)}" target="_blank">${esc(j.title)}${j.new?'<span class="new">MOI</span>':''}</a>
      <div class="meta"><b style="color:#1d1c1a">${esc(j.company)}</b>
        <span class="srcb ${j.source==='vietnamworks'?'vnw':'li'}">${j.source==='vietnamworks'?'VietnamWorks':'LinkedIn'}</span>
        ${j.salary?'<span class="sal">💰 '+esc(j.salary)+'</span>':''}
        ${j.location?'<span>📍 '+esc(j.location)+'</span>':''}
        ${j.posted?'<span>📅 đăng '+esc(j.posted)+'</span>':''}
        ${j.added?'<span>🗓️ thấy '+dd(j.added)+'</span>':''}</div>
     </div>
     <button class="star ${SAVED[j.url]?'on':''}" data-star="${esc(j.url)}" title="Quan tâm">${SAVED[j.url]?'★':'☆'}</button>
    </div>
    ${j.reason?'<div class="reason">💬 '+esc(j.reason)+'</div>':''}
    ${j.flags&&j.flags.length?'<div class="flags">'+j.flags.map(f=>{
      const no=f.includes('✘');return '<span class="flag '+(no?'no':'ok')+'">'+esc(f)+'</span>';}).join('')+'</div>':''}
    ${(j.strengths&&j.strengths.length)||(j.gaps&&j.gaps.length)?`<details><summary>Chi tiet khop / con thieu</summary>
      ${j.strengths&&j.strengths.length?'<b style="font-size:13px;color:#15663f">Khop:</b><ul>'+j.strengths.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':''}
      ${j.gaps&&j.gaps.length?'<b style="font-size:13px;color:#8f560d">Con thieu:</b><ul>'+j.gaps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ul>':''}
      ${j.keywords&&j.keywords.length?'<div>'+j.keywords.map(k=>'<span class="kw">'+esc(k)+'</span>').join('')+'</div>':''}
     </details>`:''}
    ${j.url?'<a class="open" href="'+esc(j.url)+'" target="_blank">Mở job ↗</a>':''}
   </div>`).join('');
  if(totalPages<=1){P.innerHTML='';}
  else{
    let b='<button class="pg" data-pg="'+(page-1)+'"'+(page===1?' disabled':'')+'>‹ Trước</button>';
    for(let i=1;i<=totalPages;i++) b+='<button class="pg'+(i===page?' on':'')+'" data-pg="'+i+'">'+i+'</button>';
    b+='<button class="pg" data-pg="'+(page+1)+'"'+(page===totalPages?' disabled':'')+'>Sau ›</button>';
    P.innerHTML=b;
  }
}
// chuyen trang
document.getElementById('pager').addEventListener('click',e=>{
  const p=e.target.getAttribute('data-pg'); if(p===null)return;
  page=+p; render(); window.scrollTo({top:0,behavior:'smooth'});
});
// nap danh sach cong ty
[...new Set(JOBS.map(j=>j.company).filter(Boolean))].sort().forEach(c=>{
  const o=document.createElement('option'); o.value=c; o.textContent=c;
  document.getElementById('company').appendChild(o);
});
['q','sort','minf','company','src','onlyOk','onlyNew'].forEach(id=>{
  const el=document.getElementById(id);
  const h=()=>{page=1;render();};
  el.addEventListener('input',h); el.addEventListener('change',h);
});
document.getElementById('reset').onclick=()=>{
  document.getElementById('q').value=''; document.getElementById('sort').value='score';
  document.getElementById('minf').value='0'; document.getElementById('company').value='';
  document.getElementById('src').value='';
  document.getElementById('onlyOk').checked=false; document.getElementById('onlyNew').checked=false;
  page=1; render();
};

// ===== Quan tam: tab, sao, timeline =====
function updSavedCount(){ document.getElementById('savedCount').textContent=Object.keys(SAVED).length; }
function setView(v){
  view=v;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('on', t.getAttribute('data-view')===v));
  document.getElementById('bar').style.display=v==='all'?'':'none';
  document.getElementById('list').style.display=v==='all'?'':'none';
  document.getElementById('pager').style.display=v==='all'?'':'none';
  document.getElementById('saved').style.display=v==='saved'?'':'none';
  if(v==='saved') renderSaved(); else render();
}
document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>setView(t.getAttribute('data-view'))));
document.getElementById('list').addEventListener('click',e=>{
  const u=e.target.getAttribute('data-star'); if(!u)return;
  if(SAVED[u]){ delete SAVED[u]; }
  else{ const j=JOBS.find(x=>x.url===u)||{}; SAVED[u]={url:u,title:j.title||'',company:j.company||'',score:j.score||0,source:j.source||'',salary:j.salary||'',status:'quan_tam',note:'',updated:today10()}; }
  saveSt(); updSavedCount(); render();
});
function renderSaved(){
  const S=document.getElementById('saved'), arr=Object.values(SAVED);
  const cnt={}; STAGES.forEach(([k])=>cnt[k]=0); arr.forEach(s=>{ cnt[s.status]=(cnt[s.status]||0)+1; });
  if(!arr.length){ S.innerHTML='<div class="empty">Chưa có job quan tâm. Bấm ⭐ ở danh sách để thêm.</div>'; return; }
  const sum='<div class="summary">'+STAGES.map(([k,l])=>'<span>'+l+': <b>'+(cnt[k]||0)+'</b></span>').join(' · ')+'</div>';
  const ord={quan_tam:0,da_nop:1,phong_van:2,offer:3,reject:4};
  arr.sort((a,b)=>(ord[a.status]-ord[b.status])||(b.score-a.score));
  S.innerHTML=sum+arr.map(s=>`
   <div class="card">
    <div class="row1">
     <div class="badge" style="background:${color(s.score)}">${s.score}<small style="font-size:11px">%</small></div>
     <div style="flex:1;min-width:0">
      <a class="t" href="${esc(s.url)}" target="_blank">${esc(s.title)}</a>
      <div class="meta"><b style="color:#1d1c1a">${esc(s.company)}</b>${s.salary?'<span class="sal">💰 '+esc(s.salary)+'</span>':''}</div>
     </div>
     <button class="star on" data-unsave="${esc(s.url)}" title="Bỏ quan tâm">★</button>
    </div>
    <div class="tl">${STAGES.map(([k,l])=>'<span class="st '+(s.status===k?'on':'')+'" data-st="'+k+'" data-u="'+esc(s.url)+'">'+l+'</span>').join('')}</div>
    <textarea class="note" data-note="${esc(s.url)}" placeholder="Ghi chú (ngày PV, người liên hệ...)">${esc(s.note||'')}</textarea>
    <div class="upd">Cập nhật: ${esc(s.updated||'-')}</div>
   </div>`).join('');
}
document.getElementById('saved').addEventListener('click',e=>{
  const st=e.target.getAttribute('data-st'), u=e.target.getAttribute('data-u'), un=e.target.getAttribute('data-unsave');
  if(st&&u&&SAVED[u]){ SAVED[u].status=st; SAVED[u].updated=today10(); saveSt(); renderSaved(); return; }
  if(un){ if(confirm('Bỏ job này khỏi Quan tâm?')){ delete SAVED[un]; saveSt(); updSavedCount(); renderSaved(); } }
});
document.getElementById('saved').addEventListener('input',e=>{
  const u=e.target.getAttribute('data-note'); if(u&&SAVED[u]){ SAVED[u].note=e.target.value; SAVED[u].updated=today10(); saveSt(); }
});
updSavedCount();
render();
</script></body></html>"""


def main():
    jobs, src = load()
    n_all = len(jobs)
    jobs, cutoff = within_posted_window(jobs)
    n_win = len(jobs)
    n_sal = sum(1 for j in jobs if extract_salary(j))  # dem job co luong (GIU HET, khong loc bo)
    per = int(os.getenv("MAX_PER_SOURCE", "30"))
    jobs = cap_per_source(jobs, per)
    print(f"[Loc] posted >= {cutoff}; {n_sal}/{n_win} co luong (giu het, uu tien len top); toi da {per}/nguon -> {len(jobs)} job.")
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
