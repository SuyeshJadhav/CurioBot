import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const redisConnection = new Redis(
  process.env.REDIS_URL || "redis://127.0.0.1:6379",
  { maxRetriesPerRequest: null },
);

export const GENERATION_QUEUE_NAME = "curios-generation";

export const generationQueue = new Queue(GENERATION_QUEUE_NAME, {
  connection: redisConnection,
});

export const queueEvents = new QueueEvents(GENERATION_QUEUE_NAME, {
  connection: redisConnection,
});
