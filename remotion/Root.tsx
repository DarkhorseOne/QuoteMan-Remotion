import { Composition } from 'remotion';
import { z } from 'zod';
import { QuoteVideo } from './compositions/QuoteVideo';
import { calcMetadata } from './compositions/calcMetadata';
import { OUTPUT_WIDTH, OUTPUT_HEIGHT, FPS } from './constants';
import './style.css';

const quoteVideoSchema = z.object({
  id: z.string(),
  tag: z.string(),
});

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
        schema={quoteVideoSchema}
        defaultProps={{
          id: 'e0606d12b7ccbc24746967841f44f2cf',
          tag: 'uncategorized',
        }}
        calculateMetadata={calcMetadata}
      />
    </>
  );
};
