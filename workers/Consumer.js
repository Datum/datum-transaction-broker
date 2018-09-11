const redisService = require('../services/RedisService');
const logger = require('../utils/Logger');
/**
 * Consumer base class implementation
 */
class Consumer{
    constructor(queues,execute,id,timeout=0,){
        this.id = id;
        redisService.newRedis()
            .then(redis=>{
                this.redis=redis;
                this.queues = queues;
                this.timeout = timeout;
                this.execute = execute;
                this.waitAndExec();
            });
    }

    /**
     * async onRequest - Executed when there is a Message in channel
     *
     * @param  {type} err          Error while fetching data
     * @param  {type} payload      Incoming payload
     * @param  {type} next         function to get exeucted after onRequest is done
     */
    async onRequest(err,[channelName,message]){
        if(!this.isValidPayload(message)){
            logger.error(`${this.name}:${this.id}:${channelName}: Invalid payload ${message}`);
        }else{
            if(err){
                logger.error(`${this.name}:${this.id}:${channelName}: Error while fetching transaction:${message}\nerror:${err}`);
            }
            logger.debug(`${this.name}:${this.id}:${channelName} Processing request: ${JSON.parse(message).id}`);
            logger.debug(`${this.name}:${this.id}:${channelName} Request: ${message}`);
            this.execute(err,[channelName,message])
                .finally(this.waitAndExec.bind(this))
                .catch(err=>{
                    logger.error(`${this.name}:${this.id}:${channelName} Transaction failed: ${err}`);
                    logger.error(`${this.name}:${this.id}:${channelName} Failed to Handle Msg: ${message}`);
                    this.reportFailure(JSON.parse(message).id,err);
                });
        }
    }

    /**
     * waitAndExec - keep watching for incoming msgs
     *
     * @return {type}  description
     */
    waitAndExec(){
        this.redis.blpop(this.queues,this.timeout,this.onRequest.bind(this));
    }

    /**
     * isValidPayload - Validating payload, every payload has to have an id
     *
     * @param  {Object}[channel, message] incoming payload
     * @return {Boolean} indicating whether a payload is valid or not
     */
    isValidPayload(message){
        return typeof message !=='undefined' &&
        message!==null&&
        typeof JSON.parse(message).id!=='undefined';
    }

    /**
     * reportFailure - Update the transaction id with failed status and reason
     *
     * @param  {string} id    transaction request id
     * @param  {Object} failure
     * @return {Object}         promise
     */
    reportFailure(id,failure){
        return this.redis.lpush([id],{
            satus:false,
            error:failure
        });
    }
}

module.exports = Consumer;
