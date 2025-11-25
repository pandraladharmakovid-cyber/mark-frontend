import React, { useEffect, useRef, useState } from "react";
import ChatMessage from "./ChatMessage";

const BACKEND = import.meta.env.VITE_BACKEND_URL || "https://mark-backend-1910.onrender.com";

const VIDEO_SRC = "/mark-bg.mp4";
const ROBOT_PNG = "/mark-robot.png";

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);

  const robotRef = useRef(null);
  const containerRef = useRef(null);
  const robotState = useRef({
    x: 60, y: 200, vx: 0.2, vy: 0.12, width: 110, height: 110, dragging: false,
  });

  const recogRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setRecognitionSupported(true);
      const r = new SpeechRecognition();
      r.lang = "en-US";
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.onresult = (evt) => {
        const txt = evt.results[0][0].transcript;
        addMessage({ role: "user", content: txt });
        send(txt);
      };
      r.onerror = (e) => console.warn("Speech recognition error", e);
      r.onend = () => setIsListening(false);
      recogRef.current = r;
    } else {
      setRecognitionSupported(false);
    }
  }, []);

  useEffect(() => {
    let raf;
    const s = robotState.current;
    const loop = () => {
      if (!containerRef.current || !robotRef.current) { raf = requestAnimationFrame(loop); return; }
      if (!s.dragging) {
        s.vx += (Math.random() - 0.5) * 0.03;
        s.vy += (Math.random() - 0.5) * 0.03;
        s.vx = clamp(s.vx, -0.6, 0.6);
        s.vy = clamp(s.vy, -0.5, 0.5);
        s.x += s.vx;
        s.y += s.vy;

        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const margin = 12;
        s.x = clamp(s.x, margin, cw - s.width - margin);
        s.y = clamp(s.y, margin + 60, ch - s.height - margin);
        robotRef.current.style.transform = `translate(${s.x}px, ${s.y}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const r = robotRef.current;
    if (!r) return;
    let startX = 0, startY = 0, origX = 0, origY = 0;
    const onPointerDown = (e) => {
      e.preventDefault();
      r.setPointerCapture?.(e.pointerId);
      robotState.current.dragging = true;
      startX = e.clientX; startY = e.clientY;
      origX = robotState.current.x; origY = robotState.current.y;
      r.classList.add("dragging");
    };
    const onPointerMove = (e) => {
      if (!robotState.current.dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const newX = clamp(origX + dx, 8, cw - robotState.current.width - 8);
      const newY = clamp(origY + dy, 8 + 60, ch - robotState.current.height - 8);
      robotState.current.x = newX; robotState.current.y = newY;
      r.style.transform = `translate(${newX}px, ${newY}px)`;
    };
    const onPointerUp = () => {
      if (!robotState.current.dragging) return;
      robotState.current.dragging = false;
      r.classList.remove("dragging");
    };

    r.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      r.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const addMessage = (m) => setMessages((s) => [...s, m]);
  const send = async (text) => {
    if (!text?.trim()) return;
    addMessage({ role: "user", content: text });
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: text }] })
      });
      const data = await res.json();
      if (res.ok) addMessage({ role: "assistant", content: data.text || "No reply." });
      else addMessage({ role: "assistant", content: `Error: ${data?.message || data?.error || res.statusText}` });
    } catch (err) {
      addMessage({ role: "assistant", content: "Network error. Check backend." });
    } finally {
      setLoading(false);
    }
  };

  const onRobotClick = (e) => {
    if (robotState.current.dragging) return;
    const robotEl = robotRef.current;
    const bubble = document.createElement("div");
    bubble.className = "robot-bubble";
    bubble.innerText = "Hi — I am Mark";
    robotEl.appendChild(bubble);
    requestAnimationFrame(() => bubble.classList.add("visible"));
    setTimeout(() => { bubble.classList.remove("visible"); setTimeout(()=>bubble.remove(),250); }, 1800);

    if (recognitionSupported && recogRef.current) {
      try {
        if (!isListening) { recogRef.current.start(); setIsListening(true); }
        else { recogRef.current.stop(); setIsListening(false); }
      } catch (err) { console.warn("recog", err); }
    } else {
      addMessage({ role: "assistant", content: "Speech recognition not supported in this browser." });
    }
  };

  const toggleMic = () => {
    if (!recognitionSupported) return addMessage({ role: "assistant", content: "Speech recognition not supported." });
    if (isListening) { recogRef.current.stop(); setIsListening(false); }
    else { recogRef.current.start(); setIsListening(true); }
  };

  return (
    <div className="app-root">
      <video className="bg-video" src={VIDEO_SRC} autoPlay muted loop playsInline />

      <div className="overlay" ref={containerRef}>
        <header className="header">
          <h1>Mark — your web Jarvis</h1>
          <div className="header-controls">
            <button className={`mic-btn ${isListening ? "listening" : ""}`} onClick={toggleMic}>
              {isListening ? "Listening..." : "Mic"}
            </button>
          </div>
        </header>

        <main className="main-area">
          <section className="chat-panel-clean">
            <div className="chat-messages-small">
              {messages.slice(-6).map((m,i) => <ChatMessage key={i} msg={m} />)}
            </div>
          </section>

          <div
            className="robot"
            ref={robotRef}
            onClick={onRobotClick}
            style={{ touchAction: "none" }}
            role="button"
            aria-label="Mark robot"
            title="Drag me or click to talk"
          >
            <img src={ROBOT_PNG} alt="Mark robot" draggable={false} />
          </div>
        </main>

        <div className="bottom-bar">
          <form onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <input
              className="chat-input"
              placeholder="Ask Mark anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="send-btn" type="submit" disabled={loading}>{loading ? "..." : "Send"}</button>
          </form>
        </div>

      </div>
    </div>
  );
}
