import { motion } from "motion/react";

interface ArcGaugeProps {
  value: number;          // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  danger?: boolean;
}

export function ArcGauge({
  value,
  size = 96,
  strokeWidth = 7,
  color,
  trackColor = "#F3F4F6",
  label,
  sublabel,
  danger = false,
}: ArcGaugeProps) {
  // Arc sweeps 220° (from 160° to 380° / -160° clockwise)
  const ANGLE = 220;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;

  // Convert degrees to radians, origin at top
  function polarToXY(deg: number) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const startDeg = 180 - ANGLE / 2; // 70°
  const endDeg = 180 + ANGLE / 2;   // 290°

  const start = polarToXY(startDeg);
  const end = polarToXY(endDeg);
  const trackPath = `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`;

  // Value arc
  const valueDeg = startDeg + (value / 100) * ANGLE;
  const valueEnd = polarToXY(valueDeg);
  const largeArc = (value / 100) * ANGLE > 180 ? 1 : 0;
  const valuePath =
    value <= 0
      ? ""
      : value >= 100
      ? trackPath
      : `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${valueEnd.x} ${valueEnd.y}`;

  // Color logic
  const resolvedColor =
    color ??
    (danger
      ? value > 66 ? "#EF4444" : value > 33 ? "#F59E0B" : "#16A34A"
      : "#16A34A");

  const circumference = 2 * Math.PI * r;
  const arcLength = (ANGLE / 360) * circumference;
  const valueDash = (value / 100) * arcLength;

  return (
    <div className="flex flex-col items-center" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size * 0.72 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ overflow: "visible", marginTop: 0 }}
        >
          {/* Track */}
          <path
            d={trackPath}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          {valuePath && (
            <motion.path
              d={valuePath}
              fill="none"
              stroke={resolvedColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            />
          )}
          {/* Center label */}
          <text
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.18}
            fontWeight="800"
            fill={resolvedColor}
            fontFamily="Inter, sans-serif"
          >
            {value}%
          </text>
          {sublabel && (
            <text
              x={cx}
              y={cy + size * 0.16}
              textAnchor="middle"
              fontSize={size * 0.1}
              fill="#9CA3AF"
              fontFamily="Inter, sans-serif"
            >
              {sublabel}
            </text>
          )}
        </svg>
      </div>
      {label && (
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1 text-center">
          {label}
        </p>
      )}
    </div>
  );
}
