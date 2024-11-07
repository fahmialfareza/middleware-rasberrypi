module.exports = (app) => {
  const logger = app.helpers.winston;
  const Data = app.models.Data;
  const TM = require("../auth/config/things-manager");

  return function (client) {
    const self = this;
    self.clients = self.clients || {};

    client.on("connect", async (packet) => {
      const token = packet.username;
      client.user = packet.username;
      client.id = packet.clientId;
      client.subscriptions = [];
      self.clients[client.id] = client;

      try {
        const reply = await TM.validity(token);

        if (reply && reply.status) {
          client.role = reply.data.role;
          client.things_id = reply.data.things_id;
          client.connack({ returnCode: 0 });
          logger.mqtt("Client %s has connected", client.id);
        } else {
          client.connack({ returnCode: 2 });
          logger.mqtt("Client %s refused: identifier rejected", client.id);
          client.stream.end();
        }
      } catch (err) {
        logger.error(
          "Token validation error for client %s: %s",
          client.id,
          err
        );
        client.connack({ returnCode: 5 });
        client.stream.end();
      }
    });

    client.on("publish", (packet) => {
      if (client.role === "publisher") {
        logger.mqtt(
          "Client %s published message to %s",
          client.id,
          packet.topic
        );
        if (packet.qos === 1) client.puback({ messageId: packet.messageId });

        TM.buildTopic(client.things_id, packet.topic, (err, topic) => {
          if (err) {
            logger.error(
              "Error building topic for client %s: %s",
              client.id,
              err
            );
            return;
          }
          TM.saveTopic(client.things_id, topic);
          Data.findOrCreate(topic, packet.payload);
        });
      } else {
        logger.mqtt("Client %s role mismatch for publishing", client.id);
        client.connack({ returnCode: 2 });
        client.stream.end();
      }
    });

    client.on("subscribe", (packet) => {
      if (client.role === "subscriber") {
        const granted = packet.subscriptions.map((sub) => sub.qos);
        const result = packet.subscriptions.map((sub) => {
          const topicRegExp = new RegExp(
            sub.topic.replace("+", "[^/]+").replace("#", ".+") + "$"
          );
          client.subscriptions.push(topicRegExp);

          const listener = (data) => {
            try {
              const payload = Buffer.isBuffer(data.value)
                ? data.value.toString()
                : data.value;
              client.publish({ topic: data.key, payload });
            } catch (err) {
              logger.error(
                "Subscription error for client %s: %s",
                client.id,
                err
              );
              client.close();
            }
          };

          Data.subscribe(sub.topic, listener);
          Data.find(sub.topic, (err, data) => {
            if (err) {
              logger.error(
                "Error finding topic data for %s: %s",
                sub.topic,
                err
              );
            } else {
              listener(data);
            }
          });

          logger.mqtt("Client %s subscribed to %s", client.id, sub.topic);
          return listener;
        });

        client.suback({ messageId: packet.messageId, granted });
        return result;
      } else {
        logger.mqtt("Client %s role mismatch for subscribing", client.id);
        client.stream.end();
      }
    });

    client.on("pingreq", () => {
      logger.mqtt("Ping from %s", client.id);
      client.pingresp();
    });

    client.on("disconnect", () => {
      logger.mqtt("Client %s disconnected", client.id);
      TM.deleteTopic(client.things_id);
      client.stream.end();
    });

    client.on("error", (error) => {
      logger.error("Client %s error: %s", client.id, error);
      TM.deleteTopic(client.things_id);
      client.stream.end();
    });

    client.on("close", (error) => {
      if (error) logger.error("Client %s close error: %s", client.id, error);
      logger.mqtt("Client %s connection closed", client.id);
      TM.deleteTopic(client.things_id);
      delete self.clients[client.id];
    });

    client.on("unsubscribe", (packet) => {
      logger.mqtt("Client %s unsubscribed", client.id);
      client.unsuback({ messageId: packet.messageId });
    });
  };
};
