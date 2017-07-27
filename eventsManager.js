'use strict';
var chokidar = require('chokidar');
var Event = require('./event.js');
var fs = require('fs');
const path = require('path');

var EventManager = function (log) {
    var logger = log;
    var eventsPath;
    var listeners = [];
    var watcher;
    var events = [];

    logger.info('[EVENTMANAGER] Instantiated');

    this.initEventManager = function(location) {
        logger.info('[EVENTMANAGER]: Event manager on path: ', location);
        eventsPath = location;
        watcher = chokidar.watch(eventsPath, {
            ignored: /[\/\\]\./, persistent: true
        });
        return new Promise(function (resolve,reject) {
            logger.info('[TEST]: About to readdir at ' + eventsPath);
            fs.readdir(eventsPath, function(error, files) {
                logger.info('[TEST]: There are ' + files.length + ' files in ' + eventsPath);
                if (error) {
                    logger.error('[EVENTMANAGER]: Unable to read events from [' + eventsPath + ']');
                    reject();
                } else {
                    files.forEach(function(file, index) {
                        logger.info('[TEST] About to stat ' + file);
                        fs.stat(path.join(eventsPath, file), function(error, stat) {
                            if (!error && stat.isFile()) {
                                logger.info('[TEST] Adding new event with name: ' + file + ' and time ' + stat.ctime);
                                events.push(new Event(file, stat.birthtimeMs));
                            }
                            logger.info('[TEST] ' + file + ' stated');
                        })
                    });
                    resolve();
                }
            });
        });
    }

    this.addNewEventListener = function(listener) {
        listeners.push(listener);
        logger.info('[EVENTMANAGER]: New watcher added. Total watchers: ' + listeners.length);
        watcher.on('add', function(filename, stats) {
            logger.info('[EVENTMANAGER]: Adding new event with name: ' + filename + ' and time ' + (stats ? stats.ctime : 'unknown'));
            listeners.forEach(function(ltnr) {
                ltnr(filename, stats);
            })
        })
    }
}

module.exports = EventManager;
