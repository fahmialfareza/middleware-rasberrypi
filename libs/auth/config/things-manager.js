const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const db = require('../db/db');

/* Request Token */
exports.request = function (payload, callback) {
    db.get('SELECT * FROM things WHERE things_id=? AND things_password=?', [payload.things_id, payload.things_password], (err, docs) => {
        if (err) { callback(err, null) }
        if (docs) {
            if (docs.token) {
                checkToken(docs.token, (err, reply) => {
                    if (err) {
                        if (err.name == "TokenExpiredError") {
                            docs.ip = payload.ip
                            docs.timestamp = payload.timestamp
                            generateToken(docs, (err, token) => {
                                if (err != null) { callback(err, null) }
                                else { callback(null, token) }
                            })
                        }
                    }
                    else {
                        callback('Already-has-token', null)
                    }
                })
            } else {
                docs.ip = payload.ip
                docs.timestamp = payload.timestamp
                generateToken(docs, (err, token) => {
                    if (err != null) { callback(err, null) }
                    else { callback(null, token) }
                })
            }
        } else {
            callback('Things-not-Registered', null)
        }
    })
}

exports.validity = function (token, callback) {
    checkToken(token, (err, reply) => {
        if (err != null) {
            callback(err, { 'status': false })
        } else {
            db.get('SELECT things_id FROM things WHERE things_id=?', reply.things_id, (e, o) => {
                if (o) { callback(null, { 'status': true, 'data': reply }) }
                else { callback(err, { 'status': false }) }
            })
        }
    })
}

exports.addThings = function (dataThings, callback) {
    let tempId
    db.get('SELECT * FROM things WHERE things_name=? AND user=?', [dataThings.things_name, dataThings.user], (err, dvc) => {
        if (dvc) {
            callback('things-name-taken')
        } else {
            tempId = hashing(dataThings.things_name, Date.now())
            db.get('SELECT things_id FROM things WHERE things_id=?', tempId, (err, rep) => {
                if (err) { callback(err) }
                if (rep) { dataThings.things_id = hashing(dataThings.things_name, Date.now()) } 
                else { dataThings.things_id = tempId }
                dataThings.topic_id = generateTopicId()
                dataThings.things_password = hashing(dataThings.user, Date.now())
                db.run('INSERT INTO things (things_name,role,description,user,things_id,things_password,topic_id,date) VALUES (?,?,?,?,?,?,?,datetime("now","localtime"))', [dataThings.things_name, dataThings.role, dataThings.description, dataThings.user, dataThings.things_id, dataThings.things_password, dataThings.topic_id], (err, o) => {
                    if (err) { callback(err) }
                    else { callback(null) }
                })
            })
        }
    })
}

exports.updateThings = function (newData, callback) {
    db.run('UPDATE things SET role=?,description=? WHERE things_id=?', [newData.role, newData.description, newData.things_id], callback)
}

exports.checkId = function (id, callback) {
    db.get('SELECT things_name,things_id,things_password,role,description,user,date,topic FROM things WHERE things_id=?', id, (err, rep) => {
        if (rep) { callback(null, rep) }
        else { callback(err, null) }
    })
}

exports.getThings = function (user, callback) {
    db.all('SELECT things_name,things_id,things_password,role,description,user,date,topic FROM things WHERE user=?', user, (e, res) => {
        if (e) callback(e)
        else callback(null, res)
    })
}

exports.getAllThings = function (callback) {
    db.all('SELECT things_name,things_id,things_password,role,description,user,date,topic FROM things', (e, res) => {
        if (e) callback(e)
        else callback(null, res)
    })
}

exports.deleteThings = function (id, user, callback) {
    if (id != null) {
        db.run('DELETE FROM things WHERE things_id=?', id, callback)
    } else if (user != null) {
        db.run('DELETE FROM things WHERE user=?', user, callback)
    }
}

exports.saveTopic = function (things_id, topic) {
    db.run('UPDATE things SET topic=? WHERE things_id=?', [topic, things_id])
}

exports.deleteTopic = function (things_id) {
    db.run('UPDATE things SET topic=null WHERE things_id=?', things_id)
}

exports.buildTopic = function (things_id, topic, callback) {
    db.get('SELECT topic_id FROM things WHERE things_id=?', things_id, (e,o) => {
        if (o) {
            callback(null, o.topic_id + '/' + topic)
        } else {
            callback(e)
        }
    })
}

let generateTopicId = function () {
    return crypto.randomBytes(4).toString(process.env.ENCODE);
}

let generateSalt = function () {
    let set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
    let salt = '';
    for (let i = 0; i < 10; i++) {
        let p = Math.floor(Math.random() * set.length);
        salt += set[p];
    }
    return salt;
}

let hashing = function (str, timestamp) {
    return crypto.createHash('sha256').update(str + '-' + timestamp).digest(process.env.ENCODE);
}

let checkToken = function (token, callback) {
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
        if (err) {
            callback(err, null)
        } else {
            callback(null, decoded)
        }
    })
}

let generateToken = function (docs, callback) {
    let payload = {
        things_id: docs.things_id,
        things_name: docs.things_name,
        timestamp: docs.timestamp,
        role: docs.role
    }
    jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: process.env.EXP_TIME, issuer: process.env.ISSUER }, (err, token) => {
        if (err) {
            callback(err.name, null)
        } else {
            db.run('UPDATE things SET ip=?,timestamp=?,token=? WHERE things_id=?', [docs.ip, docs.timestamp, token, docs.things_id], (err) => {
                if (err) callback(err, null)
            })
            callback(null, token)
        }
    })
}