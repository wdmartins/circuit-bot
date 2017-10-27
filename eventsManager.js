'use strict';
var chokidar = require('chokidar');
var Event = require('./event.js');
var FileAPI = require('file-api');
var File = FileAPI.File;
var fs = require('fs');
const path = require('path');

var EventManager = function (log) {
    var self = this;
    var logger = log;
    var eventsPath;
    var eventsType = '*.avi';
    var listeners = [];
    var watcher;
    var events = [];

    logger.info('[EVENTMANAGER] Instantiated');

    this.initEventManager = function (location, type) {
        return new Promise(function (resolve, reject) {
            logger.info(`[EVENTMANAGER]: Event manager initialization on ${location} for type ${type}`);
            eventsPath = location;
            eventsType = type;
            self.initFileSystem()
                .then(self.watchFolder)
                .then(self.collectExistingEvents)
                .then(resolve);
        });
    };

    this.collectExistingEvents = function () {
        return new Promise(function (resolve, reject) {
            logger.info(`[EVENTMANAGER] Reading files ${eventsPath + '*.' + eventsType}`);
            fs.readdir(eventsPath, function (error, files) {
                logger.info(`[TEST] readdir callback with ${files ? files.length : 0} files`);
                if (error) {
                    logger.error(`[EVENTMANAGER]: Unable to read events from ${eventsPath}`);
                    reject();
                } else {
                    if (!files || !files.length) {
                        resolve();
                        return;
                    }
                    files.forEach(function (file, index) {
                        fs.stat(path.join(eventsPath, file), function (error, stat) {
                            if (!error && stat.isFile()) {
                                logger.info(`[EVENTMANAGER] Reading new event with name ${file} and time ${stat.ctime}`);
                                var tempArray = file.split(".");
                                logger.info(`${tempArray}`);
                                if (tempArray && tempArray.length && tempArray[tempArray.length - 1] === eventsType) {
                                    events.push(new Event(path.basename(file), stat.ctime));
                                    logger.info(`[EVENTMANAGER] Adding new event with name ${file} and time ${stat.ctime}`);
                                }
                            }
                            if (index === files.length - 1) {
                                resolve();
                                return;
                            }
                        })
                    });
                }
            });
        });
    };

    this.watchFolder = function () {
        return new Promise(function (resolve, reject) {
            watcher = chokidar.watch(eventsPath + '*.' + eventsType, {
                ignored: /[\/\\]\./,
                persistent: true,
                ignoreInitial: true,
                alwaysStat: true
            });
            // Add watch for new files        
            watcher.on('add', self.processNewFile);
            resolve();
        });
    };

    this.initFileSystem = function () {
        return new Promise(function (resolve, reject) {
            if (eventsPath) {
                //Create events folder if it does not exist
                fs.stat(eventsPath, function (error, stats) {
                    if (error) {
                        if (error.code === 'ENOENT') {
                            logger.warn(`[EVENTMANAGER]: Folder ${eventsPath} does not exist. It will be created.`);
                            fs.mkdirSync(eventsPath);
                            resolve();
                        } else {
                            logger.error(`[EVENTMANAGER] Unable to access folder ${eventsPath}. Error: ${error}`);
                            reject();
                            return;
                        }
                    } else {
                        resolve();
                    }
                })
            } else {
                logger.error(`[EVENTMANAGER] Events folder configuration missing in config.json. Set eventsFolder.`);
                reject();
            }
        });
    };

    this.processNewFile = function (filename, stats) {
        logger.info(`[EVENTMANAGER]: New File with name ${filename} and time ${stats.ctime}`);
        if (listeners) {
            listeners.forEach(function (lstnr) {
                var event = new Event(path.basename(filename), stats.ctime);
                events.push(event);
                lstnr(event);
            })
        }
    };

    this.addNewEventListener = function (listener) {
        return new Promise(function (resolve, reject) {
            logger.info(`[EVENTMANAGER]: Add new listener`);
            listeners.push(listener);
            resolve();
        });
    };

    this.getAllEvents = function () {
        return events;
    };

    this.getEventFile = function (index) {
        if (index > events.length - 1) {
            return;
        }
        var filename = path.join(eventsPath, events[index].getName());
        logger.info(`[EVENTMANAGER]: getEventFileName returns ${filename}`)
        return new File(filename);
    };
}

module.exports = EventManager;
