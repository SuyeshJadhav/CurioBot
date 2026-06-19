import { useState, useEffect } from 'react';

const PIPELINE_STEPS = [
  { icon: 'lightbulb', label: 'Choosing a topic' },
  { icon: 'travel_explore', label: 'Conducting deep research' },
  { icon: 'edit_note', label: 'Writing your article' },
];

// Context-aware subtext arrays that map to your new architecture
const SUB_MESSAGES = {
  picking_topic: [
    "Scanning your interest vectors...",
    "Running novelty scoring heuristics...",
    "Checking library for duplicates...",
    "Finalizing narrative angle..."
  ],
  researching: [
    "Querying unified research MCP...",
    "Fetching encyclopedic context...",
    "Executing targeted web search...",
    "Scraping readable DOM content...",
    "Extracting key insights and facts..."
  ],
  writing_article: [
    "Structuring 5-section outline...",
    "Drafting narrative prose...",
    "Injecting human-like perspectives...",
    "Running automated fact-check pass...",
    "Formatting markdown layout..."
  ]
};

interface IgniteLoadingProps {
  currentTopic: string | null;
  generationStatus: string | null;
}

export function IgniteLoading({ currentTopic, generationStatus }: IgniteLoadingProps) {
  const [subMessageIndex, setSubMessageIndex] = useState(0);

  // Helper to determine step status
  const getStepState = (index: number, currentStatus: string | null): 'completed' | 'active' | 'pending' => {
    if (!currentStatus) return index === 0 ? 'active' : 'pending';
    const statusOrder = ['picking_topic', 'researching', 'writing_article'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    
    if (currentIndex < 0) return index === 0 ? 'active' : 'pending';
    if (currentIndex > index) return 'completed';
    if (currentIndex === index) return 'active';
    return 'pending';
  };

  // Safe fallback for current status
  const activeStatus = (generationStatus || 'picking_topic') as keyof typeof SUB_MESSAGES;
  const currentSubMessages = SUB_MESSAGES[activeStatus] || SUB_MESSAGES.picking_topic;

  // Cycle through sub-messages every 3.5 seconds to create the illusion of granular progress
  useEffect(() => {
    setSubMessageIndex(0); // Reset index when status changes

    const interval = setInterval(() => {
      setSubMessageIndex((prev) => (prev + 1) % currentSubMessages.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [activeStatus, currentSubMessages.length]);

  return (
    <div className="hero-stage">
      <div className="noise-overlay" />
      <style>{`
        @keyframes pulse-icon {
          0% { transform: scale(0.95); opacity: 0.8; }
          100% { transform: scale(1.1); opacity: 1; }
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(4px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Animated pipeline visualizer */}
      <div style={{ textAlign: 'center', maxWidth: '340px', width: '100%', margin: '0 auto' }}>
        
        {/* Main Spinner */}
        <div className="ignite-btn" style={{ cursor: 'default', margin: '0 auto 2rem' }}>
          <div className="ignite-inner">
            <span
              className="material-symbols-outlined ignite-icon"
              style={{
                fontVariationSettings: "'FILL' 1",
                animation: 'spin 1.4s linear infinite',
                fontSize: '2.5rem',
              }}
            >
              progress_activity
            </span>
          </div>
        </div>

        {/* Dynamic Headers */}
        <p style={{
          fontFamily: 'var(--font-headline)',
          fontWeight: 600,
          fontSize: '1.25rem',
          color: 'var(--ink-charcoal)',
          marginBottom: '0.5rem',
          minHeight: '1.75rem' // Prevents layout jump when text wraps
        }}>
          {currentTopic ? `Researching: ${currentTopic}` : 'Initializing Engine...'}
        </p>
        
        {/* The "Ghost Progress" rotating text */}
        <p 
          key={`${activeStatus}-${subMessageIndex}`} // Forces re-render animation on change
          style={{ 
            fontFamily: 'var(--font-body)', 
            fontSize: '0.95rem', 
            color: 'var(--ink-wash)', 
            marginBottom: '2rem',
            animation: 'fade-up 0.4s ease-out forwards',
            minHeight: '1.5rem'
          }}
        >
          {currentSubMessages[subMessageIndex]}
        </p>

        {/* Step list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {PIPELINE_STEPS.map((step, i) => {
            const stepState = getStepState(i, generationStatus);
            
            let iconName = step.icon;
            let iconColor = 'rgba(0,0,0,0.25)';
            let textColor = 'rgba(0,0,0,0.45)';
            let bg = 'var(--surface-cream)';
            let border = '1px solid var(--outline-variant)';
            let isPulsing = false;
            let shimmerStyle = {};

            if (stepState === 'completed') {
              iconName = 'check_circle';
              iconColor = 'var(--primary)'; 
              textColor = 'rgba(0,0,0,0.5)';
              bg = 'rgba(174,198,207,0.12)';
              border = '1px solid var(--primary-container)';
            } else if (stepState === 'active') {
              iconColor = 'var(--tertiary)';
              textColor = 'var(--ink-charcoal)';
              border = '2px solid var(--tertiary)';
              isPulsing = true;
              
              // Apply the active shimmer background
              bg = 'linear-gradient(90deg, var(--surface-paper) 0%, rgba(200,200,200,0.15) 50%, var(--surface-paper) 100%)';
              shimmerStyle = {
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s infinite linear'
              };
            }

            return (
              <div
                key={step.label}
                className="paper-shadow"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.65rem 1.1rem',
                  borderRadius: '8px',
                  background: bg,
                  border: border,
                  transition: 'all 0.3s ease',
                  transform: isPulsing ? 'scale(1.025)' : 'scale(1)',
                  boxShadow: isPulsing ? '0 4px 12px rgba(0,0,0,0.06)' : 'none',
                  ...shimmerStyle
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '1.25rem',
                    color: iconColor,
                    fontVariationSettings: stepState === 'completed' ? "'FILL' 1" : "'FILL' 0",
                    animation: isPulsing ? 'pulse-icon 1s infinite alternate ease-in-out' : 'none',
                  }}
                >
                  {iconName}
                </span>
                <span style={{
                  fontSize: '0.92rem',
                  fontFamily: isPulsing ? 'var(--font-headline)' : 'var(--font-body)',
                  fontWeight: isPulsing ? 600 : 400,
                  color: textColor,
                  transition: 'all 0.3s ease',
                }}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
