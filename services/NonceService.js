const Web3Factory = require('./Web3Factory');
const config = require('../utils/Config');
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

  /**
     * calibrateNonce - calibrate nonce in redis
     *
     * @param  {Array} accounts Array of accounts to calibrate nonces for
     */
  async calibrateNonce(accounts) {
    logger.debug('NonceService:calibrating nonces...');
    const promises = accounts.map(async (account) => {
      const pendingTxChannel = `${account.address}_pending`;
      const pendingNonce = await this.getLastPendingNonce(pendingTxChannel);
      const tmpn = await this.web3.eth.getTransactionCount(account.address, 'pending');
      logger.debug(`NonceService::Calibrating ${account.address}\nLast Pending Nonce:${pendingNonce}\nTransaction Count:${tmpn}`);
      return this.fillNonce(this.listName(account.address), tmpn, pendingNonce);
    });
    await Promise.all(promises);
  }

  async getLastPendingNonce(channel) {
    const len = await this.redis.llen(channel);
    const tx = await this.redis.lindex(channel, len - 1);
    const nonce = tx !== null && typeof tx.nonce !== 'undefined' ? tx.nonce : 0;
    return nonce;
  }

  /**
     * async getNonce - Return nonce from pregenerated nonces in list related to address
     *
     * @param  {type} address target address
     * @return {Integer}  nonce
     */
  async getNonce(address) {
    const nonce = await this.redis.rpop(this.listName(address));
    logger.debug(`NonceService::${address}:Current transaction count: ${nonce}`);
    this.redis.lindex(this.listName(address), 0)
      .then(val => this.redis.lpush(this.listName(address), ++val));
    return nonce;
  }

  async replayNonce(address, nonce) {
    return this.redis.rpush(this.listName(address), nonce);
  }

  /**
     * async fillNonce - Fill nonce queues with next nonce
     *
     * @param  {String} listName     Name of list related to target account
     * @param  {Integer} transactionCount CurrentNonce reported by web3js
     * @param  {Integer} pendingNonce
     * @return {void}
     */
  async fillNonce(listName, transactionCount, pendingNonce) {
    let startingNonce = this.getStartingNonce(transactionCount, pendingNonce);
    let lstLen = 0;
    await this.redis.del(listName);
    while (lstLen < 60) {
      await this.redis.lpush(listName, startingNonce);
      startingNonce += 1;
      lstLen += 1;
    }
  }

  getStartingNonce(txCount = 0, pendingNonce = 0) {
    const tmp = [txCount, pendingNonce];
    return tmp.sort()[tmp.length - 1];
  }

  /**
     * listName - return address nonce list name
     *
     * @param  {String} address target address
     * @return {String} list name related to nonces
     */
  listName(address) {
    return `${address}_NONCE_LIST`;
  }

}

const nonceService = new NonceService();
module.exports = nonceService;
