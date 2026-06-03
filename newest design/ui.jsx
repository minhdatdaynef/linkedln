/* Scout — shared icons + UI primitives (exported to window) */
const { useState, useRef, useEffect, useCallback } = React;

/* ── Icon set: stroke-based, inherits currentColor ─────────────── */
const ICON_PATHS = {
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></>,
  sparkles: <><path d="M12 3v4M12 17v4M5 12H1M23 12h-4" /><path d="m6.3 6.3 2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" /><circle cx="12" cy="12" r="3.2" /></>,
  spark: <><path d="M12 2c.4 4.5 2.5 6.6 7 7-4.5.4-6.6 2.5-7 7-.4-4.5-2.5-6.6-7-7 4.5-.4 6.6-2.5 7-7Z" /></>,
  play: <><path d="M7 5.5v13l11-6.5-11-6.5Z" /></>,
  refresh: <><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></>,
  external: <><path d="M14 4h6v6M20 4l-9 9M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  chevron: <><path d="m6 9 6 6 6-6" /></>,
  check: <><path d="m4 12 5 5L20 6" /></>,
  paperclip: <><path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L10 17.4a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  send: <><path d="M4 12 19 5l-4 14-3.5-5.5L19 5" /></>,
  copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></>,
  x: <><path d="M6 6l12 12M18 6 6 18" /></>,
  pin: <><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  cal: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18M8 3v4M16 3v4" /></>,
  money: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.2a2.3 2.3 0 0 1 2.5-1.5c1.4 0 2.4.8 2.4 1.9 0 2.5-4.8 1.4-4.8 3.8 0 1.1 1 1.9 2.4 1.9a2.3 2.3 0 0 0 2.5-1.5" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5" /></>,
  gauge: <><path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" /><path d="m13.5 10.5 4-4M5 18a9 9 0 1 1 14 0" /></>,
  filter: <><path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" /></>,
  arrowRight: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
  warn: <><path d="M12 4 2.5 20h19L12 4Z" /><path d="M12 10v4M12 17.5v.5" /></>,
  trash: <><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" /></>,
  bolt: <><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
};
function Icon({ name, size = 18, stroke = 1.7, fill = false, style, ...rest }) {
  const p = ICON_PATHS[name];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill={fill ? "currentColor" : "none"} stroke={fill ? "none" : "currentColor"}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "0 0 auto", ...style }} {...rest}>
      {p}
    </svg>
  );
}

/* ── Button ────────────────────────────────────────────────────── */
function Button({ variant = "primary", size = "md", icon, iconRight, children, style, ...rest }) {
  const sizes = {
    sm: { padding: "0 12px", height: 34, fontSize: 13, gap: 6 },
    md: { padding: "0 16px", height: 42, fontSize: 14.5, gap: 8 },
    lg: { padding: "0 22px", height: 50, fontSize: 16, gap: 9 },
  }[size];
  const variants = {
    primary: { background: "var(--primary)", color: "var(--primary-fg)", border: "1px solid transparent", boxShadow: "var(--shadow-sm)" },
    soft: { background: "var(--primary-soft)", color: "var(--primary-soft-fg)", border: "1px solid transparent" },
    ghost: { background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)" },
    outline: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border-strong)" },
    quiet: { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" },
  }[variant];
  const [hover, setHover] = useState(false);
  return (
    <button
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: sizes.gap, height: sizes.height, padding: sizes.padding,
        fontSize: sizes.fontSize, fontWeight: 600, borderRadius: 11, cursor: "pointer",
        whiteSpace: "nowrap", transition: "filter .18s ease, transform .12s ease, background .18s ease, border-color .18s",
        filter: hover ? "brightness(.96)" : "none",
        transform: hover ? "translateY(-1px)" : "none",
        ...variants, ...style,
      }}
      {...rest}>
      {icon && <Icon name={icon} size={size === "lg" ? 19 : 17} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === "lg" ? 19 : 17} />}
    </button>
  );
}

/* ── Tag / Pill ─────────────────────────────────────────────────── */
function Tag({ tone = "neutral", icon, children, style }) {
  const tones = {
    neutral: { bg: "var(--surface-3)", fg: "var(--text-muted)" },
    primary: { bg: "var(--primary-soft)", fg: "var(--primary-soft-fg)" },
    success: { bg: "var(--success-soft)", fg: "var(--success-fg)" },
    warning: { bg: "var(--warning-soft)", fg: "var(--warning-fg)" },
    danger: { bg: "var(--danger-soft)", fg: "var(--danger-fg)" },
    info: { bg: "var(--info-soft)", fg: "var(--info-fg)" },
    accent: { bg: "var(--accent-soft)", fg: "var(--accent-fg)" },
  }[tone];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "4px 10px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
      background: tones.bg, color: tones.fg, lineHeight: 1.3, ...style,
    }}>
      {icon && <Icon name={icon} size={13} stroke={2} />}
      {children}
    </span>
  );
}

