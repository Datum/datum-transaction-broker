const Tx = require('ethereumjs-tx');
const Publisher = require('./Publisher');
const Consumer = require('./Consumer');
const nonceService = require('../services/NonceService');
const web3Factory = require('../services/Web3Factory');
const logger = require('../utils/Logger');

class TxWorker {

  constructor(inputChannels, outputChannels, account) {
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
      const txResult = await this.submitTx(tx.rawTx);
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
    const txObj = { ...txObject, nonce: this.web3.utils.toHex(nonce), from: this.account.address };
    const tmpTx = new Tx(txObject);
    tmpTx.sign(Buffer.from(this.account.privateKey, 'hex'));
    return {
      txObj,
      rawTx: `0x${tmpTx.serialize().toString('hex')}`,
      nonce,
      transactionHash: `0x${tmpTx.hash().toString('hex')}`,
    };
  }

  async submitTx(transaction) {
    return new Promise((resolve, reject) => {
      this.web3.eth.sendSignedTransaction(transaction)
        .on('transactionHash', hash => resolve(hash))
        .on('error', reject)
        .catch(err => reject(err));
    });
  }

}

module.exports = TxWorker;
