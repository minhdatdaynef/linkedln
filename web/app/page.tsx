"use client";
import React, { useState, useEffect } from "react";
import { Icon } from "./components/ui";
import JobsTab from "./components/JobsTab";
import CVTab from "./components/CVTab";
import type { Job } from "./components/types";

const DIRECTIONS = [
  { id: "indigo", label: "Indigo" },
  { id: "evergreen", label: "Evergreen" },
  { id: "midnight", label: "Midnight" },
];

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--primary)", color: "var(--primary-fg)", display: "grid", placeItems: "center", boxShadow: "var(--shadow-sm)" }}>
        <Icon name="compass" size={22} stroke={1.8} />
      </div>
      <div style={{ lineHeight: 1.05 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-.02em" }}>review_your_cv.app</div>
        <div style={{ fontSize: 11.5, color: "var(--text-faint)", fontWeight: 500 }}>Job Crawler · AI CV</div>
      </div>
    </div>
  );
}

function NavTabs({ tab, setTab }: { tab: string; setTab: (t: "jobs" | "cv") => void }) {
  const items = [
    { id: "jobs" as const, label: "Tìm việc", icon: "briefcase" },
    { id: "cv" as const, label: "Phân tích CV", icon: "sparkles" },
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

function ThemeSwitcher({ theme, setTheme }: { theme: string; setTheme: (t: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 3, padding: 3, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 10 }}>
      {DIRECTIONS.map((d) => {
        const active = theme === d.id;
        return (
          <button key={d.id} onClick={() => setTheme(d.id)} title={d.label} style={{
            width: 26, height: 26, borderRadius: 7, cursor: "pointer", border: active ? "2px solid var(--text)" : "1px solid var(--border-strong)",
            background: d.id === "indigo" ? "#4b46c9" : d.id === "evergreen" ? "#1d7a52" : "#171a21",
            padding: 0,
          }} />
        );
      })}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"jobs" | "cv">("jobs");
  const [incoming, setIncoming] = useState<Job | null>(null);
  const [theme, setTheme] = useState("indigo");

  // restore + apply theme
  useEffect(() => {
    const saved = localStorage.getItem("scout_theme");
    if (saved) setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("scout_theme", theme); } catch { /* ignore */ }
  }, [theme]);

  const analyzeJob = (job: Job) => { setIncoming(job); setTab("cv"); };
  const isCV = tab === "cv";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{
        flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 20, padding: "0 26px", height: 70, background: "var(--surface)",
        borderBottom: "1px solid var(--border)", position: "relative", zIndex: 10,
      }}>
        <Brand />
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
          <NavTabs tab={tab} setTab={setTab} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ThemeSwitcher theme={theme} setTheme={setTheme} />
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--surface-3)", color: "var(--text-muted)", display: "grid", placeItems: "center" }}>
            <Icon name="user" size={19} />
          </div>
        </div>
      </header>

      <main className={isCV ? "" : "scroll"} style={{
        flex: 1, minHeight: 0,
        overflowY: isCV ? "hidden" : "auto",
        padding: isCV ? "26px" : "32px 26px 56px",
      }}>
        <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto", height: isCV ? "100%" : "auto" }}>
          {tab === "jobs"
            ? <JobsTab onAnalyze={analyzeJob} />
            : <CVTab incoming={incoming} clearIncoming={() => setIncoming(null)} />}
        </div>
      </main>
    </div>
  );
}
