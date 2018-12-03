const Redis = require('ioredis');
const uuid = require('uuid/v1');
const config = require('./ConfigService');
const logger = require('../utils/Logger');

// function reconnectOnError(error) {
//   const targetError = 'READONLY';
//   if (error !== undefined
//     && error.message !== undefined
//      && error.message.slice(0, targetError.length) === targetError) {
//     // Only reconnect when the error starts with "READONLY"
//     return 2; // or `return 1;`
//   }
//   return false;
// }

class RedisService {

  constructor() {
    this.instances = {};
  }

  async getRedisInstance() {
    logger.info('creating redis standalone connection');
    const tmpRedis = await new Redis(config.redis);
    tmpRedis.on('connect', () => { logger.info('redis connect'); });
    tmpRedis.on('ready', () => { logger.info('redis ready'); });
    tmpRedis.on('error', (err) => { logger.error(`redis error: ${err}`); });
    tmpRedis.on('close', () => { logger.info('redis close'); });
    tmpRedis.on('reconnecting', () => { logger.info('redis reconnecting'); });
    tmpRedis.on('end', () => { logger.info('redis end'); });
    return tmpRedis;
  }

  async newRedis() {
    const tmpid = uuid();
    const tmpRedis = await this.getRedisInstance();
    this.instances[tmpid] = tmpRedis;
    tmpRedis.id = tmpid;
    return tmpRedis;
  }

  isProd() {
    return process.env.NODE_ENV === 'prod';
  }

  async getDefaultRedis() {
    if (typeof this.instances.default === 'undefined') {
      const tmpRedis = await this.getRedisInstance();
      this.instances.default = tmpRedis;
      return tmpRedis;
    }
    return this.instances.default;
  }

  getRedis(id) {
    return this.instances[id];
  }

  close(id) {
    const tmpRedis = this.instances[id];
    if (typeof tmpRedis !== 'undefined') {
      tmpRedis.disconnect();
    }
  }

}
const redisService = new RedisService();
module.exports = redisService;
