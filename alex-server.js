	/*
 * Copyright (c) 2018 Matthew E. Tolentino, UW, metolent@uw.edu
 * Intelligent Platforms and Architecture (IPA) Lab, UW-Tacoma, USA
 *
 * <INSERT LICENSE HERE>
 *
 */

/*Added By Alex Boyle on 1/15/18*/
const WebSocket = require('ws');
//===================================//

var http = require('http');
var url = require('url');
var childprocess = require('child_process');
var HttpDispatcher = require('httpdispatcher');
var fs = require('fs');

var dispatcher = new HttpDispatcher();

const PORT=8080;

var current_socket;

var personnel = new Array();
var beacons = new Array();
var drones = new Array();

var personnel_positions = new Object();
var drone_positions = new Object();

var have_vco_origin = 0;
var init_stage = 1;

var conditions = {
	high_temp: 0,
	high_temp_id: 0,
	high_co: 0,
	high_co_id: 0,
	nr_onscene: 0,
	nr_beacons: 0
};

class device_log {
	constructor(id,lats,lons){
		this.id = id;
		this.lats = (lats);
		this.lons = (lons);
	}
};


var filenameDrone = 'Data.csv';
var file_header = 'CO2,TVOC';

fs.writeFile(filenameDrone, file_header, (err) => {
	if (err) throw err;

	console.log('File ' + filenameDrone + ' created to save all air quality data');
});

process.on('SIGINT', function() {
	console.log('Shutting down....');
	process.exit();
});

dispatcher.setStatic('/resources');
dispatcher.setStaticDirname('static');

dispatcher.onGet('/', function(req, res) {
	fs.readFile('./index.html', 'utf-8', function(error, content) {
		res.writeHead(200, {"Content-Type": "text/html"});
		res.end(content);
	});
});




function update_env_conditions(person) {
	if (person.temp > conditions.high_temp) {
		conditions.high_temp = person.temp;
		conditions.high_temp_id = person.id;
	}

	if (person.co > conditions.high_co) {
		conditions.high_co = person.co;
		conditions.high_co_id = person.id;
	}
	/* FIXME - add partiulate, light, humidity here */
}


function personnel_exists(id) {
	for (var i = 0; i < personnel.length; i++) {
		if (personnel[i].id === id) {
			return true;
		}
	}
	return false;
}
function find_person(id) {
	for (var i = 0; i < personnel.length; i++) {
		if (personnel[i].id === id) {
			return personnel[i];
		}
	}
	console.log('ERROR: Could not find registered person with ID: ' + id);
	return null;
}
function get_personnel_current_position(id) {
	for (var i = 0; i < personnel.length; i++) {
			if (personnel[i].id === id) {
				var position = {
					lat: personnel[i].lat,
					lon: personnel[i].lon
				};
				return position;
			}
	}
	return null;
}

function find_beacon(id) {
	for (var i = 0; i < beacons.length; i++) {
		if (beacons[i].id === id) {
			return beacons[i];
		}
	}
	console.log('ERROR: Could not find registered BEACON with ID: ' + id);
	return null;
}

function beacon_exists(id) {
	for (var i = 0; i < beacons.length; i++) {
		if (beacons[i].id === id) {
			return true;
		}
	}
	return false;
}

function nr_beacons_with_gps() {
	var nr_devices = 0;

	for (var i = 0; i < beacons.length; i++) {
		if (beacons[i].gps)
			nr_devices++;
	}
	return nr_devices;
}

function drone_exists(id){
	for (var i = 0; i < drones.length; i++) {
		if (drones[i].id === id) {
			return true;
		}
	}
	return false;
}

function find_drone(id){
	for (var i = 0; i < drones.length; i++) {
		if (drones[i].id === id) {
			return drones[i];
		}
	}
	console.log('ERROR: Could not find registered drone with ID: ' + id);
	return null;
}

