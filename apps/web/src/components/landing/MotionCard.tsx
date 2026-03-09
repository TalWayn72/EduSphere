import { motion } from 'framer-motion';
import { useReducedMotion } from '@/providers/ReducedMotionProvider';

interface MotionCardProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export function MotionCard({ children, delay = 0, className }: MotionCardProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
