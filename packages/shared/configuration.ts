import { config } from 'dotenv';
config();
config({ path: '../../.env' });
// config({ path: '../../.env.local' });
export default () => ({
  JWT_SECRET: String(process.env.JWT_SECRET),
  JWT_EXPIRE: String(process.env.JWT_EXPIRE),
  STORY_RPC_URL: String(process.env.STORY_RPC_URL),
  MONGODB_URI: String(process.env.MONGODB_URI),
  MAX_RETRY: 10,
  SERVER_URL:
    String(process.env.SERVER_URL) || 'https://beta-api.storyname.space',
  PORTS: {
    API_SERVICE: Number(process.env.API_PORT),
    ONCHAIN_QUEUE_SERVICE: Number(process.env.ONCHAIN_QUEUE_PORT),
    ONCHAIN_WORKER_SERVICE: Number(process.env.ONCHAIN_WORKER_PORT),
  },

  REDIS: {
    HOST: String(process.env.REDIS_HOST),
    PORT: Number(process.env.REDIS_PORT),
  },

  BLOCK: {
    BEGIN: Number(process.env.BLOCK_BEGIN),
    STEP: Number(process.env.BLOCK_STEP),
  },
  FILE_STORAGE_PATH: process.env.FILE_STORAGE_PATH || './uploads', // Path to store uploaded files
  IMAGE_DIMENSIONS: {
    logo: {
      width: parseInt(process.env.LOGO_WIDTH, 10) || 150,
      height: parseInt(process.env.LOGO_HEIGHT, 10) || 150,
    },
    banner: {
      width: parseInt(process.env.BANNER_WIDTH, 10) || 1200,
      height: parseInt(process.env.BANNER_HEIGHT, 10) || 500,
    },
  },

  //S3 Configuration
  S3_KEY: String(process.env.KEY_S3_ACCESS_KEY_ID),
  S3_SECRET: String(process.env.KEY_S3_SECRET_ACCESS_KEY),
  S3_BUCKET: String(process.env.KEY_S3_BUCKET),
  S3_REGION: String(process.env.KEY_S3_REGION),
  S3_ENDPOINT: String(process.env.KEY_S3_GATEWAY),
});
