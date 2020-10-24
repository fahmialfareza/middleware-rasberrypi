module.exports = (app) => {

    const logger = app.helpers.winston
    const Data = app.models.Data
    const TM = require('../auth/config/things-manager')
    const url = require('url');

    return (req, res) => {

        const sendResponse = (code, payload) => {
            res.code = code
            res.end(JSON.stringify(payload))
        }

        const handlerPost = () => {
            let topic, payload, token, parseUrl, parsePayload

            parseUrl = url.parse(req.url, true)
            parsePayload = JSON.parse(req.payload)

            if (/^\/r\/(.+)$/.exec(req.url) === null) {
                return sendResponse('4.00', {
                    message: 'Bad Request'
                })
            }

            if (parseUrl.query.token) {
                token = parseUrl.query.token
                payload = req.payload
            } else if (parsePayload.token) {
                token = parsePayload.token
                delete parsePayload.token
                payload = Buffer.from(JSON.stringify(parsePayload))
            }

            topic = (/^\/r\/(.+)$/.exec(req.url)[1]).split("?")[0]

            if (!token) {
                logger.coap('Server has refused, client %s do not have tokens', req.rsinfo.address)
                logger.error('There\'s an error: jwt must be provided')
                sendResponse('4.01', {
                    message: 'Unauthorized',
                    additional: 'jwt must be provided'
                })
            } else {
                TM.validity(token, (err, reply) => {
                    if (err != null) {
                        logger.error('There\'s an error: %s', err)
                        sendResponse('4.00', {
                            message: 'Bad Request',
                            additional: err.name
                        })
                    } else {
                        if (reply.status) {
                            if (reply.data.role == 'publisher') {
                                TM.buildTopic(reply.data.things_id, topic, (e, o) => {
                                    TM.saveTopic(reply.data.things_id, o)
                                    Data.findOrCreate(o, payload)
                                    logger.coap('Incoming %s request from %s for topic %s ', req.method, req.rsinfo.address, topic)
                                    sendResponse('2.01', {
                                        message: 'Created'
                                    })
                                })
                            } else {
                                logger.coap('Refused %s request, from %s does not match the role', req.method, req.rsinfo.address)
                                sendResponse('4.01', {
                                    message: 'Unauthorized',
                                    additional: 'Does not match the role'
                                })
                            }
                        } else {
                            logger.coap('Server has refused, client %s identity rejected', req.rsinfo.address)
                            sendResponse('4.01', {
                                message: 'Unauthorized'
                            })
                        }
                    }
                })
            }
        }

        const handlerGet = () => {
            let topic, payload, token, parseUrl, parsePayload

            parseUrl = url.parse(req.url, true)
            parsePayload = JSON.parse(req.payload)

            if (/^\/r\/(.+)$/.exec(req.url) === null) {
                return sendResponse('4.00', {
                    message: 'Bad Request'
                })
            }
            if (parseUrl.query.token) {
                token = parseUrl.query.token
            } else if (parsePayload.token) {
                token = parsePayload.token
                delete parsePayload.token
                payload = Buffer.from(JSON.stringify(data))
            }

            topic = /^\/r\/(.+)$/.exec(req.url)[1]

            if (!token) {
                logger.coap('Server has refused, client %s do not have tokens', req.rsinfo.address)
                logger.error('There\'s an error: jwt must be provided')
                sendResponse('4.01', {
                    message: 'Unauthorized',
                    additional: 'jwt must be provided'
                })
            } else {
                TM.validity(token, (err, reply) => {
                    if (err != null) {
                        logger.error('There\'s an error: %s', err)
                        sendResponse('5.00', {
                            message: 'Internal Server Error',
                            additional: err
                        })
                    } else {
                        if (reply.status) {
                            if (reply.role == 'subscriber') {
                                logger.coap('Incoming %s request from %s for %s ', req.method, req.rsinfo.address, topic)
                                let handlerObserver = function (payload) {
                                    let listener = function (data) {
                                        try {
                                            let stringValue = (data.value && data.value.type === 'Buffer') ?
                                                new Buffer(data.value).toString() :
                                                data.value.toString()
                                            res.write(JSON.stringify({
                                                topic: topic,
                                                payload: stringValue
                                            }))
                                        } catch (err) {
                                            logger.error('There\'s an error: %s', err.toLowerCase())
                                        }
                                    }

                                    res.write(JSON.stringify(payload))
                                    Data.subscribe(topic, listener)

                                    res.on('finish', function (err) {
                                        if (err)
                                            if (err) logger.error(err)
                                        res.reset()
                                    })
                                }

                                Data.find(topic, function (err, data) {
                                    if (err != null || data == null) {
                                        sendResponse('4.04', {
                                            message: 'not found'
                                        })
                                    } else {
                                        let stringValue = (data.value && data.value.type === 'Buffer') ?
                                            new Buffer(data.value).toString() :
                                            data.value
                                        if (req.headers['Observe'] !== 0) {
                                            sendResponse('2.05', {
                                                topic: topic,
                                                payload: stringValue
                                            })
                                        } else {
                                            handlerObserver({
                                                topic: topic,
                                                payload: stringValue
                                            })
                                        }
                                    }
                                })
                            } else {
                                logger.coap('Refused %s request, from %s does not match the role', req.method, req.rsinfo.address)
                                sendResponse('4.01', {
                                    message: 'Unauthorized',
                                    additional: 'Does not match the role'
                                })
                            }
                        } else {
                            logger.coap('Server has refused, client %s identity rejected', req.rsinfo.address)
                            sendResponse('4.01', {
                                message: 'Unauthorized'
                            })
                        }
                    }
                })
            }
        }

        const handlerOther = () => {
            logger.coap('Incoming %s request from %s', req.method, req.rsinfo.address)
            sendResponse('4.05', {
                message: 'Method Not Allowed'
            })
        }

        switch (req.method) {
            case 'POST':
                handlerPost()
                break
            case 'GET':
                handlerGet()
                break
            default:
                handlerOther()
                break
        }
    }
}