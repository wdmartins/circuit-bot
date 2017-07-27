'use strict';
var menu = require('./menu.json');

var CommandProcessor = function(log) {
    var self = this;
    var logger = log;

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

module.exports = CommandProcessor;


