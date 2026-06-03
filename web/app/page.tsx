"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Job = {
  title: string; company: string; location: string; url: string; posted: string;
  seniority?: string; salary?: string; working_hours?: string;
  experience_required?: string; key_requirements?: string[];
  benefits?: string[]; work_location_detail?: string;
};

type RunStatus = "idle" | "queued" | "in_progress" | "completed";

type CVAnalysis = {
  match_score: number; summary: string;
  strengths: string[]; gaps: string[];
  cv_suggestions: string[]; keywords_to_add: string[];
};

type ChatMsg = {
  id: string; role: "user" | "assistant"; content: string;
  attachLabel?: string; // e.g. "📎 CV: resume.pdf"
};

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  wrap:   { maxWidth: 980, margin: "0 auto", padding: "24px 16px" },
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
  chip:   (c: string) => ({ display:"inline-block", padding:"3px 10px", borderRadius:12, fontSize:12, fontWeight:600, background: c==="in_progress"?"#fff8e1":c==="completed"?"#e8f5e9":c==="queued"?"#e3f2fd":"#f5f5f5", color: c==="in_progress"?"#f57c00":c==="completed"?"#2e7d32":c==="queued"?"#1565c0":"#666" }),
};

const tabBtn = (active: boolean): React.CSSProperties => ({
  flex:1, padding:"12px 0", fontSize:14, fontWeight:600, cursor:"pointer",
  border:"none", borderBottom: active?"3px solid #0a66c2":"3px solid transparent",
  background: active?"#f0f6ff":"#fff", color: active?"#0a66c2":"#666",
  transition:"all 0.15s",
});

const scoreColor = (s: number) => s >= 70 ? "#2e7d32" : s >= 40 ? "#e65100" : "#c62828";

const INIT_MSG: ChatMsg = {
  id: "init", role: "assistant",
  content: `Xin chào! Tôi là **HR Consultant AI** 👋

Tôi có thể giúp bạn:
• 📊 Phân tích CV so với JD và cho điểm phù hợp
• ✍️ Gợi ý sửa từng phần CV cụ thể
• 🔑 Bổ sung keywords để qua vòng lọc ATS
• 💬 Trả lời mọi câu hỏi về cách cải thiện hồ sơ

**Để bắt đầu, hãy cung cấp:**
1. CV của bạn (nhấn 📎 **Đính kèm CV** hoặc dán text trực tiếp)
2. JD công việc (nhấn 📄 **Đính kèm JD**, dán text, hoặc gửi link LinkedIn)`,
};

const QUICK_ACTIONS = [
  "Viết lại phần Kỹ năng cho phù hợp hơn",
  "Thêm keywords còn thiếu vào CV giúp tôi",
  "Rút gọn CV xuống còn 1 trang",
  "Viết lại mục tiêu nghề nghiệp",
  "Tôi cần cải thiện thêm gì để tăng match score?",
];

// ── Simple markdown renderer (bold + bullet) ──────────────────────────────────

