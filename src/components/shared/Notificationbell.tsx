import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/store/AuthContext/AuthContext";
import { X, Gavel, Trophy, Heart, Tag, Clock, Bell } from "lucide-react";

interface Notification {
  id: string;
  type: "bid" | "win" | "watchlist" | "promo" | "expiry";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "win",
    title: "You won the auction!",
    message: "Congratulations! You won the Vintage Rolex Submariner.",
    time: "2m ago",
    read: false,
  },
  {
    id: "2",
    type: "bid",
    title: "You've been outbid",
    message: "Someone placed a higher bid on Rare Diamond Ring.",
    time: "15m ago",
    read: false,
  },
  {
    id: "3",
    type: "watchlist",
    title: "Watchlist item ending soon",
    message: "Antique Persian Rug ends in 30 minutes.",
    time: "28m ago",
    read: false,
  },
  {
    id: "4",
    type: "promo",
    title: "Exclusive offer just for you",
    message: "Use code LOQTA20 for 20% off your next bid voucher.",
    time: "1h ago",
    read: true,
  },
  {
    id: "5",
    type: "expiry",
    title: "Auction starting soon",
    message: "Signed Football Jersey auction starts in 1 hour.",
    time: "2h ago",
    read: true,
  },
];

const TYPE_CONFIG = {
  bid: {
    Icon: Gavel,
    color: "#64a0ff",
    bg: "rgba(100,160,255,0.13)",
    border: "rgba(100,160,255,0.25)",
  },
  win: {
    Icon: Trophy,
    color: "#c9a96e",
    bg: "rgba(201,169,110,0.13)",
    border: "rgba(201,169,110,0.28)",
  },
  watchlist: {
    Icon: Heart,
    color: "#ff6b9d",
    bg: "rgba(255,107,157,0.13)",
    border: "rgba(255,107,157,0.25)",
  },
  promo: {
    Icon: Tag,
    color: "#5ee8a0",
    bg: "rgba(94,232,160,0.13)",
    border: "rgba(94,232,160,0.25)",
  },
  expiry: {
    Icon: Clock,
    color: "#ff9d5c",
    bg: "rgba(255,157,92,0.13)",
    border: "rgba(255,157,92,0.25)",
  },
};

