"use client";
/* Scout — Tab 2 · Phân tích CV (real /api/cv-chat, /api/fetch-jd, /api/cv-export + localStorage) */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Icon, Button, Tag, ScoreRing, Markdown, scoreColor } from "./ui";
import type { Job, CVAnalysis, CVJson, ChatMsg, SavedVersion } from "./types";

const LS_KEY = "cvchat_state_v1";
const LS_VERSIONS = "cvchat_versions_v1";

const GREETING =
  "Chào bạn! Mình là **Scout AI** — trợ lý phân tích CV của bạn.\n\nĐể bắt đầu, hãy cung cấp cho mình hai thứ:\n• **CV của bạn** — bấm 📎 CV để tải file (PDF / DOCX / TXT)\n• **Mô tả công việc (JD)** — bấm 📄 JD, dán text, hoặc dán link LinkedIn\n\nMình sẽ chấm độ phù hợp và viết lại CV giúp bạn nổi bật hơn.";

const INIT_MSG: ChatMsg = { id: "init", role: "assistant", content: GREETING };

const QUICK_CHIPS = [
  "Viết lại phần Kỹ năng cho phù hợp hơn",
  "Thêm keywords còn thiếu vào CV giúp tôi",
  "Rút gọn CV xuống còn 1 trang",
  "Viết lại mục tiêu nghề nghiệp",
  "Tôi cần cải thiện thêm gì để tăng match score?",
  "✉️ Viết thư xin việc (cover letter) theo JD này",
  "Gợi ý câu hỏi phỏng vấn thường gặp cho vị trí này",
  "Dịch CV đã cải thiện sang tiếng Anh",
];

const olist: React.CSSProperties = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 11 };
const oitem: React.CSSProperties = { display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.55, color: "var(--text-muted)" };

// ── Chat bubble ────────────────────────────────────────────────
function ChatBubble({ m }: { m: ChatMsg }) {
  const isUser = m.role === "user";
  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", animation: "scout-pop .35s ease both" }}>
      <div style={{ maxWidth: "84%", display: "flex", gap: 10, flexDirection: isUser ? "row-reverse" : "row" }}>
        {!isUser && (
          <div style={{ width: 30, height: 30, borderRadius: 9, flex: "0 0 auto", background: "var(--primary)", color: "var(--primary-fg)", display: "grid", placeItems: "center", marginTop: 2 }}>
            <Icon name="spark" size={16} fill />
          </div>
        )}
        <div style={{
          padding: "11px 15px", borderRadius: 15, fontSize: 14.5, lineHeight: 1.55,
          background: isUser ? "var(--primary)" : "var(--surface)",
          color: isUser ? "var(--primary-fg)" : "var(--text)",
          border: isUser ? "1px solid transparent" : "1px solid var(--border)",
          borderTopRightRadius: isUser ? 5 : 15, borderTopLeftRadius: isUser ? 15 : 5,
          boxShadow: "var(--shadow-sm)",
        }}>
          {m.attachLabel && (
            <div style={{
              fontSize: 12, fontWeight: 700, marginBottom: 6, opacity: 0.85,
              background: isUser ? "rgba(255,255,255,.16)" : "var(--primary-soft)",
              color: isUser ? "inherit" : "var(--primary-soft-fg)",
              padding: "2px 8px", borderRadius: 6, display: "inline-block",
            }}>{m.attachLabel}</div>
          )}
          <Markdown text={m.content} />
        </div>
      </div>
    </div>
  );
}