function register_drone(device,res){

		if (drone_exists(device.id)) {
			/* we should probably verify that the topic exists */
			console.log('This Device ID is already registered....');
			return 0;
		}

		console.log('New Registration: ' +
				'\nId: ' + device.id +
				'\nType: ' + device.type +
				'\nLatitude: ' + device.lat +
				'\nLongitude: ' + device.lon +
				'\nTemperature: ' + device.temp +
				'\nCO: ' + device.co
			 	);

		console.log('Adding ' + device.id + ' to current on-scene drones');

		var new_drone = {
			id: 		device.id,
			lat:	device.lat,
			lon: 	device.lon,
			alt: device.alt,
			temp: 		device.temp,
			co: 		device.co,
			light: 		device.light

			};

		var lat = new Array();
		lat.push(device.lat);

		var lon = new Array();
		lon.push(device.lon);

		drone_positions[device.id] = new device_log(device.id, lat, lon);
		drones.push(new_drone);
		conditions.nr_onscene = conditions.nr_onscene + 1;

		return 0;
}

function update_drone(msg) {
	var drone = find_drone(msg.id);

	if (drone != null) {
		drone.lat = msg.lat;
		drone.lon = msg.lon;
		drone.temp = msg.temp;
		drone.alt = msg.alt;
		drone.co = msg.co;
		drone.light = msg.light;

		var end = drone_positions[msg.id].lats.length - 1;


		if(drone_positions[msg.id].lats[end] != msg.lat || drone_positions[msg.id].lons[end] != msg.lon){
			drone_positions[msg.id].lats.push(msg.lat);
			drone_positions[msg.id].lons.push(msg.lon);
		}
		return drone;

	} else {
		console.log('ERROR - trying to update non-existent drone!');
	}
	return null;
}

function register_person(device, res) {

	if (personnel_exists(device.id)) {
		/* we should probably verify that the topic exists */
		console.log('This Device ID is already registered....');
		return 0;
	}

	console.log('New Registration: ' +
			'\nId: ' + device.id +
			'\nType: ' + device.type + ' (Person) ' +
			'\nLatitude: ' + device.lat +
			'\nLongitude: ' + device.lon
		 	);

			// ' UserId: ' + device.user_id +
			// ' MeshId: ' + device.mesh_id +
			// ' Current Location: ' + device.latitude + ', ' + device.longitude +
			// ' Has VCO Address: ' + device.has_vco_address +
			// ' VCO Address: (' + device.x + ', ' + device.y + ', ' + device.z + ') ' +
			// ' GPS: ' + device.gps +
			// ' Temp Sensor: ' + device.temp_sensor +
			// ' CO Sensor: ' + device.co_sensor +
			// ' Light Sensor: ' + device.light_sensor +
			// ' Particulate Sensor: ' + device.particulate_sensor +
			// ' Heart Rate: ' + device.heartrate_sensor +
		    //     ' HUD: ' + device.hud
			// );

	console.log('Adding ' + device.id + ' to current on-scene personnel');

	var new_person = {
		id: 		device.id,
		lat:	device.lat,
		lon: 	device.lon,
		alt: 1,
		temp: 		device.temp,
		co: 		device.co,
		light: 		device.light,
		};

	var lat = new Array();
	lat.push(device.lat);

	var lon = new Array();
	lon.push(device.lon);

	personnel_positions[device.id] = new device_log(device.id, lat, lon);

	personnel.push(new_person);
	conditions.nr_onscene = conditions.nr_onscene + 1;

	return 0;
}

/*
 * This function returns:
 * 	 -1 	- if nothing was done and there is NO JSON to send back.
 * 	  0 	- if registered and a VCO position was written to be returned.
 *
 * This means the caller should ensure that res.end is populated if -1 is returned
 * and NOT write anything to res.end if 0 is returned.
 */
