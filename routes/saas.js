/**
 * Created by Roman on 01.04.2015.
 */
var express = require('express');
var router = express.Router();
var Saas = require('../handlers/saas');

function isMasterLoggedIn(req, res, next){
    var err;

    if(req.session && req.session.uName === 'saasAdmin'){
        return next();
    }

    err = new Error('You don\'t hav any rights for list');
    err.status = 400;
    next(err);
}

module.exports = function (mainDb) {
    var subDomainHandler = new Saas(mainDb);

    router.get('/', function(req, res, next){
        res.render('saas.html');
    });
    router.get('/clientList', isMasterLoggedIn, subDomainHandler.clientList);
    router.get('/clientList/count', isMasterLoggedIn, subDomainHandler.count);
    router.post('/', subDomainHandler.register);
    router.post('/trialCheck', subDomainHandler.check);
    router.post('/forgotPassword', subDomainHandler.forgotPass);
    router.post('/changePassword', subDomainHandler.changePassword);

    return router;
};