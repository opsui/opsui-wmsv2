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
  cardBg: 'rgba(30, 41, 59, 0.9)',
  accent: '#a855f7',
  accentLight: '#c084fc',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
};

// OpsUI Logo Component
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

// Glass Card Component
const GlassCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) => (
  <div
    style={{
      background: colors.cardBg,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid rgba(168, 85, 247, 0.3)`,
      borderRadius: 16,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      ...style,
    }}
  >
    {children}
  </div>
);

// Metric Card
const MetricCard = ({
  value,
  label,
  color,
  delay = 0,
}: {
  value: string | number;
  label: string;
  color: string;
  delay?: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [delay, delay + fps * 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const translateY = interpolate(frame, [delay, delay + fps * 0.3], [20, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div style={{ padding: 20, flex: 1, opacity, transform: `translateY(${translateY}px)` }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: `linear-gradient(135deg, ${color}33 0%, ${color}11 100%)`,
            border: `1px solid ${color}4D`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: 20, height: 20, borderRadius: 4, background: color }} />
        </div>
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 36,
            fontWeight: 700,
            color: colors.textPrimary,
          }}
        >
          {value}
        </span>
        <span
          style={{
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            fontSize: 11,
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};

// Mini Chart
const MiniChart = ({
  data,
  color,
  height = 60,
}: {
  data: number[];
  color: string;
  height?: number;
}) => {
  const max = Math.max(...data);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((val, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(val / max) * 100}%`,
            background: `linear-gradient(180deg, ${color} 0%, ${color}66 100%)`,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
};

// Value Proposition Badge
const ValueBadge = ({ text, delay = 0 }: { text: string; delay?: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [delay, delay + fps * 0.2], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const scale = spring({ frame: frame - delay, fps, config: { damping: 200, stiffness: 100 } });

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
        transform: `scale(${scale})`,
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
        Warehouse Management System
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
          Command Center
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
        Real-time visibility across your entire warehouse operation
      </p>
    </div>
  );
};

// Main Dashboard Scene
const MainScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{ opacity, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Logo */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <OpsUILogo size={32} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: 20,
            background: `${colors.accent}22`,
            border: `1px solid ${colors.accent}44`,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors.accent }} />
          <span
            style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: colors.accent }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 36,
          fontWeight: 800,
          color: colors.textPrimary,
          margin: '0 0 16px 0',
        }}
      >
        <span
          style={{
            background: `linear-gradient(135deg, #ffffff 0%, ${colors.accent} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Dashboard
        </span>
      </h1>

      {/* Metrics Grid */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <MetricCard value="12" label="Active Staff" color={colors.accent} delay={0} />
        <MetricCard value="47" label="Orders/Hour" color={colors.success} delay={2} />
        <MetricCard value="156" label="Queue Depth" color={colors.warning} delay={4} />
        <MetricCard value="3" label="Exceptions" color={colors.error} delay={6} />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'flex', gap: 12, flex: 1 }}>
        <GlassCard style={{ flex: 1, padding: 16 }}>
          <h3
            style={{
              fontFamily: 'Archivo, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: 2, background: colors.accent }} />
            Throughput
          </h3>
          <MiniChart
            data={[35, 42, 38, 55, 48, 62, 58, 75, 68, 82, 78, 95]}
            color={colors.accent}
            height={80}
          />
        </GlassCard>
        <GlassCard style={{ flex: 1, padding: 16 }}>
          <h3
            style={{
              fontFamily: 'Archivo, sans-serif',
              fontSize: 12,
              fontWeight: 600,
              color: colors.textPrimary,
              margin: '0 0 12px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: 2, background: colors.success }} />
            Order Status
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Pending', value: 45, color: colors.warning },
              { label: 'Picking', value: 28, color: colors.accent },
              { label: 'Shipped', value: 68, color: colors.success },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
                <span
                  style={{
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                    fontSize: 11,
                    color: colors.textSecondary,
                    flex: 1,
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: 12,
                    fontWeight: 600,
                    color: colors.textPrimary,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

// Outro Scene with CTA
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
        Transform Your Warehouse Operations
      </h2>

      {/* Value Props */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 32,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <ValueBadge text="Real-time Analytics" delay={5} />
        <ValueBadge text="Mobile-First Design" delay={10} />
        <ValueBadge text="Enterprise Security" delay={15} />
      </div>

      {/* CTA */}
      <CTAButton text="Start Free Trial" delay={20} />

      {/* Website */}
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

export const DashboardModule = ({ accentColor }: { accentColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 40 }}>
      {/* Grid Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />

      {/* Animated gradient orb */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          right: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.accent}22 0%, transparent 70%)`,
          filter: 'blur(40px)',
          animation: 'pulse 4s ease-in-out infinite',
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
