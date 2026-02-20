import {
  forwardRef,
  useState,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { clsx } from 'clsx';

/* ---- Shared field styles ---- */

const baseFieldStyles: React.CSSProperties = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: '14px',
  color: 'var(--text-primary)',
  background: 'var(--surface-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  padding: '10px 14px',
  outline: 'none',
  transition: 'all 200ms ease',
};

const focusStyles: React.CSSProperties = {
  borderColor: 'rgba(124,58,237,0.5)',
  boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
  background: 'var(--surface-hover)',
};

const labelStyles: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
};

const errorTextStyles: React.CSSProperties = {
  fontSize: '12px',
  color: '#EF4444',
  marginTop: '4px',
};

/* ---- Input ---- */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, style, id: propId, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = propId || generatedId;
    const errorId = `${inputId}-error`;
    const [focused, setFocused] = useState(false);

    return (
      <div className={clsx('aurora-input-wrapper', className)}>
        {label && <label htmlFor={inputId} style={labelStyles}>{label}</label>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          style={{
            ...baseFieldStyles,
            ...(focused ? focusStyles : {}),
            ...(error ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
            ...style,
          }}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {error && <p id={errorId} role="alert" style={errorTextStyles}>{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';

/* ---- Textarea ---- */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, style, id: propId, ...rest }, ref) => {
    const generatedId = useId();
    const textareaId = propId || generatedId;
    const errorId = `${textareaId}-error`;
    const [focused, setFocused] = useState(false);

    return (
      <div className={clsx('aurora-textarea-wrapper', className)}>
        {label && <label htmlFor={textareaId} style={labelStyles}>{label}</label>}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          style={{
            ...baseFieldStyles,
            minHeight: '100px',
            resize: 'vertical',
            ...(focused ? focusStyles : {}),
            ...(error ? { borderColor: 'rgba(239,68,68,0.5)' } : {}),
            ...style,
          }}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {error && <p id={errorId} role="alert" style={errorTextStyles}>{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export default Input;
