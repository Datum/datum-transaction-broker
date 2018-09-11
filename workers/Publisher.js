const redisService = require('../services/RedisService');
const logger = require('../utils/Logger');

class Publisher {

  constructor(output, id) {
    this.id = id;
    this.pause = false;
    redisService.newRedis().then((redis) => {
      this.redis = redis;
      this.outputQueue = output;
    });
  }

  pushMsg(payload, highPriority = false) {
    logger.debug(`Publisher:${this.id}:${this.outputQueue}: Handling request ${payload}`);
    if (highPriority) {
      return this.redis.rpush(this.outputQueue, payload);
    }
    return this.redis.lpush(this.outputQueue, payload);
  }

}

module.exports = Publisher;
