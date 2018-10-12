/**
 * Full integration test for the transaciton broker
 */

const request = require('request');
const Web3 = require('web3');
// const jest = require('jest');

/**
 * Util class to help with generating transactions
 */
class TxUtils {

  static get api() {
    return 'http://localhost:3000/api/v1/transaction';
  }

  static get provider() {
    return 'http://localhost:8547';
  }

  static generateTx(accounts) {
    const toIndex = Math.floor(Math.random() * accounts.length);
    const rawTx = {
      gasPrice: TxUtils.toHex(`${TxUtils.getRandomArbitrary(3100000, 50000000000)}`),
      gasLimit: TxUtils.toHex('6721975'),
      to: accounts[toIndex],
      value: TxUtils.toHex((Math.floor(Math.random() * 10000000000))),
    };
    return rawTx;
  }

  static toHex(v) {
    return Web3.utils.toHex(v);
  }

  static getRandomArbitrary(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  static getWeb3() {
    return new Web3(new Web3.providers.HttpProvider(TxUtils.provider));
  }

  static submitTx(tx) {
    return new Promise((resolve, reject) => {
      request.post('http://localhost:3000/api/v1/transaction', { form: tx },
        (err, resp, body) => {
          if (err) {
            reject(err);
          } else {
            resolve({ resp, body });
          }
        });
    });
  }

}
// test('Should send request and receive transaction hash with pending status', () => new Promise(async (resolve, reject) => {
//
// }), 30000);

async function test() {
  const web3 = await TxUtils.getWeb3();
  const accounts = await web3.eth.getAccounts();
  const tx = TxUtils.generateTx(accounts);
  TxUtils.submitTx(tx)
    .then((res) => {
      console.log(res);
    }).catch(err => console.error(err));
}
test();
