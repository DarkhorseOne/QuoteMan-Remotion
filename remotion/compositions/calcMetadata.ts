import { getAudioDurationInSeconds } from '@remotion/media-utils';
import { FPS, LEAD_IN_FRAMES, LEAD_OUT_FRAMES } from '../constants';

type Props = {
  id: string;
  tag: string;
};

export const calcMetadata = async ({ props }: { props: Props }) => {
  // Use relative path which works if running from project root
  const audioPath = `public/assets/audio/${props.tag}/${props.id}.mp3`;

  try {
    const durationSec = await getAudioDurationInSeconds(audioPath);
    const durationInFrames = Math.ceil(durationSec * FPS) + LEAD_IN_FRAMES + LEAD_OUT_FRAMES;
    return {
      durationInFrames,
      props,
    };
  } catch (err) {
    console.warn(
      `Could not calculate metadata for ${props.id}, using default duration. Error: ${err}`,
    );
    return {
      durationInFrames: 30 * 10,
      props,
    };
  }
};
