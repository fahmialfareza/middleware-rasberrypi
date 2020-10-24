module.exports = (app) => {

    const logger = app.helpers.winston
    const router = require('express').Router()
    const AM = require('../auth/config/account-manager')
    const TM = require('../auth/config/things-manager')

    /* 
    Things Request
    */
    /* Things request token */
    router.route('/things/request')
        .post((req, res) => {
            let ip, payload
            ip = req.ip
            if (ip.substr(0, 7) == "::ffff:") {
                ip = ip.substr(7)
            }
            logger.http('Incoming Things for %s request token from %s ', req.method, ip)
            payload = req.body

            if (!req.body) {
                logger.http('Not generate token for %s, %s', ip, err)
                    res.format({
                        'application/json': function () {
                            res.status(401).send({ message: "Things-not-Registered" });
                        }
                    })
            }

            payload.ip = ip
            payload.timestamp = Date.now().toString()
            TM.request(payload, (err, data) => {
                if (err != null) {
                    logger.http('Not generate token for %s, %s', ip, err)
                    res.format({
                        'application/json': function () {
                            res.status(401).send({ message: err});
                        }
                    })
                } else {
                    logger.http('Token generated for %s', ip)
                    res.format({
                        'application/json': function () {
                            res.status(200).send({ token: data });
                        },
                    })
                }
            })
        })
        .get((req, res) => {
            let ip = req.ip
            if (ip.substr(0, 7) == "::ffff:") {
                ip = ip.substr(7)
            }
            logger.http('Incoming Things for %s request token from %s ', req.method, ip)
            res.format({
                'application/json': function () {
                    res.status(405).send({ message: 'Method-not-allowed' })
                }
            })
        })

    router.route('/things/check')
        .get((req, res) => {
            let ip = req.ip
            if (ip.substr(0, 7) == "::ffff:") {
                ip = ip.substr(7)
            }
            logger.http('Incoming ThingThing for %s check token from %s ', req.method, ip)
            if (req.body.token) {
                TM.validity(req.body.token, (err, reply) => {
                    if (err != null) {
                        logger.error('There\'s an error: %s', err)
                        res.format({
                            'application/json': function () {
                                res.status(401).send({ message: err })
                            }
                        })
                    } else {
                        if (reply.status) {
                            res.format({
                                'application/json': function () {
                                    res.status(200).send({ status: 'Valid', message: reply })
                                }
                            })
                        } else {
                            res.format({
                                'application/json': function () {
                                    res.status(200).send({ status: 'Invalid' })
                                }
                            })
                        }
                    }
                })
            } else {
                res.format({
                    'application/json': function () {
                        res.status(200).send({ message: 'Token-not-found' })
                    }
                })
            }
        })

    /*
    User Web Request
    */
    /* Main Path */
    router.route('/')
        .get((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            let ip = req.ip
            if (ip.substr(0, 7) == "::ffff:") {
                ip = ip.substr(7)
            }
            if (req.cookies.login == undefined) {
                res.render('login', { title: 'Hello - Please Login To Your Account' });
            } else {
                AM.validateLoginKey(req.cookies.login, ip, function (e, o) {
                    if (o) {
                        AM.autoLogin(o.username, o.pass, function (o) {
                            req.session.user = o;
                            res.redirect('/dashboard');
                        });
                    } else {
                        res.render('login', { title: 'Login' });
                    }
                });
            }
        })
        .post((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            let ip = req.ip
            if (ip.substr(0, 7) == "::ffff:") {
                ip = ip.substr(7)
            }
            AM.manualLogin(req.body['username'], req.body['password'], function (e, o) {
                if (!o) {
                    console.log(e)
                    res.status(400).send(e);
                } else {
                    req.session.user = o;
                    AM.generateLoginKey(o.username, ip, function (key) {
                        logger.http('User %s has login', req.session.user.username)
                        res.cookie('login', key, { maxAge: 900000 });
                        res.status(200).send(o);
                    });
                }
            });
        })

    /* SignUp path */
    router.route('/signup')
        .get((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            res.render('signup', { title: 'Signup' });
        })
        .post((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            AM.addNewAccount({
                name: req.body['name'],
                email: req.body['email'],
                username: req.body['username'],
                password: req.body['password'],
                admin: req.body['checkbox']
            }, function (err) {
                if (err) {
                    res.status(400).send(err);
                } else {
                    logger.http('User %s has registered', req.body['username'])
                    res.status(200).send('ok');
                }
            });
        })

    /* Dashboard path */
    router.route('/dashboard')
        .get((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            if (req.session.user == null) {
                res.redirect('/');
            } else {
                let user = req.session.user.username
                TM.getThings(user, (err, things) => {
                    res.render('dashboard', {
                        title: 'Dashboard',
                        things: things,
                        usr: req.session.user
                    })
                })
            }
        })

    /* Things Path */
    router.route('/things')
        .get((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            if (req.session.user == null) {
                res.redirect('/');
            } else {
                if (req.query.id) {
                    let id = req.query.id
                    TM.checkId(id, (err, data) => {
                        if (data == null) {
                            res.status(400);
                            res.render('error', { title: 'Page Not Found', message: 'I\'m sorry, the page or resource you are searching for is currently unavailable.' });
                        } else {
                            res.render('edit-things', {
                                title: 'Things Update',
                                things: data
                            })
                        }
                    })
                } else {
                    res.render('things', { title: 'Things' })
                }
            }
        })
        .post((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            if (req.session.user == null) {
                res.redirect('/');
            } else {
                if (req.query.id) {
                    TM.checkId(req.query.id, (err, o) => {
                        if (err) {
                            res.status(400).send('not-found');
                        } else {
                            TM.updateThings({
                                things_id: req.query.id,
                                role: req.body['role'],
                                description: req.body['description']
                            }, (err, rep) => {
                                if (err) {
                                    res.status(400).send(err);
                                } else {
                                    logger.http('User %s has changed the things data', req.session.user.username)
                                    res.status(200).send('ok');
                                }
                            })
                        }
                    })
                }
            }
        })

    router.route('/account')
        .get((req,res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            res.status(200)
            res.render('edit-account', {
                title: 'Account Update',
                usr: req.session.user
            })
        })
        .post((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            if (req.session.user == null) {
                res.redirect('/');
            } else {
                AM.updateAccount({
                    //id: req.session.user.id,
                    username: req.body['username'],
                    name: req.body['name'],
                    email: req.body['email'],
                    password: req.body['password']
                }, function (e, o) {
                    if (e) {
                        res.status(400).send('error-updating-account');
                    } else {
                        logger.http('User %s has changed the account', req.session.user.username)
                        if (req.session.user.admin == 1) {
                            res.redirect('/print')
                        } else {
                            req.session.user = o;
                            res.status(200).send('ok');
                        }
                    }
                });
            }
        })

    /* Get Things API */
    router.get('/api/things', (req, res) => {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        if (req.session.user == null) {
            res.redirect('/');
        } else {
            let user = req.session.user.username
            TM.getThings(user, (err, things) => {
                res.json({ user: user, thing: things })
            })
        }
    })

    router.get('/api/osutils', (req, res) => {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        if (req.session.user == null) {
            res.redirect('/');
        } else {
            let osu = require('node-os-utils');
            let os = require('os-utils');
            let admin = req.session.user.admin;

            (async function run() {
                data = {
                    platform: await osu.os.platform(),
                    uptime: osu.os.uptime(),
                    cpus: osu.cpu.count(),
                    cpuUsage: await osu.cpu.usage(),
                    cpuFree: await osu.cpu.free(),
                    memTotal: os.totalmem(),
                    memFree: os.freemem()
                }
                res.json({ user: admin, osutils: data })
            })()
        }
    })

    /* Register Things path */
    router.route('/register')
        .get((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            if (req.session.user == null) {
                res.redirect('/');
            } else {
                let user = req.session.user.username
                res.render('add-things', {
                    title: 'Register Things',
                })
            }
        })
        .post((req, res) => {
            // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
            //     return res.redirect('https://' + req.get('host') + req.url);
            // }
            TM.addThings({
                things_name: req.body['things_name'],
                role: req.body['role'],
                description: req.body['description'],
                user: req.session.user.username
            }, (err) => {
                if (err) {
                    res.status(400).send(err);
                } else {
                    logger.http('User %s has register the things', req.session.user.username)
                    res.status(200).send('ok');
                }
            })
        })

    /* Delete Path */
    router.post('/delete', function (req, res) {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        if (req.session.user == null) {
            res.redirect('/');
        } else {
            if (req.query.id) {
                TM.deleteThings(req.query.id, null, (err, obj) => {
                    if (err != null) {
                        res.status(400).send('record not found');
                    } else {
                        logger.http('User %s has deleted the things', req.session.user.username)
                        res.status(200).send('ok');
                    }
                })
            } else {
                if (req.body['username']) {
                    AM.deleteAccount(req.body['username'], function (err, obj) {
                        if (err != null) {
                            res.status(400).send('record not found');
                        } else {
                            res.redirect('/print')
                        }
                    })
                } else {
                    AM.deleteAccount(req.session.user.username, function (err, obj) {
                        if (err != null) {
                            res.status(400).send('record not found');
                        } else {
                            TM.deleteThings(null, req.session.user.username, (err, obj) => {
                                if (err != null) {
                                    res.status(400).send('record not found');
                                } else {
                                    logger.http('User %s has deleted the account and Things', req.session.user.username)
                                    res.clearCookie('login');
                                    req.session.destroy(function (e) { res.status(200).send('ok'); });
                                }
                            })
                        }
                    });
                }
            }
        }
    });

    /* Print All User Path*/
    router.get('/print', function (req, res) {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        if (req.session.user && req.session.user.admin == 1) {
            AM.getAllRecords(function (e, accounts) {
                TM.getAllThings(function (e, things) {
                    res.render('print', { title: 'Account List', accts: accounts, thing: things });
                })
            })
        } else {
            res.render('error', { title: 'Forbidden', message: 'forbidden you don\'t have permission to access ' + req.path + ' on this server' })
        }
    });

    /* System Utils */
    router.get('/status', function (req, res) {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        if (req.session.user.admin == 1) {
            res.render('sysutils', { title: 'Information System' })
        } else {
            res.render('error', { title: 'Forbidden', message: 'forbidden you don\'t have permission to access ' + req.path + ' on this server' })
        }
    })

    /* LogOut Path */
    router.post('/logout', (req, res) => {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        logger.http('User %s has logout', req.session.user.username)
        res.clearCookie('login');
        req.session.destroy(function (e) { res.status(200).send('ok'); });
    })

    router.post('/approve', (req,res) => {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        if (req.session.user == null) {
            res.redirect('/');
        } else {
            AM.approveAccount(req.body['username'], (e,o) => {
                if (e != null) {
                    res.status(400).send('record not found');
                } else {
                    res.redirect('/print')
                }
            })
        }
    })

    router.post('/decline', (req,res) => {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        if (req.session.user == null) {
            res.redirect('/');
        } else {
            AM.declineAccount(req.body['username'], (e,o) => {
                if (e != null) {
                    res.status(400).send('record not found');
                } else {
                    res.redirect('/print')
                }
            })
        }
    })

    /* Error path handler */
    router.get('*', function (req, res) {
        // if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        //     return res.redirect('https://' + req.get('host') + req.url);
        // }
        res.render('error', { title: 'Page Not Found', message: 'I\'m sorry, the page or resource you are searching for is currently unavailable.' });
    });

    return router
}
