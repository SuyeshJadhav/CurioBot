import React from 'react';

export function Skeleton({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        height: '100%',
        width: '100%',
        minHeight: '10px',
        ...style
      }}
    />
  );
}

export function MetricSkeleton() {
  return (
    <div className="metric" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Skeleton style={{ height: '11px', width: '50%' }} />
      <Skeleton style={{ height: '24px', width: '80%', marginTop: '4px' }} />
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
      <Skeleton style={{ height: '14px', width: '30%' }} />
      <Skeleton style={{ height: '12px', width: '90%', marginTop: '4px' }} />
      <Skeleton style={{ height: '12px', width: '70%' }} />
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <div>
        <Skeleton style={{ height: '18px', width: '120px', borderRadius: '10px', marginBottom: '1rem' }} />
        <Skeleton style={{ height: '2.5rem', width: '70%', marginBottom: '0.5rem' }} />
        <Skeleton style={{ height: '1.25rem', width: '40%' }} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        <Skeleton style={{ height: '14px', width: '100%' }} />
        <Skeleton style={{ height: '14px', width: '95%' }} />
        <Skeleton style={{ height: '14px', width: '97%' }} />
        <Skeleton style={{ height: '14px', width: '80%' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        <Skeleton style={{ height: '14px', width: '98%' }} />
        <Skeleton style={{ height: '14px', width: '100%' }} />
        <Skeleton style={{ height: '14px', width: '90%' }} />
        <Skeleton style={{ height: '14px', width: '60%' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
        <Skeleton style={{ height: '14px', width: '100%' }} />
        <Skeleton style={{ height: '14px', width: '95%' }} />
        <Skeleton style={{ height: '14px', width: '75%' }} />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton style={{ height: '13px', width: '60%' }} />
            <Skeleton style={{ height: '10px', width: '30%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarRecentSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', padding: '0 8px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
          <Skeleton style={{ height: '12px', width: '12px', borderRadius: '3px', flexShrink: 0 }} />
          <Skeleton style={{ height: '11px', width: '75%' }} />
        </div>
      ))}
    </div>
  );
}

export function InterestSkeleton() {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="interest-tag" style={{ border: 'none', margin: 0, padding: 0, background: 'transparent' }}>
          <Skeleton style={{ height: '32px', width: '110px' }} />
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton style={{ height: '13px', width: '25%' }} />
          <Skeleton style={{ height: '11px', width: '50%', marginBottom: '4px' }} />
          <Skeleton style={{ height: '30px', width: '100%' }} />
        </div>
      ))}
    </div>
  );
}
