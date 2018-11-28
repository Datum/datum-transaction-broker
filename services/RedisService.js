const Redis = require('ioredis');
const uuid = require('uuid/v1');
const config = require('./ConfigService');

class RedisService {

  constructor() {
    this.instances = {};
  }

  async getRedisInstance() {
    let tmpRedis;
    if (this.isProd()) {
      tmpRedis = await new Redis.Cluster([
        config.redis,
      ]);
    } else {
      tmpRedis = await new Redis(config.redis);
    }
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