function renderMd(text: string) {
  return text
    .split("\n")
    .map((line, i) => {
      const parts = line.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
      if (line.startsWith("•") || line.startsWith("-")) {
        return <div key={i} style={{ paddingLeft: 12, marginBottom: 2 }} dangerouslySetInnerHTML={{ __html: parts }} />;
      }
      return <div key={i} style={{ marginBottom: line === "" ? 8 : 2 }} dangerouslySetInnerHTML={{ __html: parts }} />;
    });
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const [activeTab, setActiveTab] = useState<"crawler" | "cv">("crawler");

  // ── Crawler ──────────────────────────────────────────────
  const [keywords,   setKeywords]   = useState("marketing,truyen thong,su kien");
  const [location,   setLocation]   = useState("Hanoi");
  const [datePoster, setDatePosted] = useState("24h");
  const [maxPages,   setMaxPages]   = useState("4");
  const [experience, setExperience] = useState("");
  const [workType,   setWorkType]   = useState("");
  const [loading,    setLoading]    = useState(false);
  const [runStatus,  setRunStatus]  = useState<RunStatus>("idle");
  const [runUrl,     setRunUrl]     = useState("");
  const [jobs,       setJobs]       = useState<Job[]>([]);
  const [lastFetch,  setLastFetch]  = useState("");
  const [polling,    setPolling]    = useState(false);

  // ── CV Chatbot ────────────────────────────────────────────
  const [messages,    setMessages]    = useState<ChatMsg[]>([INIT_MSG]);
  const [chatInput,   setChatInput]   = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [cvContext,   setCvContext]   = useState(""); // persisted CV text
  const [jdContext,   setJdContext]   = useState(""); // persisted JD text
  const [cvFileName,  setCvFileName]  = useState("");
  const [jdFileName,  setJdFileName]  = useState("");
  const [analysis,    setAnalysis]    = useState<CVAnalysis | null>(null);
  const [chatError,   setChatError]   = useState("");

  const cvFileRef    = useRef<HTMLInputElement>(null);
  const jdFileRef    = useRef<HTMLInputElement>(null);
  const pendCvFile   = useRef<File | null>(null);
  const pendJdFile   = useRef<File | null>(null);
  const chatEndRef   = useRef<HTMLDivElement>(null);

  // ── Crawler callbacks ─────────────────────────────────────

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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, location, date_posted: datePoster, max_pages: maxPages, experience, work_type: workType }),
      });
      if (res.ok) { setRunStatus("queued"); setPolling(true); }
      else        { alert("Lỗi: " + JSON.stringify(await res.json())); }
    } finally { setLoading(false); }
  };

  // ── Chat helpers ──────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  const addMsg = (msg: Omit<ChatMsg, "id">) =>
    setMessages(prev => [...prev, { ...msg, id: Date.now().toString() }]);

  // ── File attach handlers ──────────────────────────────────

  const handleCvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    pendCvFile.current = f;
    setCvFileName(f.name);
    // Optimistically show in chat — actual text extracted server-side
    addMsg({ role: "user", content: `Đây là CV của tôi.`, attachLabel: `📎 CV: ${f.name}` });
    sendToAI("", f, null);
    e.target.value = "";
  };

  const handleJdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    pendJdFile.current = f;
    setJdFileName(f.name);
    addMsg({ role: "user", content: `Đây là JD công việc tôi muốn apply.`, attachLabel: `📄 JD: ${f.name}` });
    sendToAI("", null, f);
    e.target.value = "";
  };

  // ── Detect LinkedIn URL in text ───────────────────────────

  const extractLinkedInUrl = (text: string): string | null => {
    const m = text.match(/https?:\/\/[^\s]*linkedin\.com\/jobs\/view\/\d+[^\s]*/i);
    return m?.[0] || null;
  };

  // ── Main send to AI ───────────────────────────────────────

  const sendToAI = async (
    userText: string,
    newCvFile: File | null = null,
    newJdFile: File | null = null,
  ) => {
    setChatError("");
    setChatLoading(true);

    // Snapshot current context
    let cv = cvContext;
    let jd = jdContext;

    try {
      // ── If URL in text → fetch JD first ───────────────────
      let resolvedText = userText;
      const liUrl = extractLinkedInUrl(userText);
      if (liUrl) {
        const fetchRes  = await fetch("/api/fetch-jd", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: liUrl }),
        });
        const fetchData = await fetchRes.json();
        if (fetchData.jd) {
          jd = fetchData.jd;
          setJdContext(jd);
          setJdFileName(fetchData.title || liUrl);
          resolvedText = userText.replace(liUrl, `[JD: ${fetchData.title || "LinkedIn Job"}]`);
        } else {
          resolvedText += `\n\n(Lưu ý: không thể tự động lấy JD từ URL — ${fetchData.error}. Hãy dán JD thủ công.)`;
        }
      }

      // ── Build conversation history (excluding system/init msg) ─────────────
      const history = messages
        .filter(m => m.id !== "init")
        .map(m => ({ role: m.role, content: m.content }));

      if (resolvedText) history.push({ role: "user", content: resolvedText });

      // ── Send via FormData if new files, else JSON ──────────
      let res: Response;
      if (newCvFile || newJdFile) {
        const fd = new FormData();
        fd.append("messages", JSON.stringify(history));
        fd.append("cvText",   cv);
        fd.append("jdText",   jd);
        if (newCvFile) fd.append("cvFile", newCvFile);
        if (newJdFile) fd.append("jdFile", newJdFile);
        res = await fetch("/api/cv-chat", { method: "POST", body: fd });
      } else {
        res = await fetch("/api/cv-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, cvText: cv, jdText: jd }),
        });
      }

      const data = await res.json();

      if (data.error) {
        setChatError(data.error);
        return;
      }

      // ── Update persisted contexts if server extracted new ones ─────────────
      if (data.cvText && data.cvText !== cv) { setCvContext(data.cvText); cv = data.cvText; }
      if (data.jdText && data.jdText !== jd) { setJdContext(data.jdText); jd = data.jdText; }

      // ── Update analysis panel ──────────────────────────────
      if (data.analysis) setAnalysis(data.analysis);

      // ── Add AI reply to chat ───────────────────────────────
      if (data.reply) addMsg({ role: "assistant", content: data.reply });

    } catch (e: unknown) {
      setChatError(e instanceof Error ? e.message : "Lỗi kết nối");
    } finally {
      setChatLoading(false);
    }
  };

  const handleSend = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    addMsg({ role: "user", content: text });
    await sendToAI(text);
  };

  const handleQuickAction = (action: string) => {
    setChatInput(action);
  };

  // Shortcut from job card
  const analyzeJobInChat = (jobOrIdx: Job | number) => {
    const job = typeof jobOrIdx === "number" ? jobs[jobOrIdx] : jobOrIdx;
    const parts: string[] = [];
    if (job.title)   parts.push(`Vị trí: ${job.title}`);
    if (job.company) parts.push(`Công ty: ${job.company}`);
    if (job.experience_required) parts.push(`Kinh nghiệm: ${job.experience_required}`);
    if (job.key_requirements?.length) parts.push(`Yêu cầu:\n${job.key_requirements.map(r=>`- ${r}`).join("\n")}`);
    if (job.benefits?.length)         parts.push(`Quyền lợi:\n${job.benefits.map(b=>`- ${b}`).join("\n")}`);
    const jd = parts.join("\n\n");
    setJdContext(jd);
    setJdFileName(`${job.title} - ${job.company}`);
    setActiveTab("cv");
    addMsg({ role: "user", content: `Tôi muốn apply vị trí này.`, attachLabel: `📄 JD: ${job.title} — ${job.company}` });
    sendToAI("Tôi vừa gửi JD cho bạn, hãy phân tích CV của tôi với JD này.", null, null);
  };

  const statusLabel: Record<string, string> = {
    idle:"Chưa chạy", queued:"Đang chờ...", in_progress:"Đang crawl...", completed:"Hoàn tất ✓",
  };

  // ── Render ────────────────────────────────────────────────

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>🔍 LinkedIn Job Crawler</h1>
        <p style={S.sub}>Tìm việc tự động · Phân tích CV với AI · Email mỗi sáng 7h</p>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"#fff", border:"1px solid #e0e0e0", borderRadius:10, overflow:"hidden", marginBottom:20 }}>
        <button style={tabBtn(activeTab==="crawler")} onClick={() => setActiveTab("crawler")}>🔍 Tìm việc</button>
        <button style={tabBtn(activeTab==="cv")}      onClick={() => setActiveTab("cv")}>📄 Phân tích CV</button>
      </div>

      {/* ════ TAB 1: CRAWLER ════ */}
      {activeTab === "crawler" && (
        <>
          <div style={S.card}>
            <div style={{ marginBottom:14 }}>
              <label style={S.label}>Keywords <span style={{color:"#888",fontWeight:400}}>(phân cách bởi dấu phẩy)</span></label>
              <input style={S.input} value={keywords} onChange={e=>setKeywords(e.target.value)} placeholder="marketing,truyen thong,su kien"/>
            </div>
            <div style={{...S.grid2, marginBottom:14}}>
              <div>
                <label style={S.label}>Vị trí địa lý</label>
                <input style={S.input} value={location} onChange={e=>setLocation(e.target.value)} placeholder="Hanoi"/>
              </div>
              <div>
                <label style={S.label}>Đăng trong</label>
                <select style={S.select} value={datePoster} onChange={e=>setDatePosted(e.target.value)}>
                  <option value="24h">24 giờ qua</option>
                  <option value="week">1 tuần qua</option>
                  <option value="month">1 tháng qua</option>
                  <option value="any">Bất kỳ</option>
                </select>
              </div>
            </div>
            <div style={{...S.grid3, marginBottom:16}}>
              <div>
                <label style={S.label}>Số trang / keyword</label>
                <select style={S.select} value={maxPages} onChange={e=>setMaxPages(e.target.value)}>
                  {[1,2,3,4,5,6,8,10].map(n=><option key={n} value={n}>{n} trang (~{n*25} jobs)</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Kinh nghiệm</label>
                <select style={S.select} value={experience} onChange={e=>setExperience(e.target.value)}>
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
                <select style={S.select} value={workType} onChange={e=>setWorkType(e.target.value)}>
                  <option value="">Tất cả</option>
                  <option value="onsite">Onsite</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              <button style={loading||polling?S.btnDis:S.btn} onClick={handleRun} disabled={loading||polling}>
                {loading?"Đang kích hoạt...":polling?"Đang chạy...":"▶ Chạy Crawler"}
              </button>
              {runStatus!=="idle" && (
                <span>
                  <span style={S.chip(runStatus)}>{statusLabel[runStatus]}</span>
                  {runUrl && <a href={runUrl} target="_blank" rel="noreferrer" style={{fontSize:12,marginLeft:8,color:"#0a66c2"}}>Xem log →</a>}
                </span>
              )}
            </div>
            {polling && <p style={{fontSize:12,color:"#888",margin:"8px 0 0"}}>⏳ Đang chạy trên GitHub Actions (~2-3 phút). Kết quả tự cập nhật khi xong.</p>}
          </div>

          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h2 style={{margin:0,fontSize:16,color:"#333"}}>
              📋 Kết quả {jobs.length>0 && <span style={{color:"#0a66c2"}}>({jobs.length} jobs)</span>}
            </h2>
            <div style={{display:"flex",gap:10,alignItems:"center"}}>
              {lastFetch && <span style={{fontSize:12,color:"#888"}}>Cập nhật: {lastFetch}</span>}
              <button onClick={fetchJobs} style={{...S.btn,padding:"6px 14px",fontSize:13}}>↻ Làm mới</button>
            </div>
          </div>

          {jobs.length===0 && (
            <div style={{...S.card,textAlign:"center" as const,color:"#888",padding:40}}>
              Chưa có kết quả. Nhấn &quot;Chạy Crawler&quot; để bắt đầu.
            </div>
          )}

          {jobs.map((job,i)=>(
            <div key={i} style={S.card}>
              <a href={job.url} target="_blank" rel="noreferrer" style={{color:"#0a66c2",textDecoration:"none",fontSize:17,fontWeight:700}}>{job.title}</a>
              <p style={{margin:"6px 0 10px",color:"#555",fontSize:14}}>
                🏢 {job.company} &nbsp;|&nbsp; 📍 {job.work_location_detail||job.location} &nbsp;|&nbsp; 📅 {job.posted}
              </p>
              <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:10}}>
                {job.salary             && <span style={S.tag}>💰 {job.salary}</span>}
                {job.working_hours      && <span style={S.tag}>🕐 {job.working_hours}</span>}
                {job.experience_required && <span style={S.tag}>🎓 {job.experience_required}</span>}
                {job.seniority          && <span style={S.tag}>{job.seniority}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:13}}>
                {job.key_requirements?.length ? (
                  <div><strong>Yêu cầu chính:</strong>
                    <ul style={{margin:"4px 0",paddingLeft:18,color:"#444"}}>{job.key_requirements.map((r,j)=><li key={j}>{r}</li>)}</ul>
                  </div>
                ):null}
                {job.benefits?.length ? (
                  <div><strong>Quyền lợi:</strong>
                    <ul style={{margin:"4px 0",paddingLeft:18,color:"#444"}}>{job.benefits.map((b,j)=><li key={j}>{b}</li>)}</ul>
                  </div>
                ):null}
              </div>
              <div style={{marginTop:12,display:"flex",gap:10}}>
                <a href={job.url} target="_blank" rel="noreferrer" style={{...S.btn,fontSize:13,padding:"6px 16px",textDecoration:"none"}}>Xem chi tiết →</a>
                <button onClick={()=>analyzeJobInChat(i)} style={{background:"#fff",color:"#0a66c2",border:"1px solid #0a66c2",borderRadius:6,padding:"6px 16px",fontSize:13,cursor:"pointer",fontWeight:600}}>
                  📄 Phân tích CV
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ════ TAB 2: CV CHATBOT ════ */}
      {activeTab==="cv" && (
        <div style={{display:"flex",gap:16,alignItems:"flex-start",flexWrap:"wrap" as const}}>

          {/* ── Left: Chat panel ─────────────────────────────── */}
          <div style={{flex:"1 1 420px",minWidth:320,display:"flex",flexDirection:"column" as const,gap:0}}>

            {/* Context badges */}
            {(cvFileName||jdFileName) && (
              <div style={{display:"flex",gap:8,flexWrap:"wrap" as const,marginBottom:10}}>
                {cvFileName && (
                  <span style={{background:"#e8f5e9",color:"#2e7d32",border:"1px solid #a5d6a7",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:600}}>
                    📎 CV: {cvFileName}
                  </span>
                )}
                {jdFileName && (
                  <span style={{background:"#e3f2fd",color:"#1565c0",border:"1px solid #90caf9",borderRadius:20,padding:"3px 12px",fontSize:12,fontWeight:600}}>
                    📄 JD: {jdFileName}
                  </span>
                )}
                <button
                  onClick={()=>{ setCvContext(""); setJdContext(""); setCvFileName(""); setJdFileName(""); setMessages([INIT_MSG]); setAnalysis(null); }}
                  style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer",padding:"3px 8px",textDecoration:"underline"}}
                >
                  Xóa & bắt đầu lại
                </button>
              </div>
            )}

            {/* Messages */}
            <div style={{
              height:480, overflowY:"auto" as const,
              background:"#f9f9f9", borderRadius:"10px 10px 0 0",
              border:"1px solid #e0e0e0", borderBottom:"none",
              padding:"16px 14px", display:"flex", flexDirection:"column" as const, gap:12,
            }}>
              {messages.map(msg => (
                <div key={msg.id} style={{
                  display:"flex", justifyContent: msg.role==="user"?"flex-end":"flex-start",
                }}>
                  <div style={{
                    maxWidth:"82%",
                    background: msg.role==="user"?"#0a66c2":"#fff",
                    color:      msg.role==="user"?"#fff":"#222",
                    border:     msg.role==="user"?"none":"1px solid #e0e0e0",
                    borderRadius: msg.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",
                    padding:"10px 14px", fontSize:13.5, lineHeight:1.55,
                    boxShadow:"0 1px 3px rgba(0,0,0,.07)",
                  }}>
                    {msg.attachLabel && (
                      <div style={{
                        fontSize:11.5, fontWeight:600, marginBottom:6, opacity:.8,
                        background: msg.role==="user"?"rgba(255,255,255,.15)":"#f0f4ff",
                        padding:"2px 8px", borderRadius:4, display:"inline-block",
                      }}>
                        {msg.attachLabel}
                      </div>
                    )}
                    <div>{renderMd(msg.content)}</div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {chatLoading && (
                <div style={{display:"flex",justifyContent:"flex-start"}}>
                  <div style={{background:"#fff",border:"1px solid #e0e0e0",borderRadius:"18px 18px 18px 4px",padding:"10px 16px",fontSize:20,color:"#aaa",boxShadow:"0 1px 3px rgba(0,0,0,.07)"}}>
                    <span style={{animation:"blink 1s infinite"}}>●</span>{" "}
                    <span style={{animation:"blink 1s infinite .2s"}}>●</span>{" "}
                    <span style={{animation:"blink 1s infinite .4s"}}>●</span>
                  </div>
                </div>
              )}

              {chatError && (
                <div style={{background:"#ffebee",color:"#c62828",border:"1px solid #ef9a9a",borderRadius:8,padding:"8px 12px",fontSize:13}}>
                  ❌ {chatError}
                </div>
              )}

              <div ref={chatEndRef}/>
            </div>

            {/* Quick actions */}
            <div style={{
              background:"#f0f4ff", border:"1px solid #c5d8f6", borderTop:"none",
              padding:"8px 12px", display:"flex", gap:6, flexWrap:"wrap" as const,
            }}>
              {QUICK_ACTIONS.map((a,i)=>(
                <button key={i} onClick={()=>handleQuickAction(a)} style={{
                  background:"#fff", color:"#0a66c2", border:"1px solid #c5d8f6",
                  borderRadius:16, padding:"3px 10px", fontSize:11.5, cursor:"pointer",
                  fontWeight:500,
                }}>
                  {a}
                </button>
              ))}
            </div>

            {/* Input area */}
            <div style={{
              background:"#fff", border:"1px solid #e0e0e0", borderTop:"none",
              borderRadius:"0 0 10px 10px", padding:"10px 12px",
              display:"flex", alignItems:"flex-end", gap:8,
            }}>
              {/* Attach CV */}
              <input ref={cvFileRef} type="file" accept=".pdf,.docx,.txt" style={{display:"none"}} onChange={handleCvFile}/>
              <button
                onClick={()=>cvFileRef.current?.click()}
                title="Đính kèm CV"
                style={{background:"#e8f5e9",color:"#2e7d32",border:"1px solid #a5d6a7",borderRadius:8,padding:"7px 10px",fontSize:13,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap" as const,flexShrink:0}}
              >
                📎 CV
              </button>

              {/* Attach JD */}
              <input ref={jdFileRef} type="file" accept=".pdf,.docx,.txt" style={{display:"none"}} onChange={handleJdFile}/>
              <button
                onClick={()=>jdFileRef.current?.click()}
                title="Đính kèm JD"
                style={{background:"#e3f2fd",color:"#1565c0",border:"1px solid #90caf9",borderRadius:8,padding:"7px 10px",fontSize:13,cursor:"pointer",fontWeight:700,whiteSpace:"nowrap" as const,flexShrink:0}}
              >
                📄 JD
              </button>

              {/* Text input */}
              <textarea
                value={chatInput}
                onChange={e=>setChatInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}}
                placeholder="Nhắn tin, dán JD, hoặc gửi link LinkedIn... (Enter để gửi)"
                rows={1}
                style={{
                  flex:1, resize:"none" as const, border:"1px solid #ddd", borderRadius:8,
                  padding:"8px 10px", fontSize:13.5, fontFamily:"inherit",
                  outline:"none", overflowY:"auto" as const, maxHeight:100,
                  lineHeight:1.5,
                }}
              />

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={chatLoading||!chatInput.trim()}
                style={{
                  background:chatLoading||!chatInput.trim()?"#ccc":"#0a66c2",
                  color:"#fff", border:"none", borderRadius:8,
                  padding:"8px 14px", fontSize:20, cursor:chatLoading||!chatInput.trim()?"not-allowed":"pointer",
                  flexShrink:0, lineHeight:1,
                }}
              >
                ➤
              </button>
            </div>

          </div>{/* end chat panel */}

          {/* ── Right: Analysis panel ────────────────────────── */}
          <div style={{flex:"1 1 280px",minWidth:260}}>
            {!analysis ? (
              <div style={{
                ...S.card, textAlign:"center" as const,
                color:"#aaa", padding:"48px 24px",
                border:"2px dashed #e0e0e0",
              }}>
                <div style={{fontSize:36,marginBottom:12}}>📊</div>
                <div style={{fontSize:14}}>Kết quả phân tích sẽ hiển thị ở đây sau khi bạn cung cấp CV + JD</div>
              </div>
            ) : (
              <div style={{...S.card,padding:20}}>
                {/* Score */}
                <div style={{marginBottom:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:14,fontWeight:700,color:"#333"}}>📊 Mức độ phù hợp</span>
                    <span style={{
                      fontSize:24,fontWeight:800,
                      color:scoreColor(analysis.match_score),
                      background: analysis.match_score>=70?"#e8f5e9":analysis.match_score>=40?"#fff3e0":"#ffebee",
                      padding:"3px 14px",borderRadius:20,
                    }}>
                      {analysis.match_score}%
                    </span>
                  </div>
                  <div style={{background:"#e0e0e0",borderRadius:8,height:9,overflow:"hidden"}}>
                    <div style={{
                      height:9,borderRadius:8,
                      background:scoreColor(analysis.match_score),
                      width:`${analysis.match_score}%`,
                      transition:"width .6s ease",
                    }}/>
                  </div>
                </div>

                {/* Summary */}
                {analysis.summary && (
                  <div style={{background:"#f5f5f5",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#333",lineHeight:1.6,marginBottom:16}}>
                    💬 {analysis.summary}
                  </div>
                )}

                {/* Strengths */}
                {analysis.strengths?.length>0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#2e7d32",marginBottom:6}}>✅ Điểm mạnh</div>
                    <ul style={{margin:0,paddingLeft:16,fontSize:12.5,color:"#333",lineHeight:1.8}}>
                      {analysis.strengths.map((s,i)=><li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}

                {/* Gaps */}
                {analysis.gaps?.length>0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#e65100",marginBottom:6}}>⚠️ Cần cải thiện</div>
                    <ul style={{margin:0,paddingLeft:16,fontSize:12.5,color:"#333",lineHeight:1.8}}>
                      {analysis.gaps.map((g,i)=><li key={i}>{g}</li>)}
                    </ul>
                  </div>
                )}

                {/* Suggestions */}
                {analysis.cv_suggestions?.length>0 && (
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#0a66c2",marginBottom:6}}>💡 Gợi ý sửa CV</div>
                    <ol style={{margin:0,paddingLeft:17,fontSize:12.5,color:"#333",lineHeight:1.9}}>
                      {analysis.cv_suggestions.map((s,i)=><li key={i}>{s}</li>)}
                    </ol>
                  </div>
                )}

                {/* Keywords */}
                {analysis.keywords_to_add?.length>0 && (
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#6a1b9a",marginBottom:6}}>🔑 Keywords nên thêm</div>
                    <div style={{display:"flex",flexWrap:"wrap" as const,gap:5}}>
                      {analysis.keywords_to_add.map((kw,i)=>(
                        <span key={i} style={{background:"#f3e5f5",color:"#6a1b9a",border:"1px solid #ce93d8",borderRadius:4,padding:"3px 9px",fontSize:11.5,fontWeight:600}}>
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Blink animation for typing indicator */}
      <style>{`@keyframes blink{0%,100%{opacity:.2}50%{opacity:1}}`}</style>
    </div>
  );
}
