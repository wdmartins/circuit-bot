'use strict';
var chokidar = require('chokidar');
var Event = require('./event.js');
var fs = require('fs');
const path = require('path');

var EventManager = function (log) {
    var self = this;
    var logger = log;
    var eventsPath;
    var listeners = [];
    var watcher;
    var events = [];

    logger.info('[EVENTMANAGER] Instantiated');

    this.initEventManager = function(location, cb) {
        return new Promise(function (resolve,reject) {
            logger.info(`[EVENTMANAGER]: Event manager initialization on ${location}`);
            eventsPath = location;
            watcher = chokidar.watch(eventsPath, {
                ignored: /[\/\\]\./, 
                persistent: true, 
                ignoreInitial: true, 
                alwaysStat: true
            });
            // Add watch for new files        
            watcher.on('add', self.processNewFile);
            // Get existing events
            fs.readdir(eventsPath, function(error, files) {
                logger.info(`[TEST] readdir callback with ${files.length} files`);
                if (error) {
                    logger.error(`[EVENTMANAGER]: Unable to read events from ${eventsPath}`);
                    reject();
                } else {
                    files.forEach(function(file, index) {
                        fs.stat(path.join(eventsPath, file), function(error, stat) {
                            if (!error && stat.isFile()) {
                                logger.info(`[EVENTMANAGER] Adding new event with name ${file} and time ${stat.ctime}`);
                                events.push(new Event(path.basename(file), stat.ctime));
                            }
                            if (index === files.length - 1) {
                                resolve();
                            }
                        })
                    });
                }
            });
        });
    }

    this.processNewFile = function(filename, stats) {
        logger.info(`[EVENTMANAGER]: New File with name ${filename} and time ${stats.ctime}`);
        if (listeners) {
            listeners.forEach(function(lstnr) {
                lstnr(new Event(path.basename(filename), stats.ctime));
            })
        }
    } 

    this.addNewEventListener = function(listener) {
        return new Promise(function(resolve, reject) {
            logger.info(`[EVENTMANAGER]: Add new listener`);
            listeners.push(listener);
            resolve();
        });
    }

    this.getAllEvents = function() {
        return events;
    }
}

module.exports = EventManager;
