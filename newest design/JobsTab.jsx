/* Scout — Tab 1 · Tìm việc (filter form + crawler + job cards) */
const { useState: useStateJ, useRef: useRefJ, useEffect: useEffectJ } = React;

function JobCard({ job, index, onAnalyze }) {
  const [open, setOpen] = useStateJ(true);
  return (
    <article style={{
      background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 18,
      padding: "26px 28px", boxShadow: "var(--shadow-sm)",
      animation: `scout-pop .5s cubic-bezier(.2,.7,.3,1) ${index * 0.06}s both`,
    }}>
      {/* header */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{
          width: 52, height: 52, borderRadius: 13, flex: "0 0 auto",
          background: "var(--primary-soft)", color: "var(--primary-soft-fg)",
          display: "grid", placeItems: "center", fontWeight: 700, fontSize: 18, letterSpacing: ".02em",
        }}>{job.logo}</div>
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
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={14} />{job.location}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="clock" size={14} />{job.posted}</span>
          </div>
        </div>
      </div>

      {/* tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
        <Tag tone="success" icon="money">{job.salary}</Tag>
        <Tag tone="neutral" icon="clock">{job.worktime}</Tag>
        <Tag tone="info" icon="gauge">{job.experience}</Tag>
        <Tag tone="primary" icon="layers">{job.seniority}</Tag>
        <Tag tone="accent">{job.mode}</Tag>
      </div>

      {/* details */}
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 22 }} className="jobcols">
          <div>
            <h4 style={colHeading}>Yêu cầu chính</h4>
            <ul style={bulletList}>
              {job.requirements.map((r, i) => (
                <li key={i} style={bulletItem}><span style={{ ...dot, background: "var(--primary)" }} />{r}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 style={colHeading}>Quyền lợi</h4>
            <ul style={bulletList}>
              {job.benefits.map((b, i) => (
                <li key={i} style={bulletItem}><Icon name="check" size={14} stroke={2.6} style={{ color: "var(--success)", marginTop: 4 }} />{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
        <Button variant="primary" size="sm" icon="sparkles" onClick={() => onAnalyze(job)}>Phân tích CV</Button>
        <a href={job.url} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" iconRight="external">Xem chi tiết</Button>
        </a>
        <button onClick={() => setOpen((o) => !o)} style={{
          marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer",
          color: "var(--text-faint)", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5,
        }}>
          {open ? "Thu gọn" : "Mở rộng"}
          <Icon name="chevron" size={14} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
        </button>
      </div>
    </article>
  );
}
const colHeading = { margin: "0 0 11px", fontSize: 11.5, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: "var(--text-faint)" };
const bulletList = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 9 };
const bulletItem = { display: "flex", gap: 9, fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 };
const dot = { width: 5, height: 5, borderRadius: "50%", flex: "0 0 auto", marginTop: 8 };

/* skeleton while crawling */
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

function JobsTab({ jobs, onAnalyze, lastUpdated, setLastUpdated }) {
  const [filters, setFilters] = useStateJ({
    keywords: "marketing, truyền thông, sự kiện",
    location: "Ho Chi Minh",
    timeframe: "1 tuần qua",
    pages: "3",
    experience: "Tất cả",
    mode: "Tất cả",
  });
  const [status, setStatus] = useStateJ("idle");
  const [progress, setProgress] = useStateJ(0);
  const [crawling, setCrawling] = useStateJ(false);
  const timers = useRefJ([]);
  const intervals = useRefJ([]);
  const set = (k) => (v) => setFilters((f) => ({ ...f, [k]: v }));
  const kws = filters.keywords.split(",").map((k) => k.trim()).filter(Boolean);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    intervals.current.forEach(clearInterval); intervals.current = [];
  };
  useEffectJ(() => clearTimers, []);

  function runCrawler() {
    if (crawling) return;
    clearTimers();
    setCrawling(true); setProgress(0); setStatus("queued");
    timers.current.push(setTimeout(() => setStatus("in_progress"), 1400));
    // animate progress
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 9 + 3;
      if (p >= 100) { p = 100; clearInterval(tick); }
      setProgress(Math.round(p));
    }, 360);
    intervals.current.push(tick);
    timers.current.push(setTimeout(() => {
      clearInterval(tick); setProgress(100); setStatus("completed"); setCrawling(false);
      setLastUpdated(new Date());
    }, 5200));
  }

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
            Cập nhật lúc {fmtTime(lastUpdated)}
          </span>
          <Button variant="ghost" size="sm" icon="refresh" onClick={() => setLastUpdated(new Date())}>Làm mới</Button>
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
            <TextInput value={filters.keywords} onChange={set("keywords")} placeholder="marketing, truyền thông, sự kiện" icon="briefcase" />
            {kws.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {kws.map((k, i) => <Tag key={i} tone="primary">{k}</Tag>)}
              </div>
            )}
          </Field>
          <Field label="Vị trí địa lý" icon="pin">
            <TextInput value={filters.location} onChange={set("location")} placeholder="Hà Nội, Hồ Chí Minh…" icon="pin" />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="filtergrid">
          <Field label="Thời gian đăng"><Select value={filters.timeframe} onChange={set("timeframe")} options={["24 giờ qua", "1 tuần qua", "1 tháng qua", "Bất kỳ"]} /></Field>
          <Field label="Số trang / keyword"><Select value={filters.pages} onChange={set("pages")} options={["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map((n) => ({ v: n, l: `${n} trang · ~${n * 25} jobs` }))} /></Field>
          <Field label="Kinh nghiệm"><Select value={filters.experience} onChange={set("experience")} options={["Tất cả", "Thực tập", "Mới ra trường", "Associate", "Mid-Senior", "Director"]} /></Field>
          <Field label="Hình thức làm việc"><Select value={filters.mode} onChange={set("mode")} options={["Tất cả", "Onsite", "Remote", "Hybrid"]} /></Field>
        </div>

        {/* run row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 24, paddingTop: 22, borderTop: "1px solid var(--border)" }}>
          <Button variant="primary" size="lg" icon="play" onClick={runCrawler} disabled={crawling}
            style={crawling ? { opacity: .65, cursor: "default", transform: "none" } : {}}>
            {crawling ? "Đang chạy…" : "Chạy Crawler"}
          </Button>
          <StatusBadge status={status} />
          {(status === "queued" || status === "in_progress") && (
            <span style={{ fontSize: 13, color: "var(--text-faint)", display: "inline-flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTopColor: "var(--primary)", animation: "scout-spin .8s linear infinite" }} />
              Tự động cập nhật mỗi 8 giây
            </span>
          )}
          {status !== "idle" && (
            <a href="https://github.com" target="_blank" rel="noreferrer"
              style={{ marginLeft: "auto", fontSize: 13.5, fontWeight: 600, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 5 }}>
              Xem log <Icon name="arrowRight" size={14} />
            </a>
          )}
        </div>
        {(status === "in_progress" || (status === "completed" && progress < 100)) && (
          <div style={{ marginTop: 16, height: 6, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "var(--primary)", borderRadius: 999, transition: "width .35s ease" }} />
          </div>
        )}
      </section>

      {/* results */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--text-muted)" }}>
          {crawling ? "Đang thu thập…" : `${jobs.length} việc làm phù hợp`}
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {crawling
          ? [0, 1, 2].map((i) => <JobSkeleton key={i} />)
          : jobs.map((j, i) => <JobCard key={j.id} job={j} index={i} onAnalyze={onAnalyze} />)}
      </div>
    </div>
  );
}

function fmtTime(d) {
  if (!d) return "—";
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

Object.assign(window, { JobsTab });
