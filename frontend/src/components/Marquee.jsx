import React from "react";
import { motion } from "framer-motion";

export const Marquee = ({
  items = [],
  speed = 35,
  reverse = false,
  className = "",
  separator = "•",
}) => {
  if (!items || items.length === 0) return null;
  const text = items.flatMap((i) => [i, separator]).join(" ");
  const repeated = `${text} `.repeat(4);

  return (
    <div className={`overflow-hidden whitespace-nowrap select-none ${className}`}>
      <motion.div
        className="inline-block"
        animate={{ x: reverse ? ["0%", "50%"] : ["0%", "-50%"] }}
        transition={{ repeat: Infinity, duration: speed, ease: "linear" }}
        style={{ willChange: "transform" }}
      >
        <span>{repeated}</span>
        <span>{repeated}</span>
      </motion.div>
    </div>
  );
};
