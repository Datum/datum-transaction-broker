const logger = require('../utils/Logger');
const Web3Factory = require('../services/Web3Factory');
const nonceService = require('../services/NonceService');
const redisService = require('../services/RedisService');
const MSGS = require('../constants');
/**
 * check the status of RPC connection and incase of
 * failure it will issue a stop the world command to all workers
 */
class Overseer {

  constructor(channel, intervals = 500, onfailIntervals = 1000) {
    this.pause = false;
    this.worldStatus = true;
    this.channel = channel;
    this.web3 = Web3Factory.getWeb3();
    this.intervals = intervals;
    this.onfailIntervals = onfailIntervals;
    redisService.newRedis()
      .then((redis) => {
        this.redis = redis;
        this.intervalID = setInterval(this.checkRPC.bind(this), this.intervals);
      });
  }

  async checkRPC() {
    if (!this.pause) {
      this.web3.eth.net.isListening()
        .then((status) => {
          logger.debug(`Overseer: network status: ${status}`);
          if (!this.worldStatus) {
            this.resumeWorld();
          }
        }).catch((ex) => {
          if (!this.worldStatus) {
            logger.error(`Overseer: Error while checking for network: ${ex}`);
          }
          if (this.worldStatus) {
            this.stopTheWorld();
          }
        });
    }
  }

  stopTheWorld() {
    logger.debug('Overseer: Stopping the world');
    this.worldStatus = false;
    this.redis.publish(this.channel, MSGS.stopWorld);
  }

  resumeWorld() {
    logger.debug('Overseer: Resuming world');
    nonceService.calibrateNonce()
      .then(() => {
        this.redis.publish(this.channel, MSGS.resumeWorld);
        this.worldStatus = true;
      })
      .catch((err) => {
        logger.error(`Overseer: Failed to calibrate nonc: ${err}`);
        this.stopTheWorld();
      });
  }

  pause() {
    logger.debug('Overseer: Paused');
    this.pause = true;
  }

  resume() {
    logger.debug('Overseer: Resumed');
    this.pause = false;
  }

}

module.exports = Overseer;
