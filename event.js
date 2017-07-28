'use strict';

var Event = function(name, time) {
    var eventName = name;
    var eventTime = time;

    this.getName = function() {
        return eventName;
    }

    this.getTimeInSeconds = function() {
        return eventTime;
    }
}

module.exports = Event;