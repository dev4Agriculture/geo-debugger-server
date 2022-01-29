/*
    GeoDebugger Webserver by dev4Agriculture
    Copyright 2022, dev4Agriculture
    Author: Frank Wiebeler

    Description:
    This Script creates a Server to receive, store and serve GeoJSON trees for communication with QGIS
*/
//============================Imports=========================================================
const express = require("express");
const bp = require('body-parser')
const app = express();


function debug(message){
    console.log ( '[' + new Date().toISOString().substring(11,23) + '] -', message )
}


function clone(objA, depth = 30){
    if( objA === undefined){
        return undefined;
    } else if( objA === null){
        return null;
    } else {
        var text = JSON.stringify(objA);
        var objB = JSON.parse(text);
        return objB;
    
    }
}



//============================Enums=========================================================

class PARAMSTYPE{
    static WRONG =-1;
    static NONE = 0;
    static TYPE = 1;
    static TYPE_INDEX = 2;
}


//============================Constants=========================================================

const Version = "1.0.1";

const parameterTypes = ["points","lines","polygons"];
const emptyFeature = {"type": "FeatureCollection","features": [] }
const emptyFeatureList = [clone(emptyFeature)];


const featuresInit = { 
    "points" : clone(emptyFeatureList),
    "lines": clone(emptyFeatureList),
    "polygons" : clone(emptyFeatureList)
};
const timesInit = {
    "points": [],
    "lines": [],
    "polygons": []
};

//============================Global Variables=========================================================


var features = clone(featuresInit);
var times = clone(timesInit);

var lastUpdate = new Date();
var lastUpdateRequest = new Date();

//============================General Functions=========================================================
function getParamsType(_type, _index){
    if( _index === null || _index === undefined){
        if( _type === null || _type === undefined){
            return PARAMSTYPE.NONE;
        } else {
            if( parameterTypes.includes(_type) === false){
                return PARAMSTYPE.WRONG;
            } else {
                return PARAMSTYPE.TYPE;
            }
        }
    } else {
        if( parameterTypes.includes(_type) === false){
            return PARAMSTYPE.WRONG;
        } else {
            return PARAMSTYPE.TYPE_INDEX;
        }
    }
}


function printCommand(_command, _type, _index, _paramsType){
    debug(_command+"Request");
    switch(_paramsType){
        case PARAMSTYPE.NONE:
            debug("\t ALL");
            break;
        case PARAMSTYPE.TYPE:
            debug("\t TYPE: " + _type)
            break;
        case PARAMSTYPE.WRONG:
            debug("\t INVALID");
            break;
        case PARAMSTYPE.TYPE_INDEX:
            debug("\t TYPE: "+ _type)
            debug("\t INDEX: " + _index)
            break;
        default:
            debug("\t DEFAULTED!");
            break;
            
    }
}



function initIndex(_type,_index){
    if(features[_type] === undefined || features[_type] === null ){
        features[_type] = [];
    } 

    if( features[_type][_index] === undefined || features[_type][_index] === null){
        features[_type][_index] = clone(emptyFeatureList);
    }

    if(times[_type] === undefined || times[_type] === null){
        times[_type] = [];
    } 

    if( times[_type][_index] === undefined || times[_type][_index] === null){
        times[_type][_index] = new Date();
    }

    return true;
}


function resetFeatures( type = null, index = null){
    var paramsType = getParamsType(type, index);

    switch(paramsType){
        case PARAMSTYPE.NONE:
            features = clone(featuresInit);
            times = clone(timesInit);
            lastUpdate = new Date();
            return true;//Always works;
        case PARAMSTYPE.WRONG:
            return false;
        case PARAMSTYPE.TYPE:
            features[type] = clone(featuresInit[type]);
            times[type] = clone(timesInit[type]);
            lastUpdate = new Date();
            return true;
        case PARAMSTYPE.TYPE_INDEX:
            features[type][index] = clone(featuresInit[type][0])
            times[type][index] = clone(timesInit[type][0]);
            lastUpdate = new Date();
            return true;
        default: 
            return false;

    }
}

function setFeatures(_content, _type, _index){
    var paramsType = getParamsType(_type, _index);

    switch(paramsType){
        case PARAMSTYPE.NONE:
        case PARAMSTYPE.WRONG:
        case PARAMSTYPE.TYPE:
            return false;
        case PARAMSTYPE.TYPE_INDEX:
            features[_type][_index] = _content;
            times[_type][_index] = new Date();
            return true;
        default:
            return false;
    }
}




function hasUpdate( _type, _index ){
    if( features[_type][_index] !== undefined && features[_type][_index] !== null){
        if(times[_type][_index] !== undefined && times[_type][_index] !== null){
            return lastUpdateRequest < times[_type][_index] ? true : false;
        } else {
            return true;
        }
    } else {
        return false;
    }
}


function getUpdatesForType(_type){
    result = [];
    _features = features[_type];
    _times = times[_type];
    for(var index = 0; index< _features.length; index++){
        if( hasUpdate(_type,index) == true){
            result[index] = _features[index];
            _times[index] = new Date();
        } else {
            result[index] = null;
        }
    }
    return result;
}

