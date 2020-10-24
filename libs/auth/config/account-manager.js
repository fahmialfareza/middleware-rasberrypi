const crypto = require('crypto');
const db = require('../db/db');
const TM = require('./things-manager')

/* Public methods */

/* Auto login validation methods */
exports.autoLogin = function (user, pass, callback) {
	db.get('SELECT * FROM accounts WHERE username=?', user, (e, o) => {
		if (o && o.approved == 1) {
			o.pass == pass ? callback(o) : callback(null);
		} else {
			callback(null);
		}
	})
}

/* Manual login validation methods */
exports.manualLogin = function (user, pass, callback) {
	db.get('SELECT * FROM accounts WHERE username=?', user, (e, o) => {
		if (o) {
			if (o.approved == 1) {
				validatePassword(pass, o.password, function (err, res) {
					if (res) {
						callback(null, o);
					} else {
						callback('invalid-password');
					}
				});
			} else {
				callback('not-approved')
			}
		} else {
			callback('user-not-found');
		}
	})
}

/* Generator cookie (Login Key) methods */
exports.generateLoginKey = function (user, ipAddress, callback) {
	let cookie = guid();
	db.run('UPDATE accounts SET ip=?,cookie=? WHERE username=?', [ipAddress, cookie, user], (e, o) => {
		callback(cookie);
	});
}

/* Validator cookie (Login Key) methods */
exports.validateLoginKey = function (cookie, ipAddress, callback) {
	db.get('SELECT username,password FROM accounts WHERE cookie=? AND ip=?', [cookie, ipAddress], (e,o) => {
		callback(null,o)
	});
}

/* insertion methods */
exports.addNewAccount = function (newData, callback) {
	db.serialize(function () {
		const query1 = 'SELECT username FROM accounts WHERE username=?';
		const query2 = 'SELECT email FROM accounts WHERE email=?';
		const query3 = 'INSERT INTO accounts (name,email,username,password,ip,admin,date) VALUES (?,?,?,?,?,?,datetime("now", "localtime"))';
		db.get(query1, [newData.username], (err, row) => {
			if (err) throw err;
			if (row) {
				callback('username-taken');
			} else {
				db.get(query2, newData.email, (err, row) => {
					if (row) {
						callback('email-taken');
					} else {
						saltAndHash(newData.password, function (hash) {
							newData.password = hash;
							// append date stamp when record was created //
							newData.date = new Date().toLocaleString()
							let admin
							if (newData.admin == "true"){ admin = 1 }
							else { admin = 0 }
							db.run(query3, [newData.name, newData.email, newData.username, newData.password, newData.ip, admin], callback)
						});
					}
				})
			}
		})
	})
}

/* Update methods */
exports.updateAccount = function (newData, callback) {
	let findOneAndUpdate = function (data) {
		let o = {
			name: data.name,
			email: data.email,
		}
		if (data.password) {
			// o.pass = data.pass;
			db.run('UPDATE accounts SET name=?,email=?,password=? WHERE username=?', [o.name, o.email, data.password, data.username]);
		} else {
			db.run('UPDATE accounts SET name=?,email=? WHERE username=?', [o.name, o.email, data.username]);
		}
		db.get('SELECT name,email,username,date FROM accounts WHERE username=?', [data.username], (e, o) => {
			callback(null, o)
		})
	}
	// findOneAndUpdate(newData);
	if (newData.password == '') {
		findOneAndUpdate(newData);
	} else {
		saltAndHash(newData.password, function (hash) {
			newData.password = hash;
			findOneAndUpdate(newData);
		});
	}
}

/* Delete methods */
exports.deleteAccount = function (username, callback) {
	db.run('DELETE FROM accounts WHERE username=?', username, (err, o) => {
		if (err) { callback(err, null) }
		else {
			DM.deleteThings(null, username, (err,o) => {
				if (err) { callback(err, null) }
				else { (callback(null, o)) }
			})
		}
	})
}

/* account lookup methods */
exports.getAllRecords = function (callback) {
	db.all('SELECT name,email,username,date,admin,date,approved FROM accounts', (err, row) => {
		if (err) {
			callback(err)
		} else {
			callback(null, row)
		}
	})
}

exports.approveAccount = function (username, callback) {
	db.run('Update accounts SET approved=1 WHERE username=?', username, (e, o) => {
		if (e) { callback(err, null) }
		else (callback(null, o))
	})
}

exports.declineAccount = function (username, callback) {
	db.run('Update accounts SET approved=0 WHERE username=?', username, (e, o) => {
		if (e) { callback(err, null) }
		else (callback(null, o))
	})
}

/* Private methods */
/* Salt generator */
let generateSalt = function () {
	let set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	let salt = '';
	for (let i = 0; i < 10; i++) {
		let p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

/* Hashing md5 algorithm */
let md5 = function (str) {
	return crypto.createHash('md5').update(str).digest('hex');
}

let saltAndHash = function (pass, callback) {
	let salt = generateSalt();
	callback(salt + md5(pass + salt));
}

let validatePassword = function (plainPass, hashedPass, callback) {
	let salt = hashedPass.substr(0, 10);
	let validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
}

let getObjectId = function (id) {
	return new require('mongodb').ObjectID(id);
}

const guid = function () {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		let r = Math.random() * 16 | 0, v = c == 'x' ? r : r & 0x3 | 0x8; return v.toString(16);
	});
}
