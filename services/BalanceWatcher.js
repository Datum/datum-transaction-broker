const redisService = require('./RedisService');
const config = require('./ConfigService');
const web3Factory = require('./Web3Factory');
const logger = require('../utils/Logger');

class BalanceWatcher {

  constructor() {
    this.web3 = web3Factory.getWeb3();
    this.settings = config.balanceWatcher === undefined ? {
      timeout: 86400, // 24 hours
      minBalance: 2000,
    } : config.balanceWatcher;

    redisService.newRedis().then(
      (redis) => {
        this.redis = redis;
      },
    );
  }

  async checkBalance(account) {
    if (this.redis !== undefined) {
      const balance = await this.web3.eth.getBalance(account);
      const exp = await this.isExp();
      const belowBalance = (this.web3.utils.fromWei(balance) < this.settings.minBalance);
      if (belowBalance && exp) {
        logger.error(`Insufficient Balance, Account: ${account}, current balance: ${balance}`);
        this.resgisterTimeout();
      }
    }
  }

  async resgisterTimeout() {
    this.redis.setex(`${config.appName}_balancewatcher`, this.settings.timeout, 'true');
  }

  async isExp() {
    const status = await this.redis.get(`${config.appName}_balancewatcher`);
    return (status === null);
  }

}

const bw = new BalanceWatcher();
module.exports = bw;
