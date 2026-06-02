"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

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

type CVAnalysis = {
  match_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  cv_suggestions: string[];
  keywords_to_add: string[];
};

// ── Style tokens ──────────────────────────────────────────────────────────────

const S = {
  wrap:   { maxWidth: 900, margin: "0 auto", padding: "24px 16px" },
  header: { background: "#0a66c2", color: "#fff", padding: "16px 24px", borderRadius: 10, marginBottom: 20 },
  h1:     { margin: 0, fontSize: 22 },
  sub:    { margin: "4px 0 0", fontSize: 13, opacity: 0.85 },
  card:   { background: "#fff", borderRadius: 10, padding: 20, marginBottom: 16, border: "1px solid #e0e0e0" },
  label:  { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#333" } as React.CSSProperties,
  input:  { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, boxSizing: "border-box" } as React.CSSProperties,
  select: { width: "100%", padding: "8px 10px", border: "1px solid #ccc", borderRadius: 6, fontSize: 14, background: "#fff", boxSizing: "border-box" } as React.CSSProperties,
  btn:    { background: "#0a66c2", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "pointer", fontWeight: 600 } as React.CSSProperties,
  btnDis: { background: "#aaa", color: "#fff", border: "none", borderRadius: 6, padding: "10px 24px", fontSize: 15, cursor: "not-allowed", fontWeight: 600 } as React.CSSProperties,
  grid2:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  grid3:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  tag:    { display: "inline-block", background: "#e8f0fe", color: "#0a66c2", borderRadius: 4, padding: "2px 8px", fontSize: 12, marginRight: 4 },
  chip:   (c: string) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: c === "in_progress" ? "#fff8e1" : c === "completed" ? "#e8f5e9" : c === "queued" ? "#e3f2fd" : "#f5f5f5", color: c === "in_progress" ? "#f57c00" : c === "completed" ? "#2e7d32" : c === "queued" ? "#1565c0" : "#666" }),
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer",
  border: "none", borderBottom: active ? "3px solid #0a66c2" : "3px solid transparent",
  background: active ? "#f0f6ff" : "#fff", color: active ? "#0a66c2" : "#666",
  transition: "all 0.15s",
});

const pill = (active: boolean): React.CSSProperties => ({
  padding: "5px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 20,
  border: "1px solid #0a66c2",
  background: active ? "#0a66c2" : "#fff",
  color: active ? "#fff" : "#0a66c2",
});

