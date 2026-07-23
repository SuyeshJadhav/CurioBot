import React from 'react';

interface GaugeChartProps {
  value: number; // 0 to 100
  label: string;
  sublabel?: string;
  size?: number;
  strokeWidth?: number;
  unit?: string;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  label,
  sublabel,
  size = 180,
  strokeWidth = 14,
  unit = '%',
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  // Determine dynamic accent color
  let strokeColor = '#10B981'; // Emerald Green (< 60%)
  if (clampedValue >= 85) {
    strokeColor = '#EF4444'; // Red (>= 85%)
  } else if (clampedValue >= 60) {
    strokeColor = '#F59E0B'; // Amber (60% - 85%)
  }

  // SVG Arc Geometry (240 degree arc from 150° to 390°)
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = 150;
  const endAngle = 390;
  const totalAngle = endAngle - startAngle;
  const currentAngle = startAngle + (totalAngle * (clampedValue / 100));

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const backgroundPath = describeArc(center, center, radius, startAngle, endAngle);
  const progressPath = describeArc(center, center, radius, startAngle, Math.max(startAngle + 0.1, currentAngle));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '0 auto' }}>
      <div style={{ position: 'relative', width: size, height: size * 0.85 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track Arc */}
          <path
            d={backgroundPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Active Colored Progress Arc */}
          <path
            d={progressPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease',
              filter: `drop-shadow(0 0 8px ${strokeColor}66)`,
            }}
          />
        </svg>
        {/* Inner Label Container */}
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '-0.02em' }}>
            {clampedValue}
            <span style={{ fontSize: '16px', fontWeight: 500, opacity: 0.8 }}>{unit}</span>
          </div>
          <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.7, fontWeight: 600, marginTop: '2px' }}>
            {label}
          </div>
        </div>
      </div>
      {sublabel && (
        <div style={{ fontSize: '12px', color: 'var(--ink-wash, #8E8D8A)', marginTop: '-8px', fontWeight: 500 }}>
          {sublabel}
        </div>
      )}
    </div>
  );
};