function getUpdatesList( _type, _index){
    var paramsType = getParamsType(_type, _index);

    switch(paramsType){
        case PARAMSTYPE.WRONG:
            return {};
        case PARAMSTYPE.NONE:
            var result = {};
            for(var [key,value] of  Object.entries(features)){
                result[key] = getUpdatesForType(key);
            }
            lastUpdateRequest = new Date();
            return result;

        case PARAMSTYPE.TYPE:
            var result = getUpdatesForType(_type);
            lastUpdateRequest = new Date();
            return result;
        
        case PARAMSTYPE.TYPE_INDEX:
            var result = {};
            if( hasUpdate(type, index,lastUpdateRequest)){
                result = features[_type][_index];
                times[_type][_index] = new Date();
            }
            lastUpdateRequest = new Date();
            return result;

        default:
            return {};
    }
}

//=========================== Server Answer Functions ==================================================

function sendResult(res, result){
    var text = JSON.stringify(result);
    res.setHeader('content-type','application/JSON');
    res.status(200);
    res.send(text);    
}


function sendOK(res){
    sendResult(res, {status: "OK"});
}

function sendError(res, message){
    res.setHeader('content-type','application/JSON');
    res.status(400);
    res.send("{\"status\":\"ERROR\",\"info\":\""+message+"\"}");
}



//============================Configure Express=========================================================

app.use(express.static("./webui"))
app.use(bp.json({limit: '200mb'}))
app.use(bp.urlencoded( { extended: true}))

//============================Commands=========================================================

// COMMAND CLEAR
// Clear the given Entry by index, all Entries in a Type or all Entries
app.delete("/api/clear/:type?/:index?", (req,res) => {
    index = req.params["index"];
    type = req.params["type"];
    var paramsType = getParamsType(type, index);
    if( paramsType === PARAMSTYPE.WRONG){
        sendError(res, "Wrong parameter values");
        return;
    }

    printCommand("Delete", type, index, paramsType);
    
    switch(paramsType){
        case PARAMSTYPE.NONE:
        case PARAMSTYPE.TYPE:
        case PARAMSTYPE.TYPE_INDEX:
            if( resetFeatures(type,index) == true){
                sendOK(res);
                return;
            } else {
                sendError(res, "Error while Reset");
                return;
            }
    }
    
});

// COMMAND PUT: Update DataSets
app.post("/api/put/:type/:index", (req,res) => {
    type = req.params["type"];
    index = req.params["index"];
    var paramsType = getParamsType(type, index);
    if( paramsType === PARAMSTYPE.WRONG){
        sendError(res, "Wrong parameter values");
        return;
    }

    printCommand("Set Data", type, index, paramsType);
    
    switch(paramsType){
        case PARAMSTYPE.NONE:
        case PARAMSTYPE.TYPE:
            sendError(res, "Wrong parameter values");
            return;
        case PARAMSTYPE.TYPE_INDEX:
            setFeatures(req.body,type,index);
            sendOK(res);
            return true;

    }
});

app.get("/api/update/:type?/:index?", (req,res) => {
    var type = req.params["type"];
    var index = req.params["index"];
    var paramsType = getParamsType(type, index);
    if( paramsType === PARAMSTYPE.WRONG){
        sendError(res, "Wrong parameter values");
        return;
    }

    printCommand("Update Data", type, index, paramsType);

    switch(paramsType){
        case PARAMSTYPE.NONE:
        case PARAMSTYPE.TYPE:
        case PARAMSTYPE.TYPE_INDEX:
            var result = getUpdatesList(type,index);
            sendResult(res, result);
            return
    }
})

// COMMAND INFO: Receive General information about the Status
app.get("/api/info", (req,res) => {
    debug("Info Request Received");
    debug("");
    let info = {
        data: {},
        times: {}
    };
    for(const [key, value] of Object.entries(features)){
        if( key !== 0 && key !== undefined && value !== undefined && Array.isArray(value)){
            info.data[key] = {
                length: value.length,
                sizes: value.map(entry => entry.features.length)
            };    
        }
    }

    for(const [key, value] of Object.entries(times)){
        if( key !== 0 && key !== undefined && value !== undefined && Array.isArray(value)){
            info.times[key] = value;
        }
    }
    sendResult(res, info);
})


//COMMAND GET: Get Current features; Done from Postman, Website and External apps like QGis
app.get("/api/get/:type?/:index?", (req,res) => {
    var type = req.params["type"];
    var index = req.params["index"];
    var paramsType = getParamsType(type, index);
    if( paramsType === PARAMSTYPE.WRONG){
        sendError(res, "Wrong parameter values");
        return;
    }

    printCommand("Get", type, index, paramsType);

    switch(paramsType){
        case PARAMSTYPE.NONE:
            sendResult(res, features);
            return true;//Always works;
        case PARAMSTYPE.TYPE:
            sendResult(res, features[type]);
            return true;
        case PARAMSTYPE.TYPE_INDEX:
            if(features[type][index] === undefined){
                sendResult(res,emptyFeature);//IMPORTANT: If we throw an error here, we destroy the display in QGIS!
            } else {
                sendResult(res,features[type][index]);
            }
            return true;

    }
})

//============================START SERVER=========================================================
app.listen(8083, () => {
 debug("GeoDebugger Server started");
 debug("Server running on port 8083");
 debug(" Version: "+ Version)
});