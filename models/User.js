var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// "Passport-Local Mongoose is a Mongoose plugin that simplifies building username and password login with Passport"
//  - https://github.com/saintedlama/passport-local-mongoose
var passportLocalMongoose = require('passport-local-mongoose');

// This defines the MongoDB entry ("document") associated with user accounts
var UserSchema = new Schema({
    username: String, // user name such as "r1" or "o1"
    password: String, // password, hopefully strong...
    role: String,  // currently "robot" or "operator"
    approved: Boolean,  // whether or not the user account has been approved to act as an operator or robot. currently admin edits mongodb entry by hand
    date: { type: Date, default: Date.now }  // when the user account was initially created
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
