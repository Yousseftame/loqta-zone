import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import AuthLayout from "@/layouts/AuthLayout/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import MainLayout from "@/layouts/MainLayout/MainLayout";
import AboutUs from "@/pages/AboutUs/AboutUs";
import AuctionForm from "@/pages/Admin/Auctions/AuctionForm";
import AuctionsList from "@/pages/Admin/Auctions/AuctionsList";
import AuctionView from "@/pages/Admin/Auctions/AuctionView";
import Biding from "@/pages/Admin/Biding/Biding";
import CategoryForm from "@/pages/Admin/Categories/Categoryform";
import CategoriesList from "@/pages/Admin/Categories/CategoryList";
import CategoryView from "@/pages/Admin/Categories/Categoryview";
import AdminContactList from "@/pages/Admin/ContactUs/AdminContactList";
import AdminContactView from "@/pages/Admin/ContactUs/AdminContactView";
import Dashboard from "@/pages/Admin/Dashboard/Dashboard";
import AdminFeedbackList from "@/pages/Admin/Feedback/AdminFeedbackList";
import AdminFeedbackView from "@/pages/Admin/Feedback/AdminFeedbackView";
import LastOffer from "@/pages/Admin/LastOffer/LastOffer";
import Payment from "@/pages/Admin/Payment/Payment";
import ProductForm from "@/pages/Admin/Products/ProductForm";
import ProductsList from "@/pages/Admin/Products/ProductsList";
import Products from "@/pages/Admin/Products/ProductsList";
import ProductView from "@/pages/Admin/Products/ProductView";
import AuctionRequestsList from "@/pages/Admin/RequestSystem/AuctionRequestsList";
import AuctionRequestView from "@/pages/Admin/RequestSystem/AuctionRequestView";
import Scheduling from "@/pages/Admin/Scheduling/Scheduling";
import User from "@/pages/Admin/User/User";
import VoucherForm from "@/pages/Admin/Voucher/VoucherForm";
import VouchersList from "@/pages/Admin/Voucher/VoucherList";
import VoucherView from "@/pages/Admin/Voucher/VoucherView";
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
      { path: "register", element: <Register /> },
      { path: "forget-password", element: <ForgetPassword /> },
      // { path: "reset-password", element: <ResetPassword /> },
    ],
  },

  {
    path: "/admin",
    element: [
      <ProtectedRoute allowedRoles={["admin", "superAdmin"]}>
        {" "}
        <DashboardLayout />{" "}
      </ProtectedRoute>,
    ],
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Dashboard /> },

      { path: "categories", element: <CategoriesList /> },
      { path: "categories/add", element: <CategoryForm /> },
      { path: "categories/:id", element: <CategoryView /> },
      { path: "categories/:id/edit", element: <CategoryForm /> },

      { path: "products", element: <ProductsList /> },
      { path: "products/add", element: <ProductForm /> },
      { path: "products/:id", element: <ProductView /> },
      { path: "products/:id/edit", element: <ProductForm /> },

      { path: "auctions", element: <AuctionsList /> },
      { path: "auctions/add", element: <AuctionForm /> },
      { path: "auctions/:id", element: <AuctionView /> },
      { path: "auctions/:id/edit", element: <AuctionForm /> },

      { path: "vouchers", element: <VouchersList /> },
      { path: "vouchers/add", element: <VoucherForm /> },
      { path: "vouchers/:id", element: <VoucherView /> },
      { path: "vouchers/:id/edit", element: <VoucherForm /> },

      { path: "auctionRequests", element: <AuctionRequestsList /> },
      { path: "auctionRequests/:id", element: <AuctionRequestView /> },

      { path: "contacts", element: <AdminContactList /> },
      { path: "contacts/:id", element: <AdminContactView /> },


      { path: "feedback", element: <AdminFeedbackList /> },
      { path: "feedback/:id", element: <AdminFeedbackView /> },

      { path: "biding", element: <Biding /> },
      { path: "lasroffer", element: <LastOffer /> },
      { path: "scheduling", element: <Scheduling /> },
      { path: "users", element: <User /> },
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
