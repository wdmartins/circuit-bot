'use strict';

// Load configuration
var config = require('./config.json');

var packjson = require('./package.json');

// Logger
var bunyan = require('bunyan');

// Command Processing
var Commander = require('./commandProcess.js');

// Event Manager
var EventManager = require('./eventsManager.js');

// SDK logger
var sdkLogger = bunyan.createLogger({
    name: 'sdk',
    stream: process.stdout,
    level: config.sdkLogLevel
});

// Application logger
var logger = bunyan.createLogger({
    name: 'app',
    stream: process.stdout,
    level: 'info'
});

// Node utils
var util = require('util');
var assert = require('assert');

// For file upload tests
var FileAPI = require('file-api');
var File = FileAPI.File;
var fs = require('fs');

// Circuit SDK
logger.info('[APP]: get Circuit instance');
var Circuit = require('circuit-node-sdk');

logger.info('[APP]: Circuit set bunyan logger');
Circuit.setLogger(sdkLogger);

var client = new Circuit.Client({
    client_id: config.bot.client_id,
    client_secret: config.bot.client_secret,
    domain: config.domain
});

var Robot = function() {
    var self = this;
    var conversation = null;
    var commander = new Commander(logger);
    var eventsManager = new EventManager(logger);

    //*********************************************************************
    //* initBot
    //*********************************************************************
    this.initBot = function() {
        logger.info(`[ROBOT]: initialize robot`);
        //Create events folder if it does not exist
        return new Promise(function (resolve, reject) {
            if (config.eventsFolder) {
                fs.stat(config.eventsFolder, function(error, stats) {
                    if (error) {
                        if (error.code === 'ENOENT') {
                            logger.warn(`[ROBOT]: Folder ${config.eventsFolder} does not exist. It will be created.`);
                            fs.mkdirSync(config.eventsFolder);
                            resolve();
                        } else {
                            logger.error(`[ROBOT] Unable to access folder ${config.eventsFolder}. Error: ${error}`);
                            reject();
                            return;
                        }
                    } else {
                        resolve();
                    }
                })
            } else {
                logger.error(`[ROBOT] Events folder configuration missing in config.json. Set eventsFolder.`);
                reject();
            }
        })
    }

    //*********************************************************************
    //* logonBot
    //*********************************************************************
    this.logonBot = function() {
        logger.info(`[ROBOT]: Create robot instance with id: ${config.bot.client_id}`);
        return new Promise(function (resolve, reject) {
            self.addEventListeners(client);  // register evt listeners
            client.logon();
            logger.info(`[ROBOT]: Client created`);
            setTimeout(resolve, 5000);
        });
    };

    //*********************************************************************
    //* addEventListeners
    //*********************************************************************
    this.addEventListeners = function(client) {
        logger.info(`[ROBOT]: addEventListeners`);
        Circuit.supportedEvents.forEach(e => client.addEventListener(e, self.processEvent));
    };

    //*********************************************************************
    //* logEvent -- helper
    //*********************************************************************
    this.logEvent = function(evt) {
        logger.info(`[ROBOT]: ${evt.type} event received`);
        logger.debug(`[ROBOT]:`, util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* getConversationWithOwner
    //*********************************************************************
    this.getDirectConversationWithOwner = function() {
        return new Promise(function (resolve, reject) {
            client.getDirectConversationWithUser(config.botOwnerEmail)
            .then(conv => {
                logger.info(`[ROBOT]: checkIfConversationExists`);
                if(conv) {
                    logger.info(`[ROBOT]: conversation ${conv.convId} exists`);
                    resolve(conv);
                } else {
                    logger.info(`[ROBOT]: conversation does not exist, create new conversation`);
                    return client.createDirectConversation(config.botOwnerEmail);
                }
            })
        });
    };

    //*********************************************************************
    //* say Hi
    //*********************************************************************
    this.sayHi = function(evt) {
        logger.info(`[ROBOT]: say hi`);
        self.getDirectConversationWithOwner()
        .then(conv => {
            logger.info(`[ROBOT]: send conversation item`);
            conversation = conv;
            return self.buildConversationItem(null, `Hi from ${config.bot.nick_name}`, 
                `Currently there are ${eventsManager.getAllEvents().length} events`).
                then(item => client.addTextItem(conversation.convId, item));
        });
    };

    this.buildConversationItem = function(parentId, subject, content) {
        return new Promise(function(resolve, reject) {
            var item = {
                parentId: parentId,
                subject: subject,
                content: content,
                contentType: Circuit.Constants.TextItemContentType.RICH
            };
            resolve(item);
        })
    } 
    //*********************************************************************
    //* terminate -- helper
    //*********************************************************************
    this.terminate = function(err) {
        var error = new Error(err);
        logger.error(`[ROBOT]: Robot failed ${error.message}`);
        logger.error(error.stack);
        process.exit(1);
    };

    //*********************************************************************
    //* processEvent
    //*********************************************************************
    this.processEvent = function(evt) {
        self.logEvent(evt);
        switch(evt.type) {
            case 'itemAdded':
                self.processItemAddedEvent(evt);
                break;
            case 'itemUpdated':
                self.processItemUpdatedEvent(evt);
                break;
            default:
                logger.info(`[ROBOT]: unhandled event ${evt.type}`);
                break;
        }
    }

    //*********************************************************************
    //* processItemAddedEvent
    //*********************************************************************
    this.processItemAddedEvent = function(evt) {
        if (evt.item.text) {
            logger.info(`[ROBOT] Recieved itemAdded event with itemId [${evt.item.itemId}] and content [${evt.item.text.content}]`);
            self.processCommand(evt.item.parentItemId || evt.item.itemId, evt.item.text.content);
        }
    }

    //*********************************************************************
    //* processItemUpdatedEvent
    //*********************************************************************
    this.processItemUpdatedEvent = function(evt) {
        if (evt.item.text) {
            if (evt.item.text.content) {
                var lastPart = evt.item.text.content.split('<hr/>').pop();
                logger.info(`[ROBOT] Recieved itemUpdated event with: ${lastPart}`);
                self.processCommand(evt.item.parentItemId || evt.item.itemId, lastPart);
            }
        }
    }

    //*********************************************************************
    //* isItForMe?
    //*********************************************************************
    this.isItForMe = function (command) {
        return (command.split(' ').shift().toLowerCase() === config.bot.nick_name.toLowerCase());
    }

    //*********************************************************************
    //* processCommand
    //*********************************************************************
    this.processCommand = function (itemId, command) {
        logger.info(`[ROBOT] Processing command: [${command}]`);
        if (self.isItForMe(command)) {
            var withoutName = command.substr(command.indexOf(' ') + 1);
            logger.info(`[ROBOT] Command is for me. Processing [${withoutName}]`);
            commander.processCommand(withoutName , function(reply) {
                logger.info(`[ROBOT] Interpreting command tp ${reply}`);
                switch(reply) {
                    case 'status':
                        self.reportStatus(itemId);
                        break;
                    case 'version':
                        self.reportVersion(itemId);
                        break;
                    default:
                        logger.info(`[ROBOT] I do not understand [${withoutName}]`);
                        self.buildConversationItem(itemId, null, 
                            `I do not understand <b>[${withoutName}]</b>`).
                            then(item => client.addTextItem(conversation.convId, item));                        
                        break;
                }
            });
        } else {
            logger.info(`[ROBOT] Ignoring command: it is not for me`);
        }
    }

    this.reportStatus = function(itemId) {
        self.buildConversationItem(itemId, null, 
            `Status <b>On</b>`).
            then(item => client.addTextItem(conversation.convId, item));                        
    }

    this.reportVersion = function(itemId) {
        self.buildConversationItem(itemId, null, 
            `Version: <b>${packjson.version}</b>`).
            then(item => client.addTextItem(conversation.convId, item));                        
    }

    this.processRobotEvents = function(event) {
        logger.info(`[ROBOT] New robot event with name: ${event.getName()} and time ${event.getTimeInSeconds()}`);
    }

    this.registerForEventsAndReport = function() {
        logger.info(`[ROBOT] Register for Robot Events and Report Current Events`);
        return new Promise(function (resolve, reject) {
            eventsManager.initEventManager(config.eventsFolder, self.test)
                .then(eventsManager.addNewEventListener(self.processRobotEvents))
                .then(resolve);
        });
    }

    this.test = function() {
        logger.info(`[TEST]: Currently there are ${eventsManager.getAllEvents().length} events`);
    }
}

//*********************************************************************
//* main
//*********************************************************************
var robot = new Robot();

robot.initBot()
    .then(robot.logonBot)
    .then(robot.registerForEventsAndReport)
//    .then(robot.test)
    .then(robot.sayHi)
    .catch(robot.terminate);

