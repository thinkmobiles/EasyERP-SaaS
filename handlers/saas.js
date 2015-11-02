/**
 * Created by Roman on 01.04.2015.
 */
var subdomainHelper = require('../helpers/subdomain.js');
var RESPONSES = ('../constants/responses');
var mongoose = require('mongoose');
var UsersSchema = mongoose.Schemas['User'];
var crypto = require('crypto');
var geoip = require('geoip-lite');
var Mailer = require('../helpers/mailer');
var generator = require('../helpers/randomPass.js');
var tracker = require('../helpers/tracker.js');

var mailer = new Mailer();

var Saas = function (mainDb) {
    var dbRegistrator = require('../helpers/dbRegistrator.js')(mainDb);
    var SaasSchema = mongoose.Schemas['Saas'];
    var Saas = mainDb.model('Saas', SaasSchema);

    this.forgotPass = function (req, res, next) {
        var body = req.body;
        var email = body.email;
        var forgotToken = generator.generate();
        var options = {email: email, forgotToken: forgotToken};

        Saas.findOneAndUpdate({"users.user": email}, {$set: {"users.$.forgotToken": forgotToken}}, function (err, company) {
            if (err) {
                //err = new Error('No email');
                //err.status = 400;
                return next(err);
            } else if (company && company._id) {
                mailer.forgotPassword(options);
                res.status(200).send({success: "Mail sent"});
            }
        });
    };

    this.changePassword = function (req, res, next) {
        var shaSum = crypto.createHash('sha256');
        var forgotToken = req.body.forgotToken;
        var newPassword = req.body.password;

        shaSum.update(newPassword);
        newPassword = shaSum.digest('hex');

        function updateUser (UserModel, email, password) {
            UserModel.findOneAndUpdate({email: email}, {
                pass: password
            }, function (err, user) {
                if (err) {
                    next(err);
                } else if (user && user._id) {
                    Saas.findOneAndUpdate({"users.forgotToken": forgotToken}, {$set: {"users.$.forgotToken": ""}}, function (err) {
                        if (!err) {
                            res.status(200).send({url: "http://easyerp.com/login"});
                        } else {
                            next(err);
                        }
                    });
                }
            });
        };


        Saas.findOneAndUpdate({"users.forgotToken": forgotToken}, {$set: {"users.$.pass": newPassword}}, function (err, company) {
            var UserModel;
            var dbConnection;

            if (err) {
                return next(err);
            } else if (company && company._id) {
                var email;

                company.users.forEach(function (element) {
                    if (element.forgotToken === forgotToken) {
                        email = element.user;
                    }
                });

                if (mainDb.dbsObject && mainDb.dbsObject[company._id]) {
                    UserModel = mainDb.dbsObject[company._id].model('Users', UsersSchema);
                    updateUser(UserModel, email, newPassword);
                } else {
                    dbConnection = mongoose.createConnection('localhost', company._id, {server: {poolSize: 3}});
                    dbConnection.once('open', function (err) {
                        if (!err) {
                            mainDb.dbsObject[company._id] = dbConnection;
                            UserModel = mainDb.dbsObject[company._id].model('Users', UsersSchema);
                            updateUser(UserModel, email, newPassword);
                        } else {
                            next(err);
                        }
                    });
                }
            }
        });
    };

    this.register = function (req, res, next) {
        var saas;
        var body = req.body;
        var shaSum = crypto.createHash('sha256');
        var subdomainObject = subdomainHelper(req);
        var email = body.email || 'testUser@easyerp.com';
        var password = body.password;
        var ip = req.ip;
        var geo = geoip.lookup(ip);

        geo = geo || {};
        geo.city = geo.city || body.city;

        console.log(ip);

        shaSum.update(password);
        password = shaSum.digest('hex');

        dbRegistrator(req, subdomainObject.accountName, body, function (err, connection) {
            if (err) {
                return next(err);
            }

            mainDb.dbsObject[subdomainObject.accountName] = connection;
            saas = new Saas();
            saas.DBname = subdomainObject.accountName;
            saas._id = subdomainObject.accountName;
            saas.users = [{
                user: email,
                pass: password
            }];
            saas.ip = ip;
            saas.geo = geo;
            saas.save(function (err, saasDb) {
                if (err) {
                    return next(err);
                }

                res.redirect(301, '/');
                mailer.registeredNewUser(body);

                tracker.track({
                    ip: ip,
                    country: geo ? geo.country : '',
                    email: email,
                    city: geo ? geo.city : '',
                    region: geo ? geo.region : undefined,
                    name: 'register',
                    subDomainName: subdomainObject.accountName,
                    registrType: process.env.SERVER_TYPE
                });
            });
        });
    };

    this.check = function (req, res, next) {
        var SaasSchema = mongoose.Schemas['Saas'];
        var Saas = mainDb.model('Saas', SaasSchema);
        var subdomainObject = subdomainHelper(req);
        var err;

        if (subdomainObject.main && !subdomainObject.accountName) {
            err = new Error(RESPONSES.INVALID_COMPANY_NAME);
            err.status = 400;

            next(err);
        } else if (subdomainObject.accountName) {
            Saas.findOne({DBname: subdomainObject.accountName}, function (err, company) {
                if (err) {
                    return next(err);
                } else if (company && company._id) {
                    err = new Error('Company with same name already registred');
                    err.status = 400;

                    return next(err);
                } else {
                    req.session.loggedIn = true;
                    res.status(200).send({success: "You can use this subdomain"});
                }
            });
        }
    };

    this.clientList = function (req, res, next) {
        var data = req.query;
        var filter = {
            'geo.country': {
                $nin: ['UA']
            }
        };
        var query = Saas.find(filter, {pass: 0, __v: 0, url: 0});

        if (data.sort) {
            query.sort(data.sort);
        } else {
            query.sort({"registrationDate": -1});
        }

        query.skip((data.page - 1) * data.count).limit(data.count);

        query.exec(function (err, saasDbs) {
            if (err) {
                return next(err);
            }

            res.status(200).send(saasDbs);
        });
    };

    this.count = function (req, res, next) {
        Saas.find().count(function (err, saasDbs) {
            if (err) {
                return next(err);
            }

            res.status(200).send({count: saasDbs});
        });
    };

    this.accountLoad = function (req, res, next) {
        var SaasSchema = mongoose.Schemas['Saas'];
        var Saas = mainDb.model('Saas', SaasSchema);
        var data = req.body;
        var password = data.pass;
        var err;
        var ip = req.ip;
        var geo = geoip.lookup(ip);
        var user = data.login || data.email;

        if (user && password) {
            var shaSum = crypto.createHash('sha256');

            shaSum.update(password);
            password = shaSum.digest('hex');
            Saas.findOne({'users.user': user, 'users.pass': password}, function (err, saasDb) {
                if (err) {
                    return next(err);
                }
                if (!saasDb) {
                    err = new Error('Such saas account dose\'t exists');
                    err.status = 400;
                    return next(err);
                }

                res.status(200).send({accountName: saasDb.DBname});

                tracker.track({
                    ip: ip,
                    country: geo ? geo.country : '',
                    email: user,
                    city: geo ? geo.city : '',
                    region: geo ? geo.region : undefined,
                    name: 'login',
                    status: 200,
                    subDomainName: saasDb.DBname,
                    registrType: process.env.SERVER_TYPE
                });

                tracker.track({
                    ip: ip,
                    country: geo ? geo.country : '',
                    email: user,
                    city: geo ? geo.city : '',
                    region: geo ? geo.region : undefined,
                    name: 'sessionStart',
                    status: 200,
                    subDomainName: saasDb.DBname,
                    registrType: process.env.SERVER_TYPE
                });

            });
        } else {
            err = new Error(RESPONSES.INVALID_PARAMETERS);
            err.status = 400;
            next(err);
        }
    };

};

module.exports = Saas;
