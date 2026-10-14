import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "success"
    | "glow";
  size?: "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]";

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 rounded-lg gap-1.5",
      md: "text-sm px-4 py-2.5 rounded-xl gap-2",
      lg: "text-base px-6 py-3.5 rounded-xl gap-2.5 font-semibold",
      xl: "text-lg px-8 py-4 rounded-2xl gap-3 font-bold",
    };

    const variantStyles = {
      primary:
        "bg-gradient-to-r from-orange-500 via-rose-500 to-rose-600 text-white shadow-md shadow-orange-500/20 hover:from-orange-600 hover:via-rose-600 hover:to-rose-700 hover:shadow-lg hover:shadow-orange-500/30 focus:ring-orange-500",
      secondary:
        "bg-slate-900 text-white hover:bg-slate-800 shadow-sm focus:ring-slate-900",
      outline:
        "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 focus:ring-slate-400",
      ghost:
        "bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300",
      danger:
        "bg-rose-600 text-white hover:bg-rose-500 shadow-sm focus:ring-rose-500",
      success:
        "bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm focus:ring-emerald-500",
      glow:
        "bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white font-extrabold shadow-lg shadow-orange-500/30 hover:shadow-xl hover:brightness-105 active:scale-[0.98] focus:ring-rose-500",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
