# geo-debugger-server
A simple server to forward received GeoJSON messages. It provides a simple WebUI to also receive the data

## About GeoDebugger

The GeoDebugger is a tool to distribute and display GeoBased information. It consists of [Dotnet Nuget Pack Library](https://github.com/dev4Agriculture/geo-debugger-lib-dotnet)
 and this server.

Additionally, a Tool like e.g. [QGis](https://qgis.org/de/site/) can be used to display the data.


## About the Author
![dev4Agriculture](resources/banner_dev4ag.png)

dev4Agriculture focusses on data exchange in agriculture. We build, analyse and visualize ISOXML and support companies in data exchange via agrirouter.

Find out more at https://www.dev4Agriculture.de

## Tutorial

There is a video tutorial available showing the usage of the Tool Chain.

URL: https://www.youtube.com/watch?v=FwGbLS0qVks&list=PL52axXJzxQSbptBD5x1bdSyR_gJuFXFgP


## Initialization

Run ```npm install```

## How to run
Run ```node index.js```


## Display the WebUI

The server can serve an own WebUI to display geometries. This display is very simple; the major advantage of the UI is that it updates automatically.

Call ```http://localhost:8083/index.html```

## Display Data with QGIS

QGis is a GIS Software and as such it displays geobased information like lines, points and polygons.

### Add layer in QGis

To display data, start QGis and go to the menu -> layers -> Add Layer -> Add VectorLayer. 

In the popup, the following settings are required:

- Select Source Type "Protocol: HTTP(S),Cloud,etc"
- Protocol Type: GeoJSON
- URI: http://localhost:8083/api/get/{type}/{layer} where type can be points, lines, polygons and layer is a number.
    **Example**: http://localhost:8083/api/get/polygons/1 

**IMPORTANT**
=====
Make sure you the entry exists **before** you add a layer. If no element exists, QGis cannot recognize the type of the feature collection and it cannot simply be reloaded. 
=====

## API-Commands 

The server is contacted via http at http://localhost:8083.

### GET - /api/get/:type?/:index?

Gets the corresponding GeoJSON Object.

- Type can be "points", "lines", "polygons"
- Index must be a number

### POST - /api/get/:type?/:index?

Sets the corresponding GeoJSON Object.

- Type can be "points", "lines", "polygons"
- Index must be a number
- The Body includes the JSON Object

### GET - /api/info

Returns an infoList of MetaData. It includes the number of Elements in each subelement of points, lines and polygons.
Additionally it includes timestamps of the last update.

### GET - /api/update

Returns an object that includes points, lines and polygons, each one is an array of elements.
All those elements that were **NOT** changed since the last call of this function will be replaced with **null**.

### DELETE - /api/clear/:type?/:index?

Clears either all data (type and index not set), all elements of one type (type is "points", "lines", "polygons") or a specific element.

