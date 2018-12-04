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

  /**
     * calibrateNonce - calibrate nonce in redis
     *
     * @param  {Array} accounts Array of accounts to calibrate nonces for
     */
  async calibrateNonce(accounts = config.accounts) {
    logger.debug('NonceService:calibrating nonces...');
    const promises = accounts.map(async (account) => {
      const pendingTxChannel = `${config.appName}_${account.address}_pending`;
      const pendingNonce = await this.getLastPendingNonce(pendingTxChannel);
      const tmpn = await this.web3.eth.getTransactionCount(account.address, 'pending');
      const transactionCount = await this.web3.eth.getTransactionCount(account.address);
      logger.debug(`${config.appName}:NonceService::Calibrating:${account.address}`);
      logger.debug(`${config.appName}:NonceService::Calibrating:Transaction count:${transactionCount}`);
      logger.debug(`${config.appName}:NonceService::Calibrating:Pending Transaction count:${tmpn} : TYPE: ${typeof tmpn}`);
      logger.debug(`${config.appName}:NonceService::Calibrating:Local Pending Transactions:${pendingNonce} : TYPE: ${typeof pendingNonce}`);
      return this.fillNonce(this.listName(`${account.address}`), tmpn, pendingNonce);
    });
    await Promise.all(promises);
  }


  /**
   * async getLastPendingNonce - Check nonce value in last pending transaction
   *
   * @param  {String} channel Pending transactions channel
   * @return {Integer} Last pending transaction nonce
   */
  async getLastPendingNonce(channel) {
    const len = await this.redis.llen(channel);
    const tx = await this.redis.lindex(channel, len - 1);
    logger.debug(`Lindex tx: ${tx}`);
    const nonce = (tx !== null && typeof tx.nonce !== 'undefined') ? tx.nonce : 0;
    logger.debug(`Nonce-> ${nonce}`);
    logger.debug(`getLastPendingNonce: ${nonce}; current transaction nonce: ${tx}`);
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
      .then((val) => {
        logger.debug(`Refilling nonce: ${val}: type: ${typeof val}`);
        this.redis.lpush(this.listName(address), (parseInt(val, 10) + 1));
      });
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
    const results = [];
    let startingNonce = this.getStartingNonce(transactionCount, pendingNonce);
    logger.debug(`Starting nonce type ${typeof startingNonce} => ${startingNonce}`);
    let lstLen = 0;
    await this.redis.del(listName); // First delete prev nonce list
    logger.debug(`Resetting nonce list: ${listName}`);
    for (;lstLen < 60; startingNonce += 1, lstLen += 1) {
      logger.debug(`Starting nonce type ${typeof startingNonce} => ${startingNonce}`);
      results.push(this.redis.lpush(listName, startingNonce));
    }
    return Promise.all(results);
  }

  /**
   * getStartingNonce - Return last nonce we should start from
   *
   * @param  {Integer} txCount = 0      Transaction count as resported by network
   * @param  {Integer} pendingNonce = 0 Last pending transaction nonce
   * @return {Integer} starting nonce
   */
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
    return `${config.appName}_${address}_NONCE_LIST`;
  }

}

const nonceService = new NonceService();
module.exports = nonceService;
