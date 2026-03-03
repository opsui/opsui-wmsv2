import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

const colors = {
  background: '#0F172A',
  cardBg: 'rgba(30, 41, 59, 0.9)',
  accent: '#a855f7',
  textPrimary: '#ffffff',
  textSecondary: '#94a3b8',
  success: '#22c55e',
  warning: '#fbbf24',
  error: '#ef4444',
};
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

export const HRModule = ({ accentColor }: { accentColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 200, stiffness: 100 } });

  const staff = [
    { name: 'Sarah Chen', role: 'Warehouse Lead', status: 'active' },
    { name: 'Mike Johnson', role: 'Picker', status: 'active' },
    { name: 'Emma Davis', role: 'Packer', status: 'break' },
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.background,
        padding: 40,
        opacity,
        transform: `scale(${scale})`,
      }}
    >
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
      <h1
        style={{
          fontFamily: 'Archivo, sans-serif',
          fontSize: 48,
          fontWeight: 800,
          color: colors.textPrimary,
          margin: '0 0 24px 0',
        }}
      >
        <span
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          HR
        </span>{' '}
        & Payroll
      </h1>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Staff', value: 24, color: colors.success },
          { label: 'On Leave', value: 3, color: colors.warning },
          { label: 'Open Roles', value: 5, color: colors.accent },
        ].map((m, i) => (
          <GlassCard key={i} style={{ flex: 1, padding: 20, textAlign: 'center' }}>
            <span
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 28,
                fontWeight: 700,
                color: m.color,
              }}
            >
              {m.value}
            </span>
            <p
              style={{
                fontSize: 11,
                color: colors.textSecondary,
                margin: '8px 0 0 0',
                textTransform: 'uppercase',
              }}
            >
              {m.label}
            </p>
          </GlassCard>
        ))}
      </div>
      <GlassCard style={{ padding: 24, flex: 1 }}>
        <h3
          style={{
            fontFamily: 'Archivo, sans-serif',
            fontSize: 16,
            fontWeight: 600,
            color: colors.textPrimary,
            margin: '0 0 16px 0',
          }}
        >
          Team Status
        </h3>
        {staff.map((s, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 16,
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${colors.accent}33 0%, ${colors.accent}11 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 16,
                  fontWeight: 600,
                  color: colors.accent,
                }}
              >
                {s.name.charAt(0)}
              </span>
            </div>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  fontSize: 14,
                  color: colors.textPrimary,
                  margin: 0,
                }}
              >
                {s.name}
              </p>
              <p style={{ fontSize: 11, color: colors.textSecondary, margin: '2px 0 0 0' }}>
                {s.role}
              </p>
            </div>
            <span
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 10,
                fontFamily: 'JetBrains Mono, monospace',
                background: s.status === 'active' ? `${colors.success}22` : `${colors.warning}22`,
                color: s.status === 'active' ? colors.success : colors.warning,
              }}
            >
              {s.status}
            </span>
          </div>
        ))}
      </GlassCard>
    </AbsoluteFill>
  );
};
