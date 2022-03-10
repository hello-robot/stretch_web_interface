var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var helmet = require('helmet');

var redis = require('redis'); 
var session = require('express-session');
// https://github.com/tj/connect-redis
var RedisStore = require('connect-redis')(session);

/////////////////
// required for socket.io to use passport's authentication
// see the following website for information about this
// https://www.codementor.io/tips/0217388244/sharing-passport-js-sessions-with-both-express-and-socket-io

// don't confuse this with passport.socket.io, which is wrong!
// https://www.npmjs.com/package/passport.socketio
// https://github.com/jfromaniello/passport.socketio
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser');

// https://www.npmjs.com/package/connect-redis
// start redis and create the redis store
// https://github.com/tj/connect-redis/blob/master/migration-to-v4.md
// No password, so removed this line for now.
// password: 'my secret',
let redisClient = redis.createClient({
  host: 'localhost',
  port: 6379,
  db: 1,
});
redisClient.unref();
redisClient.on('error', console.log);

let sessionStore = new RedisStore({ client: redisClient });

/////////////////

mongoose.Promise = global.Promise;
console.log('start mongoose');

mongoose.connect('mongodb://localhost/node-auth', {useNewUrlParser: true, useUnifiedTopology: true})
    .then(() =>  console.log('connection successful'))
    .catch((err) => console.error(err));

var index = require('./routes/index');

var app = express();

// "Helmet helps you secure your Express apps by setting various HTTP headers."
console.log('use helmet');
app.use(helmet());

var use_content_security_policy = true;
// NOTE: operator.html has its own CSP rules that override what is set here
if (use_content_security_policy) {
    console.log('using a content security policy');
    app.use(helmet.contentSecurityPolicy({
        directives: {
            defaultSrc:["'self'"],
            scriptSrc:["'self'", "'unsafe-inline'", 
                'static.robotwebtools.org', 
                'robotwebtools.org', 
                'webrtc.github.io',
                'www.gstatic.com',
                'code.jquery.com',
                'cdnjs.cloudflare.com',
                'stackpath.bootstrapcdn.com',
                'cdn.jsdelivr.net',
                '*.firebaseio.com',
                'https://apis.google.com/'],
            connectSrc:["'self'",
                'ws://localhost:9090',
                'wss://localhost:9090',
                'https://securetoken.googleapis.com',
                'https://www.googleapis.com',
                'wss:\/\/*.firebaseio.com'],
            imgSrc: ["'self'", 'data:'],
            styleSrc:["'self'", 
                'stackpath.bootstrapcdn.com'],
            fontSrc:["'self'"],
            frameSrc: ['*.firebaseio.com', 'https://stretchteleop.firebaseapp.com/']}
        })
    );
} else {
    // Disable the content security policy. This is helpful during
    // development, but risky when deployed.
    console.log('WARNING: Not using a content security policy. This risky when deployed!');
    app.use(
        helmet({
            contentSecurityPolicy: false,
        })
    );
}

/////////////////////////
//
// Only allow use of HTTPS and redirect HTTP requests to HTTPS
//
// code derived from
// https://stackoverflow.com/questions/24015292/express-4-x-redirect-http-to-https

console.log('require https');
app.all('*', ensureSecure); // at top of routing calls

function ensureSecure(req, res, next){
    if(!req.secure){
        // handle port numbers if you need non defaults
        res.redirect('https://' + req.hostname + req.url); 
    }

    return next();
};
/////////////////////////


// view engine setup
console.log('set up the view engine');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

var secret_string = 'you should change this secret string';

app.use(session({
    secret: secret_string,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,
        sameSite: true
    }
}));

//var RedisStore = require('connect-redis')(session);

// set up passport for user authorization (logging in, etc.)
console.log('set up passport');
app.use(passport.initialize());
app.use(passport.session());


// make files in the public directory available to everyone
console.log('make public directory contents available to everyone');
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'operator/icons')));

app.use('/', index);

// passport configuration
console.log('configure passport');
var User = require('./models/User');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

console.log('set up error handling');
// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

//////////////////////////////////////////////////////////

// check if user is an approved and logged-in robot
function isRobot(data) {
    return (data.user &&
            data.user.logged_in &&
            data.user.approved &&
            (data.user.role === 'robot'));
};

// check if user is an approved and logged-in operator
function isOperator(data) {
    return (data.user &&
            data.user.logged_in &&
            data.user.approved &&
            (data.user.role === 'operator'));
};


// based on passport.socketio documentation
// https://github.com/jfromaniello/passport.socketio

function onAuthorizeSuccess(data, accept){
    console.log('');
    console.log('successful connection to socket.io');
    console.log('data.user =');
    console.log(data.user);
    
    if(isRobot(data) || isOperator(data)) {
        console.log('connection authorized!');
        accept();
    } else {
        console.log('connection attempt from unauthorized source!');
        // reject connection (for whatever reason)
        accept(new Error('not authorized'));
    }
}

function onAuthorizeFail(data, message, error, accept){
    console.log('');
    console.log('#######################################################');
    console.log('failed connection to socket.io:', message);
    console.log('data.headers =');
    console.log(data.headers);
    
    // console.log('message =');
    // console.log(message);
    // console.log('error =');
    // console.log(error);
    // console.log('accept =');
    // console.log(accept);
    
    console.log('#######################################################');
    console.log('');

    // error indicates whether the fail is due to an error or just an unauthorized client
    if(error) throw new Error(message);
    // send the (not-fatal) error-message to the client and deny the connection
    //return accept(new Error(message));
    return accept(new Error("You are not authorized to connect."));
}


ioauth = passportSocketIo.authorize({
    key: 'connect.sid',
    secret: secret_string,
    store: sessionStore,
    cookieParser: cookieParser,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
});


// module.exports = {
//     app: app,
//     ioauth: ioauth
// };

export const viteNodeApp = app;