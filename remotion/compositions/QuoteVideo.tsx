import { AbsoluteFill, Audio, staticFile, useVideoConfig } from 'remotion';
import { WordFlow } from '../components/WordFlow';
import { ScrollingStage } from '../components/ScrollingStage';
import { BG_COLOR, PADDING_HORIZONTAL, PADDING_VERTICAL, LEAD_IN_FRAMES } from '../constants';
import { WordTiming, LayoutConfig } from '../types';
import React, { useEffect, useState } from 'react';

// Props passed to the component
type QuoteVideoProps = {
  id: string;
};

export const QuoteVideo: React.FC<QuoteVideoProps> = ({ id }) => {
  const [timings, setTimings] = useState<WordTiming[] | null>(null);
  const [layout, setLayout] = useState<LayoutConfig | null>(null);
  const [handle] = useState(() =>  {
      if (typeof window !== 'undefined' && 'remotion_delayRender' in window) {
           return (window as any).remotion_delayRender();
      }
      return null;
  });

  useEffect(() => {
    const loadData = async () => {
        try {
            const timingRes = await fetch(staticFile(`assets/timing/${id}.json`));
            if (!timingRes.ok) throw new Error(`Timing 404: ${timingRes.statusText}`);
            const timingData = await timingRes.json();
            
            const layoutRes = await fetch(staticFile(`assets/layout/${id}.json`));
            if (!layoutRes.ok) throw new Error(`Layout 404: ${layoutRes.statusText}`);
            const layoutData = await layoutRes.json();
            
            setTimings(timingData);
            setLayout(layoutData);
            
            if (handle) {
                 (window as any).remotion_continueRender(handle);
            }
        } catch (e) {
            console.error("Failed to load assets", e);
             if (handle) {
                 (window as any).remotion_continueRender(handle);
            }
        }
    };
    
    loadData();
  }, [id, handle]);

  if (!timings || !layout) {
    return null; 
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BG_COLOR }}>
      <Audio src={staticFile(`assets/audio/${id}.mp3`)} />
      
      <div
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            padding: `${PADDING_VERTICAL}px ${PADDING_HORIZONTAL}px`,
            boxSizing: 'border-box',
            fontFamily: 'sans-serif', 
        }}
      >
          <ScrollingStage layout={layout}>
            <WordFlow timings={timings} />
          </ScrollingStage>
      </div>
    </AbsoluteFill>
  );
};
