
const Tx = require('ethereumjs-tx');
const Publisher = require('./Publisher');
const Consumer = require('./Consumer');

const nonceService = require('../services/NonceService');
const web3Factory = require('../services/Web3Factory');
const logger = require('../utils/Logger');
const redisService = require('../services/RedisService');

const { TxStatus } = require('../constants');

class TxWorker {

  constructor(inputChannels, outputChannels, account) {
    redisService.newRedis().then((redis) => {
      this.redis = redis;
    });
    this.consumer = new Consumer(inputChannels, this.execute.bind(this), account.address);
    this.publisher = new Publisher(outputChannels, account.address);
    this.web3 = web3Factory.getWeb3();
    this.account = account;
  }

  async execute(error, [channelName, message]) {
    try {
      logger.debug(`TxWoker:${channelName}:${message}`);
      const msg = JSON.parse(message);
      const tmpTxId = msg.id;
      delete msg.id;
      const tx = await this.signTransaction(msg);
      // Update transaction status
      const txResult = await this.submitTx(tx.rawTx, tmpTxId);
      logger.debug(`TxWoker:${channelName}:${tx.transactionHash}:Transaction signed`);
      this.publisher.pushMsg(JSON.stringify({
        nonce: tx.nonce,
        transactionHash: tx.transactionHash,
        txObj: tx.txObj,
        id: tmpTxId,
        ts: new Date(),
        txResult,
      }));
      logger.debug(`TxWoker:${channelName}:${tx.transactionHash}:Transaction submitted`);
      return Promise.resolve(txResult);

      // return Promise.resolve('0x3ccd71d14ceade7e31d8967e4043f6947220e423bf2f3f9bb6a591912d9fd487');
    } catch (err) {
      this.examinError(err);
      return Promise.reject(err);
    }
  }

  examinError(ex) {
    // Returned error: nonce too low
    // Returned error: replacement transaction underpriced
    const message = typeof ex === 'string' ? ex : ex.message;
    console.log(`=>>>>>${message}`);
  }

  /**
     * async signTransaction - Build and sign transaction object
     *
     * @param  {Object} txObject Transaction Object
     * @return {Object} Object containing serialized transaction object, and nonce
     */
  async signTransaction(txObject) {
    const nonce = await nonceService.getNonce(this.account.address);

    const txObj = {
      ...txObject,
      gas: this.web3.utils.toHex(6000000),
      gasPrice: this.web3.utils.toHex(9000000000),
      nonce: this.web3.utils.toHex(nonce),
      from: this.account.address,
    };

    logger.debug(`TxWorker:Signing Transaction: ${JSON.stringify(txObj)}`);

    const tmpTx = new Tx(txObj);

    tmpTx.sign(Buffer.from(this.account.privateKey, 'hex'));
    return {
      txObj,
      rawTx: `0x${tmpTx.serialize().toString('hex')}`,
      nonce,
      transactionHash: `0x${tmpTx.hash().toString('hex')}`,
    };
  }

  async submitTx(transaction, id, txHash) {
    logger.debug(`TxWorker:Submitting Transaction:${id}:${transaction}`);
    return new Promise((resolve, reject) => {
      this.web3.eth.sendSignedTransaction(transaction)
        .on('transactionHash', (hash) => {
          // Set to expire after 24 hours
          this.redis.set(hash, JSON.stringify({ status: TxStatus.SUBMITTED }));
          this.redis.lpush([id], JSON.stringify(
            { status: TxStatus.SUBMITTED, transactionHash: hash },
          ));
          resolve(hash);
        })
        .on('receipt', (receipt) => {
          this.redis.set(receipt.transactionHash, JSON.stringify({ status: 'mined' }));
        })
        .on('error', (err) => {
          this.redis.lpush([id], JSON.stringify(
            { error: (typeof err.message !== 'undefined' ? err.message : err) },
          ));
          this.redis.set(txHash, JSON.stringify(
            { error: (typeof err.message !== 'undefined' ? err.message : err) },
          ));
          reject(err);
        });
    });
  }

}

module.exports = TxWorker;