function register_beacon(beacon, res)
{
	/* this function is now idempotent - :-) */
	if (beacon_exists(beacon.id)) {
		console.log('Beacon already registered.....');

		var b = find_beacon(beacon.id)
		var position = { x: b.x, y: b.y, z: b.z };
		res.end(JSON.stringify(position));
		return 0;
	}

	console.log('Received Registration Request from: ' + device.id +
			' \nType: ' + device.type + ' (Beacon) ' +
			' \nUserId: ' + device.user_id +
			' \nMeshId: ' + device.mesh_id +
			' \nLatitude: ' + device.lat +
			' \nLongitude: ' + device.lon +
			' \nHas VCO Address: ' + device.has_vco_address +
			' \nVCO Address: (' + device.x + ', ' + device.y + ', ' + device.z + ') ' +
			' \nGPS: ' + device.gps +
			' \nTemp: ' + device.temp_sensor +
			' \nCO: ' + device.co_sensor +
			' \nLight: ' + device.light_sensor +
			' \nParticulate: ' + device.particulate_sensor +
			' \nHUD: ' + device.hud);

	var new_beacon = {
		id: 		device.id,
		lat:	device.lat,
		lon: 	device.lon,
		alt: 1,
		temp: 		device.temp,
		co: 		device.co,
		light: 		device.light,
	};

	beacons.push(new_beacon);
	conditions.nr_beacons = conditions.nr_beacons + 1;

	/*
	 * matt - ignore the rest for now - we're testing the emulation mode right now
	 * FIXME - come back to the below when we start testing the *real* initalization
	 * where the first three (or so) anchors *with* GPS devices register.
	 */
	//var position = { x: new_beacon.x, y: new_beacon.y, z: new_beacon.z };
	//res.end(JSON.stringify(position));
	return 0;


	if (have_vco_origin === 1) {

		return 0;
	}

	/*
	 * If this is the first gps-enabled device we've seen AND there is a valid Lat/Lon,
	 * make this device the origin of the VCO. If this device has a GPS, but does not have
	 * a Lat/Lon, then treat it like any other non-GPS device.  It could be this device will
	 * never get a Lat/Lon fix via GPS and will only be able to localize via UWB.
	 */
	if ((have_vco_origin === 0) && (device.latitude != 0) && (device.longitude != 0)) {

		/* This is the first beacon with a GPS that has registered.  It is our VCO origin */
		have_vco_origin = 1;

		/* Mark this device as the VCO origin */
		new_beacon.is_vco_origin = 1;

		console.log('First GPS-enabled device registered!  VCO origin established!');
		return 0;
	}
	return -1;
}

/*
 * Ok, register is interesting.  We have several cases to handle.
 *
 * 		   UWB   GPS
 * 		 -------------
 * 1) Device has |  X  |  X  |
 * 2) Device has |  X  |     |
 * 3) Device has |     |  X  |
 *               -------------
 * What this means is that upon registration, we may get
 * 1) VCO Address + Lat/Lon address (case 1)
 * 2) VCO Address                   (case 2)
 * 3)               Lat/Lon address (case 3)
 *
 * For case #1 - This means that the GPS has been initialized AND UWB has already
 * been able to go through a few rounds of trilateration communicating with other
 * devies to determine its location.  Given we have a geodetic address, this enables
 * us to validate the VCO address it's using based on what we know about it's position
 * from the first device (at the VCO origin).  This means we can actually send a
 * NEW, corrected VCO address.  The device could then use this as a calibration factor.
 *
 * For case #2 - Given we received a VCO address, it means that the device does NOT
 * have a GPS or a GPS signal (they could be inside), BUT they have gone through a few
 * rounds of trilateration and calculated where they are.  This is fine.  On the server
 * we'll use that VCO address to calculate their geodetic position for rendering.  We
 * can NOT validate their position.
 *
 * For case #3 - This shouldn't happen in most of our scenarios as every device should
 * have an UWB Txvr.  However, for completeness if this should happen (device malfunction)
 * then we would calculate the VCO address given the provided Lat/Lon relative to the
 * Lat/Lon of the first device at the VCO origin.
 */

