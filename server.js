
const app = require('express')();
const bodyParser = require('body-parser');
const Web3 = require('web3');
const config = require('config');
const logger = require('./utils/Logger');
const txService = require('./services/TransactionService');
const redisService = require('./services/RedisService');


let redis;

/**
 * Start transaction service workers
 */

txService.start();
/**
 * End
 */

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function isEmpty(v) {
  return typeof (v) === 'undefined' || v === null || v === '';
}

function isValidBody(body) {
  return !isEmpty(body)
  && !isEmpty(body.data)
  && !isEmpty(body.to);
  // && !isEmpty(body.gasPrice)
  // && !isEmpty(body.gasLimit);
}

function toObj(body) {
  return typeof body === 'string' ? JSON.parse(body) : body;
}

app.post('/api/v1/transaction', (req, res) => {
  try {
    const body = toObj(req.body);
    logger.debug(`Incoming tx request: ${JSON.stringify(body)}`);
    if (isValidBody(body)) {
      txService.dispatch(body)
        .then((reqID) => {
          logger.debug(`Tx ID:${reqID}`);
          redis.blpop([reqID], 0, (err, [channelName, msg]) => {
            if (err) {
              logger.error(`${channelName}:Failed to process tx: ${reqID}\n${err}`);
              res.status(500).send({ error: 'Transaction failed to process' });
            } else {
              logger.debug(`Tx response:${reqID}:${msg}`);
              res.status(200).send(msg);
            }
            // Delete temp key
            redis.del(reqID);
          });
        });
    } else {
      throw new Error('missing or invalid request values');
    }
  } catch (err) {
    const tmpBody = typeof (req.body) === 'object' ? JSON.stringify(req.body) : req.body;
    logger.error(`Failed to dispatch request: ${tmpBody}\n${err}`);
    res.status(400).send({ error: 'Invalid request: missing or invalid request values' });
  }
});


function isValidHash(hash) {
  return typeof hash !== 'undefined'
  && hash !== null
  && hash.length !== 0
  && Web3.utils.isHexStrict(hash);
}

app.get('/api/v1/transaction/:txHash', async (req, res) => {
  const { txHash } = req.params;
  if (isValidHash(txHash)) {
    const txStatus = await redis.get(txHash);
    if (txStatus === null || typeof txStatus === 'undefined') {
      res.status(400).send({ error: `Tx hash not found: ${txHash}` });
    } else {
      logger.debug(`Received status: ${txStatus}`);
      logger.debug(`Received status: ${JSON.stringify(txStatus)}`);
      const status = (typeof txStatus === 'string') ? JSON.parse(txStatus) : txStatus;
      res.status(200).send({ transacitonHash: txHash, ...status });
    }
  } else {
    res.status(500).send({ error: `Invalid transaction hash: ${txHash}` });
  }
});

logger.debug('Connecting to local redis...');
redisService.newRedis().then((red) => {
  redis = red;
  logger.debug(`Successfully connected to redis:${redis.id}`);

  const port = process.env.PORT || config.server.port;
  app.listen(port, () => logger.info(`Server is up and running at port ${port}`));
});
