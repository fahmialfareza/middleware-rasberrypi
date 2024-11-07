require("dotenv").config();

// @ts-ignore
import coap from "coap";
// @ts-ignore
import mqtt from "mqtt";
import express, { Express } from "express";
import session from "express-session";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
// @ts-ignore
import consign from "consign";
// @ts-ignore
import ascoltatori from "ascoltatori";
// @ts-ignore
import redis from "redis";
const SQLiteStore = require("connect-sqlite3")(session);
import http from "http";
// @ts-ignore
import socketIo from "socket.io";
import { Logger } from "winston";

interface Opts {
  port: string;
  host: string;
  db: string;
}

interface App extends Express {
  redis?: any;
  controllers?: any;
}

const app: App = express();
const server = http.createServer(app);
const io = socketIo(server);

app.redis = {};

let logger: Logger;

// Set up Ascoltatore with Redis
const setupAscoltatore = (opts: Opts) => {
  app.ascoltatore = new ascoltatori.RedisAscoltatore({
    redis,
    port: opts.port,
    host: opts.host,
    db: opts.db,
  });
  return app.ascoltatore;
};

// Set up Redis and Ascoltatore
const setupRedis = (opts: Opts) => {
  const args = [opts.port, opts.host];
  app.redis.client = redis.createClient(...args);
  app.redis.client.select(opts.db || 0);
  return setupAscoltatore(opts);
};

// Configure consign to include modules
const configureApp = () => {
  return consign({ cwd: "libs", verbose: false })
    .include("models")
    .include("helpers")
    .include("controllers")
    .into(app);
};

// Initialize and configure servers
const initializeServers = () => {
  configureApp();
  logger = app.helpers!.winston;

  // Setup Redis
  setupRedis({
    port: process.env.PORT_REDIS!,
    host: process.env.HOST_REDIS!,
    db: process.env.DB_REDIS!,
  });

  // CoAP Gateway
  const coapServer = coap.createServer();
  coapServer.on("request", app.controllers.coap_api);
  coapServer.listen(process.env.PORT_COAP, () => {
    logger.info(
      `CoAP server listening on port ${process.env.PORT_COAP} in ${process.env.NODE_ENV} mode`
    );
  });

  // MQTT Gateway
  const mqttServer = mqtt.createServer();
  mqttServer.on("client", app.controllers.mqtt_api);
  mqttServer.listen(process.env.PORT_MQTT, () => {
    logger.info(
      `MQTT server listening on port ${process.env.PORT_MQTT} in ${process.env.NODE_ENV} mode`
    );
  });

  // WebSocket Gateway
  io.on("connection", app.controllers.socket_api);
  server.listen(process.env.PORT_SOCKET, () => {
    logger.info(
      `WebSocket listening on port ${process.env.PORT_SOCKET} in ${process.env.NODE_ENV} mode`
    );
  });

  // Express HTTP Server Setup
  setupExpress();

  // HTTP Gateway
  app.listen(process.env.PORT_HTTP, () => {
    logger.info(
      `HTTP server listening on port ${process.env.PORT_HTTP} in ${process.env.NODE_ENV} mode`
    );
  });
};

// Set up Express with middleware and routes
const setupExpress = () => {
  app.set("port", process.env.PORT_HTTP);
  app.set("views", `${__dirname}/libs/auth/web/views`);
  app.set("view engine", "pug");

  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(express.static(`${__dirname}/libs/auth/web/public`));

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "supersecret",
      proxy: true,
      resave: true,
      saveUninitialized: true,
      cookie: { maxAge: 86400000 },
      store: new SQLiteStore({
        db: "database.db",
        table: "sessions",
        dir: "./libs/auth/db/",
      }),
    })
  );

  app.use("/", app.controllers.http_api);
};

// Start the application
const startApp = () => {
  initializeServers();
};

if (require.main === module) {
  startApp();
}

module.exports = {
  app,
  setupRedis,
  setupAscoltatore,
  configureApp,
};
