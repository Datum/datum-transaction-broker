const Redis = require('ioredis');
const uuid = require('uuid/v1');
const config = require('config');

class RedisService {

  constructor() {
    this.instances = {};
  }

  async newRedis() {
    const tmpid = uuid();
    const tmpRedis = await new Redis(config.redis);
    this.instances[tmpid] = tmpRedis;
    tmpRedis.id = tmpid;
    return tmpRedis;
  }

  async getDefaultRedis() {
    if (typeof this.instances.default === 'undefined') {
      const tmpRedis = await new Redis(config.redis);
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
