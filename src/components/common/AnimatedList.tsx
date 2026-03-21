import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode[];
  staggerDelay?: number;
  className?: string;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } },
};

export const AnimatedList: React.FC<Props> = ({ children, className = '' }) => (
  <motion.div
    variants={container}
    initial="hidden"
    animate="show"
    className={className}
  >
    {React.Children.map(children, (child, i) => (
      <motion.div key={i} variants={item}>
        {child}
      </motion.div>
    ))}
  </motion.div>
);
