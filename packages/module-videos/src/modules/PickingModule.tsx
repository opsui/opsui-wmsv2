import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';

const colors = {
  background: '#0F172A',
  cardBg: 'rgba(30, 41, 59, 0.95)',
  accent: '#a855f7',
  accentLight: '#c084fc',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
  binLocation: '#6b21a8',
};

// OpsUI Logo
const OpsUILogo = ({ size = 40 }: { size?: number }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentLight} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 4px 20px ${colors.accent}44`,
      }}
    >
      <span
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: size * 0.5,
          fontWeight: 800,
          color: '#fff',
        }}
      >
        O
      </span>
    </div>
    <span
      style={{
        fontFamily: 'Archivo, sans-serif',
        fontSize: size * 0.4,
        fontWeight: 700,
        color: colors.textPrimary,
      }}
    >
      OpsUI
    </span>
  </div>
);

// Industrial Card
const IndustrialCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95) 0%, rgba(76, 29, 149, 0.9) 100%)',
      border: '1px solid rgba(168, 85, 247, 0.3)',
      borderRadius: 16,
      boxShadow:
        '0 4px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 0 40px rgba(168, 85, 247, 0.1)',
      position: 'relative',
      ...style,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: -1,
        left: -1,
        width: 20,
        height: 20,
        borderTop: '2px solid rgba(168, 85, 247, 0.5)',
        borderLeft: '2px solid rgba(168, 85, 247, 0.5)',
        borderRadius: '4px 0 0 0',
      }}
    />
    <div
      style={{
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 20,
        height: 20,
        borderBottom: '2px solid rgba(168, 85, 247, 0.5)',
        borderRight: '2px solid rgba(168, 85, 247, 0.5)',
        borderRadius: '0 0 4px 0',
      }}
    />
    {children}
  </div>
);

// Progress Ring
const ProgressRing = ({ progress, size = 100 }: { progress: number; size?: number }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(168, 85, 247, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#prog-grad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
        <defs>
          <linearGradient id="prog-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#c084fc" />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 24,
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          {progress}%
        </span>
      </div>
    </div>
  );
};

// Value Badge
const ValueBadge = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [delay, delay + fps * 0.2], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 100,
        background: `linear-gradient(135deg, ${colors.accent}22 0%, ${colors.accent}11 100%)`,
        border: `1px solid ${colors.accent}44`,
        opacity,
      }}
    >
      <span style={{ color: colors.success, fontSize: 14 }}>✓</span>
      <span
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 12,
          color: colors.textPrimary,
          fontWeight: 500,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// CTA Button
const CTAButton = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const pulse = Math.sin(frame * 0.1) * 0.05 + 1;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '14px 28px',
        borderRadius: 12,
        background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentLight} 100%)`,
        boxShadow: `0 4px 20px ${colors.accent}44`,
        opacity,
        transform: `scale(${pulse})`,
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {text}
      </span>
      <span style={{ color: '#fff', fontSize: 16 }}>→</span>
    </div>
  );
};

