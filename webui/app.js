
const resultOverviewText = document.getElementById("resultview-area");
const locateMeButton = document.getElementById("locate-me");
const loader = document.getElementById("loader");
const factory = new jsts.geom.GeometryFactory();
const centerActiveButton = document.getElementById("auto-zoom");
const selectPolygons = document.getElementById("select-polygons");
const selectPoints = document.getElementById("select-points");
const selectLines = document.getElementById("select-lines");
const indexMenu = document.getElementById("layer-selection");
const layerDiv = document.getElementById("layer");

let shallCenter = false;


const INITIAL_VIEW_STATE = {
  longitude: 50.302428631992042,
  latitude: 40.50131842240836,
  zoom: 9
}


function clone(objA, depth = 30){
  var text = JSON.stringify(objA);
  var objB = JSON.parse(text);
  return objB;
}

let oldFetchResult = "";
const emptyFeature = {"type": "FeatureCollection","features": [] }
const emptyFeatureList = [clone(emptyFeature)];

//============================Global Variables=========================================================

var featuresInit = { 
    "points" : clone(emptyFeatureList),
    "lines": clone(emptyFeatureList),
    "polygons" : clone(emptyFeatureList)
};

let features = clone(featuresInit);

let defaultColor = [255, 0, 0]
let geometryType = "polygons";
let geometryIndex = 0;
const parseColor = color => {
    if (typeof color !== 'string') {
        return null
    }
    const m = color.match(/^#([0-9a-f]{6})$/i)[1];
    if (!m) {
        return null
    }
    return [
        parseInt(m.substr(0,2),16),
        parseInt(m.substr(2,2),16),
        parseInt(m.substr(4,2),16)
    ];
}

const geoJSONPointLayer = new deck.GeoJsonLayer({
  id: 'geojson-point-layer',
  pointRadiusScale: 1,
  pointRadiusMinPixels: 5,
  opacity: 0.07,
  getElevation: d => 20 * 0.1,//TODO Fix
  getLineColor: d => [255, 255, 255,0],
  getFillColor: d => [0,128,0,255],
  radiusScale: 2,
  getRadius: d => 1,
  pointRadiusUnits: 'meters',
  pickable: false
});

const geoJSONLineLayer = new deck.GeoJsonLayer({
  id: 'geojson-line-layer',
  extruded: true,
  lineWidthScale: 2,
  lineWidthMinPixels: 2,
  opacity: 0.07,
  getElevation: d => 20 * 0.1,//TODO Fix
  getFillColor: d => [0,0,0,255],
  getLineColor: [0, 0, 255],
  radiusScale: 1,
  getRadius: d => 1,
  getLineWidth: 5,
  lineWidthUnits: "pixels",
  pickable: false
});

const geoJSONPolygonLayer = new deck.GeoJsonLayer({
  id: 'geojson-polygon-layer',
  extruded: true,
  lineWidthScale: 20,
  lineWidthMinPixels: 2,
  opacity: 0.07,
  getElevation: d => 20 * 0.1,//TODO Fix
  getFillColor: d => [255,0,0,128],
  getLineColor: [255, 255, 255],
  radiusScale: 10,
  getRadius: d => 15,
  getLineWidth: 3,
  lineWidthUnits: "pixels",
  pickable: false
});


const getCoordinates = d => {
  return d.coordinates;
}

let displayLoaderCounter = 0;


function showLoader() {
  displayLoaderCounter++;
  if (displayLoaderCounter > 0) {
    loader.style.display = "initial";
  }
}

function hideLoader() {
  displayLoaderCounter--;
  if (displayLoaderCounter <= 0) {
    loader.style.display = "none";
  }
}

function hasFeatures(_type,_index){
  if( 
    features[_type] != null &&
    features[_type][_index] != null &&
    features[_type][_index].features != null &&
    features[_type][_index].features.length > 0
    ){
      return true;
    } else {
      return false;
    }
}

function updateGeoJSON(){
  let queryURL = "http://localhost:8083/api/update";
  updateLayerList(queryURL);

}
function loadGeoJSON() {
  let queryURL = "http://localhost:8083/api/get";
  updateLayerList(queryURL);
}

function getTooltipByFeature(feature){
    return Object.keys(feature.properties)
        .filter(key => !key.startsWith('_'))
        .map(key => `${key}: ${feature.properties[key]}`)
        .join('<br>')
}


// Create Deck.GL map	
let deckMap = new deck.DeckGL({
  mapStyle: 'https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json',
  
  initialViewState: {
    longitude: 50.302428631992042,
    latitude: 62.50131842240836,
    zoom: 15
  },
  layers: [geoJSONPointLayer, geoJSONLineLayer, geoJSONPolygonLayer],
  getTooltip: ({object}) => {
      return object && {html: getTooltipByFeature(object)}
  },
  controller: true,
  onViewStateChange: ({ viewState }) => {
    deckMap.setProps({ viewState })
  }
});

function setLayerData(oLayer, oFeatureCollection){
  oLayer.updateState({
    props: {
      data: oFeatureCollection,
    },
    changeFlags: { dataChanged: true, propsChanged: true, viewportChanged: true },
  })

}


function updateView(){
  let oFeatureCollection = features[geometryType][geometryIndex];
  if( oFeatureCollection == null){
    oFeatureCollection = clone(emptyFeature);
  }
  switch(geometryType){
    case "points":
      setLayerData(geoJSONPointLayer,oFeatureCollection);
      setLayerData(geoJSONLineLayer, emptyFeature);
      setLayerData(geoJSONPolygonLayer, emptyFeature);
      oLayer = geoJSONPointLayer;
      break;
    case "lines":
      setLayerData(geoJSONPointLayer,emptyFeature);
      setLayerData(geoJSONLineLayer, oFeatureCollection);
      setLayerData(geoJSONPolygonLayer, emptyFeature);
      oLayer = geoJSONLineLayer;
      break;
    case "polygons":
      setLayerData(geoJSONPointLayer,emptyFeature);
      setLayerData(geoJSONLineLayer, emptyFeature);
      setLayerData(geoJSONPolygonLayer, oFeatureCollection);
      oLayer = geoJSONPolygonLayer;
      break;
  }
  
  const viewport = oLayer.context.viewport

    if (shallCenter == true &&  
      oFeatureCollection != null && 
      oFeatureCollection.features != null &&
      oFeatureCollection.features.length > 0
    ) {
      const geoJSONBbox = window.bbox(oFeatureCollection);
      if( geoJSONBbox !== null && geoJSONBbox !== undefined && (geoJSONBbox.length >= 4)){
        console.log("GeoJSONBbox: " + JSON.stringify(geoJSONBbox));
        const {longitude, latitude, zoom} = viewport.fitBounds([
          [geoJSONBbox[0], geoJSONBbox[1]],
          [geoJSONBbox[2], geoJSONBbox[3]]
        ], {padding: 50})
  
        if (latitude !== viewport.latitude || longitude !== viewport.longitude || zoom !== viewport.zoom) {
          deckMap.setProps({
              viewState: {
              longitude,
              latitude,
              zoom,
              transitionInterpolator: new deck.FlyToInterpolator(),
              transitionDuration: '100'
              }
          })
        }  
      }
    }
}

function updateFeatures(updates){
  var updateNeeded = false;
  for( var [key,dataArray] of Object.entries(updates) ){
    if(features[key] != null){
        if( dataArray != null && Array.isArray(dataArray) == true){
          for(var index= 0; index < dataArray.length; index++ ){
              if( dataArray[index] != null){
                  console.log("Adding element to " + key + " " + index +": " +JSON.stringify(dataArray[index]));
                  features[key][index] = dataArray[index];
                  if( key === geometryType && index === geometryIndex){
                    updateNeeded = true;
                  }
              }
          }
        } else {
          console.log("Did not include an array: " + key);
        }
    } else {
        console.log("Feature '" + key + "' does not exist");
    }
  }
  return updateNeeded;
}

function updateLayerList(oQuery) {
  showLoader();

  fetch(oQuery, {
    "method": "GET"
  }).then(res => res.text()).then(resultsStr => {
    let updates = JSON.parse(resultsStr);
    if( updateFeatures(updates) === true){
      updateView();
    }
    hideLoader();
  }).catch(e => {
    console.error(e);
  });
}


function setType(type){
  geometryType = type;
  if( type === "points"){
    selectPoints.src = "img/points_active.png";
  } else {
    selectPoints.src = "img/points.png";
  }

  if( type === "lines"){
    selectLines.src = "img/lines_active.png";

  } else {
    selectLines.src = "img/lines.png";

  }

  if( type === "polygons"){
    selectPolygons.src = "img/polygons_active.png";
  } else {
    selectPolygons.src = "img/polygons.png";
  }

  updateView();
}

function setIndex(_index){
  geometryIndex = _index;
  indexMenu.style.display = "none";
  layerDiv.innerHTML = "<b>Layer</b><br>\n"+ _index;
  updateView();
}

function showMenu(){
    indexMenu.style.display = "block";
    let text = "<table>";
    for(let index=0; index<12;index++){
      text += "<tr><td><a onclick='setIndex("+index+")'/>";
      if( hasFeatures(geometryType,index) == true){
        text += "<b>"+index +"</b>";
      } else {
        text += ""+index;
      }
      if( index == geometryIndex){
        text += " (X)";
      }
      text+= "</a></td></tr>"
    }
    text+= "</table>";
    indexMenu.innerHTML = text;
}

function init(){
  loadGeoJSON();
  window.setTimeout(() => {
  window.setInterval(()=>{ updateGeoJSON();},1000); 
  },1000);
}


locateMeButton.addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition((position) => {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    bottomLeft = [longitude - 0.05, latitude - 0.05];
    topRight = [longitude + 0.05, latitude + 0.05];

    deckMap.setProps({
      viewState: {
        longitude: longitude,
        latitude: latitude,
        "zoom": 16,
        "minZoom": 5,
        "maxZoom": 20,
        "pitch": 40.5,
        "bearing": -27.396674584323023,
        transitionInterpolator: new deck.FlyToInterpolator(),
        transitionDuration: '1000'
      }
    });

  }, (error) => {
    console.log.error(error);
  });
});

centerActiveButton.addEventListener("click", () => {
  shallCenter = !shallCenter;
  if( shallCenter){
    centerActiveButton.src = "img/lupe_aktiv.png";
  } else {
    centerActiveButton.src = "img/lupe.png";
  }
});


selectPoints.addEventListener("click", () => {
  setType("points");
  showMenu();
})


selectLines.addEventListener("click", () => {
  setType("lines");
  showMenu();
})


selectPolygons.addEventListener("click", () => {
  setType("polygons");
  showMenu();
})


