import React from 'react';
import { AbsoluteFill } from 'remotion';
import { COPYRIGHT_TEXT, TEXT_DEFAULT, FONT_FAMILY } from '../constants';

export const Copyright: React.FC = () => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 30,
        left: 0,
        width: '100%',
        textAlign: 'center',
        fontFamily: FONT_FAMILY,
        fontSize: 24,
        color: TEXT_DEFAULT,
        opacity: 0.6,
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      {COPYRIGHT_TEXT}
    </div>
  );
};
