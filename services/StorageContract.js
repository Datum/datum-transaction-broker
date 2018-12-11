const lightwallet = require('eth-lightwallet');
const config = require('./ConfigService');
const web3Factory = require('./Web3Factory');

class StorageContract {

  constructor(address) {
    this.address = address;
    this.web3 = web3Factory.getWeb3();
    this.contract = new this.web3.eth.Contract(
      config.contracts.storage.abi,
      config.contracts.storage.address,
    );
  }

  async getDepositedBalance(targetAddress, toDat = true) {
    const db = await this.contract.methods.getDepositBalance(targetAddress).call();
    if (toDat) {
      return this.web3.utils.fromWei(db);
    }
    return db;
  }

  encFunctionData(method, types, params) {
    // eslint-disable-next-line no-underscore-dangle
    return lightwallet.txutils._encodeFunctionTxData(method, types, params);
  }

}
const sc = new StorageContract(config.contracts.storage.address);
module.exports = sc;
