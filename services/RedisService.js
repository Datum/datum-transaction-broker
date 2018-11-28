const Redis = require('ioredis');
const uuid = require('uuid/v1');
const config = require('./ConfigService');
const logger = require('../utils/Logger');

function _reconnectOnError(err) {
    var targetError = 'READONLY';
    if (err.message.slice(0, targetError.length) === targetError) {
        // Only reconnect when the error starts with "READONLY"
        return true; // or `return 1;`
    }
}

class RedisService {

  constructor() {
    this.instances = {};
  }


  async getRedisInstance() {
    let tmpRedis;
    if (this.isProd()) {
      tmpRedis = await new Redis.Cluster([
          config.redis,
        ],
        {
          redisOptions:
            {
                reconnectOnError: _reconnectOnError
            }
        }
      )
    }

      // FIXME this is for temp debug

        tmpRedis.on('connect', function () { logger.info('redis connect'); });
        tmpRedis.on('ready', function () { logger.info('redis ready'); });
        tmpRedis.on('error', function (err) { logger.info('redis error', err); });
        tmpRedis.on('close', function () { logger.info('redis close'); });
        tmpRedis.on('reconnecting', function () { logger.info('redis reconnecting'); });
        tmpRedis.on('end', function () { logger.info('redis end'); });


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
