import { Toaster } from "react-hot-toast";

/* ================== COLOR SYSTEM ================== */

const colors = {
  primary: "#2A4863",
  primaryLight: "#DBEAFE",
  success: "#16A34A",
  error: "#DC2626",
  bgLight: "#FFFFFF",
  bgDark: "#0F172A",
  textLight: "#0F172A",
  textDark: "#F8FAFC",
  borderLight: "#E2E8F0",
};

/* ================== LIGHT TOAST ================== */

export const ToastConfig = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        top: 24,
        right: 24,
      }}
      toastOptions={{
        duration: 4000,

        /* ===== Default Style ===== */
        style: {
          background: colors.bgLight,
          color: colors.textLight,
          padding: "14px 18px",
          borderRadius: "16px",
          border: `1px solid ${colors.borderLight}`,
          boxShadow: "0 12px 32px rgba(37, 99, 235, 0.08)",
          fontSize: "14px",
          fontWeight: 500,
          maxWidth: "420px",
        },

        /* ===== Success ===== */
        success: {
          duration: 3500,
          style: {
            borderLeft: `4px solid ${colors.success}`,
            boxShadow: "0 12px 32px rgba(22, 163, 74, 0.08)",
          },
          iconTheme: {
            primary: colors.success,
            secondary: "#fff",
          },
        },

        /* ===== Error ===== */
        error: {
          duration: 4500,
          style: {
            borderLeft: `4px solid ${colors.error}`,
            boxShadow: "0 12px 32px rgba(220, 38, 38, 0.08)",
          },
          iconTheme: {
            primary: colors.error,
            secondary: "#fff",
          },
        },

        /* ===== Loading ===== */
        loading: {
          style: {
            borderLeft: `4px solid ${colors.primary}`,
            boxShadow: "0 12px 32px rgba(37, 99, 235, 0.08)",
          },
          iconTheme: {
            primary: colors.primary,
            secondary: "#fff",
          },
        },
      }}
    />
  );
};

/* ================== DARK TOAST ================== */

export const DarkToastConfig = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        top: 24,
        right: 24,
      }}
      toastOptions={{
        duration: 4000,

        /* ===== Default Dark Style ===== */
        style: {
          background: colors.bgDark,
          color: colors.textDark,
          padding: "14px 18px",
          borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          fontSize: "14px",
          fontWeight: 500,
          maxWidth: "420px",
        },

        /* ===== Success ===== */
        success: {
          style: {
            borderLeft: "4px solid #22C55E",
          },
          iconTheme: {
            primary: "#22C55E",
            secondary: colors.bgDark,
          },
        },

        /* ===== Error ===== */
        error: {
          style: {
            borderLeft: "4px solid #EF4444",
          },
          iconTheme: {
            primary: "#EF4444",
            secondary: colors.bgDark,
          },
        },

        /* ===== Loading ===== */
        loading: {
          style: {
            borderLeft: `4px solid ${colors.primary}`,
          },
          iconTheme: {
            primary: colors.primary,
            secondary: colors.bgDark,
          },
        },
      }}
    />
  );
};

/* ================== ADAPTIVE TOAST ================== */

export const AdaptiveToastConfig = () => {
  const isDark = document.documentElement.classList.contains("dark");
  return isDark ? <DarkToastConfig /> : <ToastConfig />;
};
