const redisService = require('./RedisService');
const config = require('./ConfigService');
const web3Factory = require('./Web3Factory');
const logger = require('../utils/Logger');
const storageContract = require('./StorageContract');

class BalanceWatcher {

  constructor() {
    this.WALLET_BALANCE = 'wallet';
    this.DEPOSITE_BALANCE = 'deposited';

    this.web3 = web3Factory.getWeb3();
    this.settings = config.balanceWatcher === undefined ? {
      timeout: 86400, // 24 hours
      minWalletBalance: 2000,
      minDepostedBalance: 2000,
    } : config.balanceWatcher;

    redisService.newRedis().then(
      (redis) => {
        this.redis = redis;
      },
    );
  }

  async checkBalance(account) {
    if (this.redis !== undefined) {
      const [walletBalance, depositedBalance] = await this.getBalances(account);
      logger.debug(`Account Balances: ${walletBalance}:${depositedBalance}`);
      const result = this.examinBalances(walletBalance, depositedBalance);
      this.shouldAlert(this.WALLET_BALANCE, walletBalance, result.walletBalanceOverdrawn, account);
      this.shouldAlert(this.DEPOSITE_BALANCE, depositedBalance, result.depositBalanceOverdrawn,
        account);
    }
  }

  async shouldAlert(key, curr, isBelowMin, account) {
    const warnningExpired = await this.isExp(key);
    if (warnningExpired && isBelowMin) {
      logger.error(`Insufficient Balance:${key}: Account:${account}: current balance:${curr}`);
      this.resgisterTimeout(key);
    }
  }

  examinBalances(walletBalance, depositedBalance) {
    return {
      walletBalanceOverdrawn: this.toDat(walletBalance) < this.settings.minWalletBalance,
      depositBalanceOverdrawn: this.toDat(depositedBalance) < this.settings.minDepostedBalance,
    };
  }

  toDat(v) {
    return this.web3.utils.fromWei(v);
  }

  getBalances(account) {
    const balanceReq = this.web3.eth.getBalance(account);
    const depositedBalanceReq = storageContract.getDepositedBalance(account);
    return Promise.all([balanceReq, depositedBalanceReq]);
  }

  async resgisterTimeout(key) {
    this.redis.setex(`${config.appName}_${key}_balancewatcher`, this.settings.timeout, 'true');
  }

  async isExp(key) {
    const status = await this.redis.get(`${config.appName}_${key}_balancewatcher`);
    return (status === null);
  }

}

const bw = new BalanceWatcher();
module.exports = bw;
