'use strict';

/* Magic Mirror
 * Module: MMM-GPSTracker
 *
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
var request = require('request');
// var moment = require('moment');

module.exports = NodeHelper.create({

	start: function() {
		var self = this;
		Log.info("Starting node helper for: " + this.name);

		this.config = null;
	},

	getData: function(getwhat) {
		var self = this;

		if(getwhat === "TRACK") {
		var geoURL = "https://offroaders.nl/geo/gsmmapper.php?guid=" + this.config.guid + "&points=" + this.config.points;
		request({
			url: geoURL,
			method: 'GET',
			headers: {
		        'Content-Type': 'application/json'
		    },
		}, function (error, response, body) {
			if (!error && response.statusCode == 200) {
				self.sendSocketNotification("TRACK", body);
			}
			else {
				self.sendSocketNotification("ERROR", "In TRACK request with status code: " + response.statusCode);
			}
		});

		setTimeout(function() { self.getData("TRACK"); }, this.config.interval * 1000);
		}
	},

	socketNotificationReceived: function(notification, payload) {
		if (notification === 'CONFIG') {
			this.config = payload;
			this.getData("TRACK");
		}
	}
});

