import { forwardRef, useState, type SelectHTMLAttributes } from 'react';
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
  color: '#F8FAFC',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '10px 36px 10px 14px',
  outline: 'none',
  transition: 'all 200ms ease',
  appearance: 'none',
  cursor: 'pointer',
  /* Arrow via encoded SVG background */
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(248,250,252,0.4)' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const focusStyle: React.CSSProperties = {
  borderColor: 'rgba(124,58,237,0.5)',
  boxShadow: '0 0 0 3px rgba(124,58,237,0.1)',
  background: 'rgba(255,255,255,0.08)',
  /* Keep the arrow */
  backgroundImage: baseStyle.backgroundImage,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: 'rgba(248,250,252,0.6)',
  marginBottom: '6px',
};

const errorTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#EF4444',
  marginTop: '4px',
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, style, ...rest }, ref) => {
    const [focused, setFocused] = useState(false);

    return (
      <div className={clsx('aurora-select-wrapper', className)}>
        {label && <label style={labelStyle}>{label}</label>}
        <select
          ref={ref}
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
            <option value="" disabled style={{ color: 'rgba(248,250,252,0.4)' }}>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
              style={{
                background: '#1a1425',
                color: opt.disabled ? 'rgba(248,250,252,0.3)' : '#F8FAFC',
              }}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p style={errorTextStyle}>{error}</p>}
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;
