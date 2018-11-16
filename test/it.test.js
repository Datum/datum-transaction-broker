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
    return 'http://127.0.0.1:8545';
  }

  static generateTx(accounts, opt) {
    const toIndex = Math.floor(Math.random() * accounts.length);
    const gasLimit = opt.gasLimit < 6721975 ? opt.gasLimit : 6721975;
    const rawTx = {
      gasPrice: TxUtils.toHex(`${TxUtils.getRandomArbitrary(opt.gasPrice, 50000000000)}`),
      gasLimit: TxUtils.toHex(gasLimit),
      to: '0x3f507f20124a504345a2384595061e5300ddb7cc',
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

  static checkTx(hash) {
    return new Promise((resolve, reject) => {
      request.get(`http://localhost:3000/api/v1/transaction/${hash}`, (err, resp, body) => {
        if (err) {
          reject(err);
        } else {
          resolve(body);
        }
      });
    });
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


test('Transacitons Are submitted and confirmed', async () => {
  const web3 = await TxUtils.getWeb3();
  const accounts = await web3.eth.getAccounts();
  const lastBlock = await web3.eth.getBlock('latest');
  const gasPrice = await web3.eth.getGasPrice();

  test('Transactions must be confiemd', async () => {
    const tx = TxUtils.generateTx(accounts, { gasLimit: lastBlock.gasLimit, gasPrice });
    const res = await TxUtils.submitTx(tx);
    console.log(res);
  });
}, 30000);
// async function test() {
//   const web3 = await TxUtils.getWeb3();
//   const accounts = await web3.eth.getAccounts();
//   const lastBlock = await web3.eth.getBlock('latest');
//   const gasPrice = await web3.eth.getGasPrice();
//   const tx = TxUtils.generateTx(accounts, { gasLimit: lastBlock.gasLimit, gasPrice });
//
//   TxUtils.submitTx(tx)
//     .then((res) => {
//       console.log(`Response:${res.body} `);
//       if (typeof res.body !== 'undefined') {
//         const response = JSON.parse(res.body);
//         if (typeof response.transactionHash !== 'undefined') {
//           setInterval(async () => {
//             TxUtils.checkTx(response.transactionHash).then((update) => {
//               console.log(update);
//             }).catch((err) => {
//               console.log(err);
//             });
//           }, 1000);
//         }
//       }
//     }).catch(err => console.error(err));
// }
// test();