const scoreColor = (s: number) => s >= 70 ? "#2e7d32" : s >= 40 ? "#e65100" : "#c62828";
const scoreBg    = (s: number) => s >= 70 ? "#e8f5e9" : s >= 40 ? "#fff3e0" : "#ffebee";

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  // Tabs
  const [activeTab, setActiveTab] = useState<"crawler" | "cv">("crawler");

  // ── Crawler state ──────────────────────────────────────────
  const [keywords,   setKeywords]   = useState("marketing,truyen thong,su kien");
  const [location,   setLocation]   = useState("Hanoi");
  const [datePoster, setDatePosted] = useState("24h");
  const [maxPages,   setMaxPages]   = useState("4");
  const [experience, setExperience] = useState("");
  const [workType,   setWorkType]   = useState("");
  const [jobType,    setJobType]    = useState("");
  const [loading,    setLoading]    = useState(false);
  const [runStatus,  setRunStatus]  = useState<RunStatus>("idle");
  const [runUrl,     setRunUrl]     = useState("");
  const [jobs,       setJobs]       = useState<Job[]>([]);
  const [lastFetch,  setLastFetch]  = useState("");
  const [polling,    setPolling]    = useState(false);

  // ── CV Analysis state ──────────────────────────────────────
  const [cvMode,         setCvMode]         = useState<"text" | "file">("text");
  const [cvText,         setCvText]         = useState("");
  const [cvFileName,     setCvFileName]     = useState("");
  const [jdSource,       setJdSource]       = useState<"jobs" | "paste" | "url">("jobs");
  const [selectedJobIdx, setSelectedJobIdx] = useState<number>(-1);
  const [jdPaste,        setJdPaste]        = useState("");
  const [jdUrl,          setJdUrl]          = useState("");
  const [fetchingJD,     setFetchingJD]     = useState(false);
  const [fetchedJD,      setFetchedJD]      = useState("");
  const [fetchedTitle,   setFetchedTitle]   = useState("");
  const [analyzing,      setAnalyzing]      = useState(false);
  const [cvAnalysis,     setCvAnalysis]     = useState<CVAnalysis | null>(null);
  const [cvError,        setCvError]        = useState("");
  const fileRef     = useRef<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Crawler callbacks ──────────────────────────────────────

  const fetchJobs = useCallback(async () => {
    const res  = await fetch("/api/jobs");
    const data = await res.json();
    setJobs(data);
    setLastFetch(new Date().toLocaleTimeString("vi-VN"));
  }, []);

  const checkStatus = useCallback(async () => {
    const res  = await fetch("/api/status");
    const data = await res.json();
    setRunStatus(data.status || "idle");
    if (data.html_url) setRunUrl(data.html_url);
    if (data.status === "completed") { setPolling(false); fetchJobs(); }
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, location, date_posted: datePoster, max_pages: maxPages, experience, work_type: workType, job_type: jobType }),
      });
      if (res.ok) { setRunStatus("queued"); setPolling(true); }
      else        { alert("Lỗi: " + JSON.stringify(await res.json())); }
    } finally { setLoading(false); }
  };

  // ── CV Analysis callbacks ──────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    fileRef.current = f;
    setCvFileName(f.name);
    setCvText("");
  };

  const handleFetchJD = async () => {
    if (!jdUrl.trim()) return;
    setFetchingJD(true);
    setFetchedJD("");
    setFetchedTitle("");
    try {
      const res  = await fetch("/api/fetch-jd", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: jdUrl }),
      });
      const data = await res.json();
      if (data.jd) { setFetchedJD(data.jd); setFetchedTitle(data.title || ""); }
      else alert("❌ " + (data.error || "Không lấy được JD"));
    } finally { setFetchingJD(false); }
  };

  const buildJDFromJob = (job: Job): string => {
    const parts: string[] = [];
    if (job.title)   parts.push(`Vị trí: ${job.title}`);
    if (job.company) parts.push(`Công ty: ${job.company}`);
    const loc = job.work_location_detail || job.location;
    if (loc)         parts.push(`Địa điểm: ${loc}`);
    if (job.seniority)           parts.push(`Cấp độ: ${job.seniority}`);
    if (job.experience_required) parts.push(`Kinh nghiệm: ${job.experience_required}`);
    if (job.salary)              parts.push(`Lương: ${job.salary}`);
    if (job.key_requirements?.length) parts.push(`Yêu cầu:\n${job.key_requirements.map(r => `- ${r}`).join("\n")}`);
    if (job.benefits?.length)         parts.push(`Quyền lợi:\n${job.benefits.map(b => `- ${b}`).join("\n")}`);
    return parts.join("\n\n");
  };

  const handleAnalyze = async () => {
    setCvError("");
    setCvAnalysis(null);

    // ── Validate JD ──
    let finalJD = "";
    if (jdSource === "jobs") {
      if (selectedJobIdx < 0 || !jobs[selectedJobIdx]) {
        setCvError("Vui lòng chọn 1 job từ danh sách kết quả."); return;
      }
      finalJD = buildJDFromJob(jobs[selectedJobIdx]);
    } else if (jdSource === "paste") {
      finalJD = jdPaste.trim();
      if (!finalJD) { setCvError("Vui lòng dán nội dung JD."); return; }
    } else {
      finalJD = fetchedJD.trim();
      if (!finalJD) { setCvError("Vui lòng lấy JD từ URL trước (nhấn nút Lấy JD)."); return; }
    }

    setAnalyzing(true);
    try {
      let res: Response;

      if (cvMode === "file" && fileRef.current) {
        const fd = new FormData();
        fd.append("cv", fileRef.current);
        fd.append("jd", finalJD);
        res = await fetch("/api/cv-review", { method: "POST", body: fd });
      } else {
        const cv = cvText.trim();
        if (!cv) { setCvError("Vui lòng nhập hoặc dán nội dung CV."); setAnalyzing(false); return; }
        res = await fetch("/api/cv-review", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ cvText: cv, jdText: finalJD }),
        });
      }

      const data = await res.json();
      if (data.error) setCvError(data.error);
      else            setCvAnalysis(data as CVAnalysis);
    } catch (e: unknown) {
      setCvError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setAnalyzing(false);
    }
  };

  // Shortcut: click "Phân tích CV" on a job card → switch tab + pre-select job
  const analyzeJob = (idx: number) => {
    setSelectedJobIdx(idx);
    setJdSource("jobs");
    setCvAnalysis(null);
    setCvError("");
    setActiveTab("cv");
  };

  const statusLabel: Record<string, string> = {
    idle: "Chưa chạy", queued: "Đang chờ...", in_progress: "Đang crawl...", completed: "Hoàn tất ✓",
  };

  // ── Render ─────────────────────────────────────────────────

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>🔍 LinkedIn Job Crawler</h1>
        <p style={S.sub}>Tìm việc làm tự động · Phân tích CV thông minh · Email mỗi sáng 7h</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", background: "#fff", border: "1px solid #e0e0e0", borderRadius: 10, overflow: "hidden", marginBottom: 20 }}>
        <button style={tabBtn(activeTab === "crawler")} onClick={() => setActiveTab("crawler")}>🔍 Tìm việc</button>
        <button style={tabBtn(activeTab === "cv")}      onClick={() => setActiveTab("cv")}>📄 Phân tích CV</button>
      </div>

      {/* ════════════════════════════════════════
          TAB 1 – CRAWLER
         ════════════════════════════════════════ */}
      {activeTab === "crawler" && (
        <>
          {/* Filter form */}
          <div style={S.card}>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Keywords <span style={{ color: "#888", fontWeight: 400 }}>(phân cách bởi dấu phẩy)</span></label>
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

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <button
                style={loading || polling ? S.btnDis : S.btn}
                onClick={handleRun}
                disabled={loading || polling}
              >
                {loading ? "Đang kích hoạt..." : polling ? "Đang chạy..." : "▶ Chạy Crawler"}
              </button>
              {runStatus !== "idle" && (
                <span>
                  <span style={S.chip(runStatus)}>{statusLabel[runStatus]}</span>
                  {runUrl && <a href={runUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginLeft: 8, color: "#0a66c2" }}>Xem log →</a>}
                </span>
              )}
            </div>
            {polling && <p style={{ fontSize: 12, color: "#888", margin: "8px 0 0" }}>⏳ Crawler đang chạy trên GitHub Actions (~2-3 phút). Kết quả tự cập nhật khi xong.</p>}
          </div>

          {/* Results header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 16, color: "#333" }}>
              📋 Kết quả {jobs.length > 0 && <span style={{ color: "#0a66c2" }}>({jobs.length} jobs)</span>}
            </h2>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {lastFetch && <span style={{ fontSize: 12, color: "#888" }}>Cập nhật: {lastFetch}</span>}
              <button onClick={fetchJobs} style={{ ...S.btn, padding: "6px 14px", fontSize: 13 }}>↻ Làm mới</button>
            </div>
          </div>

          {jobs.length === 0 && (
            <div style={{ ...S.card, textAlign: "center" as const, color: "#888", padding: 40 }}>
              Chưa có kết quả. Nhấn &quot;Chạy Crawler&quot; để bắt đầu.
            </div>
          )}

          {/* Job cards */}
          {jobs.map((job, i) => (
            <div key={i} style={S.card}>
              <a href={job.url} target="_blank" rel="noreferrer" style={{ color: "#0a66c2", textDecoration: "none", fontSize: 17, fontWeight: 700 }}>
                {job.title}
              </a>
              <p style={{ margin: "6px 0 10px", color: "#555", fontSize: 14 }}>
                🏢 {job.company} &nbsp;|&nbsp; 📍 {job.work_location_detail || job.location} &nbsp;|&nbsp; 📅 {job.posted}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 10 }}>
                {job.salary            && <span style={S.tag}>💰 {job.salary}</span>}
                {job.working_hours     && <span style={S.tag}>🕐 {job.working_hours}</span>}
                {job.experience_required && <span style={S.tag}>🎓 {job.experience_required}</span>}
                {job.seniority         && <span style={S.tag}>{job.seniority}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                {job.key_requirements?.length ? (
                  <div>
                    <strong>Yêu cầu chính:</strong>
                    <ul style={{ margin: "4px 0", paddingLeft: 18, color: "#444" }}>
                      {job.key_requirements.map((r, j) => <li key={j}>{r}</li>)}
                    </ul>
                  </div>
                ) : null}
                {job.benefits?.length ? (
                  <div>
                    <strong>Quyền lợi:</strong>
                    <ul style={{ margin: "4px 0", paddingLeft: 18, color: "#444" }}>
                      {job.benefits.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  </div>
                ) : null}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <a href={job.url} target="_blank" rel="noreferrer" style={{ ...S.btn, fontSize: 13, padding: "6px 16px", textDecoration: "none" }}>
                  Xem chi tiết →
                </a>
                <button
                  onClick={() => analyzeJob(i)}
                  style={{ background: "#fff", color: "#0a66c2", border: "1px solid #0a66c2", borderRadius: 6, padding: "6px 16px", fontSize: 13, cursor: "pointer", fontWeight: 600 }}
                >
                  📄 Phân tích CV
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ════════════════════════════════════════
          TAB 2 – CV ANALYSIS
         ════════════════════════════════════════ */}
      {activeTab === "cv" && (
        <>
          {/* ── CV Input ── */}
          <div style={S.card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#333", marginBottom: 12 }}>📄 CV của bạn</div>

            {/* Mode toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button style={pill(cvMode === "text")} onClick={() => setCvMode("text")}>✏️ Dán text</button>
              <button style={pill(cvMode === "file")} onClick={() => setCvMode("file")}>📎 Upload file</button>
            </div>

            {cvMode === "text" ? (
              <textarea
                style={{ ...S.input, height: 180, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                placeholder="Dán toàn bộ nội dung CV vào đây (copy từ Word, PDF, v.v.)..."
                value={cvText}
                onChange={e => setCvText(e.target.value)}
              />
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  style={{ display: "none" }}
                  onChange={handleFileSelect}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button
                    style={{ ...S.btn, padding: "8px 18px", fontSize: 13 }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📎 Chọn file PDF / DOCX / TXT
                  </button>
                  {cvFileName && (
                    <span style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600 }}>✓ {cvFileName}</span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: "#888", margin: "8px 0 0" }}>
                  Hỗ trợ: PDF, DOCX, TXT · Tối đa 4 MB
                </p>
              </div>
            )}
          </div>

          {/* ── JD Source ── */}
          <div style={S.card}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#333", marginBottom: 12 }}>📋 Nguồn mô tả công việc (JD)</div>

            {/* Source toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" as const }}>
              <button style={pill(jdSource === "jobs")}  onClick={() => setJdSource("jobs")}>📌 Chọn từ kết quả</button>
              <button style={pill(jdSource === "paste")} onClick={() => setJdSource("paste")}>✏️ Dán JD</button>
              <button style={pill(jdSource === "url")}   onClick={() => setJdSource("url")}>🔗 Link LinkedIn</button>
            </div>

            {/* From crawled jobs */}
            {jdSource === "jobs" && (
              jobs.length === 0 ? (
                <div style={{ padding: "16px", background: "#f9f9f9", borderRadius: 8, color: "#888", fontSize: 13 }}>
                  ℹ️ Chưa có job nào. Hãy chạy Crawler trước ở tab &quot;Tìm việc&quot;, hoặc chọn nguồn JD khác.
                </div>
              ) : (
                <div>
                  <label style={S.label}>Chọn job từ danh sách đã crawl</label>
                  <select
                    style={S.select}
                    value={selectedJobIdx}
                    onChange={e => setSelectedJobIdx(Number(e.target.value))}
                  >
                    <option value={-1}>-- Chọn job --</option>
                    {jobs.map((j, i) => (
                      <option key={i} value={i}>{j.title} · {j.company}</option>
                    ))}
                  </select>
                  {selectedJobIdx >= 0 && jobs[selectedJobIdx] && (
                    <div style={{ marginTop: 10, padding: "10px 14px", background: "#f0f6ff", borderRadius: 8, fontSize: 13, color: "#333" }}>
                      <strong>{jobs[selectedJobIdx].title}</strong> — {jobs[selectedJobIdx].company}
                      {jobs[selectedJobIdx].experience_required && <> · 🎓 {jobs[selectedJobIdx].experience_required}</>}
                      {jobs[selectedJobIdx].key_requirements?.length
                        ? <div style={{ marginTop: 4, color: "#555" }}>Yêu cầu: {jobs[selectedJobIdx].key_requirements!.slice(0, 3).join(" · ")}...</div>
                        : null}
                    </div>
                  )}
                </div>
              )
            )}

            {/* Paste JD */}
            {jdSource === "paste" && (
              <div>
                <label style={S.label}>Dán nội dung JD <span style={{ fontWeight: 400, color: "#888" }}>(copy từ LinkedIn, TopCV, v.v.)</span></label>
                <textarea
                  style={{ ...S.input, height: 160, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                  placeholder="Dán toàn bộ mô tả công việc vào đây..."
                  value={jdPaste}
                  onChange={e => setJdPaste(e.target.value)}
                />
              </div>
            )}

            {/* LinkedIn URL */}
            {jdSource === "url" && (
              <div>
                <label style={S.label}>Link LinkedIn Jobs</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    style={{ ...S.input, flex: 1 }}
                    placeholder="https://www.linkedin.com/jobs/view/4234567890/"
                    value={jdUrl}
                    onChange={e => setJdUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleFetchJD()}
                  />
                  <button
                    style={{ ...S.btn, padding: "8px 18px", fontSize: 13, whiteSpace: "nowrap" as const }}
                    onClick={handleFetchJD}
                    disabled={fetchingJD}
                  >
                    {fetchingJD ? "Đang lấy..." : "Lấy JD"}
                  </button>
                </div>
                {fetchedJD && (
                  <div style={{ marginTop: 10, padding: "10px 14px", background: "#e8f5e9", borderRadius: 8, fontSize: 12, color: "#1b5e20" }}>
                    ✓ Đã lấy JD{fetchedTitle ? `: "${fetchedTitle}"` : ""} · {fetchedJD.length} ký tự
                  </div>
                )}
                <p style={{ fontSize: 12, color: "#888", margin: "8px 0 0" }}>
                  💡 Nếu LinkedIn chặn (403), hãy copy JD thủ công và dùng chế độ &quot;Dán JD&quot;.
                </p>
              </div>
            )}
          </div>

          {/* ── Analyze button ── */}
          <div style={{ marginBottom: 20 }}>
            <button
              style={analyzing ? S.btnDis : { ...S.btn, fontSize: 15, padding: "12px 32px" }}
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? "⏳ Đang phân tích..." : "🔍 Phân tích CV"}
            </button>
            {analyzing && (
              <p style={{ fontSize: 12, color: "#888", margin: "8px 0 0" }}>
                AI đang đọc CV và JD, so sánh kỹ năng... (~10-20 giây)
              </p>
            )}
          </div>

          {/* ── Error ── */}
          {cvError && (
            <div style={{ background: "#ffebee", border: "1px solid #ef9a9a", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#c62828", fontSize: 14 }}>
              ❌ {cvError}
            </div>
          )}

          {/* ── Analysis results ── */}
          {cvAnalysis && (
            <div style={{ ...S.card, padding: 24 }}>
              {/* Score */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#333" }}>📊 Mức độ phù hợp</span>
                  <span style={{
                    fontSize: 28, fontWeight: 800,
                    color: scoreColor(cvAnalysis.match_score),
                    background: scoreBg(cvAnalysis.match_score),
                    padding: "4px 16px", borderRadius: 20,
                  }}>
                    {cvAnalysis.match_score}%
                  </span>
                </div>
                <div style={{ background: "#e0e0e0", borderRadius: 8, height: 10, overflow: "hidden" }}>
                  <div style={{
                    height: 10, borderRadius: 8,
                    background: scoreColor(cvAnalysis.match_score),
                    width: `${cvAnalysis.match_score}%`,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>

              {/* Summary */}
              {cvAnalysis.summary && (
                <div style={{ padding: "12px 16px", background: "#f5f5f5", borderRadius: 8, fontSize: 14, color: "#333", marginBottom: 20, lineHeight: 1.6 }}>
                  💬 {cvAnalysis.summary}
                </div>
              )}

              {/* Strengths & Gaps */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                {/* Strengths */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#2e7d32", marginBottom: 8 }}>✅ Điểm mạnh</div>
                  {cvAnalysis.strengths?.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#333", fontSize: 13, lineHeight: 1.8 }}>
                      {cvAnalysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  ) : <p style={{ fontSize: 13, color: "#888" }}>—</p>}
                </div>
                {/* Gaps */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#e65100", marginBottom: 8 }}>⚠️ Điểm cần cải thiện</div>
                  {cvAnalysis.gaps?.length ? (
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#333", fontSize: 13, lineHeight: 1.8 }}>
                      {cvAnalysis.gaps.map((g, i) => <li key={i}>{g}</li>)}
                    </ul>
                  ) : <p style={{ fontSize: 13, color: "#888" }}>—</p>}
                </div>
              </div>

              {/* CV Suggestions */}
              {cvAnalysis.cv_suggestions?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0a66c2", marginBottom: 8 }}>💡 Gợi ý cụ thể để sửa CV</div>
                  <div style={{ background: "#f0f6ff", borderRadius: 8, padding: "12px 16px" }}>
                    <ol style={{ margin: 0, paddingLeft: 20, color: "#333", fontSize: 13, lineHeight: 2 }}>
                      {cvAnalysis.cv_suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  </div>
                </div>
              )}

              {/* Keywords */}
              {cvAnalysis.keywords_to_add?.length > 0 && (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#6a1b9a", marginBottom: 8 }}>🔑 Keywords nên thêm vào CV</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 6 }}>
                    {cvAnalysis.keywords_to_add.map((kw, i) => (
                      <span key={i} style={{
                        background: "#f3e5f5", color: "#6a1b9a",
                        border: "1px solid #ce93d8",
                        borderRadius: 4, padding: "4px 12px", fontSize: 12, fontWeight: 600,
                      }}>
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
