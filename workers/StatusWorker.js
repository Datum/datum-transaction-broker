const Web3Factory = require('../services/Web3Factory');
const nonceService = require('../services/NonceService');
const Consumer = require('./Consumer');
const Publisher = require('./Publisher');
const redisService = require('../services/RedisService');
const logger = require('../utils/Logger');

class StatusWorker {

  constructor(processedTxChannel, retryTxChannel, maxTimeout = 15) {
    redisService.newRedis().then((redis) => { this.redis = redis; });
    this.web3 = Web3Factory.getWeb3();
    this.channel = processedTxChannel;
    this.txWorker = new Consumer([processedTxChannel], this.checkTx.bind(this), 'Pending_TX_worker');
    this.reCheckWroker = new Publisher(processedTxChannel);
    this.resubmitTxWorker = new Publisher(retryTxChannel);
    this.maxTimeout = maxTimeout;
  }

  async checkTx(error, [channelName, tx]) {
    const tmpTx = JSON.parse(tx);
    const txReceipt = await this.web3.eth.getTransactionReceipt(tmpTx.transactionHash);
    logger.debug(`StatusWorker:${channelName}:Requesting Transaction txReceipt for:${tmpTx.transactionHash}: ${txReceipt}`);
    if (!this.isNull(txReceipt)) {
      logger.debug(`StatusWorker:${channelName}:Transaction executed: ${tmpTx.id}: ${tx}`);
      return this.redis.set(tmpTx.transactionHash, { status: 'mined' });
    } if (this.isNull(txReceipt) && this.shouldResubmit(tmpTx.ts)) {
      logger.debug(`StatusWorker:${channelName}:Resubmitting Transaction:${tmpTx.id}`);
      logger.debug(`StatusWorker:${channelName}:${tmpTx.id}: ${tx}`);
      return this.redis.set(tmpTx.transactionHash, { error: 'Transaction has been pending for too long' });
      // TODO: define a better resubmittion startgy
      // TODO: With resubmittion we need to have abiility to cancel
      // return this.resubmitTx(tmpTx);
    } if (this.isNull(txReceipt)) {
      logger.debug(`StatusWorker:${channelName}:Submitting Transaction for recheck:${tmpTx.id}`);
      logger.debug(`StatusWorker:${channelName}:${tmpTx.id}: ${tx}`);
      return this.submitToRecheck(tx);
    }
  }

  isNull(obj) {
    return obj === null || typeof obj === 'undefined';
  }

  submitToRecheck(tx) {
    return this.reCheckWroker.pushMsg(tx);
  }

  resubmitTx(tx) {
    const tmpTx = { ...tx.txObj };
    nonceService.replayNonce(tmpTx.from, tmpTx.nonce);
    delete tmpTx.from;
    delete tmpTx.nonce;
    return this.resubmitTxWorker.pushMsg(JSON.stringify(tmpTx));
  }

  shouldResubmit(ts) {
    const diffMin = Math.ceil(((new Date() - new Date(ts)) / 1000) / 60);
    return diffMin >= this.maxTimeout;
  }

}
module.exports = StatusWorker;