dispatcher.onPost("/register", function(req, res) {

	var status = 0;

	res.writeHead(200, {'Content-Type': 'text/plain'});
	//res.writeHead(200, {'Content-Type': 'application/json'});

	device = JSON.parse(req.body);
	console.log('Received Registration Request from: ' + device.id);

	/*
	 * If this is the first beacon to be registered, check to see
	 * if it has a GPS.  If it does, we'll use it to assign VCO coordinates
	 */

	/*
	 * determine if it's a beacon or a person and register appropriately
	 * DEVICE_TYPE_PERSON == 1
	 * DEVICE_TYPE_BEACON == 2
	 * DEVICE_TYPE_DRONE == 3
	 */

	if (device.type == 1)
		register_person(device, res);
	if (device.type == 2)
		register_beacon(device, res);
	if (device.type == 3)
		register_drone(device,res);
	res.end();
});

/* This "reading" arg is actually the json that was sent from the sensor platform. */
function update_person(msg) {
	var person = find_person(msg.id);
	if (person != null) {
		person.lat = msg.lat;
		person.lon = msg.lon;
		person.temp = msg.temp;
		person.co = msg.co;
		person.light = msg.light;

		var end = personnel_positions[msg.id].lats.length - 1;

		if(personnel_positions[msg.id].lats[end] != msg.lat || personnel_positions[msg.id].lons[end] != msg.lon){
			personnel_positions[msg.id].lats.push(msg.lat);
			personnel_positions[msg.id].lons.push(msg.lon);
		}
		return person;

	} else {
		console.log('ERROR - trying to update non-existent person!');
	}
	return null;
}

function update_beacon(msg) {
	var beacon = find_beacon(msg.id);

	if (beacon != null) {
		beacon.lat = msg.lat;
		beacon.lon = msg.lon;
		beacon.temp = msg.temp;
		beacon.co = msg.co;
		beacon.light = msg.light;

		return beacon;
	} else {
		console.log('ERROR - trying to update non-existent beacon!');
	}
	return null;
}

/* matt - ggg testing mesh+gps+serverpush here */
dispatcher.onPost("/update", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});

	var device = JSON.parse(req.body);

	if (device.type == 1)
		update_person(device);
	if (device.type == 2)
		update_beacon(device);

	if (device.type == 3) {
		update_drone(device);
        var file_entry = "\n" + device.co + ',' + device.tvoc;
        console.log(' DEVICE UPDATE --- ID: ' + device.id.toString(16) +
			' Lat/Lon: ' + device.lat + ', ' + device.lon + ') ' + 'CO2: ' + device.co + ' ppm' );

        fs.appendFile(filenameDrone, file_entry, (err) => {
			if (err) throw err;

	    });
    }
	console.log(' DEVICE UPDATE --- ID: ' + device.id.toString(16) +
			' Lat/Lon: ' + device.lat + ', ' + device.lon + ')');

	/* We need to build a new JSON that includes cartesian coordinates */

	res.end(device.id.toString());
});

dispatcher.onGet("/beacons", function(req, res) {

	console.log('There are currently ' + beacons.length + ' beacons deployed.');

	if (beacons.length > 0) {
		console.log('Returning JSON list of deployed beacons');
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(beacons));
	} else {
		console.log('No beacons registered!  Nothing to send');
		res.writeHead(204);
		res.end();
	}
});

function getDevicePositionsLat(deviceID,type){
	var current_device_pos;
	switch (type){
		case 'ff':
			current_device_pos = personnel_positions[deviceID].lats;
			break;
		case 'dn':
			current_device_pos = drone_positions[deviceID].lats;
			break;
		default:
			console.log("Couldn't get device position");
			return;
	}
	return current_device_pos;
}

function getDevicePositionsLon(deviceID,type){
	var current_device_pos;
	switch (type){
		case 'ff':
			current_device_pos = personnel_positions[deviceID].lons;
			break;
		case 'dn':
			current_device_pos = drone_positions[deviceID].lons;
			break;
		default:
			console.log("Couldn't get device position");
			return;
	}
	return current_device_pos;
}