export const NotificationBell = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] =
    useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [attracted, setAttracted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Attract animation fires every 7 seconds while there are unread notifications
  useEffect(() => {
    if (unreadCount === 0) return;
    const fire = () => {
      setAttracted(true);
      setTimeout(() => setAttracted(false), 2000);
    };
    const initial = setTimeout(fire, 1200);
    const interval = setInterval(fire, 7000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [unreadCount]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  const markRead = (id: string) =>
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  const dismiss = (id: string) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  if (!user) return null;

  return (
    <>
      <style>{`
        @keyframes nfPanelIn {
          0%   { opacity:0; transform:scale(0.88) translateY(24px); }
          60%  { opacity:1; transform:scale(1.02) translateY(-4px); }
          100% { opacity:1; transform:scale(1) translateY(0); }
        }
        @keyframes nfItemIn {
          from { opacity:0; transform:translateX(30px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes nfBadgePop {
          0%   { transform:scale(0) rotate(-20deg); }
          65%  { transform:scale(1.3) rotate(8deg); }
          100% { transform:scale(1) rotate(0deg); }
        }
        @keyframes nfRipple {
          0%   { transform:scale(0.85); opacity:0.85; }
          100% { transform:scale(2.8);  opacity:0; }
        }
        @keyframes nfAttract {
          0%   { transform:scale(1)    rotate(0deg); }
          8%   { transform:scale(1.2)  rotate(-14deg); }
          18%  { transform:scale(1.25) rotate(14deg); }
          28%  { transform:scale(1.2)  rotate(-10deg); }
          38%  { transform:scale(1.22) rotate(10deg); }
          50%  { transform:scale(1.16) rotate(-5deg); }
          62%  { transform:scale(1.18) rotate(5deg); }
          78%  { transform:scale(1.08) rotate(0deg); }
          100% { transform:scale(1)    rotate(0deg); }
        }
        @keyframes nfGoldSpin {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes nfShine {
          0%   { opacity:0; left:-80%; }
          35%  { opacity:0.55; }
          100% { opacity:0; left:140%; }
        }
        @keyframes nfBreathe {
          0%,100% { box-shadow:0 0 0 0 rgba(201,169,110,0),   0 8px 32px rgba(0,0,0,0.6); }
          50%     { box-shadow:0 0 0 10px rgba(201,169,110,0.14), 0 14px 44px rgba(201,169,110,0.2); }
        }
        @keyframes nfDotPulse {
          0%,100% { opacity:1; transform:scale(1); }
          50%     { opacity:0.3; transform:scale(0.5); }
        }
        @keyframes nfBadgeGlow {
          0%,100% { box-shadow:0 3px 10px rgba(255,61,90,0.55); }
          50%     { box-shadow:0 3px 18px rgba(255,61,90,0.9), 0 0 0 4px rgba(255,61,90,0.15); }
        }
        @keyframes nfLabelIn {
          from { opacity:0; transform:translateX(10px); max-width:0; padding:0; }
          to   { opacity:1; transform:translateX(0);    max-width:180px; }
        }
        @keyframes nfLabelOut {
          from { opacity:1; max-width:180px; }
          to   { opacity:0; max-width:0; padding:0; }
        }

        /* ─── Root ─── */
        .nf-root {
          position: fixed;
          bottom: 28px;
          right: 28px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        /* ─── FAB wrapper ─── */
        .nf-fab-row {
          display: flex;
          align-items: center;
          gap: 0;
          position: relative;
        }

        /* Hover label — only visible on hover, positioned absolutely so it never affects layout */
        .nf-label {
          font-family: 'Jost', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #c9a96e;
          white-space: nowrap;
          background: linear-gradient(135deg,#0e1c2e,#0a0a1a);
          border: 1px solid rgba(201,169,110,0.3);
          border-radius: 10px;
          height: 36px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          position: absolute;
          right: calc(100% + 12px);
          pointer-events: none;
          white-space: nowrap;
          opacity: 0;
          transform: translateX(8px);
          transition: opacity 0.25s ease, transform 0.25s ease;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        }
        .nf-label::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 50%;
          transform: translateY(-50%);
          width: 0; height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-left: 6px solid rgba(201,169,110,0.3);
        }
        .nf-fab-row:hover .nf-label {
          opacity: 1;
          transform: translateX(0);
        }

        /* Main circle */
        .nf-circle {
          position: relative;
          width: 76px;
          height: 76px;
          border-radius: 50%;
          background: linear-gradient(145deg, #162d45 0%, #0a0a1a 100%);
          border: 2.5px solid rgba(201,169,110,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.3s, transform 0.35s cubic-bezier(0.22,1,0.36,1);
          animation: nfBreathe 3.5s ease-in-out infinite;
          overflow: visible;
          flex-shrink: 0;
          cursor: pointer;
        }
        .nf-fab-row:hover .nf-circle {
          border-color: #c9a96e;
          transform: scale(1.08);
          animation: none;
          box-shadow: 0 0 0 7px rgba(201,169,110,0.11), 0 14px 44px rgba(201,169,110,0.3);
        }
        .nf-circle.attracted {
          animation: nfAttract 1s cubic-bezier(0.22,1,0.36,1) forwards,
                     nfBreathe 3.5s ease-in-out 1.1s infinite;
        }

        /* Spinning gold arc - single arc, clipped to not show outside visually */
        .nf-arc {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          border: 2px solid transparent;
          border-top-color: rgba(201,169,110,0.65);
          border-right-color: rgba(201,169,110,0.18);
          animation: nfGoldSpin 3.8s linear infinite;
          pointer-events: none;
        }

        /* Ripple rings (only when attracted) */
        .nf-ripple {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2.5px solid rgba(201,169,110,0.55);
          opacity: 0;
          pointer-events: none;
        }
        .nf-circle.attracted .nf-ripple:nth-child(1) { animation: nfRipple 1.1s ease-out 0.0s forwards; }
        .nf-circle.attracted .nf-ripple:nth-child(2) { animation: nfRipple 1.1s ease-out 0.3s forwards; }
        .nf-circle.attracted .nf-ripple:nth-child(3) { animation: nfRipple 1.1s ease-out 0.6s forwards; }

        /* Light-sweep shimmer (only when attracted) */
        .nf-shine {
          position: absolute;
          top: 5%; bottom: 5%; left: -80%;
          width: 45%;
          background: linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.22) 50%, transparent 80%);
          pointer-events: none;
          z-index: 4;
          border-radius: 50%;
        }
        .nf-circle.attracted .nf-shine { animation: nfShine 0.65s ease-out 0.1s forwards; }

        /* Logo */
        .nf-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          filter: drop-shadow(0 3px 10px rgba(201,169,110,0.55));
          transition: filter 0.3s, transform 0.3s;
          position: relative;
          z-index: 2;
        }
        .nf-fab-row:hover .nf-logo {
          filter: drop-shadow(0 5px 16px rgba(201,169,110,0.8));
          transform: scale(1.06);
        }

        /* Red badge */
        .nf-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          min-width: 26px;
          height: 26px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ff3d5a, #c41e3a);
          border: 3px solid #0a0a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          color: #fff;
          font-family: 'Jost', sans-serif;
          padding: 0 5px;
          animation: nfBadgePop 0.5s cubic-bezier(0.22,1,0.36,1) both,
                     nfBadgeGlow 2s ease-in-out 0.5s infinite;
          z-index: 10;
          pointer-events: none;
        }

        /* ─── Panel ─── */
        .nf-panel {
          position: absolute;
          bottom: calc(100% + 18px);
          right: 0;
          width: 365px;
          background: linear-gradient(160deg,#0f2035 0%,#080d1a 100%);
          border: 1px solid rgba(201,169,110,0.22);
          border-radius: 24px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.82),
                      0 0 0 1px rgba(201,169,110,0.07),
                      inset 0 1px 0 rgba(201,169,110,0.12);
          overflow: hidden;
          animation: nfPanelIn 0.42s cubic-bezier(0.22,1,0.36,1) both;
          max-height: 530px;
          display: flex;
          flex-direction: column;
        }
        .nf-panel::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1.5px;
          background: linear-gradient(90deg,transparent,rgba(201,169,110,0.7),transparent);
        }

        .nf-head {
          padding: 18px 20px 14px;
          border-bottom: 1px solid rgba(229,224,198,0.06);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          background: linear-gradient(135deg,rgba(201,169,110,0.05),transparent);
        }
        .nf-head-left { display:flex; align-items:center; gap:8px; flex-wrap: nowrap; overflow: hidden; }
        .nf-head-logo { height:34px; width:auto; filter:drop-shadow(0 2px 8px rgba(201,169,110,0.4)); }
        .nf-head-title {
          font-family:'Jost',sans-serif; font-size:14px; font-weight:800;
          letter-spacing:0.1em; text-transform:uppercase; color:#c9a96e;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .nf-new-pill {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:900;
          letter-spacing:0.06em; color:#fff;
          background:linear-gradient(135deg,#ff3d5a,#c41e3a);
          border-radius:999px; padding:4px 10px;
          white-space: nowrap;
          flex-shrink: 0;
          line-height: 1;
          display: inline-flex;
          align-items: center;
        }
        .nf-markall {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:700;
          letter-spacing:0.1em; text-transform:uppercase; color:rgba(201,169,110,0.55);
          background:none; border:none; cursor:pointer; padding:5px 10px;
          border-radius:8px; transition:all 0.2s;
        }
        .nf-markall:hover { color:#c9a96e; background:rgba(201,169,110,0.09); }

        .nf-scroll {
          overflow-y:auto; flex:1; scrollbar-width:thin;
          scrollbar-color:rgba(201,169,110,0.18) transparent;
        }
        .nf-scroll::-webkit-scrollbar { width:3px; }
        .nf-scroll::-webkit-scrollbar-thumb { background:rgba(201,169,110,0.18); border-radius:2px; }

        .nf-item {
          display:flex; align-items:flex-start; gap:13px;
          padding:14px 16px 14px 22px;
          border-bottom:1px solid rgba(255,255,255,0.033);
          cursor:pointer; transition:background 0.2s; position:relative;
          animation:nfItemIn 0.38s cubic-bezier(0.22,1,0.36,1) both;
        }
        .nf-item:last-child { border-bottom:none; }
        .nf-item:hover { background:rgba(255,255,255,0.023); }
        .nf-item.unread { background:rgba(201,169,110,0.03); }
        .nf-item.unread:hover { background:rgba(201,169,110,0.055); }

        .nf-unread-bar {
          position:absolute; left:0; top:12%; bottom:12%;
          width:3px; border-radius:0 3px 3px 0;
          background:linear-gradient(180deg,#c9a96e,#b8944e);
          box-shadow:0 0 8px rgba(201,169,110,0.65);
        }

        .nf-icon {
          width:44px; height:44px; border-radius:14px;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; margin-top:1px; position:relative;
        }
        .nf-icon-pulse {
          position:absolute; bottom:-2px; right:-2px;
          width:9px; height:9px; border-radius:50%;
          border:2px solid #080d1a;
          animation:nfDotPulse 1.8s ease-in-out infinite;
        }

        .nf-body { flex:1; min-width:0; }
        .nf-item-title {
          font-family:'Jost',sans-serif; font-size:13px; font-weight:700;
          color:rgb(229,224,198); margin:0 0 4px; padding-right:24px; line-height:1.3;
        }
        .nf-item.unread .nf-item-title { color:#fff; }
        .nf-item-msg {
          font-family:'Jost',sans-serif; font-size:11.5px;
          color:rgba(229,224,198,0.42); margin:0 0 5px; line-height:1.5;
        }
        .nf-item-time {
          font-family:'Jost',sans-serif; font-size:10px;
          font-weight:700; color:rgba(201,169,110,0.45); letter-spacing:0.05em;
        }

        .nf-x {
          position:absolute; top:10px; right:10px;
          width:22px; height:22px; border-radius:7px;
          background:transparent; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          color:rgba(229,224,198,0.2); opacity:0; transition:all 0.2s;
        }
        .nf-item:hover .nf-x { opacity:1; }
        .nf-x:hover { background:rgba(255,61,90,0.13)!important; color:#ff6464!important; }

        .nf-empty {
          padding:50px 20px; text-align:center; font-family:'Jost',sans-serif;
        }
        .nf-empty-ring {
          width:64px; height:64px; border-radius:50%;
          border:1.5px solid rgba(201,169,110,0.18);
          display:flex; align-items:center; justify-content:center;
          margin:0 auto 14px; background:rgba(201,169,110,0.04);
        }
        .nf-empty-txt { font-size:13px; font-weight:700; color:rgba(229,224,198,0.3); letter-spacing:0.06em; }

        .nf-foot {
          padding:11px 20px; border-top:1px solid rgba(229,224,198,0.05);
          text-align:center; flex-shrink:0;
          background:linear-gradient(0deg,rgba(201,169,110,0.03),transparent);
        }
        .nf-foot-btn {
          font-family:'Jost',sans-serif; font-size:10px; font-weight:800;
          letter-spacing:0.18em; text-transform:uppercase;
          color:rgba(201,169,110,0.5); background:none; border:none;
          cursor:pointer; padding:6px 16px; border-radius:8px; transition:all 0.2s;
        }
        .nf-foot-btn:hover { color:#c9a96e; background:rgba(201,169,110,0.08); }
      `}</style>

      <div className="nf-root" ref={panelRef}>
        {/* ── Dropdown Panel ── */}
        {open && (
          <div className="nf-panel">
            <div className="nf-head">
              <div className="nf-head-left">
                <img
                  src="/loqta-removebg-preview.png"
                  alt="Loqta"
                  className="nf-head-logo"
                />
                <span className="nf-head-title">Notifications</span>
                {unreadCount > 0 && (
                  <span className="nf-new-pill">{unreadCount} NEW</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button className="nf-markall" onClick={markAllRead}>
                  Mark all read
                </button>
              )}
            </div>

            <div className="nf-scroll">
              {notifications.length === 0 ? (
                <div className="nf-empty">
                  <div className="nf-empty-ring">
                    <Bell
                      size={24}
                      style={{ color: "rgba(201,169,110,0.35)" }}
                    />
                  </div>
                  <p className="nf-empty-txt">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((notif, i) => {
                  const cfg = TYPE_CONFIG[notif.type];
                  const { Icon } = cfg;
                  return (
                    <div
                      key={notif.id}
                      className={`nf-item${!notif.read ? " unread" : ""}`}
                      style={{ animationDelay: `${i * 0.06}s` }}
                      onClick={() => markRead(notif.id)}
                    >
                      {!notif.read && <span className="nf-unread-bar" />}
                      <div
                        className="nf-icon"
                        style={{
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                        }}
                      >
                        <Icon
                          size={19}
                          style={{ color: cfg.color }}
                          strokeWidth={1.8}
                        />
                        {!notif.read && (
                          <span
                            className="nf-icon-pulse"
                            style={{ background: cfg.color }}
                          />
                        )}
                      </div>
                      <div className="nf-body">
                        <p className="nf-item-title">{notif.title}</p>
                        <p className="nf-item-msg">{notif.message}</p>
                        <span className="nf-item-time">{notif.time}</span>
                      </div>
                      <button
                        className="nf-x"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismiss(notif.id);
                        }}
                      >
                        <X size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {notifications.length > 0 && (
              <div className="nf-foot">
                <button className="nf-foot-btn">
                  ✦ View all notifications
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── FAB ── */}
        <div
          className="nf-fab-row"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Tooltip label — absolutely positioned, never in flow */}
          <span className="nf-label">
            {unreadCount > 0 ? `${unreadCount} new alerts` : "Notifications"}
          </span>

          <div
            className={`nf-circle${attracted && !open ? " attracted" : ""}`}
            onClick={() => setOpen((v) => !v)}
            role="button"
            aria-label="Notifications"
          >
            {/* Ripple rings — only render when attracted so they don't linger */}
            {attracted && !open && (
              <>
                <span className="nf-ripple" />
                <span className="nf-ripple" />
                <span className="nf-ripple" />
              </>
            )}

            {/* Arc — always spins */}
            <span className="nf-arc" />

            {/* Shine — only when attracted */}
            <span className="nf-shine" />

            {/* Logo */}
            <img
              src="/loqta-removebg-preview.png"
              alt="Loqta Zone"
              className="nf-logo"
            />

            {/* Badge */}
            {unreadCount > 0 && (
              <span className="nf-badge">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NotificationBell;
