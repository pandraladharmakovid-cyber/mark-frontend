import React from "react";

export default function ChatMessage({ msg }) {
  return (
    <div className={`chat-row ${msg.role === "user" ? "user" : "assistant"}`}>
      <div className="bubble">
        <div className="role">{msg.role === "user" ? "You" : "Mark"}</div>
        <div className="content">{msg.content}</div>
      </div>
    </div>
  );
}
