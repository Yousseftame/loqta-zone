import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import PermissionRoute from "@/permissions/PermissionRoute";
import AuthLayout from "@/layouts/AuthLayout/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import MainLayout from "@/layouts/MainLayout/MainLayout";
import AboutUs from "@/pages/AboutUs/AboutUs";
import AuctionForm from "@/pages/Admin/Auctions/AuctionForm";
import AuctionsList from "@/pages/Admin/Auctions/AuctionsList";
import AuctionView from "@/pages/Admin/Auctions/AuctionView";
import BidsList from "@/pages/Admin/Biding/BidsList";
import CategoryForm from "@/pages/Admin/Categories/Categoryform";
import CategoriesList from "@/pages/Admin/Categories/CategoryList";
import CategoryView from "@/pages/Admin/Categories/Categoryview";
import AdminContactList from "@/pages/Admin/ContactUs/AdminContactList";
import AdminContactView from "@/pages/Admin/ContactUs/AdminContactView";
import Dashboard from "@/pages/Admin/Dashboard/Dashboard";
import AdminFeedbackList from "@/pages/Admin/Feedback/AdminFeedbackList";
import AdminFeedbackView from "@/pages/Admin/Feedback/AdminFeedbackView";
import LastOfferList from "@/pages/Admin/LastOffer/LastOfferList";
import ParticipantsList from "@/pages/Admin/Participants/ParticipantsList";
import Payment from "@/pages/Admin/Payment/Payment";
import ProductForm from "@/pages/Admin/Products/ProductForm";
import ProductsList from "@/pages/Admin/Products/ProductsList";
import ProductView from "@/pages/Admin/Products/ProductView";
import AuctionRequestsList from "@/pages/Admin/RequestSystem/AuctionRequestsList";
import AuctionRequestView from "@/pages/Admin/RequestSystem/AuctionRequestView";
import Scheduling from "@/pages/Admin/Scheduling/Scheduling";
import AdminsList from "@/pages/Admin/User/AdminsList";
import UsersList from "@/pages/Admin/User/UsersList";
import UserView from "@/pages/Admin/User/UserView";
import VoucherForm from "@/pages/Admin/Voucher/VoucherForm";
import VouchersList from "@/pages/Admin/Voucher/VoucherList";
import VoucherView from "@/pages/Admin/Voucher/VoucherView";
import AuctionLivePage from "@/pages/AuctionLivePage/AuctionLivePage";
import AuctionRegisterPage from "@/pages/Auctionregisterpage/Auctionregisterpage";
import ForgetPassword from "@/pages/Auth/ForgetPassword/ForgetPassword";
import Login from "@/pages/Auth/Login/Login";
import Register from "@/pages/Auth/Register/Register";
import VerifyEmail from "@/pages/Auth/Verifyemail/Verifyemail";
import Contact from "@/pages/Contact/Contact";
import Home from "@/pages/Home/Home";
import HowItWork from "@/pages/HowItWork/HowItWork";
import NotFound from "@/pages/NotFound/NotFound";
import TermsAndConditions from "@/pages/TermsAndConditions/TermsAndConditions";
import MyBids from "@/pages/User/Bids/MyBids";
import MyProfile from "@/pages/User/Profile/MyProfile";
import ChangePassword from "@/pages/User/Settings/ChangePassword";
import { createBrowserRouter } from "react-router-dom";
import CantFind from "@/pages/CantFind/CantFind";
import LastOfferConfirmPage from "@/pages/LastOfferConfirm/LastOfferConfirmPage";

