const redisService=  require('../services/RedisService');
const logger = require('../utils/Logger');
class Publisher{
    constructor(output,id){
        this.id=id;
        this.pause=false;
        redisService.newRedis().then(redis=>{
            this.redis=redis;
            this.outputQueue =output;
        });
    }
    pushMsg(payload,highPriority=false){
        logger.debug(`${this.name}:${this.id}:${this.outputQueue}: Handling request ${payload}`);
        if(highPriority){
            return this.redis.rpush(this.outputQueue,payload);
        }else{
            return this.redis.lpush(this.outputQueue,payload);
        }
    }

}

module.exports = Publisher;
