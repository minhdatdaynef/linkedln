"use client";
/* Scout — Tab 1 · Tìm việc (real crawler: /api/trigger, /api/status, /api/jobs) */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { Icon, Button, Tag, StatusBadge, Field, Select, TextInput } from "./ui";
import type { Job, RunStatus } from "./types";

const DATE_OPTS = [
  { v: "24h", l: "24 giờ qua" }, { v: "week", l: "1 tuần qua" },
  { v: "month", l: "1 tháng qua" }, { v: "any", l: "Bất kỳ" },
];
const EXP_OPTS = [
  { v: "", l: "Tất cả" }, { v: "internship", l: "Thực tập" }, { v: "entry", l: "Mới ra trường" },
  { v: "associate", l: "Associate" }, { v: "mid_senior", l: "Mid-Senior" }, { v: "director", l: "Director" },
];
const MODE_OPTS = [
  { v: "", l: "Tất cả" }, { v: "onsite", l: "Onsite" }, { v: "remote", l: "Remote" }, { v: "hybrid", l: "Hybrid" },
];

const colHeading: React.CSSProperties = { margin: "0 0 11px", fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)" };
const bulletList: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 };
const bulletItem: React.CSSProperties = { display: "flex", gap: 9, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 };

function initials(name: string) {
  return (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function JobCard({ job, index, onAnalyze }: { job: Job; index: number; onAnalyze: (j: Job) => void }) {
  const [open, setOpen] = useState(true);
  const loc = job.work_location_detail || job.location;
  return (
    <article style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
      padding: "26px 28px", boxShadow: "var(--shadow-sm)",
      animation: `scout-pop .5s cubic-bezier(.2,.7,.3,1) ${index * 0.06}s both`,
    }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 13, flex: "0 0 auto",
          background: "var(--primary-soft)", color: "var(--primary-soft-fg)",
          display: "grid", placeItems: "center", fontWeight: 700, fontSize: 18, letterSpacing: ".02em",
        }}>{initials(job.company)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={job.url} target="_blank" rel="noreferrer" style={{
            fontSize: 19, fontWeight: 700, color: "var(--text)", lineHeight: 1.3,
            display: "inline-flex", alignItems: "center", gap: 7,
          }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text)")}>
            {job.title}
          </a>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px 14px", marginTop: 8, color: "var(--text-muted)", fontSize: 14 }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{job.company}</span>
            {loc && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={14} />{loc}</span>}
            {job.posted && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={14} />{job.posted}</span>}
          </div>
        </div>
      </div>

      {/* tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        {job.salary && <Tag tone="success" icon="money">{job.salary}</Tag>}
        {job.working_hours && <Tag tone="neutral" icon="clock">{job.working_hours}</Tag>}
        {job.experience_required && <Tag tone="info" icon="gauge">{job.experience_required}</Tag>}
        {job.seniority && <Tag tone="primary" icon="layers">{job.seniority}</Tag>}
      </div>

      {/* details */}
      {open && (job.key_requirements?.length || job.benefits?.length) ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 22 }} className="jobcols">
          {job.key_requirements?.length ? (
            <div>
              <h4 style={colHeading}>Yêu cầu chính</h4>
              <ul style={bulletList}>
                {job.key_requirements.map((r, i) => (
                  <li key={i} style={bulletItem}><span style={{ width: 5, height: 5, borderRadius: "50%", flex: "0 0 auto", marginTop: 8, background: "var(--primary)" }} />{r}</li>
                ))}
              </ul>
            </div>
          ) : <div />}
          {job.benefits?.length ? (
            <div>
              <h4 style={colHeading}>Quyền lợi</h4>
              <ul style={bulletList}>
                {job.benefits.map((b, i) => (
                  <li key={i} style={bulletItem}><Icon name="check" size={14} stroke={2.6} style={{ color: "var(--success)", marginTop: 4 }} />{b}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <Button variant="primary" size="sm" icon="sparkles" onClick={() => onAnalyze(job)}>Phân tích CV</Button>
        <a href={job.url} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" iconRight="external">Xem chi tiết</Button>
        </a>
        {(job.key_requirements?.length || job.benefits?.length) ? (
          <button onClick={() => setOpen((o) => !o)} style={{
            marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer",
            color: "var(--text-faint)", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5,
          }}>
            {open ? "Thu gọn" : "Mở rộng"}
            <Icon name="chevron" size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
        ) : null}
      </div>
    </article>
  );
}

function JobSkeleton() {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18, padding: "26px 28px" }}>
      {[60, 90, 40].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 22 : 13, width: `${w}%`, borderRadius: 7, marginBottom: 14,
          background: "linear-gradient(90deg, var(--surface-3) 0%, var(--border) 50%, var(--surface-3) 100%)",
          backgroundSize: "200% 100%", animation: "scout-sheen 1.4s linear infinite",
        }} />
      ))}
    </div>
  );
}

