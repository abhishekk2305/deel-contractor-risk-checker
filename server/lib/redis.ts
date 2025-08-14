import { Redis } from 'ioredis';
import { createChildLogger } from './logger';

const logger = createChildLogger('redis');

// Create Redis instance with fallback handling
const createRedisInstance = () => {
  if (!process.env.REDIS_URL || process.env.REDIS_URL.includes('localhost') || process.env.REDIS_URL.includes('127.0.0.1')) {
    logger.warn('Redis URL not configured or pointing to localhost, using fallback mode');
    return null;
  }

  return new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
};

const redis = createRedisInstance();

if (redis) {
  redis.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redis.on('error', (error) => {
    logger.error({ error }, 'Redis connection error');
  });
}

// Create a fallback redis interface that handles operations gracefully
const redisInterface = {
  async get(key: string): Promise<string | null> {
    if (!redis) return null;
    try {
      return await redis.get(key);
    } catch {
      return null;
    }
  },
  async set(key: string, value: string): Promise<'OK' | null> {
    if (!redis) return null;
    try {
      return await redis.set(key, value);
    } catch {
      return null;
    }
  },
  async setex(key: string, seconds: number, value: string): Promise<'OK' | null> {
    if (!redis) return null;
    try {
      return await redis.setex(key, seconds, value);
    } catch {
      return null;
    }
  },
  async incr(key: string): Promise<number> {
    if (!redis) return 1; // Fallback for rate limiting
    try {
      return await redis.incr(key);
    } catch {
      return 1;
    }
  },
  async decr(key: string): Promise<number> {
    if (!redis) return 0;
    try {
      return await redis.decr(key);
    } catch {
      return 0;
    }
  },
  async del(key: string): Promise<number> {
    if (!redis) return 1;
    try {
      return await redis.del(key);
    } catch {
      return 1;
    }
  },
  async expire(key: string, seconds: number): Promise<number> {
    if (!redis) return 1;
    try {
      return await redis.expire(key, seconds);
    } catch {
      return 1;
    }
  },
  async lpush(key: string, value: string): Promise<number> {
    if (!redis) return 1;
    try {
      return await redis.lpush(key, value);
    } catch {
      return 1;
    }
  },
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (!redis) return 1;
    try {
      return await redis.zadd(key, score, member);
    } catch {
      return 1;
    }
  }
};

export { redisInterface as redis };

// Queue management utilities
export class JobQueue {
  constructor(private queueName: string) {}

  async addJob(jobType: string, data: any, options: { delay?: number } = {}): Promise<string> {
    const jobId = `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const job = {
      id: jobId,
      type: jobType,
      data,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    if (options.delay) {
      await redis.zadd(`${this.queueName}:delayed`, Date.now() + options.delay, JSON.stringify(job));
    } else {
      await redis.lpush(this.queueName, JSON.stringify(job));
    }

    await redis.setex(`job:${jobId}`, 3600, JSON.stringify(job)); // Job info expires in 1 hour

    logger.info({ jobId, jobType }, 'Job added to queue');
    return jobId;
  }

  async getJob(jobId: string): Promise<any | null> {
    const jobData = await redis.get(`job:${jobId}`);
    return jobData ? JSON.parse(jobData) : null;
  }

  async updateJobStatus(jobId: string, status: string, result?: any): Promise<void> {
    const job = await this.getJob(jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date().toISOString();
      if (result) {
        job.result = result;
      }
      await redis.setex(`job:${jobId}`, 3600, JSON.stringify(job));
      logger.info({ jobId, status }, 'Job status updated');
    }
  }

  async processJobs(handler: (job: any) => Promise<any>): Promise<void> {
    while (true) {
      try {
        // Process delayed jobs first
        const delayedJobs = await redis.zrangebyscore(`${this.queueName}:delayed`, 0, Date.now());
        for (const jobData of delayedJobs) {
          await redis.zrem(`${this.queueName}:delayed`, jobData);
          await redis.lpush(this.queueName, jobData);
        }

        // Process regular jobs
        const jobData = await redis.brpop(this.queueName, 5); // 5 second timeout
        if (jobData) {
          const job = JSON.parse(jobData[1]);
          await this.updateJobStatus(job.id, 'processing');

          try {
            const result = await handler(job);
            await this.updateJobStatus(job.id, 'completed', result);
          } catch (error) {
            logger.error({ jobId: job.id, error }, 'Job processing failed');
            await this.updateJobStatus(job.id, 'failed', { error: error.message });
          }
        }
      } catch (error) {
        logger.error({ error }, 'Queue processing error');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
      }
    }
  }
}

export const pdfQueue = new JobQueue('pdf-generation');
export const notificationQueue = new JobQueue('notifications');
