import { lazy } from "react";
import ProtectedRoute from "@/components/ProtectedRoute/ProtectedRoute";
import PermissionRoute from "@/permissions/PermissionRoute";
import AuthLayout from "@/layouts/AuthLayout/AuthLayout";
import DashboardLayout from "@/layouts/DashboardLayout/DashboardLayout";
import MainLayout from "@/layouts/MainLayout/MainLayout";

// ── Auth pages ────────────────────────────────────────────────────────────────
const Login = lazy(() => import("@/pages/Auth/Login/Login"));
const Register = lazy(() => import("@/pages/Auth/Register/Register"));
const ForgetPassword = lazy(
  () => import("@/pages/Auth/ForgetPassword/ForgetPassword"),
);

// ── Admin pages ───────────────────────────────────────────────────────────────
const Dashboard = lazy(() => import("@/pages/Admin/Dashboard/Dashboard"));
const HeroSlidesList = lazy(
  () => import("@/pages/Admin/HeroSlide/HeroSlidesList"),
);
const LeftSectionList = lazy(
  () => import("@/pages/Admin/LeftSection/LeftSectionList"),
);const RightSectionList = lazy(
  () => import("@/pages/Admin/RightSection/RightSectionList"),
);
const AuctionForm = lazy(() => import("@/pages/Admin/Auctions/AuctionForm"));
const AuctionsList = lazy(() => import("@/pages/Admin/Auctions/AuctionsList"));
const AuctionView = lazy(() => import("@/pages/Admin/Auctions/AuctionView"));
const BidsList = lazy(() => import("@/pages/Admin/Biding/BidsList"));
const CategoryForm = lazy(
  () => import("@/pages/Admin/Categories/Categoryform"),
);
const CategoriesList = lazy(
  () => import("@/pages/Admin/Categories/CategoryList"),
);
const CategoryView = lazy(
  () => import("@/pages/Admin/Categories/Categoryview"),
);
const AdminContactList = lazy(
  () => import("@/pages/Admin/ContactUs/AdminContactList"),
);
const AdminContactView = lazy(
  () => import("@/pages/Admin/ContactUs/AdminContactView"),
);
const AdminFeedbackList = lazy(
  () => import("@/pages/Admin/Feedback/AdminFeedbackList"),
);
const AdminFeedbackView = lazy(
  () => import("@/pages/Admin/Feedback/AdminFeedbackView"),
);
const LastOfferList = lazy(
  () => import("@/pages/Admin/LastOffer/LastOfferList"),
);
const ParticipantsList = lazy(
  () => import("@/pages/Admin/Participants/ParticipantsList"),
);
const Payment = lazy(() => import("@/pages/Admin/Payment/Payment"));
const ProductForm = lazy(() => import("@/pages/Admin/Products/ProductForm"));
const ProductsList = lazy(() => import("@/pages/Admin/Products/ProductsList"));
const ProductView = lazy(() => import("@/pages/Admin/Products/ProductView"));
const AuctionRequestsList = lazy(
  () => import("@/pages/Admin/RequestSystem/AuctionRequestsList"),
);
const AuctionRequestView = lazy(
  () => import("@/pages/Admin/RequestSystem/AuctionRequestView"),
);
const Scheduling = lazy(() => import("@/pages/Admin/Scheduling/Scheduling"));
const AdminsList = lazy(() => import("@/pages/Admin/User/AdminsList"));
const UsersList = lazy(() => import("@/pages/Admin/User/UsersList"));
const UserView = lazy(() => import("@/pages/Admin/User/UserView"));
const VoucherForm = lazy(() => import("@/pages/Admin/Voucher/VoucherForm"));
const VouchersList = lazy(() => import("@/pages/Admin/Voucher/VoucherList"));
const VoucherView = lazy(() => import("@/pages/Admin/Voucher/VoucherView"));

// ── Main / public pages ───────────────────────────────────────────────────────
const AboutUs = lazy(() => import("@/pages/AboutUs/AboutUs"));
const AuctionLivePage = lazy(
  () => import("@/pages/AuctionLivePage/AuctionLivePage"),
);
const AuctionRegisterPage = lazy(
  () => import("@/pages/Auctionregisterpage/Auctionregisterpage"),
);
const Contact = lazy(() => import("@/pages/Contact/Contact"));
const Home = lazy(() => import("@/pages/Home/Home"));
const HowItWork = lazy(() => import("@/pages/HowItWork/HowItWork"));
const NotFound = lazy(() => import("@/pages/NotFound/NotFound"));
const TermsAndConditions = lazy(
  () => import("@/pages/TermsAndConditions/TermsAndConditions"),
);
const MyBids = lazy(() => import("@/pages/User/Bids/MyBids"));
const MyProfile = lazy(() => import("@/pages/User/Profile/MyProfile"));
const ChangePassword = lazy(
  () => import("@/pages/User/Settings/ChangePassword"),
);
const CantFind = lazy(() => import("@/pages/CantFind/CantFind"));
const LastOfferConfirmPage = lazy(
  () => import("@/pages/LastOfferConfirm/LastOfferConfirmPage"),
);

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
      {
        index: true,
        element: (
          <ProtectedRoute allowedRoles={["superAdmin"]}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      // ── Hero Slide ───────────────────────────────────────────────────────

      { path: "/admin/hero-slides", element: <HeroSlidesList /> },

      { path: "/admin/left-section", element: <LeftSectionList /> },
      { path: "/admin/right-section", element: <RightSectionList /> },

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
