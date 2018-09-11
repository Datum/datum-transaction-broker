const Redis = require('ioredis');
const path = require('path');
const fs = require('fs');
const uuid =require('uuid/v1');

const CONFIG = JSON.parse(fs.readFileSync(path.resolve('./','config.json')));

class RedisService{

    constructor(){
        this.instances={};
    }
    async newRedis(){
        let tmpid =  uuid();
        let tmpRedis = await new Redis(CONFIG.redis);
        this.instances[tmpid]=tmpRedis;
        tmpRedis.id= tmpid;
        return tmpRedis;
    }

    async getDefaultRedis(){
        if(typeof this.instances['default']==='undefined'){
            let tmpRedis = await new Redis(CONFIG.redis);
            this.instances['default']=tmpRedis;
            return tmpRedis;
        } else{
            return this.instances['default'];
        }
    }

    getRedis(id){
        return this.instances[id];
    }

    close(id){
        let tmpRedis =this.instances[id];
        if(typeof tmpRedis !=='undefined'){
            tmpRedis.disconnect();
        }
    }
}
const redisService = new RedisService();
module.exports= redisService;
