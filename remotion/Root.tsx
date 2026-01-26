import { Composition } from 'remotion';
import { QuoteVideo } from './compositions/QuoteVideo';
import { calcMetadata } from './compositions/calcMetadata';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT, FPS } from './constants';
import './style.css'; 

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="QuoteVideo"
        component={QuoteVideo}
        durationInFrames={300} 
        fps={FPS}
        width={OUTPUT_WIDTH}
        height={OUTPUT_HEIGHT}
        defaultProps={{
          id: 'q_000001', 
        }}
        calculateMetadata={calcMetadata}
      />
    </>
  );
};
