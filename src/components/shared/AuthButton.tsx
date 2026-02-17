import React, { type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "right",
      loading = false,
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "font-semibold rounded-xl transition-all duration-300 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary:
        "group relative bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 overflow-hidden",
      secondary:
        "bg-gray-600 hover:bg-gray-700 text-white shadow-lg shadow-gray-500/30 hover:shadow-gray-500/50",
      outline:
        "border-2 border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30",
      ghost:
        "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
    };

    const sizes = {
      sm: "py-2 px-4 text-sm",
      md: "py-3.5 px-6",
      lg: "py-4 px-8 text-lg",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          fullWidth && "w-full",
          className,
        )}
        {...props}
      >
        {/* Hover Animation for Primary Variant */}
        {variant === "primary" && (
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        )}

        {/* Loading Spinner */}
        {loading && (
          <svg
            className="animate-spin h-5 w-5 relative z-10"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Left Icon */}
        {icon && iconPosition === "left" && !loading && (
          <span
            className={cn(
              "relative z-10 transition-transform duration-300",
              variant === "primary" && "group-hover:-translate-x-1",
            )}
          >
            {icon}
          </span>
        )}

        {/* Button Text */}
        <span className="relative z-10">{children}</span>

        {/* Right Icon */}
        {icon && iconPosition === "right" && !loading && (
          <span
            className={cn(
              "relative z-10 transition-transform duration-300",
              variant === "primary" && "group-hover:translate-x-1",
            )}
          >
            {icon}
          </span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";