/* ── Status badge (crawler) ─────────────────────────────────────── */
function StatusBadge({ status }) {
  const map = {
    idle: { tone: "neutral", label: "Chưa chạy", dot: "var(--text-faint)" },
    queued: { tone: "info", label: "Đang chờ…", dot: "var(--info)" },
    in_progress: { tone: "warning", label: "Đang crawl…", dot: "var(--warning)" },
    completed: { tone: "success", label: "Hoàn tất", dot: "var(--success)" },
  }[status];
  const animating = status === "queued" || status === "in_progress";
  return (
    <Tag tone={map.tone}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%", background: map.dot,
        animation: animating ? "scout-pulse 1.1s ease-in-out infinite" : "none",
      }} />
      {map.label}
      {status === "completed" && <Icon name="check" size={13} stroke={2.4} />}
    </Tag>
  );
}

/* ── Select (native, styled) ────────────────────────────────────── */
function Field({ label, icon, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--text-muted)", letterSpacing: ".01em" }}>
        {icon && <Icon name={icon} size={14} />}
        {label}
      </span>
      {children}
    </label>
  );
}
function Select({ value, onChange, options, style }) {
  return (
    <div style={{ position: "relative", ...style }}>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          appearance: "none", WebkitAppearance: "none", width: "100%",
          height: 44, padding: "0 38px 0 14px", fontSize: 14.5, fontWeight: 500,
          color: "var(--text)", background: "var(--surface)",
          border: "1px solid var(--border-strong)", borderRadius: 11, cursor: "pointer",
          fontFamily: "inherit", outline: "none",
        }}>
        {options.map((o) => <option key={o.v ?? o} value={o.v ?? o}>{o.l ?? o}</option>)}
      </select>
      <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", pointerEvents: "none" }}>
        <Icon name="chevron" size={16} />
      </span>
    </div>
  );
}
function TextInput({ value, onChange, placeholder, icon, style, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9, height: 44, padding: "0 14px",
      background: "var(--surface)", borderRadius: 11,
      border: `1px solid ${focus ? "var(--primary)" : "var(--border-strong)"}`,
      boxShadow: focus ? "0 0 0 3px var(--ring)" : "none",
      transition: "border-color .15s, box-shadow .15s", ...style,
    }}>
      {icon && <span style={{ color: "var(--text-faint)" }}><Icon name={icon} size={17} /></span>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14.5, color: "var(--text)" }}
        {...rest} />
    </div>
  );
}

/* ── Score ring (circular progress) ─────────────────────────────── */
function scoreColor(score) {
  if (score < 40) return { c: "var(--danger)", soft: "var(--danger-soft)", fg: "var(--danger-fg)", label: "Thấp" };
  if (score < 70) return { c: "var(--warning)", soft: "var(--warning-soft)", fg: "var(--warning-fg)", label: "Trung bình" };
  return { c: "var(--success)", soft: "var(--success-soft)", fg: "var(--success-fg)", label: "Cao" };
}
function ScoreRing({ score, size = 168, animate = true }) {
  const stroke = 14, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const { c, label } = scoreColor(score);
  const [shown, setShown] = useState(animate ? 0 : score);
  useEffect(() => {
    if (!animate) { setShown(score); return; }
    let raf, start;
    const dur = 900;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(eased * score));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score, animate]);
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ - (shown / 100) * circ}
          style={{ transition: "stroke .4s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: size * 0.3, fontWeight: 700, lineHeight: 1, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>
          {shown}<span style={{ fontSize: size * 0.12, color: "var(--text-faint)", fontWeight: 600 }}>%</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 600, color: c }}>{label} · phù hợp</div>
      </div>
    </div>
  );
}

/* ── tiny inline markdown (bold + bullets) ──────────────────────── */
function mdInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <strong key={i} style={{ fontWeight: 700 }}>{p.slice(2, -2)}</strong>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}
function Markdown({ text }) {
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((ln, i) => {
        const t = ln.trim();
        if (!t) return <div key={i} style={{ height: 2 }} />;
        if (/^[•\-]\s/.test(t)) {
          return (
            <div key={i} style={{ display: "flex", gap: 8, paddingLeft: 2 }}>
              <span style={{ color: "var(--primary)", marginTop: 7, width: 5, height: 5, borderRadius: "50%", background: "currentColor", flex: "0 0 auto" }} />
              <span>{mdInline(t.replace(/^[•\-]\s/, ""))}</span>
            </div>
          );
        }
        return <div key={i}>{mdInline(t)}</div>;
      })}
    </div>
  );
}

Object.assign(window, { Icon, Button, Tag, StatusBadge, Field, Select, TextInput, ScoreRing, scoreColor, Markdown });
