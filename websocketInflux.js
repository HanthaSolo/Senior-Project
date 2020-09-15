const webSocketServer = require('websocket').server;
const http = require('http');
const webSocketsServerPort = 8010;

const querystring = require('querystring');

const os = require( 'os' );
const networkInterfaces = os.networkInterfaces( );
const ip = networkInterfaces['enp1s0'][0]['address'];

const Influx = require('influx');
const express = require('express');

const bodyParser = require('body-parser');

// InfluxDB
const influx = new Influx.InfluxDB({
    host: 'localhost',
    database: 'sensor_data_db',
    schema: [
      {
        measurement: 'sensor_data',
        fields: {
          CO2: Influx.FieldType.INTEGER,
          TVOC: Influx.FieldType.INTEGER,
          altitude: Influx.FieldType.FLOAT,
          temperature: Influx.FieldType.FLOAT,
          pressure: Influx.FieldType.FLOAT
        },
        tags: [
          'host'
        ]
      }
    ]
})

influx.getDatabaseNames()
  .then(names => {
    if (!names.includes('sensor_data_db')) {
      return influx.createDatabase('sensor_data_db');
    }
  })
  .catch(err => {
    console.error(`Error creating Influx database!`);
  })

// Spinning the http server and the websocket server.
const server = http.createServer();
server.listen(webSocketsServerPort, function(){
    console.log("WebSocket started on http://" + ip + ":" + webSocketsServerPort + ' press Ctrl-C to terminate');
});
const wsServer = new webSocketServer({
  httpServer: server
});


// WebSocket server
wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
  
    // This is the most important callback for us, we'll handle
    // all messages from users here.
    connection.on('message', function(message) {
      if (message.type === 'utf8') {
        var data = querystring.decode(message.utf8Data);
        var CO2 = data.CO2;
        var TVOC = data.TVOC;
        var altitude = data.altitude[0];
        var temperature = data.temperature;
        var pressure = data.pressure;
        console.log(data);
        influx.writePoints([
            {
              measurement: 'temp',
              tags: { host: os.hostname() },
              fields: { CO2, TVOC, altitude, temperature, pressure },
            }
          ]).catch(err => {
            console.error(`Error saving data to InfluxDB! ${err.stack}`)
          })
      }
    });
  
    connection.on('close', function(connection) {
      // close user connection
    });
});