export default function JobsTab({ onAnalyze }: { onAnalyze: (j: Job) => void }) {
  const [keywords, setKeywords] = useState("marketing, truyền thông, sự kiện");
  const [location, setLocation] = useState("Hanoi");
  const [datePosted, setDatePosted] = useState("24h");
  const [maxPages, setMaxPages] = useState("4");
  const [experience, setExperience] = useState("");
  const [workType, setWorkType] = useState("");

  const [loading, setLoading] = useState(false);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [runUrl, setRunUrl] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [polling, setPolling] = useState(false);

  const kws = keywords.split(",").map(k => k.trim()).filter(Boolean);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/jobs");
      const data = await res.json();
      if (Array.isArray(data)) { setJobs(data); setLastFetch(new Date()); }
    } catch { /* ignore */ }
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data = await res.json();
      setRunStatus(data.status || "idle");
      if (data.html_url) setRunUrl(data.html_url);
      if (data.status === "completed") { setPolling(false); fetchJobs(); }
    } catch { /* ignore */ }
  }, [fetchJobs]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);
  useEffect(() => {
    if (!polling) return;
    const id = setInterval(checkStatus, 8000);
    checkStatus();
    return () => clearInterval(id);
  }, [polling, checkStatus]);

  const handleRun = async () => {
    if (loading || polling) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, location, date_posted: datePosted, max_pages: maxPages, experience, work_type: workType }),
      });
      if (res.ok) { setRunStatus("queued"); setPolling(true); }
      else alert("Lỗi: " + JSON.stringify(await res.json()));
    } finally { setLoading(false); }
  };

  const crawling = polling || runStatus === "queued" || runStatus === "in_progress";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {/* page head */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: "-.02em" }}>Tìm việc</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 15 }}>
            Crawl LinkedIn theo bộ lọc của bạn, rồi phân tích độ phù hợp ngay với CV.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "var(--text-faint)" }}>
            Cập nhật lúc {lastFetch ? lastFetch.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "—"}
          </span>
          <Button variant="ghost" size="sm" icon="refresh" onClick={fetchJobs}>Làm mới</Button>
        </div>
      </div>

      {/* filter panel */}
      <section style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 26, boxShadow: "var(--shadow-sm)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 20 }}>
          <span style={{ color: "var(--primary)" }}><Icon name="filter" size={18} /></span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bộ lọc crawler</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 18, marginBottom: 18 }} className="filtertop">
          <Field label="Từ khóa" icon="search">
            <TextInput value={keywords} onChange={setKeywords} placeholder="marketing, truyền thông, sự kiện" icon="briefcase" />
            {kws.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {kws.map((k, i) => <Tag key={i} tone="primary">{k}</Tag>)}
              </div>
            )}
          </Field>
          <Field label="Vị trí địa lý" icon="pin">
            <TextInput value={location} onChange={setLocation} placeholder="Hanoi, Ho Chi Minh…" icon="pin" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="filtergrid">
          <Field label="Thời gian đăng"><Select value={datePosted} onChange={setDatePosted} options={DATE_OPTS} /></Field>
          <Field label="Số trang / keyword"><Select value={maxPages} onChange={setMaxPages} options={["1", "2", "3", "4", "5", "6", "8", "10"].map(n => ({ v: n, l: `${n} trang · ~${Number(n) * 25} jobs` }))} /></Field>
          <Field label="Kinh nghiệm"><Select value={experience} onChange={setExperience} options={EXP_OPTS} /></Field>
          <Field label="Hình thức làm việc"><Select value={workType} onChange={setWorkType} options={MODE_OPTS} /></Field>
        </div>

        {/* run row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 24, paddingTop: 22, borderTop: "1px solid var(--border)" }}>
          <Button variant="primary" size="lg" icon="play" onClick={handleRun} disabled={crawling || loading}>
            {loading ? "Đang kích hoạt…" : crawling ? "Đang chạy…" : "Chạy Crawler"}
          </Button>
          <StatusBadge status={runStatus} />
          {(runStatus === "queued" || runStatus === "in_progress") && (
            <span style={{ fontSize: 13, color: "var(--text-faint)", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--primary)", animation: "scout-spin .8s linear infinite" }} />
              Tự động cập nhật mỗi 8 giây
            </span>
          )}
          {runUrl && runStatus !== "idle" && (
            <a href={runUrl} target="_blank" rel="noreferrer"
              style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 600, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              Xem log <Icon name="arrowRight" size={14} />
            </a>
          )}
        </div>
      </section>

      {/* results */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-muted)" }}>
          {crawling ? "Đang thu thập…" : `${jobs.length} việc làm phù hợp`}
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {crawling && jobs.length === 0
          ? [0, 1, 2].map((i) => <JobSkeleton key={i} />)
          : jobs.length === 0
            ? <div style={{ background: "var(--surface)", border: "1px dashed var(--border-strong)", borderRadius: 18, padding: "48px 24px", textAlign: "center", color: "var(--text-faint)" }}>
                Chưa có kết quả. Nhấn &quot;Chạy Crawler&quot; để bắt đầu.
              </div>
            : jobs.map((j, i) => <JobCard key={i} job={j} index={i} onAnalyze={onAnalyze} />)}
      </div>
    </div>
  );
}
