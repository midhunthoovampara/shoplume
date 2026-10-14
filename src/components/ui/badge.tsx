import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "brand"
    | "secondary"
    | "success"
    | "warning"
    | "danger"
    | "outline"
    | "purple";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  ...props
}: BadgeProps) {
  const base = "inline-flex items-center font-semibold tracking-wide rounded-full";
  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  };

  const variants = {
    default: "bg-slate-900 text-white",
    brand: "bg-gradient-to-r from-orange-500/10 to-rose-500/10 text-orange-700 border border-orange-300/60 font-bold",
    secondary: "bg-slate-100 text-slate-800",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/60",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/60",
    outline: "border border-slate-300 text-slate-700 bg-white",
    purple: "bg-purple-50 text-purple-700 border border-purple-200/60",
  };

  return (
    <span
      className={cn(base, sizeStyles[size], variants[variant], className)}
      {...props}
    />
  );
}
