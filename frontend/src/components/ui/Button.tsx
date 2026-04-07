import React from 'react';
import { motion } from 'framer-motion';
import bloadGif from '@/assets/load/bload.gif';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  primary:
    'bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-sm hover:from-violet-700 hover:to-indigo-600 hover:shadow-md focus-visible:ring-4 focus-visible:ring-indigo-500/20',
  secondary:
    'bg-white text-indigo-700 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/70 focus-visible:ring-4 focus-visible:ring-indigo-500/15',
  outline:
    'bg-white text-indigo-700 border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/60 focus-visible:ring-4 focus-visible:ring-indigo-500/15',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-slate-300/40',
  danger:
    'bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md focus-visible:ring-4 focus-visible:ring-red-500/20',
};

const sizeClasses: Record<string, string> = {
  sm: 'min-h-12 px-4 py-3 text-sm rounded-xl',
  md: 'min-h-12 px-6 py-3 text-sm rounded-xl',
  lg: 'min-h-14 px-8 py-4 text-base rounded-xl',
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <motion.button
      whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`
        inline-flex items-center justify-center gap-2 font-semibold
        whitespace-nowrap transition-all duration-300 outline-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || isLoading}
      {...(props as React.ComponentProps<typeof motion.button>)}
    >
      {isLoading ? (
        <img src={bloadGif} alt="Loading" className="h-5 w-5 object-contain" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </motion.button>
  );
};

export default Button;
