'use strict';

var Event = function(name, time) {
    var eventName;
    var eventTime;

    this.getName = function() {
        return eventName;
    }

    this.getTimeInSeconds = function() {
        return eventTime;
    }
}

module.exports = Event;