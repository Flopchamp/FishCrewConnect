const winston = require('winston');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const transports = [
    new winston.transports.Console({
        format: isProduction
            ? winston.format.combine(winston.format.timestamp(), winston.format.json())
            : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.timestamp({ format: 'HH:mm:ss' }),
                  winston.format.printf(({ timestamp, level, message, ...meta }) => {
                      const extras = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
                      return `${timestamp} ${level}: ${message}${extras}`;
                  })
              ),
    }),
];

if (isProduction) {
    const logsDir = path.join(__dirname, '..', 'logs');
    transports.push(
        new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(logsDir, 'combined.log') })
    );
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    transports,
    // Prevent Winston from exiting on uncaught exceptions — let the process handler deal with it
    exitOnError: false,
});

module.exports = logger;
