// const TxProducer = require('./TxProducer');
// const redisService = require('./services/RedisService');
// const nonceService = require('./services/NonceService');
// const config = require('../utils/Config');
//
// const tmpProducer = new TxProducer();
// const TxWorker = require('./workers/TxWorker');
// const Printer = require('./tmp/Printer');
// const StatusWorker = require('./workers/StatusWorker');
//
// console.log('Transaction Service starting...');
//
//
// // TODO:Add connection checkeks before you start
// setTimeout(() => {
//   config.accounts.map((acc) => {
//     new TxWorker([config.queues.transactions], [`${acc.address}_pending`], acc);
//     new StatusWorker([`${acc.address}_pending`], [config.queues.transactions]);
//   });
//   setTimeout(() => {
//     tmpProducer.generateTx();
//   }, 3500);
// }, 3000);
