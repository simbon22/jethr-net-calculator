import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, useReducedMotion } from 'framer-motion';

const nf = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const euro = (n: number) => nf.format(Math.round(n));

export const percentuale = (n: number) =>
  `${(n * 100).toFixed(1).replace('.', ',')}%`;

interface AnimatedNumberProps {
  value: number;
  className?: string;
  prefix?: string;
}

/**
 * Il numero non compare: ci arriva.
 * Una molla interpola dal valore precedente a quello nuovo, così le cifre
 * scorrono durante il ricalcolo invece di sostituirsi di scatto.
 */
export function AnimatedNumber({ value, className = '', prefix = '' }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  const motion = useMotionValue(0);
  const spring = useSpring(motion, {
    stiffness: 90,
    damping: 20,
    mass: 0.7,
    restDelta: 0.5,
  });

  useEffect(() => {
    if (reduce) {
      if (ref.current) ref.current.textContent = prefix + euro(value);
      return;
    }
    motion.set(value);
  }, [value, motion, reduce, prefix]);

  useEffect(() => {
    if (reduce) return;
    return spring.on('change', (v) => {
      if (ref.current) ref.current.textContent = prefix + euro(v);
    });
  }, [spring, reduce, prefix]);

  return <span ref={ref} className={`tnum ${className}`}>{prefix + euro(value)}</span>;
}
