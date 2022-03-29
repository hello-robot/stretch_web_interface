var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/User");

var userController = {};


// check if user is an approved and logged-in robot
function isRobot(req) {
    return (req.user &&
            req.user.approved &&
            (req.user.role === 'robot'));
};

// check if user is an approved and logged-in operator
function isOperator(req) {
    return (req.user &&
            req.user.approved &&
            (req.user.role === 'operator'));
};

// Only give approved logged-in robots access to files in the robot directory
userController.robot = function (req, res, next) {
    if (isRobot(req)) {
        return next()
    } else {
        res.status(403).send("Not authorized to get " + req.originalUrl);
    }
};

// Only give approved logged-in operators access to files in the operator directory
userController.operator = function (req, res, next) {
    if (isOperator(req)) {
        return next()
    } else {
        res.status(403).send("Not authorized to get " + req.originalUrl);
    }
};

// Only give approved logged-in operators and robots access to files in the shared directory
userController.shared = function (req, res, next) {
    if (isOperator(req) || isRobot(req)) {
        return next()
    } else {
        res.status(403).send("Not authorized to get " + req.originalUrl);
    }
};


// Restrict access to root page
userController.home = function(req, res) {
    res.render('index', { user : req.user });
};

// Go to registration page
userController.register = function(req, res) {
    res.render('register');
};

// Post registration
userController.doRegister = function(req, res) {
    User.register(
        new User({ username : req.body.username,
                   role: 'operator',
                   approved: false
                 }),
        req.body.password,
        function(err, user)
        {
            if (err) {
                return res.render('register', { user : user });
            }
            
            passport.authenticate('local')(req, res, function () {
                res.redirect('/');
            });
        }
    );
};

// Go to login page
userController.login = function(req, res) {
    res.render('login');
};

// Post login
userController.doLogin = function(req, res) {
    passport.authenticate('local')(req, res, function () {
        if (isOperator(req)) {
            res.redirect('/operator');
        } else if (isRobot(req)) {
            res.redirect('/robot');
        } else {
            res.redirect('/');
        }
    });
};

// logout
userController.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};

module.exports = userController;
