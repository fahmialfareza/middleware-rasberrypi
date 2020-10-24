let start, configure, app, logger, coap, consign, session, bodyParser, cookieParser, setup, setupAscoltatore, redis, coapServer, fs, https, SQLiteStore;

require('dotenv').config();
coap = require('coap')
mqtt = require('mqtt')
express = require('express')()
session = require('express-session')
module.exports.app = app = require('http').Server(express)
io = require('socket.io')(app)
SQLiteStore = require('connect-sqlite3')(session);
consign = require('consign')
ascoltatori = require('ascoltatori')
redis = require('redis')
bodyParser = require('body-parser')
cookieParser = require('cookie-parser')
app.redis = {}
// fs = require('fs')
// https = require('https').createServer({
//     key: fs.readFileSync('cert/server.key'),
//     cert: fs.readFileSync('cert/server.cert')
// }, express)

module.exports.setupAscoltatore = setupAscoltatore = (opts) => {
    if (opts == null) {
        opts = {}
    }
    app.ascoltatore = new ascoltatori.RedisAscoltatore({
        redis: redis,
        port: opts.port,
        host: opts.host,
        db: opts.db
    })
    return app.ascoltatore
}

module.exports.setup = setup = (opts) => {
    let args
    if (opts == null) {
        opts = {}
    }
    args = [opts.port, opts.host]
    app.redis.client = redis.createClient.apply(redis, args)
    app.redis.client.select(opts.db || 0)
    return setupAscoltatore(opts)
}

module.exports.configure = configure = () => {
    return consign({ cwd: 'libs', verbose: false })
        .include('models')
        .include('helpers')
        .include('controllers')
        .into(app)
}

module.exports.start = start = () => {
    configure()

    logger = app.helpers.winston

    setup({
        port: process.env.PORT_REDIS,
        host: process.env.HOST_REDIS,
        db: process.env.DB_REDIS
    })

    // CoAP Gateway
    coapServer = coap.createServer()
    coapServer.on('request', app.controllers.coap_api).listen(process.env.PORT_COAP, () => {
        logger.coap('CoAP server listening on port %d in %s mode', process.env.PORT_COAP, process.env.NODE_ENV)
    });

    // MQTT Gateway
    mqttServer = mqtt.Server(app.controllers.mqtt_api).listen(process.env.PORT_MQTT, () => {
        logger.mqtt('MQTT server listening on port %d in %s mode', process.env.PORT_MQTT, process.env.NODE_ENV)
    });

    // Websocket Gateway
    app.listen(process.env.PORT_SOCKET, () => {
        logger.socket('WebSocket listening on port %d in %s mode', process.env.PORT_SOCKET, process.env.NODE_ENV)
    });

    // Express
    express.locals.pretty = true;
    express.set('port', process.env.PORT_HTTP);
    express.set('views', __dirname + '/libs/auth/web/views');
    express.set('view engine', 'pug');
    express.use(cookieParser());
    express.use(bodyParser.json());
    express.use(bodyParser.urlencoded({ extended: true }));
    express.use(require('express').static(__dirname + '/libs/auth/web/public'));
    express.use(session({
        secret: 'supersecret',
        proxy: true,
        resave: true,
        saveUninitialized: true,
        cookie: { maxAge: 86400000 },
        store: new SQLiteStore({ db: 'database.db', table: 'sessions', dir: './libs/auth/db/' })
    }))
    express.use('/', app.controllers.http_api)

    // HTTP Gateway
    express.listen(process.env.PORT_HTTP, () => {
        logger.http('HTTP server listening on port %d in %s mode', process.env.PORT_HTTP, process.env.NODE_ENV)
    })

    // HTTPS
    // https.listen(process.env.PORT_HTTPS, function () {
    //     logger.https('HTTPS server listening on port %d in %s mode', process.env.PORT_HTTPS, process.env.NODE_ENV)
    // })

    return app
}

if (require.main.filename === __filename) {
    start()
}