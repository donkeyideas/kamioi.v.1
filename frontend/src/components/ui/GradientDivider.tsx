import { clsx } from 'clsx';

interface GradientDividerProps {
  className?: string;
  margin?: string;
}

export function GradientDivider({
  className,
  margin = '28px 0',
}: GradientDividerProps) {
  return (
    <div
      className={clsx('aurora-divider', className)}
      role="separator"
      style={{
        height: '1px',
        background:
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        margin,
      }}
    />
  );
}

export default GradientDivider;
