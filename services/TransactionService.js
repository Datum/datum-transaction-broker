const uuid = require('uuid/v1');
const Web3 = require('web3');
const config = require('./ConfigService');
const logger = require('../utils/Logger');
const Publisher = require('../workers/Publisher');
const TxWorker = require('../workers/TxWorker');
const StatusWorker = require('../workers/StatusWorker');
const Overseer = require('../workers/Overseer');
/**
 * Transaction service
 */
class TransactionService {

  constructor() {
    this.dispatcher = new Publisher([`${config.appName}_${config.queues.transactions}`], `${config.appName}_transaction_dispatcher`);
    this.txWorkers = {};
    this.statusWorkers = {};
    this.overseer = undefined;
  }

  start() {
    logger.info(`${config.appName}:Transaction service starting...`);
    config.accounts.forEach((account) => {
      this.txWorkers[account.address] = new TxWorker([`${config.appName}_${config.queues.transactions}`], [`${config.appName}_${account.address}_pending`], account);
      this.statusWorkers[account.address] = new StatusWorker([`${config.appName}_${account.address}_pending`], [`${config.appName}_${config.queues.transactions}`]);
    });
    this.overseer = new Overseer(`${config.appName}_${config.queues.overseer}`);
  }

  dispatch(request) {
    const tmp = this.convertVals(request);
    tmp.id = uuid();
    logger.debug(`${config.appName}: Dispatching tmp ${tmp.id}`);
    return this.dispatcher.pushMsg(JSON.stringify(tmp)).then(() => Promise.resolve(tmp.id));
  }

  /**
   * convertVals - Convert object values to Hex if not already in Hex format
   *
   * @param  {Object} request incoming request Object
   * @return {Object}  Object with hex values
   */
  convertVals(request) {
    const tmpR = { ...request };
    const keys = Object.keys(tmpR);
    for (let i = 0; i < keys.length; i += 1) {
      tmpR[keys[i]] = this.toHex(tmpR[keys[i]]);
    }
    return tmpR;
  }

  /**
   * toHex - Conver value v to hex if not in Hex
   */
  toHex(v) {
    return Web3.utils.isHex(v) ? v : Web3.utils.toHex(v);
  }

}
const transactionService = new TransactionService();
module.exports = transactionService;
