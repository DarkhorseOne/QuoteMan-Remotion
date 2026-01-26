import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import {
  LEAD_IN_FRAMES,
  TEXT_ACTIVE,
  TEXT_DEFAULT,
  ACTIVE_WORD_STROKE,
  ACTIVE_WORD_SHADOW,
} from '../constants';
import type { WordTiming } from '../types';

type WordFlowProps = {
  timings: WordTiming[];
};

export const WordFlow: React.FC<WordFlowProps> = ({ timings }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const time = (frame - LEAD_IN_FRAMES) / fps;

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '20px',
        width: '100%',
      }}
    >
      {timings.map((timing, index) => {
        const isActive = time >= timing.startSec && time < timing.endSec;

        return (
          <span
            key={`${timing.token}-${index}`}
            style={{
              color: isActive ? TEXT_ACTIVE : TEXT_DEFAULT,
              WebkitTextStroke: isActive ? ACTIVE_WORD_STROKE : undefined,
              textShadow: isActive ? ACTIVE_WORD_SHADOW : undefined,
              fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              fontWeight: 'bold',
              fontSize: '70px',
              transition: 'color 0.1s ease, text-shadow 0.1s ease',
            }}
          >
            {timing.token}
          </span>
        );
      })}
    </div>
  );
};
