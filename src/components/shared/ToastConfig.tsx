import { Toaster } from "react-hot-toast";

export const ToastConfig = () => {
  return (
    <Toaster
      position="top-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "#fff",
          color: "#1f2937",
          padding: "16px",
          borderRadius: "12px",
          boxShadow:
            "0 10px 40px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid rgba(229, 231, 235, 0.8)",
          maxWidth: "420px",
          fontSize: "14px",
          fontWeight: "500",
        },

        // Success toast
        success: {
          duration: 3500,
          style: {
            background: "linear-gradient(135deg, #fff 0%, #fef3f2 100%)",
            color: "#166534",
            border: "1px solid rgba(251, 146, 60, 0.2)",
            boxShadow:
              "0 10px 40px rgba(251, 146, 60, 0.15), 0 2px 8px rgba(251, 146, 60, 0.1)",
          },
          iconTheme: {
            primary: "#ea580c",
            secondary: "#fff",
          },
        },

        // Error toast
        error: {
          duration: 4500,
          style: {
            background: "linear-gradient(135deg, #fff 0%, #fef2f2 100%)",
            color: "#991b1b",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            boxShadow:
              "0 10px 40px rgba(239, 68, 68, 0.15), 0 2px 8px rgba(239, 68, 68, 0.1)",
          },
          iconTheme: {
            primary: "#dc2626",
            secondary: "#fff",
          },
        },

        // Loading toast
        loading: {
          style: {
            background: "linear-gradient(135deg, #fff 0%, #f0f9ff 100%)",
            color: "#1e40af",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            boxShadow:
              "0 10px 40px rgba(59, 130, 246, 0.15), 0 2px 8px rgba(59, 130, 246, 0.1)",
          },
          iconTheme: {
            primary: "#3b82f6",
            secondary: "#fff",
          },
        },
      }}
    />
  );
};

// Dark mode toast configuration
export const DarkToastConfig = () => {
  return (
    <Toaster
      position="bottom-center"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: "#1f2937",
          color: "#f9fafb",
          padding: "16px",
          borderRadius: "12px",
          boxShadow:
            "0 10px 40px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)",
          border: "1px solid rgba(55, 65, 81, 0.8)",
          maxWidth: "420px",
          fontSize: "14px",
          fontWeight: "500",
        },

        success: {
          duration: 3500,
          style: {
            background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
            color: "#86efac",
            border: "1px solid rgba(251, 146, 60, 0.3)",
            boxShadow:
              "0 10px 40px rgba(251, 146, 60, 0.2), 0 2px 8px rgba(251, 146, 60, 0.15)",
          },
          iconTheme: {
            primary: "#fb923c",
            secondary: "#1f2937",
          },
        },

        error: {
          duration: 4500,
          style: {
            background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
            color: "#fca5a5",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            boxShadow:
              "0 10px 40px rgba(239, 68, 68, 0.2), 0 2px 8px rgba(239, 68, 68, 0.15)",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#1f2937",
          },
        },

        loading: {
          style: {
            background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
            color: "#93c5fd",
            border: "1px solid rgba(59, 130, 246, 0.3)",
            boxShadow:
              "0 10px 40px rgba(59, 130, 246, 0.2), 0 2px 8px rgba(59, 130, 246, 0.15)",
          },
          iconTheme: {
            primary: "#60a5fa",
            secondary: "#1f2937",
          },
        },
      }}
    />
  );
};

// Adaptive toast that switches based on theme
export const AdaptiveToastConfig = () => {
  const isDark = document.documentElement.classList.contains("dark");

  return isDark ? <DarkToastConfig /> : <ToastConfig />;
};
