import { forwardRef, useState, useId, type SelectHTMLAttributes } from 'react';
import { clsx } from 'clsx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const baseStyle: React.CSSProperties = {
  width: '100%',
  fontFamily: 'inherit',
  fontSize: '14px',
  color: 'var(--text-primary)',
  background: 'var(--surface-input)',
  border: '1px solid var(--border-subtle)',
  borderRadius: '8px',
  padding: '10px 36px 10px 14px',
  outline: 'none',
  transition: 'all 200ms ease',
  appearance: 'none',
  cursor: 'pointer',
  /* Arrow via encoded SVG background */
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(148,163,184,0.6)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const focusStyle: React.CSSProperties = {
  borderColor: 'rgba(124,58,237,0.5)',
  boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
  background: 'var(--surface-hover)',
  /* Keep the arrow */
  backgroundImage: baseStyle.backgroundImage,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
};

const errorTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#EF4444',
  marginTop: '4px',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, style, id: propId, ...rest }, ref) => {
    const generatedId = useId();
    const selectId = propId || generatedId;
    const errorId = `${selectId}-error`;
    const [focused, setFocused] = useState(false);

    return (
      <div className={clsx('aurora-select-wrapper', className)}>
        {label && <label htmlFor={selectId} style={labelStyle}>{label}</label>}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          style={{
            ...baseStyle,
            ...(focused ? focusStyle : {}),
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
        >
          {placeholder && (
            <option value="" disabled style={{ color: 'var(--text-muted)' }}>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              style={{
                background: 'var(--dark-card-solid)',
                color: opt.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
              }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p id={errorId} role="alert" style={errorTextStyle}>{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
