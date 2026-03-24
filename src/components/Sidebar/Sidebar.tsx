import { useState } from "react";
import { Dashboard, MenuBook, Logout, Home } from "@mui/icons-material";
import CategoryIcon from "@mui/icons-material/Category";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ContactsIcon from "@mui/icons-material/Contacts";
import FeedbackIcon from "@mui/icons-material/Feedback";
import AttachEmailIcon from "@mui/icons-material/AttachEmail";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AddCardIcon from "@mui/icons-material/AddCard";
import LocalActivityIcon from "@mui/icons-material/LocalActivity";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase/firebase";
import { useAuth } from "../../store/AuthContext/AuthContext";
import { useContactFeedback } from "../../store/AdminContext/ContactFeedbackContext/ContactFeedbackContext";

// ── Logout Confirmation Modal ─────────────────────────────────────────────────

function LogoutModal({
  onCancel,
  onConfirm,
  loading,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={loading ? undefined : onCancel}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "rgba(15, 23, 42, 0.45)",
          backdropFilter: "blur(4px)",
          animation: "lm-fadein 0.18s ease forwards",
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            pointerEvents: "all",
            background: "#ffffff",
            borderRadius: 20,
            boxShadow:
              "0 32px 80px rgba(15,23,42,0.18), 0 0 0 1px rgba(226,232,240,0.8)",
            width: "100%",
            maxWidth: 400,
            margin: "0 16px",
            overflow: "hidden",
            animation:
              "lm-slidein 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
        >
          {/* Top accent bar */}
          <div
            style={{
              height: 4,
              background: "linear-gradient(90deg, #2A4863 0%, #4A90BE 100%)",
            }}
          />

          {/* Body */}
          <div style={{ padding: "32px 32px 28px" }}>
            {/* Icon */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)",
                border: "1px solid #BFDBFE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 20,
              }}
            >
              {loading ? (
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ animation: "lm-spin 0.8s linear infinite" }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#BFDBFE"
                    strokeWidth="2.5"
                  />
                  <path
                    d="M12 2a10 10 0 0 1 10 10"
                    stroke="#2A4863"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                    stroke="#2A4863"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points="16 17 21 12 16 7"
                    stroke="#2A4863"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="21"
                    y1="12"
                    x2="9"
                    y2="12"
                    stroke="#2A4863"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </div>

            {/* Title */}
            <h2
              id="logout-title"
              style={{
                margin: "0 0 8px",
                fontSize: 19,
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.02em",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {loading ? "Signing you out…" : "Sign out of Admin Panel?"}
            </h2>

            {/* Subtitle */}
            <p
              style={{
                margin: "0 0 28px",
                fontSize: 14,
                color: "#64748B",
                lineHeight: 1.6,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {loading
                ? "Please wait while we securely end your session."
                : "Your session will be ended and you'll be redirected to the login page."}
            </p>

            {/* Progress bar — visible only while loading */}
            {loading && (
              <div
                style={{
                  height: 3,
                  background: "#EFF6FF",
                  borderRadius: 99,
                  marginBottom: 28,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #2A4863, #4A90BE)",
                    borderRadius: 99,
                    animation: "lm-progress 1.4s ease-in-out infinite",
                    transformOrigin: "left center",
                  }}
                />
              </div>
            )}

            {/* Buttons — hidden while loading */}
            {!loading && (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={onCancel}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 10,
                    border: "1.5px solid #E2E8F0",
                    background: "#F8FAFC",
                    color: "#475569",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    transition: "all 0.18s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F1F5F9";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#CBD5E1";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#1E293B";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "#F8FAFC";
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      "#E2E8F0";
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "#475569";
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={onConfirm}
                  style={{
                    flex: 1,
                    padding: "11px 0",
                    borderRadius: 10,
                    border: "none",
                    background:
                      "linear-gradient(135deg, #2A4863 0%, #1e3652 100%)",
                    color: "#ffffff",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    boxShadow: "0 4px 14px rgba(42,72,99,0.35)",
                    transition: "all 0.18s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 7,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform =
                      "translateY(-1px)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 6px 20px rgba(42,72,99,0.45)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow =
                      "0 4px 14px rgba(42,72,99,0.35)";
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="16 17 21 12 16 7"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="21"
                      y1="12"
                      x2="9"
                      y2="12"
                      stroke="white"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes lm-fadein  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes lm-slidein { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes lm-spin    { to { transform: rotate(360deg) } }
        @keyframes lm-progress {
          0%   { transform: scaleX(0.05); }
          40%  { transform: scaleX(0.65); }
          70%  { transform: scaleX(0.85); }
          100% { transform: scaleX(1); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();
  const { contactNewCount, feedbackNewCount } = useContactFeedback();

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error("[Sidebar] Logout error:", err);
      setLogoutLoading(false);
      setShowLogoutModal(false);
    }
  };

  const handleLogoutCancel = () => {
    if (logoutLoading) return;
    setShowLogoutModal(false);
  };

  const allMenuItems = [
    {
      id: "Dashboard",
      label: "Dashboard",
      icon: Home,
      path: "/admin",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Category",
      label: "Category",
      icon: CategoryIcon,
      path: "/admin/categories",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Products",
      label: "Products",
      icon: Dashboard,
      path: "/admin/Products",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Auctions",
      label: "Auctions",
      icon: MenuBook,
      path: "/admin/auctions",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Vouchers",
      label: "Vouchers",
      icon: LocalActivityIcon,
      path: "/admin/vouchers",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Auction Requests",
      label: "Auction Requests",
      icon: AttachEmailIcon,
      path: "/admin/auctionRequests",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Contacts",
      label: "Contacts",
      icon: ContactsIcon,
      path: "/admin/contacts",
      roles: ["admin", "superAdmin"],
      badge: contactNewCount,
    },
    {
      id: "Feedback",
      label: "Feedback",
      icon: FeedbackIcon,
      path: "/admin/feedback",
      roles: ["admin", "superAdmin"],
      badge: feedbackNewCount,
    },
    {
      id: "last offer System",
      label: "Last Offer System",
      icon: LocalOfferIcon,
      path: "/admin/lastoffers",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Bids",
      label: "Bids",
      icon: AddCardIcon,
      path: "/admin/bids",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Auction Participants",
      label: "Auction Participants",
      icon: FolderSharedIcon,
      path: "/admin/participants",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Users",
      label: "Users",
      icon: AccountCircleIcon,
      path: "/admin/users",
      roles: ["admin", "superAdmin"],
    },
    {
      id: "Admins",
      label: "Admins",
      icon: AdminPanelSettingsIcon,
      path: "/admin/admins",
      roles: ["superAdmin"],
    },
  ];

  const menuItems = allMenuItems.filter(
    (item) => !role || item.roles.includes(role),
  );

  return (
    <>
      {showLogoutModal && (
        <LogoutModal
          onCancel={handleLogoutCancel}
          onConfirm={handleLogoutConfirm}
          loading={logoutLoading}
        />
      )}

      <>
        <div
          className={`relative bg-white border-r border-[#E2E8F0] shadow-sm transition-all duration-500 ease-in-out flex-shrink-0 ${
            collapsed ? "w-20" : "w-72"
          }`}
        >
          <div className="flex flex-col h-full overflow-hidden">
            {/* Logo */}
            <div className="h-24 flex items-center justify-center border-b border-[#E2E8F0] flex-shrink-0">
              <img
                src="/loqta-removebg-preview.png"
                alt="loqta zone"
                className="h-40 object-contain"
              />
            </div>

            {/* Scrollable Menu */}
            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <nav className="mt-6 px-3 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.path === "/admin"
                      ? location.pathname === "/admin"
                      : location.pathname.startsWith(item.path);
                  const showBadge = item.badge !== undefined && item.badge > 0;

                  return (
                    <button
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className={`relative w-full flex items-center py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
                        collapsed ? "justify-center px-0" : "px-4"
                      } ${isActive ? "bg-[#DBEAFE]" : "hover:bg-[#EFF6FF]"}`}
                    >
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#2A4863] rounded-r-full" />
                      )}
                      <div className="relative flex-shrink-0">
                        <Icon
                          className={`transition-all duration-300 ${
                            isActive
                              ? "text-[#2A4863] scale-110"
                              : "text-gray-400 group-hover:text-[#2A4863]"
                          }`}
                          style={{ fontSize: "22px" }}
                        />
                        {showBadge && (
                          <span
                            className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                            style={{
                              minWidth: 18,
                              height: 18,
                              padding: "0 4px",
                              lineHeight: "18px",
                              boxShadow: "0 1px 4px rgba(239,68,68,0.5)",
                              animation:
                                "badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                            }}
                          >
                            {item.badge! > 99 ? "99+" : item.badge}
                          </span>
                        )}
                      </div>
                      <div
                        className={`overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out ${
                          collapsed
                            ? "w-0 opacity-0 ml-0"
                            : "w-auto opacity-100 ml-4 delay-150"
                        }`}
                      >
                        <span
                          className={`text-[15px] font-medium whitespace-nowrap ${
                            isActive
                              ? "text-[#1E40AF]"
                              : "text-gray-600 group-hover:text-[#2A4863]"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                      {!collapsed && showBadge && (
                        <span
                          className="ml-auto text-[10px] font-bold text-red-500 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 flex-shrink-0"
                          style={{ marginLeft: "auto" }}
                        >
                          {item.badge} new
                        </span>
                      )}
                      {collapsed && (
                        <span className="absolute left-16 z-50 bg-[#1E40AF] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                          {item.label}
                          {showBadge && ` (${item.badge} new)`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Scroll Hint */}
              <div className="px-4 py-2 flex items-center gap-2">
                <div className="flex flex-col gap-[3px]">
                  <div className="w-3.5 h-[2px] bg-[#2A4863] rounded-full opacity-50" />
                  <div className="w-2.5 h-[2px] bg-[#2A4863] rounded-full opacity-30" />
                  <div className="w-1.5 h-[2px] bg-[#2A4863] rounded-full opacity-15" />
                </div>
                {!collapsed && (
                  <span className="text-[11px] text-gray-400 italic">
                    Scroll to see more
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Section */}
            <div className="border-t border-[#E2E8F0] p-4 space-y-3 flex-shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#2A4863] font-bold flex-shrink-0">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out ${
                    collapsed
                      ? "w-0 opacity-0 ml-0"
                      : "w-auto opacity-100 delay-150"
                  }`}
                >
                  <p className="text-sm text-gray-700 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-400">
                    {role === "superAdmin" ? "Super Admin" : "Administrator"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowLogoutModal(true)}
                className={`w-full flex items-center py-2.5 rounded-lg hover:bg-red-50 transition-all duration-300 group overflow-hidden ${
                  collapsed ? "justify-center px-0" : "px-3"
                }`}
              >
                <Logout className="text-gray-400 group-hover:text-red-500 transition-all duration-300 flex-shrink-0" />
                <div
                  className={`overflow-hidden whitespace-nowrap transition-all duration-500 ease-in-out ${
                    collapsed
                      ? "w-0 opacity-0 ml-0"
                      : "w-auto opacity-100 ml-3 delay-150"
                  }`}
                >
                  <span className="text-sm text-gray-500 group-hover:text-red-500 whitespace-nowrap">
                    Logout
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Toggle Button */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-28 z-10 bg-white border border-[#E2E8F0] rounded-full p-2 text-gray-500 hover:text-[#2A4863] hover:border-[#2A4863] transition-all duration-300 shadow-md"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        <style>{`
          @keyframes badgePop {
            from { transform: scale(0); opacity: 0; }
            to   { transform: scale(1); opacity: 1; }
          }
        `}</style>
      </>
    </>
  );
};

export default Sidebar;
