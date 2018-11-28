const Web3 = require('web3');
const config = require('./ConfigService');

class Web3Factory {

  static getWeb3() {
    return new Web3(new Web3.providers.HttpProvider(config.web3.provider));
  }

}

module.exports = Web3Factory;