//A function that responds to the request with all the positions logged from a device.
dispatcher.onGet("/positions",function(req,res){

	var ffToSend = new Array();
	for (var id in personnel_positions) {
		// console.log(id);
	    if (personnel_positions.hasOwnProperty(id)) {

	        var devicePosLat = getDevicePositionsLat(id,"ff");
	        var devicePosLon = getDevicePositionsLon(id, "ff");
	        ffToSend.push({id: id, lat: devicePosLat, lon: devicePosLon} );

	    }
	}

	var dnToSend = new Array();
	for (var id in drone_positions) {
		// console.log(id);
	    if (drone_positions.hasOwnProperty(id)) {

	        var devicePosLat = getDevicePositionsLat(id,"dn");
	        var devicePosLon = getDevicePositionsLon(id, "dn");
	        dnToSend.push({id: id, lat: devicePosLat, lon: devicePosLon} );

	    }
	}
	res.writeHead(200,{'Content-Type': 'application/json'});
	var send = { type: "positions", body: {ff: ffToSend, dn: dnToSend}};
	res.end(JSON.stringify(send));

});

dispatcher.onGet("/beacons/nr_online", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	var nr_beacons = beacons.length;
	console.log('Sending back that there are ' + beacons.length + ' beacons');
	res.end(nr_beacons.toString());
});

dispatcher.onGet("/conditions", function(req, res) {
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(conditions));
});


dispatcher.onGet("/personnel/nr_online", function(req, res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
	var nr_people = personnel.length;
	res.end(nr_people);
});


/* FIXME - needs to be cleaned up and fixed  */
dispatcher.onGet("/person", function(req, res) {
	res.writeHead(200, {'Content-Type': 'application/json'});
	console.log('Hit /person function');
	var query_data = url.parse(req.url, true).query;

	console.log('ID requested: ' + query_data.id);
	var person = find_person(query_data.id);
	res.end(JSON.stringify(person));
});


var pathTrace; //variable to hold the pathTrace


dispatcher.onPost('/mavCoords', function(req, res) {

	var message = 200
	res.writeHead(message, {'Content-Type': 'text/plain'});
	pathTrace = JSON.parse(req.body);
	res.end();
});

dispatcher.onGet('/appMavCoords', function(req, res) {

	var message = 204
	var temp = null;
	if(pathTrace != null){
			temp = JSON.stringify(pathTrace);
			message = 200;
			pathTrace = null;
	}
		res.writeHead(message, {"Content-Type": "text/plain"});

		if(temp == null){
			res.end();
		}else{
		res.end(temp);
		}
});

var battery; //variable to hold battery percentage


dispatcher.onPost('/droneBattery', function(req, res) {
	var message = 200;
	res.writeHead(message, {'Content-Type': 'text/plain'});
	battery = JSON.parse(req.body);
	console.log(battery)
	res.end
});

dispatcher.onGet('/appDroneBattery', function(req, res) {

	var message = 204;

	res.writeHead(message, {"Content-Type": "text/plain"});
	res.end(JSON.stringify(battery));
});



var flightPath;

dispatcher.onGet('/droneControl', function(req, res) {
	var message = 204
	var temp = null;
	if(flightPath != null){
			temp = JSON.stringify(flightPath);
			message = 200;
			flightPath = null;
	}
		res.writeHead(message, {"Content-Type": "text/plain"});


		if(temp == null){
			res.end();
		}else{
		res.end(temp);
		}
});


var flightStart = false;

dispatcher.onPost('/appStartFlight', function(req, res){
	res.writeHead(200, {'Content-Type': 'text/plain'});
	flightStart = true;
	res.end();

});

var landDrone = false;

dispatcher.onPost('/appLand', function(req, res){
	res.writeHead(200, {'Content-Type': 'text/plain'});
	landDrone = true;
	res.end();

});

