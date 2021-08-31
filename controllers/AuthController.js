var path = require('path');
var mongoose = require("mongoose");
var passport = require("passport");
var User = require("../models/User");

var userController = {};

var robot_root = path.join(__dirname, '../robot');
var operator_root = path.join(__dirname, '../operator');
var shared_root = path.join(__dirname, '../shared');

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
userController.robot = function(req, res) {
    var file = req.params.file;
    if (isRobot(req)) {
        res.sendFile(robot_root + "/" + file); 
    } else {
        res.status(403).send("Not authorized to get " + file); 
    }
};

// Only give approved logged-in operators access to files in the operator directory
userController.operator = function(req, res) {
    var file = req.params.file;
    console.log('file', file, operator_root);
    if (isOperator(req)) {
        //res.sendFile(operator_root + "/" + file); 
        //console.log(req);
        //res.sendFile(__dirname + '/../' + req.originalUrl);
        //console.log(req.originalUrl, req.params.file);
        res.sendFile(path.join(__dirname, '../' + req.originalUrl));
    } else {
        res.status(403).send("Not authorized to get " + file); 
    }
};

// Only give approved logged-in operators and robots access to files in the shared directory
userController.shared = function(req, res) {
    var file = req.params.file;
    if (isOperator(req) || isRobot(req)) {
        //res.sendFile(shared_root + "/" + file); 
        res.sendFile(path.join(__dirname, '../' + req.originalUrl));
    } else {
        res.status(403).send("Not authorized to get " + file); 
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
            res.redirect('/operator/operator.html');
        } else if (isRobot(req)) {
            res.redirect('/robot/robot.html');
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
