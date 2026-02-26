import { useState } from "react";
import { Dashboard, MenuBook, Logout, Home } from "@mui/icons-material";
import CategoryIcon from "@mui/icons-material/Category";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import FolderSharedIcon from "@mui/icons-material/FolderShared";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import ContactsIcon from "@mui/icons-material/Contacts";
import FeedbackIcon from "@mui/icons-material/Feedback";
import AttachEmailIcon from "@mui/icons-material/AttachEmail";
import NotificationsIcon from "@mui/icons-material/Notifications";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import AddCardIcon from "@mui/icons-material/AddCard";
import LocalActivityIcon from "@mui/icons-material/LocalActivity";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import { useAuth } from "../../store/AuthContext/AuthContext";

const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  let timerInterval: ReturnType<typeof setInterval>;

  const handleLogout = async () => {
    Swal.fire({
      title: "Logging out...",
      html: "You will be logged out in <b></b> ms",
      timer: 1500,
      timerProgressBar: true,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
        const popup = Swal.getPopup();
        const timerEl = popup?.querySelector("b");
        timerInterval = setInterval(() => {
          if (timerEl) timerEl.textContent = `${Swal.getTimerLeft()}`;
        }, 100);
      },
      willClose: () => clearInterval(timerInterval),
    }).then(async (result) => {
      if (result.dismiss === Swal.DismissReason.timer) {
        await logout();
        navigate("/login");
      }
    });
  };

  const menuItems = [
    { id: "Dashboard", label: "Dashboard", icon: Home, path: "/admin" },
    {
      id: "Category",
      label: "Category",
      icon: CategoryIcon,
      path: "/admin/categories",
    },
    {
      id: "Products",
      label: "Products",
      icon: Dashboard,
      path: "/admin/Products",
    },
    {
      id: "Auctions",
      label: "Auctions",
      icon: MenuBook,
      path: "/admin/auctions",
    },
    {
      id: "Vouchers",
      label: "Vouchers",
      icon: LocalActivityIcon,
      path: "/admin/vouchers",
    },

    {
      id: "Auction Requests",
      label: "Auction Requests",
      icon: AttachEmailIcon,
      path: "/admin/auctionRequests",
    },
    {
      id: "Notifications",
      label: "Notifications",
      icon: NotificationsIcon,
      path: "/admin/#",
      badge: 8,
    },
    {
      id: "Bids",
      label: "Bids",
      icon: AddCardIcon,
      path: "/admin/#",
      badge: 3,
    },
    {
      id: "last offer System",
      label: "Last Offer System",
      icon: LocalOfferIcon,
      path: "/admin/#",
    },

    {
      id: "Auction Participants",
      label: "Auction Participants",
      icon: FolderSharedIcon,
      path: "/admin/#",
    },
    {
      id: "Feedback",
      label: "Feedback",
      icon: FeedbackIcon,
      path: "/admin/#",
    },
    {
      id: "Contacts",
      label: "Contacts",
      icon: ContactsIcon,
      path: "/admin/#",
    },
    {
      id: "Users",
      label: "Users",
      icon: AccountCircleIcon,
      path: "/admin/#",
    },
    {
      id: "Admins",
      label: "Admins",
      icon: AdminPanelSettingsIcon,
      path: "/admin/#",
    },
  ];

  return (
    <div className="flex h-screen">
      <div
        className={`relative bg-white border-r border-[#E2E8F0] shadow-sm transition-all duration-500 ease-in-out flex-shrink-0 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Flex column layout — logo | scrollable nav | fixed bottom */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Logo — fixed top */}
          <div className="h-24 flex items-center justify-center border-b border-[#E2E8F0] flex-shrink-0">
            <img
              src="/loqta-removebg-preview.png"
              alt="loqta zone"
              className="h-40 object-contain"
            />
          </div>

          {/* Scrollable Menu Area */}
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

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.path)}
                    className={`relative w-full flex items-center py-3 rounded-xl transition-all duration-300 group overflow-hidden ${
                      collapsed ? "justify-center px-0" : "px-4"
                    } ${isActive ? "bg-[#DBEAFE]" : "hover:bg-[#EFF6FF]"}`}
                  >
                    {/* Active Left Bar */}
                    {isActive && !collapsed && (
                      <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#2A4863] rounded-r-full" />
                    )}

                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <Icon
                        className={`transition-all duration-300 ${
                          isActive
                            ? "text-[#2A4863] scale-110"
                            : "text-gray-400 group-hover:text-[#2A4863]"
                        }`}
                        style={{ fontSize: "22px" }}
                      />
                      {item.badge && (
                        <span className="absolute -top-2 -right-2 bg-[#2A4863] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Label */}
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

                    {/* Tooltip when collapsed */}
                    {collapsed && (
                      <span className="absolute left-16 z-50 bg-[#1E40AF] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md">
                        {item.label}
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

          {/* Bottom Section — fixed at bottom */}
          <div className="border-t border-[#E2E8F0] p-4 space-y-3 flex-shrink-0">
            {/* User Info */}
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
                <p className="text-sm text-gray-700 truncate">{user?.email}</p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
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
    </div>
  );
};

export default Sidebar;
