import { Link } from 'react-router-dom';
import { Brain } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
  linkTo?: string;
}

const SIZE_MAP = {
  sm: { icon: 'h-5 w-5', text: 'text-base' },
  md: { icon: 'h-7 w-7', text: 'text-xl' },
  lg: { icon: 'h-9 w-9', text: 'text-2xl' },
} as const;

export function Logo({
  size = 'md',
  showText = true,
  className = '',
  linkTo = '/',
}: LogoProps) {
  const { icon, text } = SIZE_MAP[size];

  return (
    <Link
      to={linkTo}
      data-testid="logo"
      aria-label="EduSphere — Go to home page"
      className={`flex items-center gap-2 ${className}`}
    >
      <Brain
        className={`${icon} text-indigo-600 dark:text-indigo-400`}
        aria-hidden="true"
      />
      {showText && (
        <span className={`${text} font-bold text-gray-900 dark:text-white`}>
          EduSphere
        </span>
      )}
    </Link>
  );
}
