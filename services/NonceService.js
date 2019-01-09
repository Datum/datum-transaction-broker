const config = require('./ConfigService');
const Web3Factory = require('./Web3Factory');
const redisService = require('./RedisService');
const logger = require('../utils/Logger');

class NonceService {

  constructor() {
    this.web3 = Web3Factory.getWeb3();
    redisService.newRedis().then((redis) => {
      this.redis = redis;
      this.calibrateNonce(config.accounts);
    });
  }

  async calibrateNonce(accounts = config.accounts) {
    logger.debug('NonceService:calibrating nonces...');
    const promises = accounts.map(async (account) => {
      const transactionCount = await this.web3.eth.getTransactionCount(account.address);
      logger.debug(`${config.appName}:NonceService::Calibrating:${account.address}`);
      logger.debug(`${config.appName}:NonceService::Calibrating:Transaction count:${transactionCount}`);
      this.redis.set(this.nonceCounterName(`${account.address}`), transactionCount);
    });
    await Promise.all(promises);
  }

  getNonce(address) {
    return this.redis.incr(this.nonceCounterName(address));
  }

  nonceCounterName(address) {
    return `${config.appName}_${address}_NONCE_COUNTER`;
  }

}

const nonceService = new NonceService();
module.exports = nonceService;
