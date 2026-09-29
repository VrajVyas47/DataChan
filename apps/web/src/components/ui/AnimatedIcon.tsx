'use client';

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface AnimatedIconProps {
  icon: LucideIcon;
  className?: string;
  size?: number;
  animation?: 'bounce' | 'pulse' | 'wiggle' | 'spin' | 'scale';
}

export function AnimatedIcon({
  icon: Icon,
  className = '',
  size = 20,
  animation = 'scale',
}: AnimatedIconProps) {
  const getVariants = (): Variants => {
    switch (animation) {
      case 'bounce':
        return {
          hover: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 0.6 } },
          tap: { scale: 0.9 },
        };
      case 'pulse':
        return {
          hover: { scale: [1, 1.15, 1], transition: { repeat: Infinity, duration: 0.8 } },
          tap: { scale: 0.9 },
        };
      case 'wiggle':
        return {
          hover: { rotate: [0, -10, 10, -5, 5, 0], transition: { duration: 0.5 } },
          tap: { scale: 0.9 },
        };
      case 'spin':
        return {
          hover: { rotate: 360, transition: { duration: 0.8, ease: 'easeInOut' } },
          tap: { scale: 0.9 },
        };
      case 'scale':
      default:
        return {
          hover: { scale: 1.18, transition: { type: 'spring', stiffness: 400, damping: 17 } },
          tap: { scale: 0.88 },
        };
    }
  };

  return (
    <motion.span
      className="inline-flex items-center justify-center cursor-pointer select-none"
      variants={getVariants()}
      whileHover="hover"
      whileTap="tap"
    >
      <Icon size={size} className={className} />
    </motion.span>
  );
}
