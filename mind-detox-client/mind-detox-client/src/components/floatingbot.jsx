import React, { useEffect, useRef, useState } from "react";
import { Send, X, MessageCircle } from "lucide-react";
import "../styles/navfloat.css";

export default function FloatingBot() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi 👋 I’m your Mind Detox assistant. How can I help?" },
  ]);

  const bodyRef = useRef(null);

  useEffect(() => {
    if (open && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [open, messages]);

  const send = () => {
    const t = text.trim();
    if (!t) return;

    setMessages((m) => [...m, { role: "user", text: t }]);
    setText("");

    // Simple canned bot reply (replace with API later)
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "bot",
          text: "Got it ✅. (We can connect me to your backend later for real AI replies.)",
        },
      ]);
    }, 400);
  };

  return (
    <div className="bot-wrapper">
      {open && (
        <div className="chat-window">
          <div className="chat-header">
            <div className="bot-info">
              <div className="bot-avatar">MD</div>
              <div>
                <h4>Mind Detox Bot</h4>
                <p>Support • Tips • Guidance</p>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                color: "white",
                cursor: "pointer",
              }}
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="chat-body" ref={bodyRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`msg ${m.role}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
            />
            <button className="send-btn" onClick={send} aria-label="Send">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      <button className="fab-button" onClick={() => setOpen((v) => !v)} aria-label="Open chat">
        <MessageCircle size={22} />
        {!open && <span className="notification-dot" />}
      </button>
    </div>
  );
}
