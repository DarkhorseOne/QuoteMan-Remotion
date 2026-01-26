import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import type { LayoutConfig } from '../types';
import { PADDING_HORIZONTAL, PADDING_VERTICAL, COPYRIGHT_HEIGHT } from '../constants';

type ScrollingStageProps = {
  layout: LayoutConfig;
  children: React.ReactNode;
};

export const ScrollingStage: React.FC<ScrollingStageProps> = ({ layout, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  let translateY = 0;

  if (
    layout.mode === 'scroll' &&
    layout.scrollStartY !== undefined &&
    layout.scrollEndY !== undefined
  ) {
    translateY = interpolate(
      frame,
      [0, durationInFrames],
      [layout.scrollStartY, layout.scrollEndY],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      },
    );
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxSizing: 'border-box',
    paddingLeft: PADDING_HORIZONTAL,
    paddingRight: PADDING_HORIZONTAL,
    paddingTop: layout.mode === 'static' ? PADDING_VERTICAL : 0,
    paddingBottom: layout.mode === 'static' ? PADDING_VERTICAL + COPYRIGHT_HEIGHT : 0,
  };

  if (layout.mode === 'static') {
    containerStyle.justifyContent = 'center';
  } else {
    containerStyle.transform = `translateY(${translateY}px)`;
  }

  return (
    <AbsoluteFill>
      <div style={containerStyle}>{children}</div>
    </AbsoluteFill>
  );
};
