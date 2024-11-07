import { Request, Response } from "coap"; // Assumes custom CoAP types exist
import { ParsedUrlQuery } from "querystring";
import url from "url";
import { Logger } from "winston";
import { DataModel, ThingsManager, ExtendedLogger } from "../types"; // Custom types for `DataModel` and `ThingsManager`

interface CoapRequest extends Request {
  headers: any;
  url: string;
  method: any;
  rsinfo: {
    address: string;
  };
  payload: string;
}

interface CoapResponse extends Response {
  on(arg0: string, arg1: () => void): unknown;
  code: string;
  end: (payload: string) => void;
  write: (payload: string) => void;
  reset: () => void;
}

interface App {
  helpers: {
    winston: ExtendedLogger;
  };
  models: {
    Data: DataModel;
  };
}

module.exports = (app: App) => {
  const logger = app.helpers.winston;
  const Data = app.models.Data;
  const TM: ThingsManager = require("../auth/config/things-manager");

  return (req: CoapRequest, res: CoapResponse) => {
    const sendResponse = (code: string, payload: object) => {
      res.code = code;
      res.end(JSON.stringify(payload));
    };

    const handlerPost = () => {
      let topic: string, payload: Buffer | undefined, token: string | undefined;
      const parseUrl = url.parse(req.url || "", true);
      const parsePayload = JSON.parse(req.payload);

      if (!/^\/r\/(.+)$/.exec(req.url || "")) {
        return sendResponse("4.00", { message: "Bad Request" });
      }

      if (parseUrl.query.token) {
        token = parseUrl.query.token as string;
        payload = Buffer.from(req.payload);
      } else if (parsePayload.token) {
        token = parsePayload.token;
        delete parsePayload.token;
        payload = Buffer.from(JSON.stringify(parsePayload));
      }

      //  @ts-ignore
      topic = (/^\/r\/(.+)$/.exec(req.url || "")[1] || "").split("?")[0];

      if (!token) {
        logger.coap(
          `Server has refused, client ${req.rsinfo.address} does not have tokens`
        );
        logger.error("There's an error: jwt must be provided");
        sendResponse("4.01", {
          message: "Unauthorized",
          additional: "jwt must be provided",
        });
      } else {
        TM.validity(token, (err, reply) => {
          if (err) {
            logger.error(`There's an error: ${err}`);
            sendResponse("4.00", {
              message: "Bad Request",
              //  @ts-ignore
              additional: err.name,
            });
          } else if (reply?.status) {
            if (reply.data.role === "publisher") {
              TM.buildTopic(reply.data.things_id, topic, (e, builtTopic) => {
                TM.saveTopic(reply.data.things_id, builtTopic);
                //  @ts-ignore
                Data.findOrCreate(builtTopic, payload);
                logger.coap(
                  `Incoming ${req.method} request from ${req.rsinfo.address} for topic ${topic}`
                );
                sendResponse("2.01", { message: "Created" });
              });
            } else {
              logger.coap(
                `Refused ${req.method} request, from ${req.rsinfo.address} does not match the role`
              );
              sendResponse("4.01", {
                message: "Unauthorized",
                additional: "Does not match the role",
              });
            }
          } else {
            logger.coap(
              `Server has refused, client ${req.rsinfo.address} identity rejected`
            );
            sendResponse("4.01", { message: "Unauthorized" });
          }
        });
      }
    };

    const handlerGet = () => {
      let topic: string, token: string | undefined;
      const parseUrl = url.parse(req.url || "", true);
      const parsePayload = JSON.parse(req.payload);

      if (!/^\/r\/(.+)$/.exec(req.url || "")) {
        return sendResponse("4.00", { message: "Bad Request" });
      }

      if (parseUrl.query.token) {
        token = parseUrl.query.token as string;
      } else if (parsePayload.token) {
        token = parsePayload.token;
        delete parsePayload.token;
      }

      //  @ts-ignore
      topic = /^\/r\/(.+)$/.exec(req.url || "")[1] || "";

      if (!token) {
        logger.coap(
          `Server has refused, client ${req.rsinfo.address} does not have tokens`
        );
        logger.error("There's an error: jwt must be provided");
        sendResponse("4.01", {
          message: "Unauthorized",
          additional: "jwt must be provided",
        });
      } else {
        TM.validity(token, (err, reply) => {
          if (err) {
            logger.error(`There's an error: ${err}`);
            sendResponse("5.00", {
              message: "Internal Server Error",
              additional: err,
            });
            //  @ts-ignore
          } else if (reply?.status && reply.role === "subscriber") {
            logger.coap(
              `Incoming ${req.method} request from ${req.rsinfo.address} for ${topic}`
            );
            const handlerObserver = (payload: {
              topic: string;
              payload: string;
            }) => {
              const listener = (data: any) => {
                try {
                  const stringValue = Buffer.isBuffer(data.value)
                    ? data.value.toString()
                    : data.value.toString();
                  res.write(JSON.stringify({ topic, payload: stringValue }));
                } catch (err) {
                  logger.error(`There's an error: ${err.toLowerCase()}`);
                }
              };

              res.write(JSON.stringify(payload));
              Data.subscribe(topic, listener);

              res.on("finish", () => {
                res.reset();
              });
            };

            Data.find(topic, (err, data) => {
              if (err || data === null) {
                sendResponse("4.04", { message: "not found" });
              } else {
                const stringValue = Buffer.isBuffer(data.value)
                  ? data.value.toString()
                  : data.value;
                if (req.headers["Observe"] !== 0) {
                  sendResponse("2.05", { topic, payload: stringValue });
                } else {
                  handlerObserver({ topic, payload: stringValue });
                }
              }
            });
          } else {
            logger.coap(
              `Refused ${req.method} request, from ${req.rsinfo.address} does not match the role`
            );
            sendResponse("4.01", {
              message: "Unauthorized",
              additional: "Does not match the role",
            });
          }
        });
      }
    };

    const handlerOther = () => {
      logger.coap(`Incoming ${req.method} request from ${req.rsinfo.address}`);
      sendResponse("4.05", { message: "Method Not Allowed" });
    };

    switch (req.method) {
      case "POST":
        handlerPost();
        break;
      case "GET":
        handlerGet();
        break;
      default:
        handlerOther();
        break;
    }
  };
};
