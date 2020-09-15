const express = require('express');
const bodyParser = require('body-parser');

const {Post, testSchema} = require('./models/post');

const os = require( 'os' );
const networkInterfaces = os.networkInterfaces( );
const ip = networkInterfaces['enp1s0'][0]['address'];

const app = express();
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/testdb', {useNewUrlParser: true});


const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
    console.log("Connected to Mongodb");
  // we're connected!
});

//#region
/*
    app.use((req, res, next) => {
    res.status(200).json({
    message: 'It works!'
    });
    next();
    });

    app.use(require('body-parser').urlencoded({
    extended: true
}));
*/
//#endregion

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.set('port', process.env.PORT || 3010);
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next){
    console.log("Looking for URL : " + req.url);
    next();
});

app.use(function(err, req, res, next){
    console.log('Error : ' + err.message);
    next();
});

app.post('/test', function(req, res){
    
    console.log('Form: ' + req.query.form);
    console.log('Test: ' + req.body);
    console.log('Test: ' + req.body.myField);
    console.log('Success');
});

/*
const post2 = new testSchema({
        bmpData: req.body.bmpData,
        ccsData: req.body.ccsData,
        mgsData: req.body.mgsData
    });
    post2.save();
const post3 = new testSchema({
        temperature : req.body.temperature,   //"float in Celsius"
        pressure    : req.body.pressure,   //"float in hPa"
        altitude    : req.body.altitude[1],    //"float in meters"
        CO2         : req.body.CO2,   //"Integer in ppm"
        TVOC        : req.body.TVOC,    //"Integer in ppb"
        approxAlt   : req.body.altitude[2],
        NH3         : req.body.NH3,   //"Float in ppm"
        CO          : req.body.CO,   //"Float in ppm"
        NO2         : req.body.NO2,   //"Float in ppm"
        C3H8        : req.body.C3H8,   //"Float in ppm"
        C4H10       : req.body.C4H10,   //"Float in ppm"
        CH4         : req.body.CH4,   //"Float in ppm"
        H2          : req.body.H2,   //"Float in ppm"
        C2H5OH      : req.body.C2H5OH    //"Float in ppm"
    });
    post3.save();
    */

app.post('/sensor-data', function(req, res) {
    
    console.log('Form ' + req.query.form);
    console.log('Test ' + req.body.title);
    console.log('Body ' + JSON.stringify(req.body));
    console.log('Success');
});

app.listen(app.get('port'),function(){
    console.log("Express started on http://" + ip + ":" + app.get('port') + ' press Ctrl-C to terminate');
});

/*
app.post('/sensor-data', function(req, res) {
    const post2 = new testSchema({
        bmpData: {
            temperature : req.body.temperature,
            pressure: req.body.pressure,
            altitude: req.body.altitude
        }
    });
    post2.save();
    console.log('Form ' + req.query.form);
    console.log('Test ' + req.body.title);
    console.log('Body ' + req.body);
    console.log('Success');
});
*/