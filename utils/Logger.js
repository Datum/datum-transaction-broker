const path = require('path');
const winston = require('winston');
const config = require('../services/ConfigService');
require('winston-daily-rotate-file');

/**
 * Adding beautiful logging :)
 */
const transport = new (winston.transports.DailyRotateFile)({
  filename: path.join(__dirname, '../', 'log', '%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  handleExceptions: true,
  level: 'debug',
});

const loggerFormat = winston.format.printf(info => `${info.timestamp} ${info.level} : ${info.message}`);

const logger = winston.createLogger({
  exitOnError: false,
  levels: winston.config.syslog.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.colorize(),
    loggerFormat,
  ),
  transports: [
    transport, new winston.transports.Console({ level: config.logger.level }),
  ],
});

module.exports = logger;