function Typing() {
  return (
    <div style={{ display: "flex", gap: 10, animation: "scout-fade .3s ease" }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, flex: "0 0 auto", background: "var(--primary)", color: "var(--primary-fg)", display: "grid", placeItems: "center" }}>
        <Icon name="spark" size={16} fill />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "13px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 15, borderTopLeftRadius: 5 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--text-faint)", animation: `scout-blink 1.2s ease-in-out ${i * 0.16}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

function ContextBadge({ tone, icon, label, value }: { tone: "success" | "info"; icon: string; label: string; value: string }) {
  const tones = { success: ["var(--success-soft)", "var(--success-fg)"], info: ["var(--info-soft)", "var(--info-fg)"] }[tone];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 9, background: tones[0], color: tones[1], fontSize: 13, fontWeight: 600, maxWidth: "100%" }}>
      <Icon name={icon} size={14} />
      <span style={{ opacity: 0.7 }}>{label}:</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function OutputSection({ icon, tone, title, children }: { icon: string; tone: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 8, background: `var(--${tone}-soft)`, color: `var(--${tone}-fg)` }}>
          <Icon name={icon} size={15} stroke={2} />
        </span>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function AnalysisView({ analysis }: { analysis: CVAnalysis }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, animation: "scout-fade .4s ease" }}>
      <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap", justifyContent: "center", padding: "8px 0 4px" }}>
        <ScoreRing score={analysis.match_score} />
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-faint)" }}>Tóm tắt</h4>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--text-muted)" }}>{analysis.summary}</p>
        </div>
      </div>

      {analysis.strengths?.length > 0 && (
        <OutputSection icon="check" tone="success" title="Điểm mạnh">
          <ul style={olist}>{analysis.strengths.map((s, i) => (
            <li key={i} style={oitem}><Icon name="check" size={15} stroke={2.6} style={{ color: "var(--success)", marginTop: 3, flex: "0 0 auto" }} />{s}</li>
          ))}</ul>
        </OutputSection>
      )}

      {analysis.gaps?.length > 0 && (
        <OutputSection icon="warn" tone="warning" title="Cần cải thiện">
          <ul style={olist}>{analysis.gaps.map((s, i) => (
            <li key={i} style={oitem}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warning)", marginTop: 7, flex: "0 0 auto" }} />{s}</li>
          ))}</ul>
        </OutputSection>
      )}

      {analysis.cv_suggestions?.length > 0 && (
        <OutputSection icon="sparkles" tone="info" title="Gợi ý sửa CV">
          <ol style={{ ...olist }}>{analysis.cv_suggestions.map((s, i) => (
            <li key={i} style={oitem}>
              <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--info-soft)", color: "var(--info-fg)", fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 1 }}>{i + 1}</span>
              {s}
            </li>
          ))}</ol>
        </OutputSection>
      )}

      {analysis.keywords_to_add?.length > 0 && (
        <OutputSection icon="bolt" tone="accent" title="Keywords nên thêm">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {analysis.keywords_to_add.map((k, i) => <Tag key={i} tone="accent" icon="bolt">{k}</Tag>)}
          </div>
        </OutputSection>
      )}

      {(analysis.ats_checks?.length ?? 0) > 0 && (
        <OutputSection icon="gauge" tone="primary" title="Kiểm tra ATS">
          <ul style={{ ...olist, gap: 9 }}>{analysis.ats_checks!.map((c, i) => (
            <li key={i} style={oitem}>
              <Icon name={c.pass ? "check" : "x"} size={15} stroke={2.6} style={{ color: c.pass ? "var(--success)" : "var(--danger)", marginTop: 3, flex: "0 0 auto" }} />
              <span>{c.label}{!c.pass && c.hint && <span style={{ color: "var(--text-faint)" }}> — {c.hint}</span>}</span>
            </li>
          ))}</ul>
        </OutputSection>
      )}
    </div>
  );
}

// ── Improved CV view (diff + changes + export) ──────────────────
function ImprovedCVView(props: {
  improvedCV: string; originalCV: string; cvContext: string;
  changes: string[]; cvView: "improved" | "original"; setCvView: (v: "improved" | "original") => void;
  showDiff: boolean; setShowDiff: (b: boolean) => void;
  copied: boolean; onCopy: () => void;
  docxLoading: boolean; onDocx: () => void; onTxt: () => void;
  diffLines: (a: string, b: string) => { text: string; added: boolean }[];
}) {
  const { improvedCV, originalCV, cvContext, changes, cvView, setCvView, showDiff, setShowDiff, copied, onCopy, docxLoading, onDocx, onTxt, diffLines } = props;
  if (!improvedCV) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", color: "var(--text-faint)", textAlign: "center", padding: 32 }}>
        <div>
          <Icon name="doc" size={32} style={{ margin: "0 auto 10px" }} />
          Gửi CV + JD để Scout viết lại CV cho bạn
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", animation: "scout-fade .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>CV đã được viết lại</h4>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="primary" size="sm" icon="download" onClick={onDocx} disabled={docxLoading}>
            {docxLoading ? "Đang tạo…" : "Tải .docx"}
          </Button>
          <Button variant={copied ? "soft" : "outline"} size="sm" icon={copied ? "check" : "copy"} onClick={onCopy}>
            {copied ? "Đã copy" : "Copy"}
          </Button>
          <Button variant="quiet" size="sm" icon="download" onClick={onTxt}>.txt</Button>
        </div>
      </div>

      {/* before/after + diff toggle */}
      <div style={{ display: "flex", gap: 4, padding: 4, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 11 }}>
        {(["original", "improved"] as const).map((v) => {
          const active = cvView === v;
          return (
            <button key={v} onClick={() => setCvView(v)} style={{
              flex: 1, height: 34, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--primary)" : "var(--text-muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none",
            }}>{v === "original" ? "CV gốc" : "✨ CV cải thiện"}</button>
          );
        })}
      </div>

      {cvView === "improved" && changes.length > 0 && (
        <div style={{ background: "var(--warning-soft)", color: "var(--warning-fg)", borderRadius: 11, padding: "10px 14px" }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="sparkles" size={14} /> Những thay đổi chính
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.6 }}>
            {changes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}

      {cvView === "improved" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12.5, color: "var(--warning-fg)" }}>
            <Icon name="warn" size={15} style={{ marginTop: 1, flex: "0 0 auto" }} />
            Đọc lại & chỉnh cho đúng trải nghiệm thật. Dòng <span style={{ background: "var(--success-soft)", padding: "0 4px", borderRadius: 4 }}>tô xanh</span> là phần AI thêm.
          </span>
          <label style={{ fontSize: 12.5, color: "var(--primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
            <input type="checkbox" checked={showDiff} onChange={(e) => setShowDiff(e.target.checked)} style={{ cursor: "pointer" }} />
            Tô sáng phần mới
          </label>
        </div>
      )}

      <div className="scroll" style={{
        margin: 0, flex: 1, minHeight: 120, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
        background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14,
        padding: "20px 22px", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.7, color: "var(--text)",
      }}>
        {cvView === "original"
          ? (originalCV || cvContext)
          : (showDiff && originalCV
            ? diffLines(originalCV, improvedCV).map((l, i) => (
                <div key={i} style={{ background: l.added ? "var(--success-soft)" : "transparent", borderRadius: 4, minHeight: "1.2em" }}>{l.text || " "}</div>
              ))
            : improvedCV)}
      </div>
    </div>
  );
}

function CoverLetterView({ text, copied, onCopy }: { text: string; copied: boolean; onCopy: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%", animation: "scout-fade .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Thư xin việc</h4>
        <Button variant={copied ? "soft" : "outline"} size="sm" icon={copied ? "check" : "copy"} onClick={onCopy}>{copied ? "Đã copy" : "Copy"}</Button>
      </div>
      <div className="scroll" style={{
        margin: 0, flex: 1, minHeight: 120, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
        background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14,
        padding: "20px 22px", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.7, color: "var(--text)",
      }}>{text}</div>
    </div>
  );
}

function OutputPanel(props: {
  analysis: CVAnalysis | null; improvedCV: string; coverLetter: string;
  outTab: "analysis" | "improved" | "cover"; setOutTab: (t: "analysis" | "improved" | "cover") => void; newCV: boolean;
  improvedProps: React.ComponentProps<typeof ImprovedCVView>;
  coverCopied: boolean; onCoverCopy: () => void;
}) {
  const { analysis, improvedCV, coverLetter, outTab, setOutTab, newCV, improvedProps, coverCopied, onCoverCopy } = props;
  if (!analysis && !improvedCV && !coverLetter) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 40, textAlign: "center" }}>
        <div style={{ maxWidth: 320 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, margin: "0 auto 22px", background: "var(--primary-soft)", color: "var(--primary-soft-fg)", display: "grid", placeItems: "center" }}>
            <Icon name="gauge" size={36} stroke={1.6} />
          </div>
          <h3 style={{ margin: "0 0 10px", fontSize: 19, fontWeight: 700 }}>Kết quả phân tích sẽ hiện ở đây</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>
            Cung cấp <strong style={{ color: "var(--text)" }}>CV</strong> và <strong style={{ color: "var(--text)" }}>JD</strong> ở khung chat bên trái. Scout sẽ chấm điểm, chỉ ra điểm mạnh/yếu và viết lại CV cho bạn.
          </p>
        </div>
      </div>
    );
  }
  const tabs: { id: "analysis" | "improved" | "cover"; label: string; icon: string; badge?: boolean; show: boolean }[] = [
    { id: "analysis", label: "Phân tích", icon: "gauge", show: !!analysis },
    { id: "improved", label: "CV cải thiện", icon: "doc", badge: newCV, show: !!improvedCV },
    { id: "cover", label: "Thư xin việc", icon: "mail", show: !!coverLetter },
  ];
  const visible = tabs.filter(t => t.show);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 4, padding: 6, background: "var(--surface-2)", borderRadius: 13, margin: "0 0 18px", flex: "0 0 auto" }}>
        {visible.map((t) => {
          const active = outTab === t.id;
          return (
            <button key={t.id} onClick={() => setOutTab(t.id)} style={{
              flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              height: 38, border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 600, fontFamily: "inherit",
              background: active ? "var(--surface)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              boxShadow: active ? "var(--shadow-sm)" : "none", transition: "all .15s", position: "relative",
            }}>
              <Icon name={t.icon} size={15} />
              {t.label}
              {t.badge && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: ".05em", padding: "2px 6px", borderRadius: 6, background: "var(--primary)", color: "var(--primary-fg)" }}>MỚI</span>}
            </button>
          );
        })}
      </div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, overflow: "auto", paddingRight: 4 }}>
        {outTab === "analysis" && analysis && <AnalysisView analysis={analysis} />}
        {outTab === "improved" && <ImprovedCVView {...improvedProps} />}
        {outTab === "cover" && <CoverLetterView text={coverLetter} copied={coverCopied} onCopy={onCoverCopy} />}
      </div>
    </div>
  );
}

function AttachBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 13px", borderRadius: 12,
        border: "1px solid var(--border-strong)", background: h ? "var(--primary-soft)" : "var(--surface)",
        color: h ? "var(--primary-soft-fg)" : "var(--text-muted)", cursor: "pointer", fontFamily: "inherit",
        fontSize: 13, fontWeight: 600, flex: "0 0 auto", transition: "all .15s",
      }}>
      <Icon name={icon} size={16} /> {label}
    </button>
  );
}

// ── Main CV tab ─────────────────────────────────────────────────
export default function CVTab({ incoming, clearIncoming }: { incoming: Job | null; clearIncoming: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([INIT_MSG]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [cvContext, setCvContext] = useState("");
  const [jdContext, setJdContext] = useState("");
  const [cvFileName, setCvFileName] = useState("");
  const [jdFileName, setJdFileName] = useState("");
  const [analysis, setAnalysis] = useState<CVAnalysis | null>(null);
  const [chatError, setChatError] = useState("");
  const [improvedCV, setImprovedCV] = useState("");
  const [originalCV, setOriginalCV] = useState("");
  const [cvJson, setCvJson] = useState<CVJson | null>(null);
  const [changes, setChanges] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [outTab, setOutTab] = useState<"analysis" | "improved" | "cover">("analysis");
  const [cvView, setCvView] = useState<"improved" | "original">("improved");
  const [showDiff, setShowDiff] = useState(true);
  const [newCV, setNewCV] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coverCopied, setCoverCopied] = useState(false);
  const [docxLoading, setDocxLoading] = useState(false);
  const [savedVersions, setSavedVersions] = useState<SavedVersion[]>([]);
  const [savedToast, setSavedToast] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const cvFileRef = useRef<HTMLInputElement>(null);
  const jdFileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, chatLoading]);

  // restore
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.messages?.length) setMessages(s.messages);
        setCvContext(s.cvContext || ""); setJdContext(s.jdContext || "");
        setCvFileName(s.cvFileName || ""); setJdFileName(s.jdFileName || "");
        setOriginalCV(s.originalCV || ""); setImprovedCV(s.improvedCV || "");
        setCoverLetter(s.coverLetter || ""); setChanges(s.changes || []);
        setAnalysis(s.analysis || null); setCvJson(s.cvJson || null);
      }
      const rawV = localStorage.getItem(LS_VERSIONS);
      if (rawV) setSavedVersions(JSON.parse(rawV));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // save
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        messages, cvContext, jdContext, cvFileName, jdFileName,
        originalCV, improvedCV, coverLetter, changes, analysis, cvJson,
      }));
    } catch { /* ignore */ }
  }, [hydrated, messages, cvContext, jdContext, cvFileName, jdFileName, originalCV, improvedCV, coverLetter, changes, analysis, cvJson]);

  const persistVersions = (list: SavedVersion[]) => {
    setSavedVersions(list);
    try { localStorage.setItem(LS_VERSIONS, JSON.stringify(list)); } catch { /* ignore */ }
  };

  const addMsg = (msg: Omit<ChatMsg, "id">) =>
    setMessages(prev => [...prev, { ...msg, id: `${prev.length}-${msg.role}-${msg.content.slice(0, 8)}` }]);

  const extractLinkedInUrl = (text: string): string | null => {
    const m = text.match(/https?:\/\/[^\s]*linkedin\.com\/jobs\/view\/\d+[^\s]*/i);
    return m?.[0] || null;
  };

  const sendToAI = useCallback(async (
    userText: string, newCvFile: File | null = null, newJdFile: File | null = null, baseMessages?: ChatMsg[],
  ) => {
    setChatError("");
    setChatLoading(true);
    let cv = cvContext;
    let jd = jdContext;
    try {
      let resolvedText = userText;
      const liUrl = extractLinkedInUrl(userText);
      if (liUrl) {
        const fetchRes = await fetch("/api/fetch-jd", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: liUrl }),
        });
        const fetchData = await fetchRes.json();
        if (fetchData.jd) {
          jd = fetchData.jd; setJdContext(jd); setJdFileName(fetchData.title || liUrl);
          resolvedText = userText.replace(liUrl, `[JD: ${fetchData.title || "LinkedIn Job"}]`);
        } else {
          resolvedText += `\n\n(Lưu ý: không lấy được JD từ URL — ${fetchData.error}. Hãy dán JD thủ công.)`;
        }
      }

      const source = baseMessages || messages;
      const history = source.filter(m => m.id !== "init").map(m => ({ role: m.role, content: m.content }));
      if (resolvedText) history.push({ role: "user", content: resolvedText });

      let res: Response;
      if (newCvFile || newJdFile) {
        const fd = new FormData();
        fd.append("messages", JSON.stringify(history));
        fd.append("cvText", cv); fd.append("jdText", jd);
        if (newCvFile) fd.append("cvFile", newCvFile);
        if (newJdFile) fd.append("jdFile", newJdFile);
        res = await fetch("/api/cv-chat", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/cv-chat", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, cvText: cv, jdText: jd }),
        });
      }
      const data = await res.json();
      if (data.error) { setChatError(data.error); return; }

      if (data.cvText && data.cvText !== cv) {
        setOriginalCV(prev => prev || data.cvText);
        setCvContext(data.cvText); cv = data.cvText;
      }
      if (data.jdText && data.jdText !== jd) { setJdContext(data.jdText); jd = data.jdText; }

      if (data.analysis) setAnalysis(data.analysis);
      if (data.cvJson) setCvJson(data.cvJson);
      if (Array.isArray(data.changes) && data.changes.length) setChanges(data.changes);
      if (data.improvedCV) { setImprovedCV(data.improvedCV); setOutTab("improved"); setNewCV(true); }
      if (data.coverLetter) { setCoverLetter(data.coverLetter); setOutTab("cover"); }
      if (data.reply) addMsg({ role: "assistant", content: data.reply });
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setChatLoading(false);
    }
  }, [cvContext, jdContext, messages]);

  // incoming job → build JD + analyze
  const incomingRef = useRef<Job | null>(null);
  useEffect(() => {
    if (!incoming || incomingRef.current === incoming) return;
    incomingRef.current = incoming;
    const job = incoming;
    const parts: string[] = [];
    if (job.title) parts.push(`Vị trí: ${job.title}`);
    if (job.company) parts.push(`Công ty: ${job.company}`);
    if (job.experience_required) parts.push(`Kinh nghiệm: ${job.experience_required}`);
    if (job.key_requirements?.length) parts.push(`Yêu cầu:\n${job.key_requirements.map(r => `- ${r}`).join("\n")}`);
    if (job.benefits?.length) parts.push(`Quyền lợi:\n${job.benefits.map(b => `- ${b}`).join("\n")}`);
    const jd = parts.join("\n\n");
    setJdContext(jd);
    setJdFileName(`${job.title} — ${job.company}`);
    const newMsg: ChatMsg = { id: `job-${job.url}`, role: "user", content: "Tôi muốn apply vị trí này.", attachLabel: `📄 JD: ${job.title} — ${job.company}` };
    setMessages(prev => {
      const base = [...prev, newMsg];
      // fire analysis using this jd + base history
      setTimeout(() => {
        setJdContext(jd);
        sendToAI("Tôi vừa gửi JD cho bạn, hãy phân tích CV của tôi với JD này.", null, null, base);
      }, 0);
      return base;
    });
    clearIncoming();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming]);

  const handleCvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setCvFileName(f.name);
    const base: ChatMsg[] = [...messages, { id: `cv-${f.name}`, role: "user", content: "Đây là CV của tôi.", attachLabel: `📎 CV: ${f.name}` }];
    setMessages(base);
    sendToAI("", f, null, base);
    e.target.value = "";
  };
  const handleJdFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setJdFileName(f.name);
    const base: ChatMsg[] = [...messages, { id: `jd-${f.name}`, role: "user", content: "Đây là JD công việc tôi muốn apply.", attachLabel: `📄 JD: ${f.name}` }];
    setMessages(base);
    sendToAI("", null, f, base);
    e.target.value = "";
  };

  const handleSend = () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    const base: ChatMsg[] = [...messages, { id: `u-${messages.length}`, role: "user", content: text }];
    setMessages(base);
    sendToAI(text, null, null, base);
  };

  const downloadDocx = async () => {
    setDocxLoading(true);
    try {
      const res = await fetch("/api/cv-export", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvJson, text: improvedCV || originalCV || cvContext, fileName: cvFileName ? `CV_${cvFileName.replace(/\.[^.]+$/, "")}` : "CV_cai_thien" }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); setChatError(e.error || "Không xuất được .docx"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "CV_cai_thien.docx"; a.click(); URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Lỗi tải .docx");
    } finally { setDocxLoading(false); }
  };

  const downloadTxt = () => {
    const text = cvView === "improved" ? improvedCV : (originalCV || cvContext);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = cvView === "improved" ? "CV_improved.txt" : "CV_original.txt"; a.click(); URL.revokeObjectURL(url);
  };

  const copyImproved = () => {
    navigator.clipboard?.writeText(cvView === "improved" ? improvedCV : (originalCV || cvContext)).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  const copyCover = () => {
    navigator.clipboard?.writeText(coverLetter).catch(() => {});
    setCoverCopied(true); setTimeout(() => setCoverCopied(false), 2000);
  };

  const saveCurrentVersion = () => {
    if (!improvedCV && !analysis) { setSavedToast("Chưa có gì để lưu"); setTimeout(() => setSavedToast(""), 2000); return; }
    const v: SavedVersion = {
      id: `${savedVersions.length}-${jdFileName || cvFileName}`,
      name: (jdFileName || cvFileName || "CV").slice(0, 60),
      score: analysis?.match_score ?? 0,
      savedAt: new Date().toLocaleString("vi-VN"),
      cvContext, jdContext, cvFileName, jdFileName, originalCV, improvedCV, coverLetter, analysis, cvJson, changes, messages,
    };
    persistVersions([v, ...savedVersions].slice(0, 20));
    setSavedToast("✓ Đã lưu"); setTimeout(() => setSavedToast(""), 2000);
  };
  const loadVersion = (v: SavedVersion) => {
    setCvContext(v.cvContext); setJdContext(v.jdContext);
    setCvFileName(v.cvFileName); setJdFileName(v.jdFileName);
    setOriginalCV(v.originalCV); setImprovedCV(v.improvedCV);
    setCoverLetter(v.coverLetter); setAnalysis(v.analysis);
    setCvJson(v.cvJson); setChanges(v.changes);
    setMessages(v.messages?.length ? v.messages : [INIT_MSG]);
    setOutTab("analysis");
  };
  const deleteVersion = (id: string) => persistVersions(savedVersions.filter(v => v.id !== id));

  const diffLines = (original: string, improved: string) => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const origSet = new Set(original.split("\n").map(norm).filter(Boolean));
    return improved.split("\n").map(line => ({ text: line, added: line.trim() !== "" && !origSet.has(norm(line)) }));
  };

  const reset = () => {
    setMessages([INIT_MSG]); setChatInput(""); setCvContext(""); setJdContext("");
    setCvFileName(""); setJdFileName(""); setAnalysis(null); setImprovedCV("");
    setOriginalCV(""); setCvJson(null); setChanges([]); setCoverLetter("");
    setNewCV(false); setOutTab("analysis"); setChatError("");
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ marginBottom: 16, flex: "0 0 auto", display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: "-.02em" }}>Phân tích CV</h1>
          <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 15 }}>
            Trò chuyện với Scout AI để chấm độ phù hợp và viết lại CV theo từng JD.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {savedToast && <span style={{ fontSize: 13, color: "var(--success)", fontWeight: 600 }}>{savedToast}</span>}
          <Button variant="ghost" size="sm" icon="save" onClick={saveCurrentVersion}>Lưu phiên bản</Button>
        </div>
      </div>

      {/* saved versions strip */}
      {savedVersions.length > 0 && (
        <div className="scroll" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, marginBottom: 6, flex: "0 0 auto" }}>
          {savedVersions.map(v => (
            <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "5px 6px 5px 10px", flex: "0 0 auto" }}>
              <button onClick={() => loadVersion(v)} title={`Mở lại — ${v.savedAt}`} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, maxWidth: 200 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                  <span style={{ color: scoreColor(v.score).c, fontWeight: 700 }}>{v.score}%</span> · {v.savedAt}
                </div>
              </button>
              <button onClick={() => deleteVersion(v.id)} title="Xóa" style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "grid", placeItems: "center", padding: 2 }}>
                <Icon name="x" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr)", gap: 20 }} className="cvgrid">
        {/* CHAT PANEL */}
        <section style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          {(cvFileName || jdFileName) && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", flex: "0 0 auto" }}>
              {cvFileName && <ContextBadge tone="success" icon="paperclip" label="CV" value={cvFileName} />}
              {jdFileName && <ContextBadge tone="info" icon="doc" label="JD" value={jdFileName} />}
              <button onClick={reset} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="trash" size={13} /> Xóa & bắt đầu lại
              </button>
            </div>
          )}

          <div ref={scrollRef} className="scroll" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m) => <ChatBubble key={m.id} m={m} />)}
            {chatLoading && <Typing />}
            {chatError && (
              <div style={{ background: "var(--danger-soft)", color: "var(--danger-fg)", border: "1px solid var(--danger)", borderRadius: 11, padding: "10px 14px", fontSize: 13 }}>
                {chatError}
              </div>
            )}
          </div>

          <div className="scroll" style={{ display: "flex", gap: 8, padding: "0 18px 10px", overflowX: "auto", flex: "0 0 auto" }}>
            {QUICK_CHIPS.map((c, i) => (
              <button key={i} onClick={() => setChatInput(c)} style={{
                whiteSpace: "nowrap", padding: "7px 13px", borderRadius: 999, cursor: "pointer",
                border: "1px solid var(--border-strong)", background: "var(--surface)", color: "var(--text-muted)",
                fontSize: 12.5, fontWeight: 600, fontFamily: "inherit", flex: "0 0 auto", transition: "all .15s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-muted)"; }}>
                {c}
              </button>
            ))}
          </div>

          <div style={{ padding: "12px 18px 18px", borderTop: "1px solid var(--border)", flex: "0 0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 9, background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 8 }}>
              <input ref={cvFileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={handleCvFile} />
              <input ref={jdFileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={handleJdFile} />
              <AttachBtn icon="paperclip" label="CV" onClick={() => cvFileRef.current?.click()} />
              <AttachBtn icon="doc" label="JD" onClick={() => jdFileRef.current?.click()} />
              <textarea
                value={chatInput} onChange={(e) => setChatInput(e.target.value)} rows={1}
                placeholder="Nhập tin nhắn, dán JD, hoặc dán link LinkedIn…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                style={{ flex: 1, minWidth: 0, resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14.5, color: "var(--text)", lineHeight: 1.5, padding: "8px 4px", maxHeight: 120 }}
              />
              <button onClick={handleSend} disabled={!chatInput.trim() || chatLoading} style={{
                width: 40, height: 40, borderRadius: 12, border: "none", flex: "0 0 auto",
                cursor: chatInput.trim() && !chatLoading ? "pointer" : "default",
                background: chatInput.trim() && !chatLoading ? "var(--primary)" : "var(--surface-3)",
                color: chatInput.trim() && !chatLoading ? "var(--primary-fg)" : "var(--text-faint)",
                display: "grid", placeItems: "center", transition: "all .15s",
              }}>
                <Icon name="send" size={18} fill />
              </button>
            </div>
          </div>
        </section>

        {/* OUTPUT PANEL */}
        <section style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 22, boxShadow: "var(--shadow-sm)" }}>
          <OutputPanel
            analysis={analysis} improvedCV={improvedCV} coverLetter={coverLetter}
            outTab={outTab} setOutTab={setOutTab} newCV={newCV}
            coverCopied={coverCopied} onCoverCopy={copyCover}
            improvedProps={{
              improvedCV, originalCV, cvContext, changes, cvView, setCvView, showDiff, setShowDiff,
              copied, onCopy: copyImproved, docxLoading, onDocx: downloadDocx, onTxt: downloadTxt, diffLines,
            }}
          />
        </section>
      </div>
    </div>
  );
}
