const winston = require('winston')
const log = process.env.LOG_LEVEL || 'debug'

module.exports = (app) => {

    const CustomLevels = {
        levels: {
            debug: 6,
            http: 5,
            https: 4,
            coap: 3,
            mqtt: 2,
            socket: 1,
            error: 0
        },
        colors: {
            debug: 'blue',
            http: 'magenta',
            https: 'gray',
            coap: 'green',
            mqtt: 'cyan',
            socket: 'yellow',
            error: 'red'
        }
    };

    const customPrint = winston.format.printf((info) => {
        return info.timestamp + ' ' + info.level + ' ' + info.message;
    });

    winston.config.addColors(CustomLevels.colors);

    let logger = winston.createLogger({
        level: log,
        levels: CustomLevels.levels,
        transports: [new winston.transports.Console({
            level: log,
            format: winston.format.combine(
                winston.format(info => {
                    info.level = info.level.toUpperCase()
                    return info;
                })(),
                winston.format.timestamp({
                    format: 'DD-MM-YYYY hh:mm:ss A'
                }),
                winston.format.colorize(),
                winston.format.align(),
                winston.format.splat(),
                customPrint
            )
        }),]
    })
    return logger
}