export const routes = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    errorElement: <NotFound />,
    children: [
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "forget-password", element: <ForgetPassword /> },
    ],
  },
  // {
  //   path: "/verify-email",
  //   element: <VerifyEmail />,
  //   errorElement: <NotFound />,
  // },

  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin", "superAdmin"]}>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />,
    children: [
      // Dashboard — always accessible to any admin
      { index: true, element: <Dashboard /> },

      // ── Categories ───────────────────────────────────────────────────────
      {
        path: "categories",
        element: (
          <PermissionRoute module="categories" action="read">
            <CategoriesList />
          </PermissionRoute>
        ),
      },
      {
        path: "categories/add",
        element: (
          <PermissionRoute module="categories" action="create">
            <CategoryForm />
          </PermissionRoute>
        ),
      },
      {
        path: "categories/:id",
        element: (
          <PermissionRoute module="categories" action="read">
            <CategoryView />
          </PermissionRoute>
        ),
      },
      {
        path: "categories/:id/edit",
        element: (
          <PermissionRoute module="categories" action="update">
            <CategoryForm />
          </PermissionRoute>
        ),
      },

      // ── Products ─────────────────────────────────────────────────────────
      {
        path: "products",
        element: (
          <PermissionRoute module="products" action="read">
            <ProductsList />
          </PermissionRoute>
        ),
      },
      {
        path: "products/add",
        element: (
          <PermissionRoute module="products" action="create">
            <ProductForm />
          </PermissionRoute>
        ),
      },
      {
        path: "products/:id",
        element: (
          <PermissionRoute module="products" action="read">
            <ProductView />
          </PermissionRoute>
        ),
      },
      {
        path: "products/:id/edit",
        element: (
          <PermissionRoute module="products" action="update">
            <ProductForm />
          </PermissionRoute>
        ),
      },

      // ── Auctions ─────────────────────────────────────────────────────────
      {
        path: "auctions",
        element: (
          <PermissionRoute module="auctions" action="read">
            <AuctionsList />
          </PermissionRoute>
        ),
      },
      {
        path: "auctions/add",
        element: (
          <PermissionRoute module="auctions" action="create">
            <AuctionForm />
          </PermissionRoute>
        ),
      },
      {
        path: "auctions/:id",
        element: (
          <PermissionRoute module="auctions" action="read">
            <AuctionView />
          </PermissionRoute>
        ),
      },
      {
        path: "auctions/:id/edit",
        element: (
          <PermissionRoute module="auctions" action="update">
            <AuctionForm />
          </PermissionRoute>
        ),
      },

      // ── Vouchers ─────────────────────────────────────────────────────────
      {
        path: "vouchers",
        element: (
          <PermissionRoute module="vouchers" action="read">
            <VouchersList />
          </PermissionRoute>
        ),
      },
      {
        path: "vouchers/add",
        element: (
          <PermissionRoute module="vouchers" action="create">
            <VoucherForm />
          </PermissionRoute>
        ),
      },
      {
        path: "vouchers/:id",
        element: (
          <PermissionRoute module="vouchers" action="read">
            <VoucherView />
          </PermissionRoute>
        ),
      },
      {
        path: "vouchers/:id/edit",
        element: (
          <PermissionRoute module="vouchers" action="update">
            <VoucherForm />
          </PermissionRoute>
        ),
      },

      // ── Auction Requests ─────────────────────────────────────────────────
      {
        path: "auctionRequests",
        element: (
          <PermissionRoute module="auctionRequests" action="read">
            <AuctionRequestsList />
          </PermissionRoute>
        ),
      },
      {
        path: "auctionRequests/:id",
        element: (
          <PermissionRoute module="auctionRequests" action="read">
            <AuctionRequestView />
          </PermissionRoute>
        ),
      },

      // ── Contacts ─────────────────────────────────────────────────────────
      {
        path: "contacts",
        element: (
          <PermissionRoute module="contacts" action="read">
            <AdminContactList />
          </PermissionRoute>
        ),
      },
      {
        path: "contacts/:id",
        element: (
          <PermissionRoute module="contacts" action="read">
            <AdminContactView />
          </PermissionRoute>
        ),
      },

      // ── Feedback ─────────────────────────────────────────────────────────
      {
        path: "feedback",
        element: (
          <PermissionRoute module="feedback" action="read">
            <AdminFeedbackList />
          </PermissionRoute>
        ),
      },
      {
        path: "feedback/:id",
        element: (
          <PermissionRoute module="feedback" action="read">
            <AdminFeedbackView />
          </PermissionRoute>
        ),
      },

      // ── Bids / Participants / Last Offers ─────────────────────────────────
      {
        path: "bids",
        element: (
          <PermissionRoute module="bids" action="read">
            <BidsList />
          </PermissionRoute>
        ),
      },
      {
        path: "participants",
        element: (
          <PermissionRoute module="participants" action="read">
            <ParticipantsList />
          </PermissionRoute>
        ),
      },
      {
        path: "lastoffers",
        element: (
          <PermissionRoute module="lastOffers" action="read">
            <LastOfferList />
          </PermissionRoute>
        ),
      },

      // ── Users ─────────────────────────────────────────────────────────────
      {
        path: "users",
        element: (
          <PermissionRoute module="users" action="read">
            <UsersList />
          </PermissionRoute>
        ),
      },
      {
        path: "users/:id",
        element: (
          <PermissionRoute module="users" action="read">
            <UserView />
          </PermissionRoute>
        ),
      },

      // ── Admins — superAdmin-only guard is inside AdminsList itself ─────────
      { path: "admins", element: <AdminsList /> },

      // ── Scheduling / Payment ──────────────────────────────────────────────
      {
        path: "scheduling",
        element: (
          <PermissionRoute module="scheduling" action="read">
            <Scheduling />
          </PermissionRoute>
        ),
      },
      {
        path: "payment",
        element: (
          <PermissionRoute module="payment" action="read">
            <Payment />
          </PermissionRoute>
        ),
      },
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
      { path: "terms", element: <TermsAndConditions /> },
      { path: "contact", element: <Contact /> },
      { path: "cantFind", element: <CantFind /> },

      {
        path: "/last-offer-confirm/:auctionId",
        element: <LastOfferConfirmPage />,
      },

      { path: "my-profile", element: <MyProfile /> },
      { path: "my-bids", element: <MyBids /> },
      { path: "change-password", element: <ChangePassword /> },

      // ── Auth-protected auction routes ────────────────────────────────────
      // Unauthenticated users are redirected to /login with ?redirect= so they
      // land back here after signing in.
      {
        path: "/auctions/register/:productId",
        element: (
          <ProtectedRoute
            allowedRoles={["user", "admin", "superAdmin"]}
            unauthRedirect="/login"
          >
            <AuctionRegisterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/auctions/:auctionId",
        element: (
          <ProtectedRoute
            allowedRoles={["user", "admin", "superAdmin"]}
            unauthRedirect="/login"
          >
            <AuctionLivePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