dispatcher.onGet('/land', function(req, res){
	var message = 204

	if(landDrone == true){
		message = 200;
		landDrone = false;

	}

	res.writeHead(message, {'Content-Type': 'text/plain'});
	res.end();

});

dispatcher.onGet('/execute', function(req, res){
	var message = 204

	if(flightStart == true){

		flightStart = false;
		message = 200;
	}

	res.writeHead(message, {'Content-Type': 'text/plain'});
	res.end();

});


dispatcher.onPost('/GARBAGE', function(req, res){
	res.writeHead(200, {'Content-Type': 'text/plain'});
	flightPath = JSON.parse(req.body);
	console.log(flightPath.lat[1]);

	//res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end(JSON.stringify(flightPath));

	//We might have to send some test gps stuff to build the flight path.
	//Just to draw it, we need some kind of iteratable format because
	//we will not know the length of the path.
});
/*
 * This call, should be used to extract the current profiles of 'registered' users.
 * We will traverse the personnel list and return those users to the requester.
 */

dispatcher.onGet("/onscene", function(req, res) {

	console.log('Currently there are ' + personnel.length + ' people on scene.');

	if (personnel.length > 0) {
		console.log('Returning JSON list of personnel on-scene.');
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(personnel));
	} else {
		console.log('No personnel data to send back');
		res.writeHead(204);
		res.end();
	}
});


dispatcher.onGet("/playbacks", function(req, res) {
	console.log("playback path called");
	res.writeHead(200, {'Content-Type': 'text'});
	res.end('This is where the list of playbacks are.');
});

dispatcher.onGet("/start_playback", function(req, res) {
	console.log("playback path called");
	res.writeHead(200, {'Content-Type': 'text'});
	res.end('Found playback, sending playback data');

	const { exec } = require('child_process');
	exec('python3 playback_script.py', (err, stdout, stderr) => {
	  if (err) {
	    // node couldn't execute the command
	    return;
	  }

	  // the *entire* stdout and stderr (buffered)
	  console.log(`stdout: ${stdout}`);
	  console.log(`stderr: ${stderr}`);
	});
});


dispatcher.onGet('/style.css', function(req, res) {
	fs.readFile('./style.css', 'utf-8', function(error, content) {
		res.writeHead(200, {"Content-Type": "text/css"});
		res.end(content);
	});
});

dispatcher.onError(function(req, res) {
	res.writeHead(404);
	res.end("NOT FOUND");
});

function handle_request(request, response) {
	try {
		console.log('Received request on ' + request.url);
		dispatcher.dispatch(request, response);
	} catch(err) {
		console.log(err);
	}
}

var server = http.createServer(handle_request);

server.listen(PORT, '0.0.0.0', function() {
	console.log('Server listening on: http://localhost:%s', PORT)
});

//Added by Alex Boyle on 1/15/18
const socket = new WebSocket('ws://localhost:16505');//Connect to the main.js server?
var active = setInterval(function () {

	//Send personnel data
	for(var i = 0; i <personnel.length;i++){
	  var newmsg = (JSON.stringify( personnel[i]));
		var tosend = { type: "ff", body: newmsg};
		if (socket.readyState === WebSocket.OPEN) {

			socket.send(JSON.stringify(tosend)); //Hi
		}
	}
	//Send out beacons data
	for(var i = 0; i <beacons.length;i++){
		var newmsg = (JSON.stringify( beacons[i]));
		var tosend = { type: "bn", body: newmsg };
		if (socket.readyState === WebSocket.OPEN) {

			socket.send(JSON.stringify(tosend)); //Hi
		}
	}
//Send out drone data
	for(var i = 0; i <drones.length;i++){
		var newmsg = (JSON.stringify( drones[i]));
		var tosend = { type: "dn", body: newmsg };
		if (socket.readyState === WebSocket.OPEN) {
			socket.send(JSON.stringify(tosend)); //Hi
		}
	}
}, 100);

//start time
var date = new Date();
let startTime = date.getTime();
//=============================================
