import { useState } from "react";
import {
  Dashboard,
  MenuBook,
  Image,
  Mail,
  Settings,
  Logout,
  Home,
} from "@mui/icons-material";
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
           if (timerEl) {
             timerEl.textContent = `${Swal.getTimerLeft()}`;
           }
         }, 100);
       },
       willClose: () => {
         clearInterval(timerInterval);
       },
     }).then(async (result) => {
       if (result.dismiss === Swal.DismissReason.timer) {
         await logout();
         navigate("/login");
       }
     });
   };

    const menuItems = [
      {
        id: "Dashboard",
        label: "Dashboard",
        icon: Home,
        path: "/admin",
      },
      {
        id: "Products",
        label: "Products",
        icon: Dashboard,
        path: "/admin/Products",
      },
      {
        id: "menu",
        label: "Menu Management",
        icon: MenuBook,
        path: "/admin/voucher",
      },
      {
        id: "gallery",
        label: "Gallery",
        icon: Image,
        path: "/admin/admin-gallery",
      },
      {
        id: "section",
        label: "Home Sections",
        icon: Settings,
        path: "/admin/home-sections",
      },
      {
        id: "contact",
        label: "Messages",
        icon: Mail,
        path: "/admin/messages",
        badge: 3,
      },
    ];

  return (
    <div className="flex h-screen">
      <div
        className={`relative bg-white border-r border-[#E2E8F0] shadow-sm transition-all duration-500 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Logo */}
        <div className="h-24  flex items-center justify-center border-b border-[#E2E8F0]">
          {!collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <img
                src="/loqta-removebg-preview.png"
                alt="loqta zone"
                className="h-40 object-contain"
              />
            </div>
          ) : (
            <img
              src="/loqta-removebg-preview.png"
              alt="loqta zone"
              className="h-40 object-contain"
            />
          )}
        </div>

        {/* Menu */}
        <nav className="mt-6 px-4 space-y-1 overflow-hidden">
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
                className={`relative w-full flex items-center ${
                  collapsed ? "justify-center px-0" : "gap-4 px-5"
                } py-3 rounded-lg transition-all duration-200 group relative ${
                  isActive
                    ? "bg-[#DBEAFE] text-[#1E40AF]"
                    : "hover:bg-[#EFF6FF]"
                }`}
              >
                {/* Active Left Bar */}
                {isActive && !collapsed && (
                  <div className="absolute left-0 top-2 bottom-2 w-1.5 bg-[#2563EB] rounded-r-full"></div>
                )}

                <div className="relative">
                  <Icon
                    className={`transition-all duration-300 ${
                      isActive
                        ? "text-[#2563EB] scale-110"
                        : "text-gray-400 group-hover:text-[#2563EB]"
                    }`}
                    style={{ fontSize: "22px" }}
                  />

                  {item.badge && (
                    <span className="absolute -top-2 -right-2 bg-[#2563EB] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>

                {!collapsed && (
                  <span
                    className={`text-[15px] font-medium transition-all duration-300 ${
                      isActive
                        ? "text-[#1E40AF]"
                        : "text-gray-600 group-hover:text-[#2563EB]"
                    }`}
                  >
                    {item.label}
                  </span>
                )}

                {/* Tooltip */}
                {collapsed && (
                  <span className="absolute left-20 bg-[#1E40AF] text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}

        <div className="absolute bottom-0 left-0 right-0 border-t border-[#E2E8F0] p-4 space-y-3">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#2563EB] font-bold">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate">{user?.email}</p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${
              collapsed ? "justify-center" : "gap-3 px-3"
            } py-2.5 rounded-lg hover:bg-red-50 transition-all duration-300 group`}
          >
            <Logout className="text-gray-400 group-hover:text-red-500 transition-all duration-300" />
            {!collapsed && (
              <span className="text-sm text-gray-500 group-hover:text-red-500">
                Logout
              </span>
            )}
          </button>
        </div>

        {/* Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-28 bg-white border border-[#E2E8F0] rounded-full p-2 text-gray-500 hover:text-[#2563EB] hover:border-[#2563EB] transition-all duration-300 shadow-md"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
