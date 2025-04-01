import { config } from 'dotenv';
config();
config({ path: '../../.env' });

export default () => ({
  JWT_SECRET: String(process.env.JWT_SECRET),
  JWT_EXPIRE: String(process.env.JWT_EXPIRE),
  MONGODB_URI: String(process.env.MONGODB_URI),

  SERVER_URL: String(process.env.SERVER_URL),
  PORT: {
    API: Number(process.env.API_PORT),
    AI: Number(process.env.AI_PORT),
  },

  REDIS: {
    HOST: String(process.env.REDIS_HOST),
    PORT: Number(process.env.REDIS_PORT),
  },
});
