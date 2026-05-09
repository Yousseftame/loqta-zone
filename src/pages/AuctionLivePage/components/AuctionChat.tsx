import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useTranslation } from "react-i18next";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  text: string;
  createdAt: Date;
}

interface AuctionChatProps {
  auctionId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  isEnded: boolean;
  /** When true, renders read-only (admin panel view) */
  readOnly?: boolean;
}

// ── Deterministic avatar colour from userId ────────────────────────────────
const AVATAR_COLORS = [
  ["#c9a96e", "#000"],   // gold on black
  ["#3b82f6", "#fff"],   // blue
  ["#22c55e", "#000"],   // green
  ["#a855f7", "#fff"],   // purple
  ["#ef4444", "#fff"],   // red
  ["#f97316", "#000"],   // orange
  ["#06b6d4", "#000"],   // cyan
  ["#ec4899", "#fff"],   // pink
  ["#84cc16", "#000"],   // lime
  ["#14b8a6", "#000"],   // teal
  ["#f59e0b", "#000"],   // amber
  ["#6366f1", "#fff"],   // indigo
];

function avatarColor(userId: string): [string, string] {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = userId.charCodeAt(i) + ((h << 5) - h);
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuctionChat({
  auctionId,
  userId,
  userName,
  userPhotoURL,
  isEnded,
  readOnly = false,
}: AuctionChatProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Ref to the scrollable messages container — NOT scrollIntoView (avoids page scroll)
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ── Subscribe ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!auctionId) return;
    const q = query(
      collection(db, "auctions", auctionId, "chat"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((doc) => {
          const d = doc.data();
          let createdAt = new Date();
          if (d.createdAt instanceof Timestamp) createdAt = d.createdAt.toDate();
          else if (d.createdAt?.seconds) createdAt = new Date(d.createdAt.seconds * 1000);
          return {
            id: doc.id,
            userId: d.userId ?? "",
            userName: d.userName ?? "User",
            userPhotoURL: d.userPhotoURL ?? undefined,
            text: d.text ?? "",
            createdAt,
          };
        })
      );
    });
    return () => unsub();
  }, [auctionId]);

  // ── Scroll within the chat container only ────────────────────────────────
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    // Scroll to bottom of the messages container without touching the window
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || isEnded || sending || readOnly) return;
    setSending(true);
    try {
      await addDoc(collection(db, "auctions", auctionId, "chat"), {
        auctionId,          // ← point 2: explicit field
        userId,
        userName,
        userPhotoURL: userPhotoURL ?? null,
        text,
        createdAt: serverTimestamp(),
      });
      setInputText("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Avatar helper ─────────────────────────────────────────────────────────
  const renderAvatar = (msg: ChatMessage, size = 32) => {
    if (msg.userPhotoURL) {
      return (
        <img
          src={msg.userPhotoURL}
          alt={msg.userName}
          className="ac-avatar-img"
          style={{ width: size, height: size }}
        />
      );
    }
    const [bg, fg] = avatarColor(msg.userId);
    return (
      <div
        className="ac-avatar"
        style={{ width: size, height: size, background: bg, color: fg }}
      >
        {msg.userName.charAt(0).toUpperCase()}
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="auction-chat-container" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="ac-header">
        <div className="ac-header-title">
          <span className="ac-header-icon">💬</span>
          {t("auctionLive.liveChat", "Live Chat")}
          {readOnly && (
            <span className="ac-readonly-badge">
              {t("auctionLive.chatReadOnly", "Read-only")}
            </span>
          )}
        </div>
        <div className="ac-header-status">
          <span className={`ac-online-dot ${isEnded ? "ended" : ""}`} />
          {isEnded
            ? t("auctionLive.chatClosed", "Closed")
            : t("auctionLive.chatOnline", "Online")}
        </div>
      </div>

      {/* Messages */}
      <div className="ac-messages-area" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="ac-empty-state">
            {t("auctionLive.chatEmpty", "Be the first to say hello!")}
          </div>
        ) : (
          <div className="ac-messages-list">
            {messages.map((msg) => {
              const isMe = !readOnly && msg.userId === userId;
              return (
                <div
                  key={msg.id}
                  className={`ac-message-wrapper ${isMe ? "ac-mine" : "ac-theirs"}`}
                >
                  {!isMe && renderAvatar(msg)}
                  <div className="ac-message-content">
                    {!isMe && (
                      <div className="ac-sender-name">{msg.userName}</div>
                    )}
                    <div className="ac-bubble">{msg.text}</div>
                    <div className="ac-time">
                      {msg.createdAt.toLocaleTimeString(
                        isRtl ? "ar-EG" : "en-US",
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="ac-input-area">
        {isEnded || readOnly ? (
          <div className="ac-ended-notice">
            {readOnly
              ? t("auctionLive.chatAdminView", "Admin view — messages are read-only.")
              : t(
                  "auctionLive.chatEnded",
                  "Chat is closed because the auction has ended."
                )}
          </div>
        ) : (
          <form className="ac-form" onSubmit={handleSend}>
            <input
              type="text"
              className="ac-input"
              placeholder={t("auctionLive.chatPlaceholder", "Type a message...")}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
              maxLength={200}
            />
            <button
              type="submit"
              className={`ac-send-btn ${!inputText.trim() ? "disabled" : ""}`}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <div className="ac-spinner" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {isRtl ? (
                    <>
                      <line x1="19" y1="12" x2="5" y2="12" />
                      <polyline points="12 19 5 12 12 5" />
                    </>
                  ) : (
                    <>
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </>
                  )}
                </svg>
              )}
            </button>
          </form>
        )}
      </div>

      <style>{`
        .auction-chat-container {
          display: flex;
          flex-direction: column;
          background: #0d1723;
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          margin-top: 24px;
          height: 450px;
        }

        /* ── Header ── */
        .ac-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .ac-header-title {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .ac-readonly-badge {
          font-size: 10px;
          font-weight: 600;
          background: rgba(201,169,110,0.2);
          color: #c9a96e;
          padding: 2px 8px;
          border-radius: 99px;
          border: 1px solid rgba(201,169,110,0.3);
        }
        .ac-header-status {
          font-size: 11px;
          font-weight: 600;
          color: rgba(229,224,198,0.6);
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ac-online-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4ade80;
          box-shadow: 0 0 8px rgba(74,222,128,0.6);
          animation: acPulse 2s infinite;
        }
        .ac-online-dot.ended {
          background: #64748b;
          box-shadow: none;
          animation: none;
        }
        @keyframes acPulse {
          0%   { box-shadow: 0 0 0 0   rgba(74,222,128,0.4); }
          70%  { box-shadow: 0 0 0 6px rgba(74,222,128,0);   }
          100% { box-shadow: 0 0 0 0   rgba(74,222,128,0);   }
        }

        /* ── Messages ── */
        .ac-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          overscroll-behavior: contain;
        }
        .ac-messages-area::-webkit-scrollbar { width: 4px; }
        .ac-messages-area::-webkit-scrollbar-track { background: transparent; }
        .ac-messages-area::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 10px;
        }
        .ac-empty-state {
          margin: auto;
          font-size: 13px;
          color: rgba(229,224,198,0.35);
          text-align: center;
          font-style: italic;
        }
        .ac-messages-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ── Message rows ── */
        .ac-message-wrapper {
          display: flex;
          gap: 8px;
          max-width: 82%;
          align-items: flex-end;
        }
        .ac-theirs { align-self: flex-start; }
        .ac-mine   { align-self: flex-end; flex-direction: row-reverse; }

        /* ── Avatars ── */
        .ac-avatar,
        .ac-avatar-img {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          object-fit: cover;
        }

        /* ── Bubbles ── */
        .ac-message-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .ac-mine .ac-message-content { align-items: flex-end; }

        .ac-sender-name {
          font-size: 11px;
          font-weight: 600;
          color: rgba(229,224,198,0.45);
          padding: 0 4px;
        }
        .ac-bubble {
          padding: 9px 13px;
          font-size: 13.5px;
          line-height: 1.45;
          word-break: break-word;
          max-width: 100%;
        }
        .ac-theirs .ac-bubble {
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.9);
          border-radius: 14px 14px 14px 4px;
        }
        .ac-mine .ac-bubble {
          background: linear-gradient(135deg, #c9a96e, #e8d5a3);
          color: #111;
          font-weight: 500;
          border-radius: 14px 14px 4px 14px;
          box-shadow: 0 3px 10px rgba(201,169,110,0.18);
        }
        .ac-time {
          font-size: 9px;
          color: rgba(255,255,255,0.25);
          padding: 0 4px;
        }

        /* ── Input area ── */
        .ac-input-area {
          padding: 14px 16px;
          background: rgba(0,0,0,0.25);
          border-top: 1px solid rgba(255,255,255,0.05);
          flex-shrink: 0;
        }
        .ac-form {
          display: flex;
          position: relative;
        }
        .ac-input {
          flex: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 11px 48px 11px 18px;
          color: #fff;
          font-size: 13.5px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          font-family: inherit;
        }
        [dir="rtl"] .ac-input { padding: 11px 18px 11px 48px; }
        .ac-input:focus {
          border-color: rgba(201,169,110,0.4);
          background: rgba(255,255,255,0.07);
        }
        .ac-input::placeholder { color: rgba(255,255,255,0.28); }

        .ac-send-btn {
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-50%);
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c9a96e, #a8884c);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          flex-shrink: 0;
        }
        [dir="rtl"] .ac-send-btn { right: auto; left: 6px; }
        .ac-send-btn:hover:not(:disabled) {
          transform: translateY(-50%) scale(1.08);
          box-shadow: 0 0 12px rgba(201,169,110,0.45);
        }
        .ac-send-btn.disabled {
          background: rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.25);
          cursor: not-allowed;
        }

        .ac-ended-notice {
          text-align: center;
          font-size: 12px;
          color: rgba(229,224,198,0.5);
          padding: 8px 12px;
          background: rgba(255,255,255,0.03);
          border-radius: 8px;
          border: 1px dashed rgba(255,255,255,0.08);
        }
        .ac-spinner {
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255,255,255,0.25);
          border-top-color: #fff;
          border-radius: 50%;
          animation: acSpin 0.8s linear infinite;
        }
        @keyframes acSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
