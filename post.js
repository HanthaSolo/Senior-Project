const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    title: {type: String},
    data: {type: String}
    
}, {
    collection: 'testCollection'
});

const mgsPostSchema = mongoose.Schema({
    NH3: {type: Number},
    CO: {type: Number},
    NO2: {type: Number},
    C3H8: {type: Number},

    C4H10: {type: Number},
    CH4: {type: Number},
    H2: {type: Number},
    C2H5OH: {type: Number}    
    }, { collection: 'testCollection' }
);
const testSchema1 = mongoose.Schema({
    bmpData : {
        temperature : {type: Number},   //"float in Celsius"
        pressure    : {type: Number},   //"float in hPa"
        altitude    : {type: Number}    //"float in meters"
    },
    ccsData : {
        CO2         : {type: Number},   //"Integer in ppm"
        TVOC        : {type: Number}    //"Integer in ppb"
    },
    mgsData : {
        NH3         : {type: Number},   //"Float in ppm"
        CO          : {type: Number},   //"Float in ppm"
        NO2         : {type: Number},   //"Float in ppm"
        C3H8        : {type: Number},   //"Float in ppm"

        C4H10       : {type: Number},   //"Float in ppm"
        CH4         : {type: Number},   //"Float in ppm"
        H2          : {type: Number},   //"Float in ppm"
        C2H5OH      : {type: Number}    //"Float in ppm"
    }
});

const testSchema3 = mongoose.Schema({
        temperature : {type: Number},   //"float in Celsius"
        pressure    : {type: Number},   //"float in hPa"
        altitude    : {type: Number},    //"float in meters"
        CO2         : {type: Number},   //"Integer in ppm"
        TVOC        : {type: Number},    //"Integer in ppb"
        approxAlt   : {type: Number},
        NH3         : {type: Number},   //"Float in ppm"
        CO          : {type: Number},   //"Float in ppm"
        NO2         : {type: Number},   //"Float in ppm"
        C3H8        : {type: Number},   //"Float in ppm"
        C4H10       : {type: Number},   //"Float in ppm"
        CH4         : {type: Number},   //"Float in ppm"
        H2          : {type: Number},   //"Float in ppm"
        C2H5OH      : {type: Number}    //"Float in ppm"
}, { timestamps: { createdAt: 'created_at' } });

const bmp = mongoose.Schema({
    temperature : {type: Number},   //"float in Celsius"
    pressure    : {type: Number},   //"float in hPa"
    altitude    : {type: Number}    //"float in meters"
});

const ccs = mongoose.Schema({
    CO2         : {type: Number},   //"Integer in ppm"
    TVOC        : {type: Number}    //"Integer in ppb"
});

const mgs = mongoose.Schema({
    NH3         : {type: Number},   //"Float in ppm"
    CO          : {type: Number},   //"Float in ppm"
    NO2         : {type: Number},   //"Float in ppm"
    C3H8        : {type: Number},   //"Float in ppm"

    C4H10       : {type: Number},   //"Float in ppm"
    CH4         : {type: Number},   //"Float in ppm"
    H2          : {type: Number},   //"Float in ppm"
    C2H5OH      : {type: Number}    //"Float in ppm"
});

const testSchema2 = mongoose.Schema({
    bmpData : [bmp],
    ccsData : [ccs],
    mgsData : [mgs]
}, { timestamps: { createdAt: 'created_at' } });

const Post = mongoose.model('Post', postSchema);
const testSchema = mongoose.model('testSchema', testSchema3);
//const testSchema3 = mongoose.model('testSchema3', testSchema3);
//module.exports = mongoose.model('Post', postSchema);
//module.exports = mongoose.model('testS', testSchema2);

module.exports = {Post, testSchema, testSchema};