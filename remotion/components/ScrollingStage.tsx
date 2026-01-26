import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { LayoutConfig } from '../types';

type ScrollingStageProps = {
  layout: LayoutConfig;
  children: React.ReactNode;
};

export const ScrollingStage: React.FC<ScrollingStageProps> = ({ layout, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let translateY = 0;

  if (layout.mode === 'scroll' && layout.scrollStartY !== undefined && layout.scrollEndY !== undefined) {
    translateY = interpolate(
      frame,
      [0, durationInFrames],
      [layout.scrollStartY, layout.scrollEndY],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  };

  if (layout.mode === 'static') {
    containerStyle.justifyContent = 'center';
  } else {
    containerStyle.transform = `translateY(${translateY}px)`;
  }

  return (
    <AbsoluteFill>
      <div style={containerStyle}>
        {children}
      </div>
    </AbsoluteFill>
  );
};
