import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import {
  LEAD_IN_FRAMES,
  TEXT_ACTIVE,
  TEXT_DEFAULT,
  ACTIVE_WORD_STROKE,
  ACTIVE_WORD_SHADOW,
  FONT_SIZE,
  WORD_GAP,
  FONT_FAMILY,
  TEXT_ALIGN,
  AUTHOR_FONT_SIZE,
  AUTHOR_COLOR,
  AUTHOR_MARGIN_TOP,
} from '../constants';
import type { WordTiming } from '../types';

type WordFlowProps = {
  timings: WordTiming[];
};

export const WordFlow: React.FC<WordFlowProps> = ({ timings }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const time = (frame - LEAD_IN_FRAMES) / fps;

  const bodyTimings = timings.filter((t) => !t.isAuthor && !t.isSeparator);
  const authorTimings = timings.filter((t) => t.isAuthor);
  const hasAuthor = authorTimings.length > 0;

  const renderWord = (timing: WordTiming, index: number, isAuthor = false) => {
    const isActive = time >= timing.startSec && time < timing.endSec;
    return (
      <span
        key={`${timing.token}-${index}`}
        style={{
          color: isAuthor
            ? isActive
              ? TEXT_ACTIVE
              : AUTHOR_COLOR
            : isActive
              ? TEXT_ACTIVE
              : TEXT_DEFAULT,
          WebkitTextStroke: isActive ? ACTIVE_WORD_STROKE : undefined,
          textShadow: isActive ? ACTIVE_WORD_SHADOW : undefined,
          fontFamily: FONT_FAMILY,
          fontWeight: isAuthor ? 'normal' : 'bold',
          fontSize: isAuthor ? `${AUTHOR_FONT_SIZE}px` : `${FONT_SIZE}px`,
          transition: 'color 0.1s ease, text-shadow 0.1s ease',
        }}
      >
        {timing.token}
      </span>
    );
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: TEXT_ALIGN,
          gap: `${WORD_GAP}px`,
          width: '100%',
        }}
      >
        {bodyTimings.map((t, i) => renderWord(t, i))}
      </div>

      {hasAuthor && authorTimings.length > 0 && (
        <div
          style={{
            marginTop: `${AUTHOR_MARGIN_TOP}px`,
            display: 'flex',
            justifyContent: 'flex-end',
            flexWrap: 'wrap',
            gap: `${WORD_GAP / 2}px`,
            width: '100%',
          }}
        >
          {authorTimings.map((t, i) => renderWord(t, i, true))}
        </div>
      )}
    </div>
  );
};
