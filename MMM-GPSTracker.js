Module.register("MMM-GPSTracker", {
    defaults: {
        latitude: 52.4681767,
        longitude: 4.566211,
        zoom: 12,
		trackcolor: "#ee9944",
        circlecolor: "#33ee77",
		width: 400,
		height: 300,
		points: 50,
		interval: 10,
		grayscale: 70,
		brightness: 40,
		contrast: 120,
		guid: "9a36a4c8-c17e-47ee-a66d-b841f489d814"
    },

    start: function() {
	    this.loaded = false;

		this.objmap = null;
		this.objmapcircle = null;
		this.objmappoly = null;
		this.objmappolyshadow = null;
		
		Log.log("Sending CONFIG to node_helper.js in " + this.name);
		this.sendSocketNotification('CONFIG', this.config);
	},

    getDom: function() {
		
		var container = document.createElement("div");
		container.id = "container";
		container.style.width = this.config.width + "px";
		container.style.height = this.config.height + "px";
		this.csscontainer = container;
		
        var mapper = document.createElement("div");
        mapper.id = "map";
		mapper.style.width = this.config.width + "px";
		mapper.style.height = this.config.height + "px";
		container.appendChild(mapper);
		this.cssmap = mapper;
		
        var infoblock = document.createElement("div");
        infoblock.id = "infoblock";
		container.appendChild(infoblock);
		this.cssinfoblock = infoblock;

        return container;
    },

    getScripts: function() {
        return [
            "https://unpkg.com/leaflet/dist/leaflet.js"
        ];
    },

    getStyles: function() {
        return [
            "https://unpkg.com/leaflet/dist/leaflet.css",
			"MMM-GPSTracker.css"
        ];
    },

    notificationReceived: function(notification, payload, sender) {
        if (notification === "DOM_OBJECTS_CREATED") {
			// Draw initial map and create Leaflet objects
            this.loadMap(0, "");
        }
	},
	
	socketNotificationReceived: function(notification, payload, sender) {
		if (notification === "TRACK") {
			// Show trackdata on map and move map
			this.loadMap(1, JSON.parse(payload));
		}
    },

    loadMap: function(loadordraw, trackdata) {
        
		if(loadordraw === 0) {
			var map = L.map('map', { zoomControl: false }).setView([this.config.latitude, this.config.longitude], this.config.zoom);
			this.objmap = map;							// Push object to module variable

			var tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', 
				zoomSnap: 0.25
			}).addTo(map);
			tileLayer.getContainer().style.filter = 'grayscale(' + this.config.grayscale + '%) brightness(' + this.config.brightness + '%) contrast(' + this.config.contrast + '%)';

			var circle = L.circleMarker([this.config.latitude, this.config.longitude], {
				color: this.config.circlecolor,
				opacity: 0.30,
				fillColor: this.config.circlecolor,
				fillOpacity: 0.15,
				radius: 80
			}).addTo(map);
			this.objmapcircle = circle;					// Push object to module variable

			var latlngs = [
				[52.4681767, 4.566211],
				[52.4681768, 4.566212]
			];
			
			var polylineshadow = L.polyline(latlngs, {color: '#101010', weight: 6}).addTo(map);	
			this.objmappolyshadow = polylineshadow;		// Push object to module variable
			var polyline = L.polyline(latlngs, {color: '' + this.config.trackcolor + '', weight: 4}).addTo(map);
			this.objmappoly = polyline;					// Push object to module variable
			
			map.panTo([this.config.latitude, this.config.longitude]);

			this.loaded = true;
		} else {
			var map = this.objmap;
			var circle = this.objmapcircle;
			var polylineshadow = this.objmappolyshadow;
			var polyline = this.objmappoly;
			
			var firstrun = 0;
		
			var json = trackdata;
			var lastData = json[0].XY.split(':');
			var lastLat = lastData[0];
			var lastLon = lastData[1];
			var lastUpd = lastData[2]; // Get last update time
			var lastSpd = lastData[3]; // Get last speed
			var lastHdg = lastData[4]; // Get last GPS heading
			var lastAlt = lastData[5]; // Get last GPS altitude
			var lastTmp = lastData[6]; // Get last temperature
			var lastTex = lastData[7]; // Get last temperature external
			var lastHum = lastData[8]; // Get last humidity
			var lastAir = lastData[9]; // Get last air pressure
			var lastPPM25 = lastData[10]; // Get last PPM2.5
			var lastPPM10 = lastData[11]; // Get last PPM10
			var lastVbatt = lastData[12]; // Get last battery voltage
			var lastVacc = lastData[13]; // Get last accessory voltage
			
			var latlngs = [];
			for(i = 0; i < json.length; i++) {
				latlngs.push([json[i].XY.split(':')[0], json[i].XY.split(':')[1]]);
			}

			// If speed isn't updated for over 5 minutes, assume the speed is 0
			if(Date.now() / 1000 - lastUpd >= 300) {
				lastSpd = 0;
			}
		
			var lastRad = lastSpd * 1.5;
			if(lastRad > 100.0) {
				lastRad = 100.0;
			}
			if(lastRad < 50.0) {
				lastRad = 50.0;
			}
			var zoomLevel = 18.0 - Math.round(((18.0 - 15.0) / 50) * (lastRad - 50.0));
			if(firstrun == 0) {
				firstrun = 1;
				map.panTo([lastLat, lastLon]);
			}
			
			polylineshadow.setLatLngs(latlngs);
			polyline.setLatLngs(latlngs);
			circle.setLatLng([lastLat, lastLon]);
			circle.setRadius(lastRad * 1.5);
			
			map.flyTo([lastLat, lastLon]);
			
			var date = new Date(lastUpd * 1000);
			var day = "0" + date.getDate();
			var month = "0" + (date.getMonth() + 1);
			var hours = "0" + date.getHours();
			var minutes = "0" + date.getMinutes();
			var seconds = "0" + date.getSeconds();
			var formattedInfo = 'Last upd: ' + day.substr(-2) + '-' + month.substr(-2) + ' ' + hours.substr(-2) + ':' + minutes.substr(-2) + ':' + seconds.substr(-2) + ' &nbsp; &nbsp; Spd: ' + parseFloat(lastSpd).toFixed(1) + ' km/h';

			this.cssinfoblock.innerHTML = formattedInfo;		}
    }
	
});
