module.exports = (app) => {

    const logger = app.helpers.winston
    const Data = app.models.Data
    const TM = require('../auth/config/things-manager')

    return function (client) {
        let self = this
        if (!self.clients) self.clients = {}

        client.on('connect', (packet) => {
            let token
            token = packet.username
            client.user = packet.username
            self.clients[packet.clientId] = client
            client.id = packet.clientId
            client.subscriptions = []

            TM.validity(token, (err, reply) => {
                if (err != null) {
                    logger.error('There\'s an error: %s', err)
                    client.connack({
                        returnCode: 5
                    })
                } else {
                    client.role = reply.data.role
                    client.things_id = reply.data.things_id
                    if (reply.status) {
                        client.connack({
                            returnCode: 0
                        })
                        logger.mqtt('client %s has connected', client.id);
                    } else {
                        client.connack({
                            returnCode: 2
                        })
                        logger.mqtt('client %s has refused, identifier rejected', client.id)
                    }
                }
            })
        });

        client.on('publish', (packet) => {
            if (client.role == 'publisher') {
                logger.mqtt('Client %s publish a message to %s', client.id, packet.topic, packet.payload)
                if (packet.qos == 1) {
                    client.puback({ messageId: packet.messageId })
                }
                return TM.buildTopic(client.things_id, packet.topic, (e, o) => {
                    TM.saveTopic(client.things_id, o)
                    Data.findOrCreate(o, packet.payload)
                })
            } else {
                logger.mqtt('Client %s does not match the role', client.id)
                client.connack({
                    returnCode: 2
                })
                client.stream.end()
            }
        });

        client.on('subscribe', (packet) => {
            if (client.role == 'subscriber') {
                let granted, result, stringValue

                granted = []

                for (let i = 0; i < packet.subscriptions.length; i++) {
                    let qos = packet.subscriptions[i].qos
                    let topic = packet.subscriptions[i].topic
                    let reg = new RegExp(topic.replace('+', '[^\/]+').replace('#', '.+') + '$')
                    granted.push(qos)
                    client.subscriptions.push(reg)
                    client.suback({
                        messageId: packet.messageId,
                        granted: granted
                    })

                    result = []
                    for (let i = 0, len = client.subscriptions.length; i < len; i++) {
                        result.push(function () {
                            let listener
                            listener = (data) => {
                                try {
                                    stringValue = (data.value && data.value.type === 'Buffer') ?
                                        new Buffer.from(data.value).toString() :
                                        data.value.toString()
                                    return client.publish({
                                        topic: data.key,
                                        payload: stringValue
                                    })
                                } catch (err) {
                                    logger.error('There\'s an error: %s', err)
                                    return client.close()
                                }
                            }
                            Data.subscribe(topic, listener)
                            return Data.find(client.subscriptions[i], (err, data) => {
                                if (err != null) {
                                    logger.error('There\'s an error: %s', err)
                                } else {
                                    return listener(data)
                                }
                            })
                        }())
                    }
                    logger.mqtt('Client %s subscribe to %s', client.id, topic)
                }
                return result
            } else {
                logger.mqtt('Client %s does not match the role', client.id)
                client.stream.end()
            }
        });

        client.on('pingreq', () => {
            logger.mqtt('Ping from %s', client.id)
            client.pingresp()
        })

        client.on('disconnect', () => {
            logger.mqtt('Client %s has disconnected', client.id)
            TM.deleteTopic(client.things_id)
            client.stream.end()
        });

        client.on('error', (error) => {
            logger.error('Client %s got an error : %s', 'ERROR', error)
            TM.deleteTopic(client.things_id)
            client.stream.end()
        });

        client.on('close', (error) => {
            if (error) logger.error(error)
            logger.mqtt('Client %s has closed connection', client.id)
            TM.deleteTopic(client.things_id)
            delete self.clients[client.id]
        });

        return client.on('unsubscribe', (packet) => {
            logger.mqtt('Client [%s] has unsubscribed', client.id)
            return client.unsuback({
                messageId: packet.messageId
            })
        })
    }
}