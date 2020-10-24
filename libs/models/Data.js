let EventEmitter = require('events').EventEmitter
let globalEventEmitter = new EventEmitter()
globalEventEmitter.setMaxListeners(0)

const KEYS_SET_NAME = 'topics'

module.exports = function (app) {
    let Data, buildKey
    buildKey = (key) => 'topic:' + key

    Data = (function () {
        function Data(key_, value_) {
            this.key = key_
            this.value = value_
            this.value || (this.value = null)
        }

        Object.defineProperty(Data.prototype, 'key', {
            enumerable: true,
            configurable: false,
            get: function () {
                return this._key
            },
            set: function (key) {
                this.redisKey = buildKey(key)
                this._key = key
                return this._key
            }
        })

        Object.defineProperty(Data.prototype, 'jsonValue', {
            configurable: false,
            enumerable: true,
            get: function () {
                return JSON.stringify(this.value)
            },
            set: function (val) {
                this.value = JSON.parse(val)
                return this.value
            }
        })

        Data.prototype.save = function (callback) {
            app.redis.client.set(this.redisKey, this.jsonValue, ((_this) => {
                return (err) => {
                    return app.ascoltatore.publish(_this.key, _this.value, () => {
                        if (callback != null) {
                            return callback(err, _this)
                        }
                    })
                }
            })(this))
            return app.redis.client.sadd(KEYS_SET_NAME, this.key)
        }
        return Data
    })()

    Data.find = (pattern, callback) => {
        let foundRecord
        foundRecord = (key) => {
            return app.redis.client.get(buildKey(key), (err, value) => {
                if (err) {
                    if (callback != null) {
                        callback(err)
                    }
                    return
                }
                if (value == null) {
                    if (callback != null) {
                        callback('Record not found', null)
                    }
                    return
                }
                if (callback != null) {
                    return callback(null, Data.fromRedis(key, value))
                }
            })
        }
        if (pattern.constructor !== RegExp) {
            foundRecord(pattern)
        } else {
            app.redis.client.smembers(KEYS_SET_NAME, (err, topics) => {
                if (err) console.log(err)
                let i, len, results, topic
                results = []
                for (i = 0, len = topics.length; i < len; i++) {
                    topic = topics[i]
                    if (pattern.test(topic)) {
                        results.push(foundRecord(topic))
                    } else {
                        results.push(void 0)
                    }
                }
                return results
            })
        }
        return Data
    }

    Data.findOrCreate = function () {
        let arg, args, callback, key, value
        args = Array.prototype.slice.call(arguments)
        key = args.shift()
        arg = args.shift()
        if (typeof arg === 'function') {
            callback = arg
        } else {
            value = arg
            callback = args.shift()
        }
        app.redis.client.get(buildKey(key), (err, oldValue) => {
            if (err) console.log(err)
            let data
            data = Data.fromRedis(key, oldValue)
            if (value != null) {
                data.value = value
            }
            return data.save(callback)
        })
        return Data
    }

    Data.fromRedis = function (topic, value) {
        let data
        data = new Data(topic)
        data.jsonValue = value
        return data
    }

    Data.subscribe = function (topic, callback) {
        callback._subscriber = (actualTopic, value) => callback(new Data(actualTopic, value))
        app.ascoltatore.subscribe(topic, callback._subscriber)
        return this
    }

    Data.unsubscribe = function (topic, callback) {
        app.ascoltatore.unsubscribe(topic, callback._subscriber)
        return this
    }
    return Data
}