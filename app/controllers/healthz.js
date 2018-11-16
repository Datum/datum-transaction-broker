const STATUS = {
  PASS: 'pass',
  WARN: 'warn',
  ERROR: 'error',
};

const getRedisDetails = async (redis) => {
  try {
    await redis.ping();
    return {
      status: STATUS.PASS,
    };
  } catch (err) {
    return {
      status: STATUS.ERROR,
      message: 'Redis connection error',
    };
  }
};

const getWeb3Details = async (web3) => {
  try {
    const isWeb3Listening = await web3.eth.net.isListening();

    if (isWeb3Listening) {
      return {
        status: STATUS.PASS,
      };
    }

    return {
      status: STATUS.ERROR,
      message: 'Web3 is not connected or not listening',
    };
  } catch (err) {
    return {
      status: STATUS.ERROR,
      message: 'Web3 is not connected',
    };
  }
};

const getOverallStatus = (statusDetails) => {
  const serviceStatus = Object.values(statusDetails).map(v => v.status);

  if (serviceStatus.includes(STATUS.ERROR)) {
    return STATUS.ERROR;
  }
  if (serviceStatus.includes(STATUS.WARN)) {
    return STATUS.WARN;
  }
  return STATUS.PASS;
};

exports.getHealthz = ({
  redis,
  txService,
}) => async (req, res) => {
  const redisDetails = await getRedisDetails(redis);
  const web3Details = await getWeb3Details(txService.overseer.web3);

  const details = {
    redis: redisDetails,
    web3: web3Details,
  };

  res.json({
    status: getOverallStatus(details),
    details,
  });
};
