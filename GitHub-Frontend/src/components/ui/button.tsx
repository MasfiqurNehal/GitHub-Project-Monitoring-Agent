import * as React from "react"
import { cn } from "./card"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    const base = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40 active:scale-95";

    const variants = {
      default: "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20",
      secondary: "bg-slate-800 hover:bg-slate-700/80 text-slate-200 border border-slate-700/60",
      outline: "border border-slate-700 hover:bg-slate-800 text-slate-300",
      ghost: "hover:bg-slate-800 text-slate-400 hover:text-slate-200",
      danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-500/20",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-9 px-4 text-xs",
      lg: "h-11 px-6 text-sm",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
)
Button.displayName = "Button"
