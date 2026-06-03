/* Scout — Tab 2 · Phân tích CV (chat panel + analysis output) */
const { useState: useS, useRef: useR, useEffect: useE } = React;

const QUICK_CHIPS = [
  "Viết lại phần Kỹ năng cho phù hợp hơn",
  "Thêm keywords còn thiếu vào CV giúp tôi",
  "Rút gọn CV xuống còn 1 trang",
  "Viết lại mục tiêu nghề nghiệp",
  "Tôi cần cải thiện thêm gì để tăng match score?",
];

const GREETING = "Chào bạn! Mình là **Scout AI** — trợ lý phân tích CV của bạn.\n\nĐể bắt đầu, hãy cung cấp cho mình hai thứ:\n• **CV của bạn** — bấm 📎 CV để tải file (PDF / DOCX / TXT)\n• **Mô tả công việc (JD)** — bấm 📄 JD, dán text, hoặc dán link LinkedIn\n\nMình sẽ chấm độ phù hợp và viết lại CV giúp bạn nổi bật hơn.";

function ChatBubble({ m }) {
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
          <Markdown text={m.text} />
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

function ContextBadge({ tone, icon, label, value }) {
  const tones = { success: ["var(--success-soft)", "var(--success-fg)"], info: ["var(--info-soft)", "var(--info-fg)"] }[tone];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 9, background: tones[0], color: tones[1], fontSize: 13, fontWeight: 600, maxWidth: "100%" }}>
      <Icon name={icon} size={14} />
      <span style={{ opacity: .7 }}>{label}:</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

/* ── Output panel ──────────────────────────────────────────────── */
function OutputSection({ icon, tone, title, children }) {
  const fg = `var(--${tone}-fg)`;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ display: "grid", placeItems: "center", width: 26, height: 26, borderRadius: 8, background: `var(--${tone}-soft)`, color: fg }}>
          <Icon name={icon} size={15} stroke={2} />
        </span>
        <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{title}</h4>
      </div>
      {children}
    </div>
  );
}

function AnalysisView({ analysis }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 30, animation: "scout-fade .4s ease" }}>
      {/* score */}
      <div style={{ display: "flex", gap: 26, alignItems: "center", flexWrap: "wrap", justifyContent: "center", padding: "8px 0 4px" }}>
        <ScoreRing score={analysis.score} />
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}>
          <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--text-faint)" }}>Tóm tắt</h4>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.6, color: "var(--text-muted)" }}>{analysis.summary}</p>
        </div>
      </div>

      <OutputSection icon="check" tone="success" title="Điểm mạnh">
        <ul style={olist}>{analysis.strengths.map((s, i) => (
          <li key={i} style={oitem}><Icon name="check" size={15} stroke={2.6} style={{ color: "var(--success)", marginTop: 3, flex: "0 0 auto" }} />{s}</li>
        ))}</ul>
      </OutputSection>

      <OutputSection icon="warn" tone="warning" title="Cần cải thiện">
        <ul style={olist}>{analysis.improvements.map((s, i) => (
          <li key={i} style={oitem}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warning)", marginTop: 7, flex: "0 0 auto" }} />{s}</li>
        ))}</ul>
      </OutputSection>

      <OutputSection icon="sparkles" tone="info" title="Gợi ý sửa CV">
        <ol style={{ ...olist, counterReset: "s" }}>{analysis.suggestions.map((s, i) => (
          <li key={i} style={oitem}>
            <span style={{ width: 22, height: 22, borderRadius: 7, background: "var(--info-soft)", color: "var(--info-fg)", fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center", flex: "0 0 auto", marginTop: 1 }}>{i + 1}</span>
            {s}
          </li>
        ))}</ol>
      </OutputSection>

      <OutputSection icon="bolt" tone="accent" title="Keywords nên thêm">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {analysis.keywords.map((k, i) => <Tag key={i} tone="accent" icon="bolt">{k}</Tag>)}
        </div>
      </OutputSection>
    </div>
  );
}
const olist = { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 11 };
const oitem = { display: "flex", gap: 10, fontSize: 14.5, lineHeight: 1.55, color: "var(--text-muted)" };

