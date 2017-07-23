'use strict';

// Load configuration
var config = require('./config.json');

// Logger
var bunyan = require('bunyan');

// Command Processing
var commander = require('./commandProcess.js');

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

    //*********************************************************************
    //* logonBot
    //*********************************************************************
    this.logonBot = function() {
        logger.info('[ROBOT]: Create robot instance with id: ' + config.bot.client_id);
        return new Promise(function (resolve, reject) {
            self.addEventListeners(client);  // register evt listeners
            client.logon();
            logger.info('[ROBOT]: Client created');
            setTimeout(resolve, 5000);
        });
    };

    //*********************************************************************
    //* addEventListeners
    //*********************************************************************
    this.addEventListeners = function(client) {
        logger.info('[ROBOT]: addEventListeners');
        Circuit.supportedEvents.forEach(e => client.addEventListener(e, self.processEvent));
    };

    //*********************************************************************
    //* logEvent -- helper
    //*********************************************************************
    this.logEvent = function(evt) {
        logger.info('[ROBOT]: ${evt.type} event received');
        logger.debug('[ROBOT]:', util.inspect(evt, { showHidden: true, depth: null }));
    };

    //*********************************************************************
    //* getConversationWithOwner
    //*********************************************************************
    this.getDirectConversationWithOwner = function() {
        return new Promise(function (resolve, reject) {
            client.getDirectConversationWithUser(config.botOwnerEmail)
            .then(conv => {
                logger.info('[ROBOT]: checkIfConversationExists');
                if(conv) {
                    logger.info('[ROBOT]: conversation exists', conv.convId);
                    resolve(conv);
                } else {
                    logger.info('[ROBOT]: conversation does not exist, create new conversation');
                    return client1.createDirectConversation(config.botOwnerEmail);
                }
            })
        });
    };

    //*********************************************************************
    //* say Hi
    //*********************************************************************
    this.sayHi = function(evt) {
        logger.info('[ROBOT]: say hi to master');
        self.getDirectConversationWithOwner()
        .then(conv => {
            logger.info('[ROBOT]: send conversation item');
            conversation = conv;
            return client.addTextItem(conv.convId, "Hi Master from " + config.bot.nick_name);
        });
    };

    //*********************************************************************
    //* terminate -- helper
    //*********************************************************************
    this.terminate = function(err) {
        var error = new Error(err);
        logger.error('[ROBOT]: Robot failed ' + error.message);
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
                logger.info('[ROBOT]: unhandled event ' + evt.type);
                break;
        }
    }

    //*********************************************************************
    //* processItemAddedEvent
    //*********************************************************************
    this.processItemAddedEvent = function(evt) {
        if (evt.item.text) {
            logger.info("[ROBOT] Recieved itemAdded event with: ", evt.item.text.content);
            
        }
    }

    //*********************************************************************
    //* processItemUpdatedEvent
    //*********************************************************************
    this.processItemUpdatedEvent = function(evt) {
        if (evt.item.text) {
            logger.info("[ROBOT] Recieved itemUpdated event with: ", evt.item.text.content.split('<hr/>').pop());
        }
    }

    this.processCommand = function (command) {
        commander.processCommand(command, function(reply) {
            logger.info("[ROBOT] Got Reply: ", reply);
        });
    }
}

//*********************************************************************
//* main
//*********************************************************************
var robot = new Robot();

//robot.logonBot().then(robot.sayHi).catch(robot.terminate);
robot.processCommand("Hola como va?");
    
