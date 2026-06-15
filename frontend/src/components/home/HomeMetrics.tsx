import React from 'react';
import { MetricSkeleton } from '../common/Skeletons';

interface HomeMetricsProps {
  isLoadingUserData: boolean;
  historyLength: number;
  savedSketchesLength: number;
}

export function HomeMetrics({ isLoadingUserData, historyLength, savedSketchesLength }: HomeMetricsProps) {
  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '26px' }}>
      {isLoadingUserData ? (
        <>
          <MetricSkeleton />
          <MetricSkeleton />
        </>
      ) : (
        <>
          <div style={{
            flex: 1,
            background: 'var(--surface-cream)',
            border: '1px solid var(--outline-variant)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-wash)', margin: 0 }}>Articles read</p>
            <p style={{ fontFamily: 'var(--font-headline)', fontSize: '26px', fontWeight: 700, color: 'var(--ink-charcoal)', margin: 0, lineHeight: 1 }}>{historyLength}</p>
          </div>
          <div style={{
            flex: 1,
            background: 'var(--surface-cream)',
            border: '1px solid var(--outline-variant)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ink-wash)', margin: 0 }}>Saved</p>
            <p style={{ fontFamily: 'var(--font-headline)', fontSize: '26px', fontWeight: 700, color: 'var(--ink-charcoal)', margin: 0, lineHeight: 1 }}>{savedSketchesLength}</p>
          </div>
        </>
      )}
    </div>
  );
}
