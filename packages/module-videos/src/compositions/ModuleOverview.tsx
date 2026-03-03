import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion';
import type { ReactNode, FC } from 'react';

type ModuleOverviewProps = {
  moduleName: string;
  description: string;
  features: string[];
  accentColor: string;
  moduleComponent: FC<{ accentColor: string }>;
};

const TitleScene = ({ moduleName, accentColor }: { moduleName: string; accentColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const opacity = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const slideUp = interpolate(frame, [0, fps * 0.5], [50, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div
        style={{
          transform: `scale(${scale}) translateY(${slideUp}px)`,
          opacity,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 80,
            height: 80,
            backgroundColor: accentColor,
            borderRadius: 16,
            marginBottom: 24,
            marginLeft: 'auto',
            marginRight: 'auto',
            boxShadow: `0 0 60px ${accentColor}40`,
          }}
        />
        <h1
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            textShadow: `0 0 40px ${accentColor}30`,
          }}
        >
          {moduleName}
        </h1>
      </div>
    </AbsoluteFill>
  );
};

const DescriptionScene = ({
  description,
  accentColor,
}: {
  description: string;
  accentColor: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div style={{ opacity, textAlign: 'center', maxWidth: 1200, padding: 40 }}>
        <p
          style={{
            fontSize: 48,
            color: 'white',
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {description}
        </p>
        <div
          style={{
            width: 100,
            height: 4,
            backgroundColor: accentColor,
            marginTop: 40,
            marginLeft: 'auto',
            marginRight: 'auto',
            borderRadius: 2,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

const FeaturesScene = ({ features, accentColor }: { features: string[]; accentColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div style={{ textAlign: 'left', paddingLeft: 100 }}>
        <h2
          style={{
            fontSize: 36,
            color: accentColor,
            marginBottom: 40,
            opacity: interpolate(frame, [0, fps * 0.2], [0, 1], {
              extrapolateRight: 'clamp',
            }),
          }}
        >
          KEY FEATURES
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {features.map((feature, index) => {
            const delay = index * fps * 0.15;
            const featureOpacity = interpolate(frame, [delay, delay + fps * 0.2], [0, 1], {
              extrapolateRight: 'clamp',
              extrapolateLeft: 'clamp',
            });
            const featureX = interpolate(frame, [delay, delay + fps * 0.2], [30, 0], {
              extrapolateRight: 'clamp',
              extrapolateLeft: 'clamp',
            });

            return (
              <div
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  opacity: featureOpacity,
                  transform: `translateX(${featureX}px)`,
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: accentColor,
                    borderRadius: '50%',
                    boxShadow: `0 0 20px ${accentColor}60`,
                  }}
                />
                <span
                  style={{
                    fontSize: 40,
                    color: 'white',
                    fontWeight: 500,
                  }}
                >
                  {feature}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const ClosingScene = ({ moduleName, accentColor }: { moduleName: string; accentColor: string }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const opacity = interpolate(frame, [0, fps * 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F172A',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          opacity,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: 56,
            fontWeight: 'bold',
            color: 'white',
            margin: 0,
            marginBottom: 20,
          }}
        >
          {moduleName}
        </h1>
        <p
          style={{
            fontSize: 32,
            color: accentColor,
            margin: 0,
          }}
        >
          OpsUI Warehouse Management System
        </p>
      </div>
    </AbsoluteFill>
  );
};

const FadeWrapper = ({ children }: { children: ReactNode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame, [0, fps * 0.2], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return <div style={{ opacity, width: '100%', height: '100%' }}>{children}</div>;
};

export const ModuleOverview = ({
  moduleName,
  description,
  features,
  accentColor,
  moduleComponent: ModuleComponent,
}: ModuleOverviewProps) => {
  const { fps } = useVideoConfig();

  const sceneDuration = fps * 1.5; // 1.5 seconds per scene

  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A' }}>
      {/* Title Scene */}
      <Sequence from={0} durationInFrames={sceneDuration}>
        <FadeWrapper>
          <TitleScene moduleName={moduleName} accentColor={accentColor} />
        </FadeWrapper>
      </Sequence>

      {/* Module Visualization */}
      <Sequence from={sceneDuration} durationInFrames={sceneDuration}>
        <FadeWrapper>
          <ModuleComponent accentColor={accentColor} />
        </FadeWrapper>
      </Sequence>

      {/* Description Scene */}
      <Sequence from={sceneDuration * 2} durationInFrames={sceneDuration}>
        <FadeWrapper>
          <DescriptionScene description={description} accentColor={accentColor} />
        </FadeWrapper>
      </Sequence>

      {/* Features Scene */}
      <Sequence from={sceneDuration * 3} durationInFrames={sceneDuration}>
        <FadeWrapper>
          <FeaturesScene features={features} accentColor={accentColor} />
        </FadeWrapper>
      </Sequence>

      {/* Closing Scene */}
      <Sequence from={sceneDuration * 4} durationInFrames={sceneDuration}>
        <FadeWrapper>
          <ClosingScene moduleName={moduleName} accentColor={accentColor} />
        </FadeWrapper>
      </Sequence>
    </AbsoluteFill>
  );
};
