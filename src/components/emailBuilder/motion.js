export const buttonMotion = {
  whileHover: { scale: 1.03, y: -2 },
  whileTap: { scale: 0.97 },
  transition: { duration: 0.18, ease: "easeOut" },
};

export const tabContentMotion = {
  initial: { opacity: 0, y: 20, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -14, scale: 0.985 },
  transition: { duration: 0.38, ease: "easeOut" },
};

export const templateListMotion = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.08,
    },
  },
};

export const templateCardMotion = {
  hidden: { opacity: 0, y: 26, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: "easeOut" } },
};

export const progressItemMotion = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

export const scrollRevealMotion = {
  initial: { opacity: 0, y: 42, scale: 0.975, filter: "blur(6px)" },
  whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

export const pageLoadMotion = {
  initial: { opacity: 0, y: 26, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.6, ease: "easeOut" },
};

export const toneCardMotion = {
  whileHover: { y: -3, scale: 1.01 },
  whileTap: { scale: 0.985 },
  transition: { duration: 0.18, ease: "easeOut" },
};

export const scrollFloatMotion = {
  initial: { opacity: 0, y: 52, scale: 0.97, filter: "blur(8px)" },
  whileInView: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
  viewport: { once: true, amount: 0.14 },
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
};

export const stepPanelMotion = {
  initial: { opacity: 0, x: 28, y: 14, scale: 0.985, filter: "blur(10px)" },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    x: -22,
    y: -8,
    scale: 0.985,
    filter: "blur(8px)",
    transition: { duration: 0.24, ease: "easeInOut" },
  },
};

export const walkthroughSwapMotion = {
  initial: { opacity: 0, y: 22, scale: 0.985, filter: "blur(8px)" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -18,
    scale: 0.985,
    filter: "blur(6px)",
    transition: { duration: 0.24, ease: "easeInOut" },
  },
};
