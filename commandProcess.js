'use strict';
//var commander = require('commander');
// Logger
var bunyan = require('bunyan');

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'info'
});
var menu = require('./menu.json');


var commandProcessor;
var CommandProcessor = function() {
    var self = this;

    this.processCommand = function(command, cb) {
        var commArray = command.split(' ');
        var moreToProcess = true;
        var subMenu = menu;
        do {
            var menuElement = subMenu[commArray.shift()];
            if (!menuElement) {
                moreToProcess = false;
            } else {
                subMenu = menuElement;
                if (!menuElement.submenu) {
                    moreToProcess = false;
                } else {
                    subMenu = menuElement.submenu;
                }
            }
        } while(moreToProcess)
        cb(subMenu.command, commArray);
    }
}

function getInstance() {
    if (!commandProcessor) {
        commandProcessor = new CommandProcessor();
    }
    return commandProcessor;
}

exports.processCommand = function(command, cb) {
    getInstance().processCommand(command, function(reply) {cb(reply)});
}

