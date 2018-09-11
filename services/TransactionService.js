const logger = require('../utils/Logger');
const Publisher = require('../workers/Publisher');
const TxWorker = require('../workers/TxWorker');
const StatusWorker = require('../workers/StatusWorker');
const config = require('../utils/Config');
const uuid = require('uuid/v1');

/**
 * Transaction service
 */
class TransactionService{
    constructor(){
        this.dispatcher = new Publisher([config.queues.transactions],'transaction_dispatcher');
        this.txWorkers ={};
        this.statusWorkers={};
    }
    start(){
        logger.info('Transaction service starting...');
        config.accounts.map(account=>{
            this.txWorkers[account.address]= new TxWorker([config.queues.transactions],[`${account.address}_pending`],account);
            this.statusWorkers[account.address] = new StatusWorker([`${account.address}_pending`],[config.queues.transactions]);
        });
    }
    dispatch(request){
        request.id = uuid();
        return this.dispatcher.publish(request).then(()=>Promise.resolve(request.id));
    }
  
}
const transactionService = new TransactionService();
module.exports = transactionService;
