import React, { useEffect, useRef, useState } from "react";
import { sendChatMessage } from "../../api/customerApi";

const SUGGESTED = ["How do I book a service?", "What time slots can I choose?", "Can I cancel my booking?"];

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "model", text: "Hi! I'm Cool Fix Assist. Ask me about our services, packages, promotions or how to book." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = async (raw) => {
    const msg = String(raw ?? input).trim();
    if (!msg || sending) return;
    setInput("");
    const history = messages.slice(-6).map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setSending(true);
    try {
      const res = await sendChatMessage(msg, history);
      setMessages((prev) => [...prev, { role: "model", text: res.reply || "Sorry, something went wrong." }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: "model",
        text: "Sorry, I couldn't reach the server. Please try again, or call +65 8686 2311 (Mon-Sat, 9am-6pm).",
      }]);
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 1050,
          width: 56, height: 56, borderRadius: "50%", border: "none",
          background: "#2563eb", color: "#fff", fontSize: 24, cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        }}
      >
        ?
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed", bottom: 24, right: 24, zIndex: 1050,
        width: 340, height: 480, background: "#fff", borderRadius: 16,
        boxShadow: "0 12px 32px rgba(0,0,0,0.28)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ background: "#2563eb", color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: 14 }}>Cool Fix Assist</strong>
          <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>Customer support · usually replies instantly</p>
        </div>
        <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer" }} aria-label="Close chat">×</button>
      </div>

      {/* Messages */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8, background: "#f8fafc" }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: "82%", padding: "8px 12px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? "#2563eb" : "#ffffff",
              color: m.role === "user" ? "#fff" : "#1e293b",
              border: m.role === "user" ? "none" : "1px solid #e2e8f0",
            }}
          >
            {m.text}
          </div>
        ))}
        {sending && (
          <div style={{ alignSelf: "flex-start", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px 12px", fontSize: 13, color: "#64748b" }}>
            Typing…
          </div>
        )}
      </div>

      {/* Suggested questions */}
      <div style={{ display: "flex", gap: 6, padding: "8px 12px", flexWrap: "wrap", borderTop: "1px solid #e2e8f0", background: "#fff" }}>
        {SUGGESTED.map((q) => (
          <button key={q} onClick={() => send(q)} disabled={sending}
            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer" }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e2e8f0", background: "#fff" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type your question…"
          maxLength={800}
          style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 10px", fontSize: 13 }}
        />
        <button onClick={() => send()} disabled={sending}
          style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatbotWidget;