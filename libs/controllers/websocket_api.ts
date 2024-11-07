module.exports = (app) => {
  const logger = app.helpers.winston;
  const Data = app.models.Data;
  const TM = require("../auth/config/things-manager");

  //   @ts-ignore
  return io.on("connection", (socket) => {
    let token = socket.handshake.query?.token;
    let subscriptions = {};

    if (!token) {
      logger.error("JWT must be provided by client %s", socket.id);
      socket.emit("error_msg", "JWT must be provided");
      socket.disconnect();
      return;
    }

    // Verify token and handle connection based on role
    TM.validity(token, (err, reply) => {
      if (err) {
        logger.error(
          "Token validation error for client %s: %s",
          socket.id,
          err.message
        );
        socket.emit("error_msg", err.message);
        socket.disconnect();
        return;
      }

      if (!reply.status || reply.data.role !== "subscriber") {
        logger.error("Client %s rejected: Invalid role or status", socket.id);
        socket.emit("error_msg", "Unauthorized or invalid role");
        socket.disconnect();
        return;
      }

      logger.info("Client %s connected as a subscriber", socket.id);

      socket.on("subscribe", (topic) => {
        logger.info("Client %s subscribed to topic %s", socket.id, topic);

        const subscriptionHandler = (currentData) => {
          try {
            const value = Buffer.isBuffer(currentData.value)
              ? currentData.value.toString()
              : currentData.value;
            socket.emit(`/r/${topic}`, value);
          } catch (error) {
            logger.error(
              "Error processing subscription data for client %s: %s",
              socket.id,
              error.message
            );
            socket.emit("error_msg", "Error processing subscription data");
          }
        };

        subscriptions[topic] = subscriptionHandler;

        Data.subscribe(topic, subscriptionHandler);
        Data.find(topic, (err, data) => {
          if (err) {
            logger.error(
              "Error finding initial data for topic %s: %s",
              topic,
              err.message
            );
          } else if (data?.value) {
            subscriptionHandler(data);
          }
        });
      });

      socket.on("disconnect", () => {
        logger.info("Client %s disconnected", socket.id);

        Object.entries(subscriptions).forEach(([topic, listener]) => {
          Data.unsubscribe(topic, listener);
        });

        subscriptions = {}; // Clear subscriptions after disconnect
      });
    });
  });
};
