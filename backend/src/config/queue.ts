import Bull from 'bull';
import { env } from './env';

export const postQueue = new Bull('post-publishing', env.redisUrl, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60_000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export default postQueue;
