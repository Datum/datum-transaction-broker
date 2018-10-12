const request = require('request');
const Web3 = require('web3');

let web3; let
  accounts;

async function init() {
  web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8547'));
  accounts = await web3.eth.getAccounts();
}

function toHex(v) {
  return web3.utils.toHex(v);
}

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function generateTx() {
  const toIndex = Math.floor(Math.random() * accounts.length);
  const rawTx = {
    gasPrice: toHex(`${getRandomArbitrary(3100000, 50000000000)}`),
    gasLimit: toHex('6721975'),
    to: accounts[toIndex],
    value: web3.utils.toHex((Math.floor(Math.random() * 10000000000))),
  };
  return rawTx;
}
init();

const wait = typeof (process.argv[2]) === 'undefined' ? 3500 : process.argv[2] * 1000;

setInterval(() => {
  const tmpTx = generateTx();
  request.post('http://localhost:3000/api/v1/transaction', { form: tmpTx },
    (err, resp, body) => {
      console.log(`err:${err}\nresp:${JSON.stringify(resp)}\nbody:${JSON.stringify(body)}`);
    });
}, wait);
