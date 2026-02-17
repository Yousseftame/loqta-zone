import React, { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "className"
> {
  label?: string;
  icon?: ReactNode;
  error?: string;
  helperText?: string;
  showPasswordToggle?: boolean;
  containerClassName?: string;
  inputClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      icon,
      error,
      helperText,
      showPasswordToggle = false,
      type = "text",
      containerClassName,
      inputClassName,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const inputType = showPasswordToggle && showPassword ? "text" : type;

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}

        <div className="relative group">
          {/* Glow Effect */}
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-r from-blue-500 to-blue-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity duration-300",
              isFocused && "opacity-30",
              error && "from-red-500 to-red-600",
            )}
          />

          <div className="relative">
            {/* Left Icon */}
            {icon && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                {icon}
              </div>
            )}

            {/* Input Field */}
            <input
              ref={ref}
              type={inputType}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={cn(
                "w-full py-3.5 bg-white dark:bg-gray-800 border-2 rounded-xl outline-none transition-all duration-300 text-gray-900 dark:text-white placeholder:text-gray-400",
                icon ? "pl-12" : "pl-4",
                showPasswordToggle ? "pr-12" : "pr-4",
                error
                  ? "border-red-300 dark:border-red-700 focus:border-red-500 dark:focus:border-red-400 focus:ring-4 focus:ring-red-500/10"
                  : "border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10",
                inputClassName,
              )}
              {...props}
            />

            {/* Password Toggle */}
            {showPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Helper Text or Error */}
        {(error || helperText) && (
          <p
            className={cn(
              "text-sm",
              error
                ? "text-red-600 dark:text-red-400"
                : "text-gray-500 dark:text-gray-400",
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
