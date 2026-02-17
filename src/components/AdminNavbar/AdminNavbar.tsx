import { useState } from "react";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext/AuthContext";

const AdminNavbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const adminName = user?.displayName || "Admin";

  const getPageTitle = () => {
    if (location.pathname.includes("Dashboard")) return "Dashboard";
    if (location.pathname.includes("Products")) return "Products";
    if (location.pathname.includes("menu")) return "Menu Management";
    if (location.pathname.includes("gallery")) return "Gallery";
    if (location.pathname.includes("home-sections")) return "Home Sections";
    if (location.pathname.includes("messages")) return "Messages";
    return "Dashboard";
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 h-20 px-10 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-[#E2E8F0] shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-10">
        {/* Page Title */}
        <h1 className="text-xl font-semibold text-[#2A4863] tracking-wide">
          {getPageTitle()}
        </h1>

        {/* Search */}
        <div className="hidden md:flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-4 py-2 w-80 focus-within:border-[#2A4863] focus-within:ring-2 focus-within:ring-[#DBEAFE] transition">
          <Search size={16} className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent outline-none text-sm w-full text-[#0F172A]"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative cursor-pointer group">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#EFF6FF] transition">
            <Bell
              size={18}
              className="text-gray-500 group-hover:text-[#2A4863] transition"
            />
          </div>
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#2A4863] rounded-full"></span>
        </div>

        {/* Profile */}
        <div className="relative">
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-full bg-[#DBEAFE] flex items-center justify-center text-[#2A4863] font-semibold group-hover:scale-105 transition">
              {adminName.charAt(0).toUpperCase()}
            </div>

            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-[#0F172A]">
                {adminName}
              </span>
              <span className="text-xs text-gray-400">Administrator</span>
            </div>

            <ChevronDown
              size={16}
              className="text-gray-400 group-hover:text-[#2A4863] transition"
            />
          </div>

          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 mt-4 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-2 animate-fadeIn">
              <button
                onClick={() => navigate("/admin/profile")}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#EFF6FF] transition text-sm text-[#0F172A]"
              >
                <User size={16} /> Profile
              </button>

              <button
                onClick={() => navigate("/admin/settings")}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#EFF6FF] transition text-sm text-[#0F172A]"
              >
                <Settings size={16} /> Settings
              </button>

              <div className="border-t border-[#E2E8F0] my-2"></div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition text-sm text-red-500"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
