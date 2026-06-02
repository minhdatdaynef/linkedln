"use client";
import { useState, useEffect, useCallback } from "react";

type Job = {
  title: string;
  company: string;
  location: string;
  url: string;
  posted: string;
  seniority?: string;
  salary?: string;
  working_hours?: string;
  experience_required?: string;
  key_requirements?: string[];
  benefits?: string[];
  work_location_detail?: string;
};

type RunStatus = "idle" | "queued" | "in_progress" | "completed";

const S = {
  wrap:    { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
  header:  { background: "#0a66c2", color: "#fff", padding: "16px 24px", borderRadius: 10, marginBottom: 20 },
  h1:      { margin: 0, fontSize: 22 },
  sub:     { margin: "4px 0 0", fontSize: 13, opacity: 0.85 },
  card:    { background: "#fff", borderRadius: 10, padding: 20, marginBottom: 16, border: "1px solid #e0e0e0" },
  label:   { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#333" },
  input:   { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const },
  select:  { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, background: "#fff", boxSizing: "border-box" as const },
  btn:     { background: "#0a66c2", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "pointer", fontWeight: 600 },
  btnDis:  { background: "#aaa", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "not-allowed", fontWeight: 600 },
  grid2:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3:   { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  tag:     { display: "inline-block", background: "#e8f0fe", color: "#0a66c2", borderRadius: 4, padding: "2px 8px", fontSize: 12, marginRight: 4 },
  chip:    (c: string) => ({ display:"inline-block", padding:"3px 10px", borderRadius:12, fontSize:12, fontWeight:600, background: c==="in_progress"?"#fff8e1":c==="completed"?"#e8f5e9":c==="queued"?"#e3f2fd":"#f5f5f5", color: c==="in_progress"?"#f57c00":c==="completed"?"#2e7d32":c==="queued"?"#1565c0":"#666" }),
};

export default function Home() {
  const [keywords,    setKeywords]    = useState("marketing,truyen thong,su kien");
  const [location,    setLocation]    = useState("Hanoi");
  const [datePoster,  setDatePosted]  = useState("24h");
  const [maxPages,    setMaxPages]    = useState("4");
  const [experience,  setExperience]  = useState("");
  const [workType,    setWorkType]    = useState("");
  const [jobType,     setJobType]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [runStatus,   setRunStatus]   = useState<RunStatus>("idle");
  const [runUrl,      setRunUrl]      = useState("");
  const [jobs,        setJobs]        = useState<Job[]>([]);
  const [lastFetch,   setLastFetch]   = useState("");
  const [polling,     setPolling]     = useState(false);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data);
    setLastFetch(new Date().toLocaleTimeString("vi-VN"));
  }, []);

  const checkStatus = useCallback(async () => {
    const res = await fetch("/api/status");
    const data = await res.json();
    setRunStatus(data.status || "idle");
    if (data.html_url) setRunUrl(data.html_url);
    if (data.status === "completed") {
      setPolling(false);
      fetchJobs();
    }
  }, [fetchJobs]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    if (!polling) return;
    const id = setInterval(checkStatus, 8000);
    checkStatus();
    return () => clearInterval(id);
  }, [polling, checkStatus]);

  const handleRun = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, location, date_posted: datePoster, max_pages: maxPages, experience, work_type: workType, job_type: jobType }),
      });
      if (res.ok) {
        setRunStatus("queued");
        setPolling(true);
      } else {
        const err = await res.json();
        alert("Lỗi: " + JSON.stringify(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const statusLabel: Record<string, string> = {
    idle: "Chưa chạy", queued: "Đang chờ...", in_progress: "Đang crawl...", completed: "Hoàn tất ✓"
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>🔍 LinkedIn Job Crawler</h1>
        <p style={S.sub}>Tìm việc làm tự động · Kết quả gửi về email mỗi sáng 7h</p>
      </div>

      {/* Filter form */}
      <div style={S.card}>
        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Keywords <span style={{ color:"#888", fontWeight:400 }}>(phân cách bởi dấu phẩy)</span></label>
          <input style={S.input} value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="marketing,truyen thong,su kien" />
        </div>
        <div style={{ ...S.grid2, marginBottom: 14 }}>
          <div>
            <label style={S.label}>Vị trí địa lý</label>
            <input style={S.input} value={location} onChange={e => setLocation(e.target.value)} placeholder="Hanoi" />
          </div>
          <div>
            <label style={S.label}>Đăng trong</label>
            <select style={S.select} value={datePoster} onChange={e => setDatePosted(e.target.value)}>
              <option value="24h">24 giờ qua</option>
              <option value="week">1 tuần qua</option>
              <option value="month">1 tháng qua</option>
              <option value="any">Bất kỳ</option>
            </select>
          </div>
        </div>
        <div style={{ ...S.grid3, marginBottom: 16 }}>
          <div>
            <label style={S.label}>Số trang / keyword</label>
            <select style={S.select} value={maxPages} onChange={e => setMaxPages(e.target.value)}>
              {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} trang (~{n*25} jobs)</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Kinh nghiệm</label>
            <select style={S.select} value={experience} onChange={e => setExperience(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="internship">Thực tập</option>
              <option value="entry">Mới ra trường</option>
              <option value="associate">Associate</option>
              <option value="mid_senior">Mid/Senior</option>
              <option value="director">Director</option>
            </select>
          </div>
          <div>
            <label style={S.label}>Hình thức làm việc</label>
            <select style={S.select} value={workType} onChange={e => setWorkType(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="onsite">Onsite</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <button style={loading || polling ? S.btnDis : S.btn} onClick={handleRun} disabled={loading || polling}>
            {loading ? "Đang kích hoạt..." : polling ? "Đang chạy..." : "▶ Chạy Crawler"}
          </button>
          {runStatus !== "idle" && (
            <span>
              <span style={S.chip(runStatus)}>{statusLabel[runStatus]}</span>
              {runUrl && <a href={runUrl} target="_blank" rel="noreferrer" style={{ fontSize:12, marginLeft:8, color:"#0a66c2" }}>Xem log →</a>}
            </span>
          )}
        </div>
        {polling && <p style={{ fontSize:12, color:"#888", margin:"8px 0 0" }}>⏳ Crawler đang chạy trên GitHub Actions (~2-3 phút). Kết quả tự cập nhật khi xong.</p>}
      </div>

      {/* Results */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <h2 style={{ margin:0, fontSize:16, color:"#333" }}>📋 Kết quả {jobs.length > 0 && <span style={{ color:"#0a66c2" }}>({jobs.length} jobs)</span>}</h2>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          {lastFetch && <span style={{ fontSize:12, color:"#888" }}>Cập nhật: {lastFetch}</span>}
          <button onClick={fetchJobs} style={{ ...S.btn, padding:"6px 14px", fontSize:13 }}>↻ Làm mới</button>
        </div>
      </div>

      {jobs.length === 0 && (
        <div style={{ ...S.card, textAlign:"center", color:"#888", padding:40 }}>
          Chưa có kết quả. Nhấn &quot;Chạy Crawler&quot; để bắt đầu.
        </div>
      )}

      {jobs.map((job, i) => (
        <div key={i} style={S.card}>
          <a href={job.url} target="_blank" rel="noreferrer" style={{ color:"#0a66c2", textDecoration:"none", fontSize:17, fontWeight:700 }}>
            {job.title}
          </a>
          <p style={{ margin:"6px 0 10px", color:"#555", fontSize:14 }}>
            🏢 {job.company} &nbsp;|&nbsp; 📍 {job.work_location_detail || job.location} &nbsp;|&nbsp; 📅 {job.posted}
          </p>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" as const, marginBottom:10 }}>
            {job.salary        && <span style={S.tag}>💰 {job.salary}</span>}
            {job.working_hours && <span style={S.tag}>🕐 {job.working_hours}</span>}
            {job.experience_required && <span style={S.tag}>🎓 {job.experience_required}</span>}
            {job.seniority     && <span style={S.tag}>{job.seniority}</span>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, fontSize:13 }}>
            {job.key_requirements?.length ? (
              <div>
                <strong>Yêu cầu chính:</strong>
                <ul style={{ margin:"4px 0", paddingLeft:18, color:"#444" }}>
                  {job.key_requirements.map((r,j) => <li key={j}>{r}</li>)}
                </ul>
              </div>
            ) : null}
            {job.benefits?.length ? (
              <div>
                <strong>Quyền lợi:</strong>
                <ul style={{ margin:"4px 0", paddingLeft:18, color:"#444" }}>
                  {job.benefits.map((b,j) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ) : null}
          </div>
          <div style={{ marginTop:12 }}>
            <a href={job.url} target="_blank" rel="noreferrer" style={{ ...S.btn, fontSize:13, padding:"6px 16px", textDecoration:"none" }}>
              Xem chi tiết →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}
