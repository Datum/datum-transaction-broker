const Web3Factory  = require('../services/Web3Factory');
const nonceService = require('../services/NonceService');
const Consumer = require('./Consumer');
const Publisher = require('./Publisher');
const redisService = require('../services/RedisService');
const logger = require('../utils/Logger');
class StatusWorker{
    constructor(processedTxChannel,retryTxChannel,maxTimeout=1){
        redisService.newRedis().then(redis=>this.redis=redis);
        this.web3 = Web3Factory.getWeb3();
        this.channel = processedTxChannel;
        this.txWorker = new Consumer([processedTxChannel],this.checkTx.bind(this));
        this.reCheckWroker =new Publisher(processedTxChannel);
        this.resubmitTxWorker = new Publisher(retryTxChannel);
        this.maxTimeout = maxTimeout;
    }

    async checkTx(error,[channelName,tx]){
        let tmpTx = JSON.parse(tx);
        let txReceipt = await this.web3.eth.getTransactionReceipt(tmpTx.signedTxRes.transactionHash);

        if(!this.isNull(txReceipt)){
            logger.debug(`${this.name}:${channelName}:Transaction executed: ${tmpTx.id}: ${tx}`);
            return this.redis.lpush(tmpTx.id,txReceipt.transactionHash);
        } else if(this.isNull(txReceipt)&&this.shouldResubmit(tmpTx.ts)){
            logger.debug(`${this.name}:${channelName}:Resubmitting Transaction:${tmpTx.id}`);
            logger.debug(`${this.name}:${channelName}:${tmpTx.id}: ${tx}`);
            return this.resubmitTx(tmpTx);
        }else if(this.isNull(txReceipt)){
            logger.debug(`${this.name}:${channelName}:Submitting Transaction for recheck:${tmpTx.id}`);
            logger.debug(`${this.name}:${channelName}:${tmpTx.id}: ${tx}`);
            return this.submitToRecheck(tx);
        }
    }
    isNull(obj){
        return obj===null || typeof obj ==='undefined';
    }
    submitToRecheck(tx){
        return this.reCheckWroker.pushMsg(tx);
    }
    resubmitTx(tx){
        let tmpTx = {...tx.txObj};
        nonceService.replayNonce(tmpTx.from,tmpTx.nonce);
        delete tmpTx.from;
        delete tmpTx.nonce;
        return this.resubmitTxWorker.pushMsg(JSON.stringify(tmpTx));
    }
    shouldResubmit(ts){
        let diffMin = Math.ceil(((new Date()-new Date(ts))/1000)/60);
        return diffMin>=this.maxTimeout;
    }
}
module.exports = StatusWorker;
