const Publisher = require('./Publisher');
const Consumer = require('./Consumer');
const nonceService = require('../services/NonceService');
const web3Factory = require('../services/Web3Factory');
const Tx = require('ethereumjs-tx');

class TxWorker{
    constructor(inputChannels,outputChannels,account){
        this.consumer = new Consumer(inputChannels,this.execute.bind(this),account.address);
        this.publisher =new Publisher(outputChannels,account.address);
        this.web3 = web3Factory.getWeb3();
        this.account = account;
    }

    async execute(error,[channelName,message]){
        try{
            const msg= JSON.parse(message);
            let tmpTxId = msg.id;
            delete msg.id;
            let tx = await this.signTransaction(msg);
            let signedTxRes=await this.web3.eth.sendSignedTransaction(tx.rawTx);
            this.publisher.pushMsg(JSON.stringify({
                nonce:tx.nonce,
                signedTxRes:signedTxRes,
                txObj:tx.txObj,
                id:tmpTxId,
                ts:new Date()
            }));
            return Promise.resolve(signedTxRes);
        }catch(err){
            return Promise.reject(err);
        }
    }
    /**
     * async signTransaction - Build and sign transaction object
     *
     * @param  {Object} txObject Transaction Object
     * @return {Object} Object containing serialized transaction object, and nonce
     */
    async signTransaction(txObject){
        let nonce =  await nonceService.getNonce(this.account.address);
        txObject.nonce = this.web3.utils.toHex(nonce);
        txObject.from = this.account.address;
        let tmpTx = new Tx(txObject);
        tmpTx.sign(Buffer.from(this.account.privateKey,'hex'));
        return{
            txObj:txObject,
            rawTx:`0x${tmpTx.serialize().toString('hex')}`,
            nonce:nonce,
        };
    }
}

module.exports=TxWorker;
