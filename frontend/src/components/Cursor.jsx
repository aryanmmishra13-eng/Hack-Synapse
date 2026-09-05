import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export const Cursor = () => {
  const [label, setLabel] = useState("");
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouch, setIsTouch] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { damping: 28, stiffness: 550 });
  const sy = useSpring(y, { damping: 28, stiffness: 550 });

  useEffect(() => {
    // Check if touch device or reduced motion
    const touchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (touchDevice || prefersReducedMotion) {
      setIsTouch(true);
      return;
    }

    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      if (!isVisible) setIsVisible(true);
    };

    const over = (e) => {
      const el = e.target;
      const interactive = el.closest("a,button,[role='button'],input,select,textarea,label,[data-cursor]");
      if (interactive) {
        setIsHovering(true);
        setLabel(interactive.getAttribute("data-cursor") || "");
      } else {
        setIsHovering(false);
        setLabel("");
      }
    };

    const leave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", move);
    window.addEventListener("mouseover", over);
    document.addEventListener("mouseleave", leave);

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      document.removeEventListener("mouseleave", leave);
    };
  }, [x, y, isVisible]);

  if (isTouch || !isVisible) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 pointer-events-none z-[99999]"
      style={{ x: sx, y: sy, translateX: "-50%", translateY: "-50%" }}
    >
      <motion.div
        animate={{
          width: isHovering ? (label ? "auto" : 32) : 8,
          height: isHovering ? (label ? "auto" : 32) : 8,
          borderRadius: label ? 2 : "50%",
          backgroundColor: isHovering ? "#FF4D00" : "#F2F0EB",
        }}
        transition={{ type: "spring", damping: 22, stiffness: 450 }}
        className="flex items-center justify-center overflow-hidden shadow-lg shadow-black/40"
      >
        {label && (
          <span className="px-2.5 py-1 text-[9px] font-mono font-black tracking-widest text-black whitespace-nowrap uppercase">
            {label}
          </span>
        )}
      </motion.div>
    </motion.div>
  );
};