// Intro Scene
const IntroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = interpolate(frame, [0, fps * 0.5], [30, 0], { extrapolateRight: 'clamp' });
  return (
    <div style={{ textAlign: 'center', opacity, transform: `translateY(${translateY}px)` }}>
      <OpsUILogo size={60} />
      <h2
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 24,
          fontWeight: 600,
          color: colors.textSecondary,
          margin: '24px 0 8px 0',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Warehouse Execution
      </h2>
      <h1
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 56,
          fontWeight: 800,
          color: colors.textPrimary,
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        <span
          style={{
            background: `linear-gradient(135deg, #ffffff 0%, ${colors.accent} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Smart Picking
        </span>
      </h1>
      <p
        style={{
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          fontSize: 18,
          color: colors.textSecondary,
          marginTop: 16,
          maxWidth: 400,
          margin: '16px auto 0',
        }}
      >
        Barcode-driven workflows with real-time optimization
      </p>
    </div>
  );
};

// Main Scene
const MainScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const pickItems = [
    {
      name: 'Wireless Mouse Black',
      sku: 'WM-001',
      location: 'A-12-03',
      status: 'completed' as const,
    },
    { name: 'USB-C Hub 7-Port', sku: 'HB-007', location: 'B-05-02', status: 'completed' as const },
    { name: 'Mechanical Keyboard', sku: 'KB-104', location: 'A-08-01', status: 'active' as const },
    {
      name: 'Monitor Stand Silver',
      sku: 'MS-200',
      location: 'C-02-04',
      status: 'pending' as const,
    },
  ];
  const currentItem = pickItems.find(item => item.status === 'active');
  const completedCount = pickItems.filter(item => item.status === 'completed').length;
  const progress = Math.round((completedCount / pickItems.length) * 100);

  return (
    <div style={{ opacity, display: 'flex', height: '100%', gap: 16 }}>
      {/* Left Sidebar */}
      <div style={{ width: 240 }}>
        <IndustrialCard style={{ padding: 20, height: '100%' }}>
          <div
            style={{
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 11,
                color: colors.accent,
                margin: '0 0 4px 0',
              }}
            >
              Order #
            </p>
            <h2
              style={{
                fontFamily: 'Archivo, sans-serif',
                fontSize: 20,
                fontWeight: 700,
                color: colors.textPrimary,
                margin: 0,
              }}
            >
              ORD-2024-0847
            </h2>
            <p
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 12,
                color: colors.textSecondary,
                margin: '6px 0 0 0',
              }}
            >
              TechCorp Industries
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <ProgressRing progress={progress} size={90} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: colors.textSecondary }}>Completed</span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.success,
                }}
              >
                {completedCount}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: colors.textSecondary }}>Remaining</span>
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.warning,
                }}
              >
                {pickItems.length - completedCount}
              </span>
            </div>
          </div>
        </IndustrialCard>
      </div>
      {/* Main Content */}
      <div style={{ flex: 1 }}>
        <IndustrialCard style={{ padding: 20, height: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 10,
                  color: colors.accent,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '0 0 4px 0',
                }}
              >
                Current Pick Task
              </p>
              <h2
                style={{
                  fontFamily: 'Archivo, sans-serif',
                  fontSize: 20,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                {currentItem?.name}
              </h2>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(168, 85, 247, 0.2)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <div
                style={{ width: 6, height: 6, borderRadius: '50%', background: colors.accent }}
              />
              <span
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                  color: colors.accent,
                  textTransform: 'uppercase',
                }}
              >
                In Progress
              </span>
            </div>
          </div>
          {/* Barcode */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 4,
                height: '60%',
                background: 'rgba(168, 85, 247, 0.6)',
                borderRadius: '0 2px 2px 0',
              }}
            />
            <p
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 10,
                color: colors.accent,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 6px 0',
              }}
            >
              Scan Barcode
            </p>
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 22,
                color: colors.textPrimary,
                letterSpacing: '0.15em',
                margin: 0,
              }}
            >
              {currentItem?.sku}
            </p>
          </div>
          {/* Quantity */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 24,
              padding: '16px 0',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                  margin: '0 0 8px 0',
                }}
              >
                Picked
              </p>
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 36,
                  fontWeight: 700,
                  color: colors.accent,
                  margin: 0,
                }}
              >
                0
              </p>
            </div>
            <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.3)' }}>/</div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                  margin: '0 0 8px 0',
                }}
              >
                Needed
              </p>
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 36,
                  fontWeight: 700,
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                2
              </p>
            </div>
            <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.3)' }}>|</div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                  margin: '0 0 8px 0',
                }}
              >
                On Hand
              </p>
              <p
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 36,
                  fontWeight: 700,
                  color: colors.success,
                  margin: 0,
                }}
              >
                5
              </p>
            </div>
          </div>
          {/* Bin Location */}
          <div
            style={{
              background: 'linear-gradient(135deg, #6b21a8 0%, #a855f7 50%, #6b21a8 100%)',
              backgroundSize: '200% 200%',
              borderRadius: 12,
              padding: '14px 20px',
              textAlign: 'center',
              border: '2px solid rgba(192, 132, 252, 0.5)',
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.3)',
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontSize: 10,
                color: 'rgba(255,255,255,0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                margin: '0 0 6px 0',
              }}
            >
              Go to bin location
            </p>
            <p
              style={{
                fontFamily: 'Archivo, sans-serif',
                fontSize: 28,
                fontWeight: 800,
                color: colors.textPrimary,
                letterSpacing: '0.1em',
                margin: 0,
              }}
            >
              {currentItem?.location}
            </p>
          </div>
          {/* Items List */}
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 10,
              padding: 12,
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p
              style={{
                fontSize: 10,
                color: colors.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 8px 0',
              }}
            >
              Items ({pickItems.length})
            </p>
            {pickItems.slice(0, 3).map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: 8,
                  borderRadius: 8,
                  marginBottom: 4,
                  background:
                    item.status === 'completed'
                      ? 'rgba(34, 197, 94, 0.1)'
                      : item.status === 'active'
                        ? 'rgba(168, 85, 247, 0.15)'
                        : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${item.status === 'completed' ? 'rgba(34, 197, 94, 0.3)' : item.status === 'active' ? 'rgba(168, 85, 247, 0.5)' : 'rgba(255,255,255,0.05)'}`,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background:
                      item.status === 'completed'
                        ? colors.success
                        : item.status === 'active'
                          ? colors.accent
                          : 'rgba(255,255,255,0.3)',
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    fontSize: 11,
                    color: item.status === 'completed' ? colors.success : colors.textPrimary,
                    textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                  }}
                >
                  {item.name}
                </span>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 10,
                    color: colors.textSecondary,
                  }}
                >
                  {item.location}
                </span>
              </div>
            ))}
          </div>
        </IndustrialCard>
      </div>
    </div>
  );
};

// Outro Scene
const OutroScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        textAlign: 'center',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
      }}
    >
      <OpsUILogo size={80} />
      <h2
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 32,
          fontWeight: 700,
          color: colors.textPrimary,
          margin: '32px 0 16px 0',
        }}
      >
        3x Faster Order Fulfillment
      </h2>
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <ValueBadge text="Barcode Scanning" delay={5} />
        <ValueBadge text="Route Optimization" delay={10} />
        <ValueBadge text="Real-time Sync" delay={15} />
      </div>
      <CTAButton text="Request Demo" delay={20} />
      <p
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 14,
          color: colors.accent,
          marginTop: 24,
          opacity: 0.8,
        }}
      >
        opsui.com
      </p>
    </div>
  );
};

export const PickingModule = ({ accentColor }: { accentColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 32 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.12) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
          opacity: 0.4,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '5%',
          width: 250,
          height: 250,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.accent}22 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />
      <Sequence from={0} durationInFrames={fps * 2}>
        <IntroScene />
      </Sequence>
      <Sequence from={fps * 2} durationInFrames={fps * 5}>
        <MainScene />
      </Sequence>
      <Sequence from={fps * 7}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