function ImprovedCVView({ cv }) {
  const [copied, setCopied] = useS(false);
  function copy() {
    navigator.clipboard?.writeText(cv).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", animation: "scout-fade .4s ease" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>CV đã được viết lại</h4>
        <Button variant={copied ? "soft" : "primary"} size="sm" icon={copied ? "check" : "copy"} onClick={copy}>
          {copied ? "Đã copy!" : "Copy"}
        </Button>
      </div>
      <div style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "11px 14px", borderRadius: 11, background: "var(--warning-soft)", color: "var(--warning-fg)", fontSize: 13, lineHeight: 1.5 }}>
        <Icon name="warn" size={16} style={{ marginTop: 1, flex: "0 0 auto" }} />
        <span>Đây là bản gợi ý của AI. Hãy đọc lại và chỉnh sửa cho đúng với trải nghiệm thật của bạn trước khi sử dụng.</span>
      </div>
      <pre className="scroll" style={{
        margin: 0, flex: 1, minHeight: 0, overflow: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word",
        background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 14,
        padding: "20px 22px", fontFamily: "inherit", fontSize: 13.5, lineHeight: 1.7, color: "var(--text)",
      }}>{cv}</pre>
    </div>
  );
}

function OutputPanel({ analysis, improvedCV, outTab, setOutTab, newCV }) {
  if (!analysis) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100%", padding: 40, textAlign: "center" }}>
        <div style={{ maxWidth: 320 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, margin: "0 auto 22px", background: "var(--primary-soft)", color: "var(--primary-soft-fg)", display: "grid", placeItems: "center" }}>
            <Icon name="gauge" size={36} stroke={1.6} />
          </div>
          <h3 style={{ margin: "0 0 10px", fontSize: 19, fontWeight: 700 }}>Kết quả phân tích sẽ hiện ở đây</h3>
          <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>
            Cung cấp <strong style={{ color: "var(--text)" }}>CV</strong> và <strong style={{ color: "var(--text)" }}>JD</strong> ở khung chat bên trái. Scout sẽ chấm điểm phù hợp, chỉ ra điểm mạnh/yếu và viết lại CV cho bạn.
          </p>
        </div>
      </div>
    );
  }
  const tabs = [
    { id: "analysis", label: "Phân tích", icon: "gauge" },
    { id: "cv", label: "CV cải thiện", icon: "doc", badge: newCV },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ display: "flex", gap: 4, padding: 6, background: "var(--surface-2)", borderRadius: 13, margin: "0 0 18px", flex: "0 0 auto" }}>
        {tabs.map((t) => {
          const active = outTab === t.id;
          return (
            <button key={t.id} onClick={() => setOutTab(t.id)} style={{
              flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
              height: 38, border: "none", borderRadius: 9, cursor: "pointer", fontSize: 14, fontWeight: 600,
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
        {outTab === "analysis" ? <AnalysisView analysis={analysis} /> : <ImprovedCVView cv={improvedCV} />}
      </div>
    </div>
  );
}

/* ── Main CV tab ───────────────────────────────────────────────── */
function CVTab({ incoming, clearIncoming }) {
  const D = window.SCOUT;
  const [messages, setMessages] = useS([{ role: "ai", text: GREETING }]);
  const [typing, setTyping] = useS(false);
  const [input, setInput] = useS("");
  const [cv, setCv] = useS(null);          // { name }
  const [jd, setJd] = useS(null);          // { name, source }
  const [analysis, setAnalysis] = useS(null);
  const [improvedCV, setImprovedCV] = useS("");
  const [outTab, setOutTab] = useS("analysis");
  const [newCV, setNewCV] = useS(false);
  const scrollRef = useR(null);
  const cvInput = useR(null);
  const jdInput = useR(null);
  const timers = useR([]);
  const pushTimer = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); return id; };
  useE(() => () => timers.current.forEach(clearTimeout), []);

  useE(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  function aiSay(text, delay = 700) {
    setTyping(true);
    pushTimer(() => { setTyping(false); setMessages((m) => [...m, { role: "ai", text }]); }, delay);
  }

  function runAnalysis(cvName, jdName) {
    setTyping(true);
    pushTimer(() => {
      setTyping(false);
      setAnalysis(D.ANALYSIS);
      setImprovedCV(D.IMPROVED_CV);
      setOutTab("analysis");
      setNewCV(true);
      setMessages((m) => [...m, { role: "ai", text: `Mình đã phân tích xong! 🎯\n\n**Độ phù hợp: ${D.ANALYSIS.score}%** — xem chi tiết ở panel bên phải.\n\n${D.ANALYSIS.summary}\n\nMình cũng đã viết lại CV cho bạn ở tab **CV cải thiện**. Bạn muốn mình điều chỉnh thêm phần nào không?` }]);
    }, 1900);
  }

  // incoming JD from a job card
  useE(() => {
    if (!incoming) return;
    const jdObj = { name: incoming.title, source: "job" };
    setJd(jdObj);
    setMessages((m) => [...m, { role: "ai", text: `Đã nạp JD cho vị trí **${incoming.title}** tại **${incoming.company}**. 📄\n\n${cv ? "Mình bắt đầu phân tích ngay nhé…" : "Giờ bạn chỉ cần tải **CV** lên (bấm 📎 CV) là mình phân tích ngay."}` }]);
    if (cv) runAnalysis(cv.name, jdObj.name);
    clearIncoming && clearIncoming();
    // eslint-disable-next-line
  }, [incoming]);

  function attachCV(file) {
    const name = file ? file.name : "CV_NguyenMinhAnh.docx";
    const cvObj = { name };
    setCv(cvObj);
    setMessages((m) => [...m, { role: "user", text: `📎 Đã tải lên CV: **${name}**` }]);
    if (jd) { aiSay(`Tuyệt vời, đã nhận CV **${name}**. Mình bắt đầu phân tích với JD đang có nhé…`, 600); runAnalysis(name, jd.name); }
    else aiSay(`Đã nhận CV **${name}** ✅\nBây giờ hãy cung cấp **JD** (bấm 📄 JD, dán text hoặc dán link LinkedIn) để mình so khớp.`, 700);
  }
  function attachJD(file) {
    const name = file ? file.name : "JD_SeniorMarketing.pdf";
    const jdObj = { name, source: "file" };
    setJd(jdObj);
    setMessages((m) => [...m, { role: "user", text: `📄 Đã tải lên JD: **${name}**` }]);
    if (cv) { aiSay(`Đã có đủ CV và JD. Mình phân tích ngay…`, 600); runAnalysis(cv.name, name); }
    else aiSay(`Đã nhận JD **${name}** ✅\nGiờ bạn tải **CV** lên (bấm 📎 CV) để mình chấm độ phù hợp nhé.`, 700);
  }

  function send() {
    const text = input.trim();
    if (!text || typing) return;
    setInput("");
    const isLink = /linkedin\.com\/jobs/i.test(text);
    setMessages((m) => [...m, { role: "user", text }]);

    if (isLink) {
      aiSay("Đang tải JD từ link LinkedIn… ⏳", 500);
      pushTimer(() => {
        const jdObj = { name: "Senior Marketing Manager · LinkedIn", source: "link" };
        setJd(jdObj);
        setMessages((m) => [...m, { role: "ai", text: "Đã lấy được JD từ LinkedIn ✅" }]);
        if (cv) runAnalysis(cv.name, jdObj.name);
        else aiSay("Giờ bạn tải **CV** lên để mình phân tích nhé.", 700);
      }, 1700);
      return;
    }
    // no CV yet
    if (!cv) { aiSay("Mình cần xem **CV** của bạn trước. Bấm 📎 CV để tải file lên nhé (PDF/DOCX/TXT).", 800); return; }
    if (!jd) { aiSay("Mình cần **JD** của vị trí bạn nhắm tới. Bấm 📄 JD, dán nội dung JD, hoặc dán link LinkedIn nhé.", 800); return; }
    // follow-up answers (canned, context-aware-ish)
    let reply;
    if (/kỹ năng|skill/i.test(text)) reply = "Mình đã cập nhật phần **Kỹ năng** trong tab CV cải thiện: tách riêng *Kỹ năng chuyên môn* (Performance Marketing, A/B Testing, Budget Management…) và *Kỹ năng mềm* (Team Leadership, Stakeholder Management). Bạn xem thử ở panel bên phải nhé.";
    else if (/keyword/i.test(text)) reply = "Mình đã chèn các keyword còn thiếu vào CV: **Performance Marketing, ROAS, Team Leadership, A/B Testing**… một cách tự nhiên trong phần kinh nghiệm và kỹ năng. Việc này giúp CV qua được hệ thống lọc ATS tốt hơn.";
    else if (/1 trang|rút gọn|ngắn/i.test(text)) reply = "Để rút xuống 1 trang, mình gợi ý: gộp 2 gạch đầu dòng ở mục Intern, bỏ phần học vấn chi tiết và chỉ giữ thành tích định lượng. Phiên bản gọn đã cập nhật ở tab CV cải thiện.";
    else if (/mục tiêu/i.test(text)) reply = "Mục tiêu nghề nghiệp đã được viết lại để gắn thẳng với vai trò ứng tuyển và nêu thành tích nổi bật (tăng trưởng social 350%). Xem ở đầu CV cải thiện.";
    else if (/match|phù hợp|cải thiện/i.test(text)) reply = `Để tăng match score từ **${D.ANALYSIS.score}%** lên trên 80%, ưu tiên: \n• Bổ sung bằng chứng **leadership** (dẫn dắt dù chỉ 1–2 người)\n• Lượng hóa kết quả bằng **ngân sách & ROAS**\n• Thêm các keyword: Performance Marketing, Stakeholder Management`;
    else reply = "Mình hiểu rồi. Dựa trên CV và JD hiện tại, mình đã cập nhật gợi ý ở panel bên phải. Bạn muốn mình tập trung vào phần nào — kỹ năng, kinh nghiệm, hay mục tiêu nghề nghiệp?";
    aiSay(reply, 1100);
  }

  function reset() {
    timers.current.forEach(clearTimeout); timers.current = [];
    setMessages([{ role: "ai", text: GREETING }]);
    setTyping(false); setInput(""); setCv(null); setJd(null);
    setAnalysis(null); setImprovedCV(""); setNewCV(false); setOutTab("analysis");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div style={{ marginBottom: 18, flex: "0 0 auto" }}>
        <h1 style={{ margin: 0, fontSize: 27, fontWeight: 700, letterSpacing: "-.02em" }}>Phân tích CV</h1>
        <p style={{ margin: "6px 0 0", color: "var(--text-muted)", fontSize: 15 }}>
          Trò chuyện với Scout AI để chấm độ phù hợp và viết lại CV cho từng vị trí.
        </p>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.05fr)", gap: 20 }} className="cvgrid">
        {/* CHAT PANEL */}
        <section style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
          {/* context badges */}
          {(cv || jd) && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: "1px solid var(--border)", background: "var(--surface-2)", flex: "0 0 auto" }}>
              {cv && <ContextBadge tone="success" icon="paperclip" label="CV" value={cv.name} />}
              {jd && <ContextBadge tone="info" icon="doc" label="JD" value={jd.name} />}
              <button onClick={reset} style={{ marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icon name="trash" size={13} /> Xóa & bắt đầu lại
              </button>
            </div>
          )}

          {/* messages */}
          <div ref={scrollRef} className="scroll" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m, i) => <ChatBubble key={i} m={m} />)}
            {typing && <Typing />}
          </div>

          {/* quick chips */}
          <div className="scroll" style={{ display: "flex", gap: 8, padding: "0 18px 10px", overflowX: "auto", flex: "0 0 auto" }}>
            {QUICK_CHIPS.map((c, i) => (
              <button key={i} onClick={() => setInput(c)} style={{
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

          {/* input */}
          <div style={{ padding: "12px 18px 18px", borderTop: "1px solid var(--border)", flex: "0 0 auto" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 9, background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 16, padding: 8 }}>
              <input ref={cvInput} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={(e) => attachCV(e.target.files[0])} />
              <input ref={jdInput} type="file" accept=".pdf,.docx,.txt" style={{ display: "none" }} onChange={(e) => attachJD(e.target.files[0])} />
              <AttachBtn icon="paperclip" label="CV" onClick={() => cvInput.current.click()} />
              <AttachBtn icon="doc" label="JD" onClick={() => jdInput.current.click()} />
              <textarea
                value={input} onChange={(e) => setInput(e.target.value)} rows={1}
                placeholder="Nhập tin nhắn, dán JD, hoặc dán link LinkedIn…"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
                style={{ flex: 1, minWidth: 0, resize: "none", border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14.5, color: "var(--text)", lineHeight: 1.5, padding: "8px 4px", maxHeight: 120 }}
              />
              <button onClick={send} disabled={!input.trim() || typing} style={{
                width: 40, height: 40, borderRadius: 12, border: "none", flex: "0 0 auto",
                cursor: input.trim() && !typing ? "pointer" : "default",
                background: input.trim() && !typing ? "var(--primary)" : "var(--surface-3)",
                color: input.trim() && !typing ? "var(--primary-fg)" : "var(--text-faint)",
                display: "grid", placeItems: "center", transition: "all .15s",
              }}>
                <Icon name="send" size={18} fill />
              </button>
            </div>
          </div>
        </section>

        {/* OUTPUT PANEL */}
        <section style={{ display: "flex", flexDirection: "column", minHeight: 0, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 22, boxShadow: "var(--shadow-sm)" }}>
          <OutputPanel analysis={analysis} improvedCV={improvedCV} outTab={outTab} setOutTab={setOutTab} newCV={newCV} />
        </section>
      </div>
    </div>
  );
}

function AttachBtn({ icon, label, onClick }) {
  const [h, setH] = useS(false);
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

Object.assign(window, { CVTab });
