'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 relative overflow-hidden',
  {
    variants: {
      variant: {
        primary:
          'bg-emerald-500 text-ink-950 hover:bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] shine-button',
        gold:
          'bg-gradient-to-br from-gold-400 to-gold-600 text-ink-950 hover:from-gold-300 hover:to-gold-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] shine-button',
        ghost:
          'text-white/80 hover:text-white hover:bg-white/5',
        outline:
          'border border-white/10 bg-white/[0.02] text-white hover:bg-white/[0.05] hover:border-white/20',
        secondary:
          'bg-white/5 text-white hover:bg-white/10 border border-white/10',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-6 text-sm',
        lg: 'h-14 px-8 text-base',
        xl: 'h-16 px-10 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
Button.displayName = 'Button';
