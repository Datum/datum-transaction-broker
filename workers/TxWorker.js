
const Tx = require('ethereumjs-tx');
const Publisher = require('./Publisher');
const Consumer = require('./Consumer');
const exceptionTranslator = require('../utils/ExceptionTranslator');
const nonceService = require('../services/NonceService');
const web3Factory = require('../services/Web3Factory');
const logger = require('../utils/Logger');
const redisService = require('../services/RedisService');
const balanceWatcher = require('../services/BalanceWatcher');
const { TxStatus } = require('../constants');

class TxWorker {

  constructor(inputChannels, outputChannels, account, minBalance = 1000) {
    redisService.newRedis().then((redis) => {
      this.redis = redis;
    });
    this.consumer = new Consumer(inputChannels, this.execute.bind(this), account.address);
    this.publisher = new Publisher(inputChannels, account.address);
    this.web3 = web3Factory.getWeb3();
    this.account = account;
    this.minBalance = minBalance;
  }

  async execute(error, [channelName, message]) {
    try {
      balanceWatcher.checkBalance(this.account.address);
      logger.debug(`TxWoker:${channelName}:${message}`);
      const msg = JSON.parse(message);
      const tmpTxId = msg.id;
      delete msg.id;
      let tx;
      if (msg.resubmit === true) {
        logger.debug(`TxWorker:Resubmitting Transaction:${msg.hash}`);
        tx = {
          rawTx: msg.tx,
          transactionHash: msg.hash,
          txObj: { hash: msg.hash, resubmit: true },
        };
      } else {
        tx = await this.signTransaction(msg);
      }
      // Update transaction status
      logger.debug(`TxWoker:${channelName}:${tx.transactionHash}:Transaction signed`);
      logger.debug(`TxWoker:${channelName}:${tx.transactionHash}:Transaction details: ${JSON.stringify(tx.txObj)}`);
      return this.submitTx(tx.rawTx, tmpTxId, tx.transactionHash).then((txResult) => {
        logger.debug(`TxWoker:${channelName}:${tx.transactionHash}:Transaction submitted`);
        return Promise.resolve(txResult);
      }).catch((err) => {
        logger.error(`TxWoker:${channelName}:${tx.transactionHash}:Failed to submit Tx: ${err}`);
        const errorCode = exceptionTranslator.translate(err);
        if (errorCode === exceptionTranslator.errors.RPC.v) {
          logger.debug(`TxWoker:${channelName}:${tx.transactionHash}:Republishing transaction`);
          this.republishOnRPCError(tx.rawTx, tmpTxId, tx.transactionHash);
        }
        return Promise.reject(err);
      });
    } catch (err) {
      return Promise.reject(err);
    }
  }


  /**
     * async signTransaction - Build and sign transaction object
     *
     * @param  {Object} txObject Transaction Object
     * @return {Object} Object containing serialized transaction object, and nonce
     */
  async signTransaction(txObject) {
    const nonce = await nonceService.getNonce(this.account.address);
    // const estimateGas = await this.estimateGas(txObject);
    const txObj = {
      ...txObject,
      gas: this.web3.utils.toHex(1500000),
      gasPrice: this.web3.utils.toHex(9000000000),
      nonce: this.web3.utils.toHex(nonce),
      from: this.account.address,
    };

    const tmpTx = new Tx(txObj);

    tmpTx.sign(Buffer.from(this.account.privateKey, 'hex'));
    return {
      txObj,
      rawTx: `0x${tmpTx.serialize().toString('hex')}`,
      nonce,
      transactionHash: `0x${tmpTx.hash().toString('hex')}`,
    };
  }

  async estimateGas(tx) {
    const estimateGas = await this.web3.eth.estimateGas({
      ...tx,
      from: this.account.address,
    });
    return Math.floor((estimateGas + (0.1 * estimateGas)));
  }

  async submitTx(transaction, id, txHash) {
    logger.debug(`TxWorker:Submitting Transaction:${id}:${transaction}`);
    return new Promise((resolve, reject) => {
      this.web3.eth.sendSignedTransaction(transaction)
        .on('transactionHash', (hash) => {
          // Set to expire after 24 hours
          logger.debug(`Hash:${txHash}:submitted`);
          this.redis.set(hash, JSON.stringify({ status: TxStatus.SUBMITTED }));
          this.redis.lpush([id], JSON.stringify(
            { status: TxStatus.SUBMITTED, transactionHash: hash },
          ));
          resolve(hash);
        })
        .on('receipt', (receipt) => {
          logger.debug(`Hash:${receipt.transactionHash}:mined:${JSON.stringify(receipt)}`);
          this.redis.set(receipt.transactionHash, JSON.stringify({ status: 'mined' }));
        })
        .on('error', (err) => {
          logger.error(`Hash:${txHash}:failed:${err}`);
          this.redis.lpush([id], JSON.stringify(
            { error: (typeof err.message !== 'undefined' ? err.message : err) },
          ));
          this.redis.set(txHash, JSON.stringify(
            { error: (typeof err.message !== 'undefined' ? err.message : err) },
          ));
          reject(err);
        })
        .catch((err) => { reject(err); });
    });
  }

  async republishOnRPCError(tx, id, hash) {
    logger.debug(`TxWoker:Resubmitting TX: Hash: ${hash}`);
    this.publisher.pushMsg(JSON.stringify({
      tx,
      id,
      hash,
      resubmit: true,
    }));
  }

}

module.exports = TxWorker;
