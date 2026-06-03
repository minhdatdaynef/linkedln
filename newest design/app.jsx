/* Scout — app shell, navigation, theme + tweaks, cross-tab handoff */
const { useState: useSA, useEffect: useEA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "direction": "indigo",
  "font": "be",
  "baseSize": 15
}/*EDITMODE-END*/;

const DIRECTIONS = [
  { id: "indigo", label: "Indigo", sub: "Sáng · doanh nghiệp" },
  { id: "evergreen", label: "Evergreen", sub: "Sáng · điềm tĩnh" },
  { id: "midnight", label: "Midnight", sub: "Tối · tech-forward" },
];
const FONTS = [
  { v: "be", l: "Be Vietnam Pro" },
  { v: "jakarta", l: "Plus Jakarta Sans" },
  { v: "public", l: "Public Sans" },
];

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--primary)", color: "var(--primary-fg)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}>
        <Icon name="compass" size={22} stroke={1.8} />
      </div>
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" }}>Scout</div>
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 500 }}>Job Crawler · AI CV</div>
      </div>
    </div>
  );
}

function NavTabs({ tab, setTab }) {
  const items = [
    { id: "jobs", label: "Tìm việc", icon: "briefcase" },
    { id: "cv", label: "Phân tích CV", icon: "sparkles" },
  ];
  return (
    <div style={{ display: "flex", gap: 4, padding: 5, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 13 }}>
      {items.map((it) => {
        const active = tab === it.id;
        return (
          <button key={it.id} onClick={() => setTab(it.id)} style={{
            display: "inline-flex", alignItems: "center", gap: 8, height: 40, padding: "0 18px",
            border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14.5, fontWeight: 600,
            fontFamily: "inherit", transition: "all .18s",
            background: active ? "var(--surface)" : "transparent",
            color: active ? "var(--primary)" : "var(--text-muted)",
            boxShadow: active ? "var(--shadow-sm)" : "none",
          }}>
            <Icon name={it.icon} size={17} /> {it.label}
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [tab, setTab] = useSA("jobs");
  const [jobs] = useSA(window.SCOUT.JOBS);
  const [lastUpdated, setLastUpdated] = useSA(new Date());
  const [incoming, setIncoming] = useSA(null);

  // apply theme + font + base size to <html>
  useEA(() => { document.documentElement.setAttribute("data-theme", t.direction); }, [t.direction]);
  useEA(() => { document.documentElement.setAttribute("data-font", t.font); }, [t.font]);
  useEA(() => { document.body.style.fontSize = t.baseSize + "px"; }, [t.baseSize]);

  function analyzeJob(job) {
    setIncoming(job);
    setTab("cv");
  }

  const isCV = tab === "cv";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* top nav */}
      <header style={{
        flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 20, padding: "0 26px", height: 70, background: "var(--surface)",
        borderBottom: "1px solid var(--border)", position: "relative", zIndex: 10,
      }}>
        <Brand />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <NavTabs tab={tab} setTab={setTab} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)" }} />
            Đã kết nối GitHub
          </span>
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--surface-3)", color: "var(--text-muted)", display: "grid", placeItems: "center" }}>
            <Icon name="user" size={19} />
          </div>
        </div>
      </header>

      {/* main */}
      <main className={isCV ? "" : "scroll"} style={{
        flex: 1, minHeight: 0,
        overflowY: isCV ? "hidden" : "auto",
        padding: isCV ? "26px" : "32px 26px 56px",
      }}>
        <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto", height: isCV ? "100%" : "auto" }}>
          {tab === "jobs"
            ? <JobsTab jobs={jobs} onAnalyze={analyzeJob} lastUpdated={lastUpdated} setLastUpdated={setLastUpdated} />
            : <CVTab incoming={incoming} clearIncoming={() => setIncoming(null)} />}
        </div>
      </main>

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection label="Hướng thiết kế" />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DIRECTIONS.map((d) => {
            const active = t.direction === d.id;
            return (
              <button key={d.id} onClick={() => setTweak("direction", d.id)} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 9, cursor: "pointer",
                border: `1px solid ${active ? "rgba(0,0,0,.35)" : "rgba(0,0,0,.1)"}`,
                background: active ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.5)", textAlign: "left", fontFamily: "inherit",
              }}>
                <span style={{ display: "flex", gap: 3 }}>
                  {swatch(d.id)}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700 }}>{d.label}</span>
                  <span style={{ display: "block", fontSize: 10.5, opacity: .6 }}>{d.sub}</span>
                </span>
                {active && <span style={{ fontSize: 12 }}>✓</span>}
              </button>
            );
          })}
        </div>

        <TweakSection label="Kiểu chữ" />
        <TweakSelect label="Font" value={t.font} options={FONTS} onChange={(v) => setTweak("font", v)} />
        <TweakSlider label="Cỡ chữ" value={t.baseSize} min={13} max={18} step={1} unit="px" onChange={(v) => setTweak("baseSize", v)} />
      </TweaksPanel>
    </div>
  );
}

function swatch(id) {
  const cols = {
    indigo: ["#4b46c9", "#ffffff", "#f1efea"],
    evergreen: ["#1d7a52", "#ffffff", "#eeece2"],
    midnight: ["#37cdbe", "#171a21", "#0e1014"],
  }[id];
  return cols.map((c, i) => (
    <span key={i} style={{ width: 11, height: 18, borderRadius: 3, background: c, border: "1px solid rgba(0,0,0,.12)" }} />
  ));
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
