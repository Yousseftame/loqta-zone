import AuthLayout from "@/layouts/AuthLayout/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import MainLayout from "@/layouts/MainLayout/MainLayout";
import AboutUs from "@/pages/AboutUs/AboutUs";
import Auctions from "@/pages/Admin/Auctions/Auctions";
import Biding from "@/pages/Admin/Biding/Biding";
import Dashboard from "@/pages/Admin/Dashboard/Dashboard";
import LastOffer from "@/pages/Admin/LastOffer/LastOffer";
import Payment from "@/pages/Admin/Payment/Payment";
import Products from "@/pages/Admin/Products/Products";
import RequestSystem from "@/pages/Admin/RequestSystem/RequestSystem";
import Scheduling from "@/pages/Admin/Scheduling/Scheduling";
import User from "@/pages/Admin/User/User";
import Voucher from "@/pages/Admin/Voucher/Voucher";
import ForgetPassword from "@/pages/Auth/ForgetPassword/ForgetPassword";
import Login from "@/pages/Auth/Login/Login";
import Register from "@/pages/Auth/Register/Register";
import ResetPassword from "@/pages/Auth/ResetPassword/ResetPassword";
import Contact from "@/pages/Contact/Contact";
import Home from "@/pages/Home/Home";
import HowItWork from "@/pages/HowItWork/HowItWork";
import NotFound from "@/pages/NotFound/NotFound";
import { createBrowserRouter } from "react-router-dom";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    errorElement: <NotFound />,
    children: [
      { path: "login", element: <Login /> },
      // { path: "register", element: <Register /> },
      { path: "forget-password", element: <ForgetPassword /> },
      // { path: "reset-password", element: <ResetPassword /> },
    ],
  },

  {
    path: "/admin",
    element: [<DashboardLayout />],
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "products", element: <Products /> },
      { path: "auctions", element: <Auctions /> },
      { path: "biding", element: <Biding /> },
      { path: "lasroffer", element: <LastOffer /> },
      { path: "requests", element: <RequestSystem /> },
      { path: "scheduling", element: <Scheduling /> },
      { path: "users", element: <User /> },
      { path: "voucher", element: <Voucher /> },
      { path: "payment", element: <Payment /> },
    ],
  },

  {
    path: "/",
    element: <MainLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: "how-it-works", element: <HowItWork /> },
      { path: "aboutUs", element: <AboutUs /> },
      { path: "contact", element: <Contact /> },
    ],
  },
]);
