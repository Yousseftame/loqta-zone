import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  limit,
  doc,
} from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { useTranslation } from "react-i18next";
import {
  warnChatUser,
  kickChatUser,
  type ChatMessageType,
} from "@/service/auctions/chatModerationService";
import toast from "react-hot-toast";
import { resolveModerationReason } from "@/lib/chatModerationI18n";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  text: string;
  type?: ChatMessageType;
  messageKey?: string;
  messageParams?: {
    targetUserName?: string;
    customReason?: string | null;
  };
  targetUserId?: string;
  targetUserName?: string;
  createdAt: Date;
}

function resolveSystemMessageText(
  msg: ChatMessage,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (msg.messageKey) {
    const reason = resolveModerationReason(
      msg.messageParams?.customReason,
      t,
    );
    const name =
      msg.messageParams?.targetUserName || msg.targetUserName || "User";
    return t(msg.messageKey, { reason, name });
  }
  return msg.text;
}

interface AuctionChatProps {
  auctionId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string;
  isEnded: boolean;
  /** True only while auction status is "live" */
  isLive: boolean;
  auctionNumber?: number;
  /** When true, renders read-only (admin panel view) */
  readOnly?: boolean;
  /** Admin/superAdmin — show warn/kick controls on user messages */
  isModerator?: boolean;
}

type ModerationAction = "warn" | "kick";

// ── Deterministic avatar colour from userId ────────────────────────────────
const AVATAR_COLORS = [
  ["#c9a96e", "#000"],
  ["#3b82f6", "#fff"],
  ["#22c55e", "#000"],
  ["#a855f7", "#fff"],
  ["#ef4444", "#fff"],
  ["#f97316", "#000"],
  ["#06b6d4", "#000"],
  ["#ec4899", "#fff"],
  ["#84cc16", "#000"],
  ["#14b8a6", "#000"],
  ["#f59e0b", "#000"],
  ["#6366f1", "#fff"],
];

function avatarColor(userId: string): [string, string] {
  let h = 0;
  for (let i = 0; i < userId.length; i++) {
    h = userId.charCodeAt(i) + ((h << 5) - h);
  }
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length] as [string, string];
}

function isSystemMessage(msg: ChatMessage): boolean {
  return msg.type === "system_warn" || msg.type === "system_kick";
}

