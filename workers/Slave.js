
const config = require('config');
const COMMANDS = require('../constants');
const redisService = require('../services/RedisService');
const logger = require('../utils/Logger');
/**
 * Slaves are waiting for the overseer in patiance, obaying his COMMANDS histation.
 */
class Slave {

  constructor() {
    this.pause = false;
    redisService.newRedis()
      .then((redis) => {
        this.seerRedis = redis;
        this.subscribeToOverseer();
      });
  }

  onResumeWorld() {
    this.pause = false;
  }

  onStopWorld() {
    this.pause = true;
  }

  subscribeToOverseer() {
    this.seerRedis.subscribe(config.queues.overseer, (err) => {
      if (err) logger.error(`Slave: error while listening to overseer: ${err}`);
      this.seerRedis.on('message', (channel, message) => {
        logger.debug(`this.id: ${channel}: ${message}`);
        switch (message) {
          case COMMANDS.stopWorld:
            this.onStopWorld();
            break;
          case COMMANDS.resumeWorld:
            this.onResumeWorld();
            break;
          default:
            logger.error(`${this.id}: Unknown command ${message}`);
        }
      });
    }).catch((err) => {
      logger.error(`Consumer: failed to subscribe to overseer: ${err}`);
    });
  }

}

module.exports = Slave;
