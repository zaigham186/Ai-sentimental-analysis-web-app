import { InputHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

interface RadioProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

/**
 * Reusable Radio Button Component
 */

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              ref={ref}
              type="radio"
              id={radioId}
              className={clsx(
                'w-4 h-4 border-gray-300',
                'text-primary-600 focus:ring-2 focus:ring-primary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                error && 'border-red-500',
                className
              )}
              aria-describedby={error ? `${radioId}-error` : undefined}
              {...props}
            />
          </div>
          <div className="ml-3 text-sm">
            <label htmlFor={radioId} className="font-medium text-gray-700">
              {label}
            </label>
          </div>
        </div>
        {error && (
          <p id={`${radioId}-error`} className="mt-1 ml-7 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';
