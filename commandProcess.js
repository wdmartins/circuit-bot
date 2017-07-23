'use strict';
//var commander = require(commander);

var commander;
var Command = function() {
    var self = this;

    this.processCommand = function(command, cb) {
        cb(command);
    }
}

function getInstance() {
    if (!commander) {
        commander = new Command();
    }
    return commander;
}

exports.processCommand = function(command, cb) {
    getInstance().processCommand(command, function(reply) {cb(reply)});
}