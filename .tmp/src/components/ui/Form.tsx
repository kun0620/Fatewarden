import React from 'react';
import { Field } from './Primitives';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  mono?: boolean;
  right?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, mono, right, className = '', ...props }, ref) => {
    return (
      <Field label={label} hint={hint || error} right={right}>
        <input
          ref={ref}
          className={`fw-input ${mono ? 'fw-input--mono' : ''} ${className}`}
          {...props}
          aria-invalid={!!error}
        />
      </Field>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = '', ...props }, ref) => {
    return (
      <Field label={label} hint={hint || error}>
        <textarea
          ref={ref}
          className={`fw-textarea ${className}`}
          {...props}
          aria-invalid={!!error}
        />
      </Field>
    );
  }
);

Textarea.displayName = 'Textarea';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, className = '', ...props }, ref) => {
    return (
      <Field label={label} hint={hint || error}>
        <select
          ref={ref}
          className={`fw-select ${className}`}
          {...props}
          aria-invalid={!!error}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
);

Select.displayName = 'Select';
