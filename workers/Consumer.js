const redisService = require('../services/RedisService');
const logger = require('../utils/Logger');
const Slave = require('./Slave');
/**
 * Consumer base class implementation
 */
class Consumer extends Slave {

  constructor(queues, execute, id, timeout = 0) {
    super();
    this.id = id;
    redisService.newRedis()
      .then((redis) => {
        this.redis = redis;
        this.queues = queues;
        this.timeout = timeout;
        this.execute = execute;
        this.waitAndExec();
      });
  }

  /**
   * @override onResumeWorld
   */
  onResumeWorld() {
    super.onResumeWorld();
    this.waitAndExec();
  }

  /**
     * async onRequest - Executed when there is a Message in channel
     *
     * @param  {type} err          Error while fetching data
     * @param  {type} payload      Incoming payload
     * @param  {type} next         function to get exeucted after onRequest is done
     */
  async onRequest(err, [channelName, message]) {
    const tmpMsg = typeof (message) === 'object' ? JSON.stringify(message) : message;
    if (!this.isValidPayload(tmpMsg)) {
      logger.error(`Consumer:${this.id}:${channelName}: Invalid payload ${tmpMsg}`);
    } else {
      if (err) {
        logger.error(`Consumer:${this.id}:${channelName}: Error while fetching transaction:${tmpMsg}\nerror:${err}`);
      }
      logger.debug(`Consumer:${this.id}:${channelName}: Processing request: ${JSON.parse(tmpMsg).id}`);
      logger.debug(`Consumer:${this.id}:${channelName}: Request: ${tmpMsg}`);
      this.execute(err, [channelName, tmpMsg])
        .finally(this.waitAndExec.bind(this))
        .catch((ex) => {
          logger.error(`Consumer:${this.id}:${channelName}: Transaction failed: ${ex}`);
          logger.error(`Consumer:${this.id}:${channelName}: Failed to Handle Msg: ${tmpMsg}`);
          this.reportFailure(JSON.parse(tmpMsg).id, ex);
        });
    }
  }

  /**
     * waitAndExec - keep watching for incoming msgs
     *
     * @return {type}  description
     */
  waitAndExec() {
    if (!this.pause) this.redis.blpop(this.queues, this.timeout, this.onRequest.bind(this));
  }

  /**
     * isValidPayload - Validating payload, every payload has to have an id
     *
     * @param  {Object}[channel, message] incoming payload
     * @return {Boolean} indicating whether a payload is valid or not
     */
  isValidPayload(message) {
    try {
      return typeof message !== 'undefined'
          && message !== null
          && typeof JSON.parse(message).id !== 'undefined';
    } catch (ex) {
      logger.error(`Failed to verify incoming request message ${message}\n${ex}`);
      return false;
    }
  }

  /**
     * reportFailure - Update the transaction id with failed status and reason
     *
     * @param  {string} id    transaction request id
     * @param  {Object} failure
     * @return {Object}         promise
     */
  reportFailure(id, error) {
    const failMsg = { status: false, error: error.message };
    return this.redis.lpush([id], JSON.stringify(failMsg));
  }

}

module.exports = Consumer;