function isUserMessage(msg: ChatMessage): boolean {
  return !msg.type || msg.type === "user";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AuctionChat({
  auctionId,
  userId,
  userName,
  userPhotoURL,
  isEnded,
  isLive,
  auctionNumber = 0,
  readOnly = false,
  isModerator = false,
}: AuctionChatProps) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [isRestricted, setIsRestricted] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [modDialog, setModDialog] = useState<{
    action: ModerationAction;
    msg: ChatMessage;
  } | null>(null);
  const [modReason, setModReason] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ── Subscribe to messages ────────────────────────────────────────────────
  useEffect(() => {
    if (!auctionId) return;
    const q = query(
      collection(db, "auctions", auctionId, "chat"),
      orderBy("createdAt", "asc"),
      limit(200),
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data();
          let createdAt = new Date();
          if (data.createdAt instanceof Timestamp)
            createdAt = data.createdAt.toDate();
          else if (data.createdAt?.seconds)
            createdAt = new Date(data.createdAt.seconds * 1000);
          return {
            id: d.id,
            userId: data.userId ?? "",
            userName: data.userName ?? "User",
            userPhotoURL: data.userPhotoURL ?? undefined,
            text: data.text ?? "",
            type: data.type as ChatMessageType | undefined,
            messageKey: data.messageKey,
            messageParams: data.messageParams,
            targetUserId: data.targetUserId,
            targetUserName: data.targetUserName,
            createdAt,
          };
        }),
      );
    });
    return () => unsub();
  }, [auctionId]);

  // ── Restricted status (kicked users) ─────────────────────────────────────
  useEffect(() => {
    if (!auctionId || !userId || readOnly || userId === "admin") return;
    const ref = doc(db, "auctions", auctionId, "restricted", userId);
    return onSnapshot(ref, (snap) => setIsRestricted(snap.exists()));
  }, [auctionId, userId, readOnly]);

  // ── Scroll within the chat container only ────────────────────────────────
  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const canSend =
    !isEnded && isLive && !readOnly && !isRestricted && !sending;

  // ── Send ─────────────────────────────────────────────────────────────────
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !canSend) return;
    setSending(true);
    try {
      await addDoc(collection(db, "auctions", auctionId, "chat"), {
        auctionId,
        userId,
        userName,
        userPhotoURL: userPhotoURL ?? null,
        text,
        type: "user",
        createdAt: serverTimestamp(),
      });
      setInputText("");
    } catch (err) {
      console.error("Failed to send message:", err);
      toast.error(
        t("auctionLive.chatSendFailed", "Could not send message. Please try again."),
      );
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

  const openModeration = (action: ModerationAction, msg: ChatMessage) => {
    setModReason("");
    setModDialog({ action, msg });
  };

  const closeModeration = () => {
    if (moderating) return;
    setModDialog(null);
    setModReason("");
  };

  const confirmModeration = useCallback(async () => {
    if (!modDialog) return;
    const { action, msg } = modDialog;
    const reason = modReason.trim() || undefined;

    setModerating(true);
    try {
      if (action === "warn") {
        await warnChatUser({
          auctionId,
          messageId: msg.id,
          targetUserId: msg.userId,
          targetUserName: msg.userName,
          auctionNumber,
          reason,
        });
        toast.success(
          t("auctionLive.chatWarnSuccess", "{{name}} has been warned.", {
            name: msg.userName,
          }),
        );
      } else {
        await kickChatUser({
          auctionId,
          targetUserId: msg.userId,
          targetUserName: msg.userName,
          auctionNumber,
          reason,
        });
        toast.success(
          t("auctionLive.chatKickSuccess", "{{name}} has been removed.", {
            name: msg.userName,
          }),
        );
      }
      setModDialog(null);
      setModReason("");
    } catch (err: any) {
      console.error("Moderation failed:", err);
      toast.error(
        err?.message ??
          t("auctionLive.chatModFailed", "Moderation action failed."),
      );
    } finally {
      setModerating(false);
    }
  }, [modDialog, modReason, auctionId, auctionNumber, t]);

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

  const headerStatus = isEnded
    ? t("auctionLive.chatClosed", "Closed")
    : isLive
      ? t("auctionLive.chatOnline", "Online")
      : t("auctionLive.chatWaiting", "Opens when live");

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
              {isModerator
                ? t("auctionLive.chatModerator", "Moderator")
                : t("auctionLive.chatReadOnly", "Read-only")}
            </span>
          )}
        </div>
        <div className="ac-header-status">
          <span
            className={`ac-online-dot ${isEnded || !isLive ? "ended" : ""}`}
          />
          {headerStatus}
        </div>
      </div>

      {/* Messages */}
      <div className="ac-messages-area" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="ac-empty-state">
            {isLive
              ? t("auctionLive.chatEmpty", "Be the first to say hello!")
              : t(
                  "auctionLive.chatEmptyWaiting",
                  "Chat will open when the auction goes live.",
                )}
          </div>
        ) : (
          <div className="ac-messages-list">
            {messages.map((msg) => {
              if (isSystemMessage(msg)) {
                return (
                  <div key={msg.id} className="ac-system-message">
                    <div
                      className={`ac-system-bubble ${msg.type === "system_kick" ? "kick" : "warn"}`}
                    >
                      {msg.type === "system_kick" ? "🚫 " : "⚠️ "}
                      {resolveSystemMessageText(msg, t)}
                    </div>
                  </div>
                );
              }

              const isMe = !readOnly && msg.userId === userId;
              const showModActions =
                isModerator && isUserMessage(msg) && msg.userId !== "system";

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
                    <div className="ac-bubble-row">
                      <div className="ac-bubble">{msg.text}</div>
                      {showModActions && (
                        <div className="ac-mod-actions">
                          <button
                            type="button"
                            className="ac-mod-btn warn"
                            onClick={() => openModeration("warn", msg)}
                            title={t("auctionLive.chatWarn", "Warn user")}
                          >
                            {t("auctionLive.chatWarn", "Warn")}
                          </button>
                          <button
                            type="button"
                            className="ac-mod-btn kick"
                            onClick={() => openModeration("kick", msg)}
                            title={t("auctionLive.chatKick", "Kick user")}
                          >
                            {t("auctionLive.chatKick", "Kick")}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="ac-time">
                      {msg.createdAt.toLocaleTimeString(
                        isRtl ? "ar-EG" : "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Input / status footer */}
      <div className="ac-input-area">
        {isEnded ? (
          <div className="ac-ended-notice">
            {t(
              "auctionLive.chatEnded",
              "Chat is closed because the auction has ended.",
            )}
          </div>
        ) : readOnly && isModerator ? (
          <div className="ac-ended-notice">
            {t(
              "auctionLive.chatModeratorHint",
              "Hover a message to warn or remove a participant.",
            )}
          </div>
        ) : readOnly ? (
          <div className="ac-ended-notice">
            {t(
              "auctionLive.chatAdminView",
              "Admin view — messages are read-only.",
            )}
          </div>
        ) : isRestricted ? (
          <div className="ac-ended-notice ac-restricted-notice">
            {t(
              "auctionLive.chatKicked",
              "You have been removed from this auction and can no longer chat.",
            )}
          </div>
        ) : !isLive ? (
          <div className="ac-ended-notice">
            {t(
              "auctionLive.chatNotLive",
              "Chat opens when the auction goes live.",
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

      {/* Moderation dialog */}
      {modDialog && (
        <div className="ac-mod-overlay" onClick={closeModeration}>
          <div
            className="ac-mod-dialog"
            onClick={(e) => e.stopPropagation()}
            dir={isRtl ? "rtl" : "ltr"}
          >
            <h4 className="ac-mod-title">
              {modDialog.action === "warn"
                ? t("auctionLive.chatWarnTitle", "Warn {{name}}", {
                    name: modDialog.msg.userName,
                  })
                : t("auctionLive.chatKickTitle", "Kick {{name}}", {
                    name: modDialog.msg.userName,
                  })}
            </h4>
            <p className="ac-mod-desc">
              {modDialog.action === "warn"
                ? t(
                    "auctionLive.chatWarnDesc",
                    "The message will be removed and replaced with a public notice. The user will receive a warning notification.",
                  )
                : t(
                    "auctionLive.chatKickDesc",
                    "The user will be restricted from this auction and cannot bid or chat. A public notice will be posted.",
                  )}
            </p>
            <label className="ac-mod-label">
              {t("auctionLive.chatReasonLabel", "Reason (optional)")}
            </label>
            <input
              className="ac-mod-input"
              value={modReason}
              onChange={(e) => setModReason(e.target.value)}
              placeholder={t(
                "auctionLive.chatReasonPlaceholder",
                "e.g. inappropriate language",
              )}
              maxLength={120}
              disabled={moderating}
            />
            <div className="ac-mod-actions-row">
              <button
                type="button"
                className="ac-mod-cancel"
                onClick={closeModeration}
                disabled={moderating}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                type="button"
                className={`ac-mod-confirm ${modDialog.action}`}
                onClick={confirmModeration}
                disabled={moderating}
              >
                {moderating
                  ? t("common.loading", "Loading...")
                  : modDialog.action === "warn"
                    ? t("auctionLive.chatWarn", "Warn")
                    : t("auctionLive.chatKick", "Kick")}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .auction-chat-container {
          display: flex;
          flex-direction: column;
          background: #1e3652;
          border: 1px solid rgba(229,224,198,0.15);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.4);
          margin-top: 24px;
          height: 450px;
          position: relative;
        }
        .auction-chat-container::before {
          content: "";
          position: absolute;
          inset: 0;
          background: url('/loqta-removebg-preview.png') no-repeat center center;
          background-size: 100%;
          opacity: 0.25;
          pointer-events: none;
          z-index: 0;
        }

        .ac-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          background: linear-gradient(90deg, #1e3652, #2A4863);
          border-bottom: 1px solid rgba(201,169,110,0.15);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
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

        .ac-messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          overscroll-behavior: contain;
          position: relative;
          z-index: 1;
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

        .ac-system-message {
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .ac-system-bubble {
          max-width: 92%;
          padding: 8px 14px;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.45;
          text-align: center;
          color: rgba(255,255,255,0.85);
          border: 1px dashed rgba(255,255,255,0.15);
          background: rgba(0,0,0,0.25);
        }
        .ac-system-bubble.warn {
          border-color: rgba(251,191,36,0.35);
          background: rgba(251,191,36,0.08);
          color: #fde68a;
        }
        .ac-system-bubble.kick {
          border-color: rgba(239,68,68,0.35);
          background: rgba(239,68,68,0.08);
          color: #fecaca;
        }

        .ac-message-wrapper {
          display: flex;
          gap: 8px;
          max-width: 82%;
          align-items: flex-end;
        }
        .ac-theirs { align-self: flex-start; }
        .ac-mine   { align-self: flex-end; flex-direction: row-reverse; }

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
        .ac-bubble-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .ac-theirs .ac-bubble-row:hover .ac-mod-actions {
          opacity: 1;
          pointer-events: auto;
        }
        .ac-mod-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s;
        }
        .ac-mod-btn {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
        }
        .ac-mod-btn.warn {
          background: rgba(251,191,36,0.15);
          color: #fde68a;
          border-color: rgba(251,191,36,0.35);
        }
        .ac-mod-btn.kick {
          background: rgba(239,68,68,0.15);
          color: #fecaca;
          border-color: rgba(239,68,68,0.35);
        }
        .ac-mod-btn:hover { filter: brightness(1.1); }
        @media (max-width: 768px) {
          .ac-mod-actions {
            opacity: 1;
            pointer-events: auto;
          }
        }

        .ac-bubble {
          padding: 9px 13px;
          font-size: 13.5px;
          line-height: 1.45;
          word-break: break-word;
          max-width: 100%;
        }
        .ac-theirs .ac-bubble {
          background: rgba(13, 23, 35, 0.5);
          color: rgba(255,255,255,0.9);
          border: 1px solid rgba(229,224,198,0.08);
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

        .ac-input-area {
          padding: 14px 16px;
          background: rgba(255, 255, 255, 0.03);
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }
        .ac-form {
          display: flex;
          position: relative;
        }
        .ac-input {
          flex: 1;
          background: rgba(42,72,99,0.15);
          border: 1px solid rgba(42,72,99,0.3);
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
        .ac-restricted-notice {
          border-color: rgba(239,68,68,0.25);
          color: #fecaca;
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

        .ac-mod-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          padding: 16px;
        }
        .ac-mod-dialog {
          background: #1a2f47;
          border: 1px solid rgba(201,169,110,0.25);
          border-radius: 14px;
          padding: 18px;
          width: 100%;
          max-width: 340px;
          box-shadow: 0 16px 40px rgba(0,0,0,0.45);
        }
        .ac-mod-title {
          margin: 0 0 8px;
          font-size: 15px;
          font-weight: 700;
          color: #fff;
        }
        .ac-mod-desc {
          margin: 0 0 14px;
          font-size: 12px;
          line-height: 1.5;
          color: rgba(229,224,198,0.65);
        }
        .ac-mod-label {
          display: block;
          font-size: 11px;
          font-weight: 600;
          color: rgba(229,224,198,0.55);
          margin-bottom: 6px;
        }
        .ac-mod-input {
          width: 100%;
          box-sizing: border-box;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          padding: 9px 12px;
          color: #fff;
          font-size: 13px;
          outline: none;
          margin-bottom: 14px;
        }
        .ac-mod-input:focus {
          border-color: rgba(201,169,110,0.4);
        }
        .ac-mod-actions-row {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .ac-mod-cancel {
          padding: 8px 14px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.15);
          background: transparent;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .ac-mod-confirm {
          padding: 8px 14px;
          border-radius: 8px;
          border: none;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          color: #111;
        }
        .ac-mod-confirm.warn {
          background: linear-gradient(135deg, #fbbf24, #f59e0b);
        }
        .ac-mod-confirm.kick {
          background: linear-gradient(135deg, #f87171, #ef4444);
          color: #fff;
        }
        .ac-mod-confirm:disabled,
        .ac-mod-cancel:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
