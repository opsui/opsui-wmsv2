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
      border: '1px solid rgba(168, 85, 247, 0.3)',
      borderRadius: 16,
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
      ...style,
    }}
  >
    {children}
  </div>
);

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
      }}
    >
      <span
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 14,
          fontWeight: 600,
          color: '#fff',
          textTransform: 'uppercase',
        }}
      >
        {text}
      </span>
      <span style={{ color: '#fff', fontSize: 16 }}>→</span>
    </div>
  );
};

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
        Logistics
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
          Shipping Dock
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
        Multi-carrier shipping with instant label generation
      </p>
    </div>
  );
};

const MainScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const shipments = [
    { carrier: 'NZ Post', count: 45, status: 'ready' },
    { carrier: 'Mainfreight', count: 12, status: 'loading' },
    { carrier: 'DHL Express', count: 8, status: 'dispatched' },
  ];

  return (
    <div style={{ opacity, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <OpsUILogo size={28} />
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
      <h1
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 32,
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
          Shipping
        </span>{' '}
        Dock
      </h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Shipped Today', value: 89, color: colors.success },
          { label: 'Ready', value: 23, color: colors.accent },
          { label: 'Carriers', value: 5, color: colors.warning },
        ].map((m, i) => (
          <GlassCard key={i} style={{ flex: 1, padding: 16, textAlign: 'center' }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 24,
                fontWeight: 700,
                color: m.color,
              }}
            >
              {m.value}
            </span>
            <p
              style={{
                fontSize: 10,
                color: colors.textSecondary,
                margin: '6px 0 0 0',
                textTransform: 'uppercase',
              }}
            >
              {m.label}
            </p>
          </GlassCard>
        ))}
      </div>
      <GlassCard style={{ padding: 20, flex: 1 }}>
        <h3
          style={{
            fontFamily: 'Archivo, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: colors.textPrimary,
            margin: '0 0 12px 0',
          }}
        >
          Carrier Dispatch
        </h3>
        {shipments.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 12,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 10,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${colors.accent}33 0%, ${colors.accent}11 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: 18 }}>🚚</span>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, color: colors.textPrimary, margin: 0 }}>{s.carrier}</p>
              <p style={{ fontSize: 10, color: colors.textSecondary, margin: '2px 0 0 0' }}>
                {s.count} packages
              </p>
            </div>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                background:
                  s.status === 'dispatched'
                    ? `${colors.success}22`
                    : s.status === 'loading'
                      ? `${colors.warning}22`
                      : `${colors.accent}22`,
                color:
                  s.status === 'dispatched'
                    ? colors.success
                    : s.status === 'loading'
                      ? colors.warning
                      : colors.accent,
              }}
            >
              {s.status}
            </span>
          </div>
        ))}
      </GlassCard>
    </div>
  );
};

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
        Ship Faster, Ship Smarter
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
        <ValueBadge text="Multi-Carrier" delay={5} />
        <ValueBadge text="Auto Labels" delay={10} />
        <ValueBadge text="Track & Trace" delay={15} />
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

export const ShippingModule = ({ accentColor }: { accentColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, padding: 32 }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(168, 85, 247, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.5,
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
