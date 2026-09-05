import React from "react";

export const DemandBar = ({ level = 0.5, demand = "MEDIUM", showLabel = true, className = "" }) => {
  const normDemand = String(demand).toUpperCase();
  const color = normDemand === "HIGH" ? "#FF4D00" : normDemand === "MEDIUM" ? "#F5A623" : "#4CAF50";
  const numLevel = typeof level === 'number' ? Math.min(Math.max(level, 0), 1) : 0.5;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1 bg-white/10 relative overflow-hidden rounded-none">
        <div
          className="absolute left-0 top-0 h-full transition-all duration-500"
          style={{ width: `${numLevel * 100}%`, backgroundColor: color }}
        />
      </div>
      {showLabel && (
        <span
          className="text-[9px] font-mono font-bold tracking-widest shrink-0"
          style={{ color }}
        >
          {normDemand}
        </span>
      )}
    </div>
  );
};
