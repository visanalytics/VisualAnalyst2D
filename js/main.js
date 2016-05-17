// Accidents mapper
// C 2014 Jacob Cybulski
//   
// Displays VicRoads accident data on Google Maps:
// - Input: Collection of CSV files with accident data
//
// accidents.datapt_stats:
//		id = unique data point ID, also its index
//		point_value = the point value
//		acc_lat, acc_long = the location of a point
//		grid_fromlat, grid_fromlong, grid_fromlong, grid_tolong = grid boundary rectangle for the point
//		marker = a marker associated with a data point
//
// accidents.datpt_grid:
//		dataPts = a list of data points in a grid cell
//		rect = a rectangle displayed with the grid (or null if not displayed)
//		total_value = total value of all data points in a grid
//		grid_fromlat, grid_fromlong, grid_fromlong, grid_tolong = grid boundary rectangle



// Data sources
var data_path = "data/";
var data_file = "r_acc_sum_grid_Test.csv";

// Data on disk
var info = {
	"map": {
		"VicAll-1x1": {"fromlat": -34, "fromlong": 141, "tolat": -39, "tolong": 150, "divlat": 1, "divlong": 1, "zoom": 7},
		"VicAll-16x16": {"fromlat": -34, "fromlong": 141, "tolat": -39, "tolong": 150, "divlat": 16, "divlong": 16, "zoom": 7},
		"VicAll-128x128": {"fromlat": -34, "fromlong": 141, "tolat": -39, "tolong": 150, "divlat": 128, "divlong": 128, "zoom": 7},
		"VicAll-256x256": {"fromlat": -34, "fromlong": 141, "tolat": -39, "tolong": 150, "divlat": 256, "divlong": 256, "zoom": 7},
		"VicAll-512x512": {"fromlat": -34, "fromlong": 141, "tolat": -39, "tolong": 150, "divlat": 512, "divlong": 512, "zoom": 7},
		"LargerMelb-64x64": {"fromlat": -37.65, "fromlong": 144.7, "tolat": -38, "tolong": 145.3, "divlat": 64, "divlong": 64, "zoom": 11},
		"LargerMelb-128x128": {"fromlat": -37.65, "fromlong": 144.7, "tolat": -38, "tolong": 145.3, "divlat": 128, "divlong": 128, "zoom": 11},
		"CitySurr-16x16": {"fromlat": -37.78, "fromlong": 144.88, "tolat": -37.86, "tolong": 145.03, "divlat": 16, "divlong": 16, "zoom": 13},
		"CitySurr-64x64": {"fromlat": -37.78, "fromlong": 144.88, "tolat": -37.86, "tolong": 145.03, "divlat": 64, "divlong": 64, "zoom": 13},
		"CitySurr-128x128": {"fromlat": -37.78, "fromlong": 144.88, "tolat": -37.86, "tolong": 145.03, "divlat": 128, "divlong": 128, "zoom": 13},
		"MelbCity-16x16": {"fromlat": -37.805, "fromlong": 144.950, "tolat": -37.825, "tolong": 144.986, "divlat": 16, "divlong": 16, "zoom": 15},
		"MelbCity-64x64": {"fromlat": -37.805, "fromlong": 144.950, "tolat": -37.825, "tolong": 144.986, "divlat": 64, "divlong": 64, "zoom": 15}
		//"Test": {"fromlat": -37.805, "fromlong": 144.950, "tolat": -37.825, "tolong": 144.986, "divlat": 64, "divlong": 64, "zoom": 15}
	}
};

// Accident data
var accidents = {

  // Limits
  maxCities: 0, // Max numbery of cities
  min_pt_value: 0, // Minimum value of stored points
  max_pt_value: 0, // Maximum value of stored points

  // Repositories
  datpt_stats: [], // Table of all accident numbers in a given council area
  datpt_grid: [], // Table of grid elements displayed on the map, indexed by top-left corner
  circles: [], // List of circles
  heatpoints: [], // List of all heat points
  selmarkers: [], // List of the selected markers
  heatmap: null, // Heat map of heat points
  frame: null, // Frame around the map
  
  // Maps
  curr_mapname: 'VicAll-16x16',
  curr_elevation: 'sum',
  curr_colour_1: '',
  cutr_colour_2: '',
  curr_display: 'grid',
  curr_map: null
  };

// -----------------------------------------------  
// User interface functions
// -----------------------------------------------  

// Select the map to be displayed
d3.select('#set-map')
  .on('change', function () {
    accidents.curr_mapname = this.value;
	if ((this.value === "VicHiRes"))
		alert('Not enough resources: '+this.value);
	else {
		data_file = accDataFile(accidents.curr_mapname, accidents.curr_elevation);
		initMap();
	}
  });

// Select the elevation type to be displayed
d3.select('#set-elevation')
  .on('change', function () {
    accidents.curr_elevation = this.value;
	if (true) {
		data_file = accDataFile(accidents.curr_mapname, accidents.curr_elevation);
		initMap();
	} else {
		alert('Feature not yet implemented: '+this.value);
	}
  });

// Select the first colour to be displayed
d3.select('#set-colour-1')
  .on('change', function () {
    accidents.curr_colour_1 = this.value;
    // redrawMap();
    alert('Feature not yet implemented: '+this.value);
  });
  
// Select the first colour to be displayed
d3.select('#set-colour-2')
  .on('change', function () {
    accidents.curr_colour_2 = this.value;
    // redrawMap();
    alert('Feature not yet implemented: '+this.value);
  });
  
// Select the display type
d3.select('#set-display')
  .on('change', function () {
    accidents.curr_display = this.value;
    reset_display();
  });
  
function reset_display() {
    if (accidents.curr_display === 'circles') {
        hideGrids();
        removeHeatmap();
        addCircles();
        sliderLoad();
    } else if (accidents.curr_display === 'grid') {
        removeHeatmap();
        removeCircles();
        showGrids(accidents.curr_map);
        sliderLoad();
    } else if (accidents.curr_display === 'heatmap') {
        hideGrids();
        removeCircles();
        addHeatmap();
        sliderLoad();
    } else if (accidents.curr_display === 'none') {
        hideGrids();
        removeCircles();
        removeHeatmap();
        sliderLoad();
    }
}

// Press button hide markers
d3.select('#marker-hide')
  .on('click', function () {
    hideMarkers();
  });

// Press button show all markers
d3.select('#marker-show')
  .on('click', function () {
    showMarkers(accidents.curr_map);
  });

// Press button show only the selected markers
d3.select('#marker-selected')
  .on('click', function () {
    hideMarkers();
    showSelectedMarkers(accidents.curr_map);
  });

// Press button delete markers
d3.select('#marker-delete')
  .on('click', function () {
    removeMarkers();
  });
  
  
// -----------------------------------------------------
// Help window
// -----------------------------------------------------

function showHelp(url, title, w, h) {
    // Fixes dual-screen position                         Most browsers      Firefox
    var dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;
    var dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;

    width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    var left = ((width / 2) - (w / 2)) + dualScreenLeft;
    var top = ((height / 2) - (h / 2)) + dualScreenTop;
    var newWindow = window.open(url, title, 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);

    // Puts focus on the newWindow
    if (window.focus) {
        newWindow.focus();
    }
    newWindow.onload = function() {
      var div = newWindow.document.createElement('div'); 
      div.innerHTML = '<a html="http://visanalytics.org" target="_blank">SAS Visual Analytics Collaboratory</a><br/>';
      div.style.fontSize = '30px';
      newWindow.document.body.insertBefore( div, newWindow.document.body.firstChild ); 
    }
}

function HelpControl(controlDiv, map) {

  // Set CSS styles for the DIV containing the control
  // Setting padding to 5 px will offset the control
  // from the edge of the map
  controlDiv.style.padding = '5px';

  // Set CSS for the control border
  var controlUI = document.createElement('div');
  controlUI.style.backgroundColor = 'white';
  controlUI.style.borderStyle = 'solid';
  controlUI.style.borderWidth = '2px';
  controlUI.style.cursor = 'pointer';
  controlUI.style.textAlign = 'center';
  controlUI.title = 'Click to show help';
  controlDiv.appendChild(controlUI);

  // Set CSS for the control interior
  var controlText = document.createElement('div');
  controlText.style.fontFamily = 'Arial,sans-serif';
  controlText.style.fontSize = '12px';
  controlText.style.paddingLeft = '4px';
  controlText.style.paddingRight = '4px';
  controlText.innerHTML = '<b>Help</b>';
  controlUI.appendChild(controlText);

  // Setup the click event listeners: simply set the map to
  // Chicago
  google.maps.event.addDomListener(controlUI, 'click', function() {
    showHelp('help.html', 'Help', 600, 600);
  });
}

// Set up the button
function setHelp(map) {
    
    // Create the DIV to hold the control and
    // call the HomeControl() constructor passing
    // in this DIV.
    var helpControlDiv = document.createElement('div');
    var helpControl = new HelpControl(helpControlDiv, map);

    helpControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(helpControlDiv); 
}


// -----------------------------------------------------
// Controlling the size slider (for circles and heatmaps
// -----------------------------------------------------

var mySlider, i=0;

function sliderLoad(){

    var slider_value = document.getElementById("slider_value");

    mySlider = new dhtmlXSlider({
        parent: "size_slider",
        step:   1,
        min:    1,
        max:    400,
        value:  100
    });

    slider_value.innerHTML = mySlider.getValue()+"%";


    mySlider.attachEvent("onChange", function(value){
        setNoteToLog({
            eventNme: "onChange",
            arg: [value]
        });
        
    });

    mySlider.attachEvent("onSlideEnd", function(value){
        setNoteToLog({
            eventNme: "onSlideEnd",
            arg: [value]
        });
        // Act on request to change the slider value
        var sliderValue = mySlider.getValue();
        if (typeof value==='number' && (value%1)===0) {
            if (accidents.curr_display === 'circles') {
                changeCircleRadius(sliderValue/100.0);
            } else if (accidents.curr_display === 'grid') {
                changeGridDarkness(sliderValue/100.0);
            } else if (accidents.curr_display === 'heatmap') {
                changeHeatmapRadius(sliderValue/100.0);
            }
        } else {
            console.log("*** Bad slider value: "+sliderValue);
        }
    });
};

function sliderUnload(){
    if (mySlider !== null){
        mySlider.unload();
        mySlider = null;
    }
};

function setNoteToLog(data) {
    var slider_value = document.getElementById("slider_value");
    slider_value.innerHTML = data.arg+"%";
};


// -----------------------------------------------  
// Utilities
// -----------------------------------------------  

// Constructs a name of a data file
function accDataFile(mapname, elevation) {
	return 'r_acc_'+elevation+'_grid_'+mapname+'.csv';
}

// Radians
function rad(x) {
  return x * Math.PI / 180;
};

// Distance between two points
function getDistance(p1, p2) {
  var R = 6378137; // Earth’s mean radius in meter
  var dLat = rad(p2.lat() - p1.lat());
  var dLong = rad(p2.lng() - p1.lng());
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d; // returns the distance in meter
};


// -----------------------------------------------  
// Map functions
// -----------------------------------------------  


// Initialise the maps
function initMap() {

	// Create a map
	accidents.curr_map = new google.maps.Map(document.getElementById('map-canvas'), {
		zoom: info.map[accidents.curr_mapname].zoom,
		center: new google.maps.LatLng(
			(info.map[accidents.curr_mapname].fromlat+info.map[accidents.curr_mapname].tolat)/2, 
			(info.map[accidents.curr_mapname].fromlong+info.map[accidents.curr_mapname].tolong)/2),
		mapTypeId: google.maps.MapTypeId.ROADMAP
	});
        
        // Add help button
        setHelp(accidents.curr_map);

	// Add the main frame 
	accidents.frame = removeFrame(accidents.frame);
	accidents.frame = addFrame(accidents.frame, accidents.curr_map, 
		info.map[accidents.curr_mapname].fromlat, info.map[accidents.curr_mapname].fromlong,
		info.map[accidents.curr_mapname].tolat, info.map[accidents.curr_mapname].tolong);
	
	// Now load a map
	loadMap();
}

// The new accidents data is structured as follows:
// datpt, accidents_no, acc_lat, acc_long, grid_fromlat, grid_fromlong, grid_tolat, grid_tolong, grid

// Load the CSV file
function loadMap() {
	removeMarkers();
	removeCircles();
        removeGrids();
	accidents.max_pt_value = 0;
	d3.csv(data_path+accDataFile(accidents.curr_mapname, accidents.curr_elevation), 
	  function(err, data) { 
            var i;
            if (err) { 
              console.log('*** Error: '+err+'; while loading masters'); 
            } else {
                captureAccidentData(data);
                addGrid();
                addMarkers();
                sliderLoad();
                reset_display();
            }});
} // loadAccidentData

// Capture masters data
function captureAccidentData(mdata) {
  var i;
  var datpt, gridpt;
  
  // Initiate globals
  accidents.datpt_stats = [];
  accidents.datpt_grid = [];

  
  // Transfer primary masters data
  for (i=0; i < mdata.length; i++) {
    
    // Add a new record to a table of accident peaks
	// mdata: point_name, point_value, acc_lat, acc_long, grid_fromlat, grid_fromlong, grid_tolat, grid_tolong
    // datpt = mdata[i].point_name+':'+i;
    datpt = mdata[i].point_name+' #'+i+1;
    accidents.datpt_stats[datpt] = {};
    accidents.datpt_stats[datpt].id = datpt;
    accidents.datpt_stats[datpt].point_value = parseInt(mdata[i].point_value, 10);
    accidents.datpt_stats[datpt].acc_lat = parseFloat(mdata[i].acc_lat);
    accidents.datpt_stats[datpt].acc_long = parseFloat(mdata[i].acc_long);
    accidents.datpt_stats[datpt].grid_fromlat = parseFloat(mdata[i].grid_fromlat);
    accidents.datpt_stats[datpt].grid_fromlong = parseFloat(mdata[i].grid_fromlong);
    accidents.datpt_stats[datpt].grid_tolat = parseFloat(mdata[i].grid_tolat);
    accidents.datpt_stats[datpt].grid_tolong = parseFloat(mdata[i].grid_tolong);
    accidents.datpt_stats[datpt].marker = null;
	
    // Accumulate the total value for the grid cell
    gridpt = 
        (accidents.datpt_stats[datpt].grid_fromlat).toPrecision(16) + '-' + 
        (accidents.datpt_stats[datpt].grid_fromlong).toPrecision(16);
    if (gridpt in accidents.datpt_grid) {
        accidents.datpt_grid[gridpt].total_value += accidents.datpt_stats[datpt].point_value;
        accidents.datpt_grid[gridpt].dataPts.push(datpt);
    } else {
        accidents.datpt_grid[gridpt] = {};
        accidents.datpt_grid[gridpt].dataPts =[datpt];
        accidents.datpt_grid[gridpt].rect = null;
        accidents.datpt_grid[gridpt].total_value = accidents.datpt_stats[datpt].point_value;
        accidents.datpt_grid[gridpt].grid_fromlat = accidents.datpt_stats[datpt].grid_fromlat; 
        accidents.datpt_grid[gridpt].grid_fromlong = accidents.datpt_stats[datpt].grid_fromlong;
        accidents.datpt_grid[gridpt].grid_tolat = accidents.datpt_stats[datpt].grid_tolat;
        accidents.datpt_grid[gridpt].grid_tolong = accidents.datpt_stats[datpt].grid_tolong;
    }

    // Find the minimum and maximum of all loaded values
    if (i===0) {
        accidents.max_pt_value = accidents.datpt_stats[datpt].point_value;
        accidents.min_pt_value = accidents.datpt_stats[datpt].point_value;
    } else {
        accidents.max_pt_value = Math.max(accidents.max_pt_value, accidents.datpt_stats[datpt].point_value);
        accidents.min_pt_value = Math.min(accidents.max_pt_value, accidents.datpt_stats[datpt].point_value);
    }
  }
}


// -----------------------------------------------  
// Marker management
// -----------------------------------------------  

// Add all data point markers to the displayed map
function addMarkers() {
    for (var datpt in accidents.datpt_stats) {
        var marker = addDataPtMarker(datpt);
    }
}

// Add markers for all data points in a grid cell
// This is done in response to clicking grid listener
function addGridCellMarkers(gridPtRef) {
    //var datapts = accidents.datpt_grid[gridPtRef].dataPts;
    var i;
    var dPoints;
    
    dPoints = accidents.datpt_grid[gridPtRef].dataPts;
    for (i=0; i< dPoints.length; i++) {
        addDataPtMarker(dPoints[i]);
    }
}

// Create an info window to be shared by all markers
var infowindow = new google.maps.InfoWindow({
    minWidth: 300
});	  

// Add one marker, associated with a grid point
function addDataPtMarker(datpt) {
    var marker;
    var marker_icon;
    var gridpt =  gridPtRef(datpt);

    if (accidents.datpt_stats[datpt].marker !== null) {
        // The marker already exists, it is now selected
        // Just make it visible and add to the selected list
        selectMarker(accidents.datpt_stats[datpt].marker);
        return accidents.datpt_stats[datpt].marker;
    } else {
        // Create a new marker
        myLatlng = new google.maps.LatLng(
            accidents.datpt_stats[datpt].acc_lat,
            accidents.datpt_stats[datpt].acc_long);

        // Marker icon
        if (accidents.datpt_stats[datpt].point_value > 0)
            marker_icon = "images/marker-blue.png";
        else if (accidents.datpt_stats[datpt].point_value < 0)
            marker_icon = "images/marker-red.png";
        else
            marker_icon = "images/marker-blue-red.png";

        // Create a new marker but do not display it
        marker = new google.maps.Marker({
            position: myLatlng,
            map: null,
            icon: marker_icon,
            title: accidents.datpt_stats[datpt].id
        });

        // Add listener opening an info window
        google.maps.event.addListener(marker, 'click', (function(marker, c) {
            return function() {	
                var gridpt = gridPtRef(c);
                var contentString = 
                    '<div id="infoWindow">'+
                        '<div id="siteNotice">'+
                        '</div>'+
                        'Deselect markers: <button onclick="deselectMarker('+"'"+datpt+"'"+')">Only This</button>'+
                        '<button onclick="deselectAllMarkers()">All</button>'+
                        '<h1 id="firstHeading" class="firstHeading">'+
                        accidents.datpt_stats[c].id+
                        '</h1>'+
                        '<div id="bodyContent">'+
                            '<p>Located in '+
                                accidents.datpt_stats[c].acc_lat.toPrecision(10) + ', '+
                                accidents.datpt_stats[c].acc_long.toPrecision(10) + '.<br/> '+
                                'Point value = ' + accidents.datpt_stats[c].point_value + '<br/>'+
                                'Of the total per grid of = ' + accidents.datpt_grid[gridpt].total_value + '</br><br/>'+
                                'In a grid = </br>   '+accidents.datpt_stats[c].grid_fromlat.toPrecision(10)+' '+ 
                                    accidents.datpt_stats[c].grid_fromlong.toPrecision(10)+',<br/>   '+
                                accidents.datpt_stats[c].grid_tolat.toPrecision(10)+' '+ 
                                    accidents.datpt_stats[c].grid_tolong.toPrecision(10)+'<br/>'+
                            '</p>'+
                        '</div>'+
                    '</div>';
                infowindow.setContent(contentString);
                infowindow.open(accidents.curr_map, marker);
            };
        })(marker, datpt));

        // Remember the marker for the data point
        accidents.datpt_stats[datpt].marker = marker;

        return marker;
    }
}

// Remove all markers
function removeMarkers() {
    for (var datpt in accidents.datpt_stats) {
        if (accidents.datpt_stats[datpt].marker !== null) {
            accidents.datpt_stats[datpt].marker.setMap(null);
            accidents.datpt_stats[datpt].marker = null;
        }
    }
    accidents.selmarkers = [];
}

// Hide all markers, but keep them and keep the selected ones
function hideMarkers() {
    for (var datpt in accidents.datpt_stats) {
        if (accidents.datpt_stats[datpt].marker !== null) {
            accidents.datpt_stats[datpt].marker.setMap(null);
        }
    }
}

// Show all markers on a map
function showMarkers(map) {
    for (var datpt in accidents.datpt_stats) {
        if (accidents.datpt_stats[datpt].marker !== null) {
            accidents.datpt_stats[datpt].marker.setMap(map);
        }
    }
}

// Select the marker and make it visible
function selectMarker(marker) {
    accidents.selmarkers.push(marker);
    marker.setMap(accidents.curr_map);
}

// Show all selected markers
function showSelectedMarkers(map) {
    var marker;
    for (marker = 0; marker < accidents.selmarkers.length; marker++) {
        accidents.selmarkers[marker].setMap(map);
    }
}

// Deselect the marker and make it invisible
// Marker is referred to by its data point
function deselectMarker(datpt) {
    var marker;
    
    marker = accidents.datpt_stats[datpt].marker;
    if (marker !== null) {
        // Find and remove the marker from an array
        var i = accidents.selmarkers.indexOf(marker);
        if(i !== -1) {
            accidents.selmarkers.splice(i, 1);
            infowindow.close();
            marker.setMap(null);
        } else {
            console.log("*** Error: Marker not found");
        }
    }
}

// Deselect all markers
function deselectAllMarkers() {
    infowindow.close();
    hideMarkers();
    accidents.selmarkers = [];
}



// -----------------------------------------------  
// Grid management
// -----------------------------------------------  

// Draw a map with all grid cells on it
function addGrid() {
    for (var datpt in accidents.datpt_stats) {
        addGridCell(datpt);
    }
}

// Add a single grid cell
function addGridCell(datpt) {
    var myLatlng;
    var rshape;
    var gridpt;

    // Find grid coordinates
    gridpt = gridPtRef(datpt);

    // Add rectangles but only if not already displayed
    if (accidents.datpt_grid[gridpt].rect === null) {
        rshape = new google.maps.Rectangle({
            gridref: gridpt,
            clickable: true,
            map: accidents.curr_map,
            zIndex: 6,
            bounds: new google.maps.LatLngBounds(
                    new google.maps.LatLng(
                            accidents.datpt_stats[datpt].grid_fromlat, 
                            accidents.datpt_stats[datpt].grid_fromlong),
                    new google.maps.LatLng(
                            accidents.datpt_stats[datpt].grid_tolat, 
                            accidents.datpt_stats[datpt].grid_tolong))
        });

        // Store the grid cell and activate it
        accidents.datpt_grid[gridpt].rect = rshape;
        
        // Set the grid colour
        colorizeGrid(accidents.datpt_grid[gridpt], 1);

        // Add listener adding all associated markers
        google.maps.event.addListener(rshape, 'click', function() {
            addGridCellMarkers(rshape.gridref);
        });

    };  
}


// Returns a reference to a grid point, given a reference to a data point
function gridPtRef(dataPtRef) {
    var gridPtStr = 
        (accidents.datpt_stats[dataPtRef].grid_fromlat).toPrecision(16) + '-' + 
        (accidents.datpt_stats[dataPtRef].grid_fromlong).toPrecision(16);
    return gridPtStr;
}


// Remove all grids
function removeGrids() {
    for (var gridpt in accidents.datpt_grid) {
        if (accidents.datpt_grid[gridpt].rect !== null) {
            accidents.datpt_grid[gridpt].rect.setMap(null);
            accidents.datpt_grid[gridpt].rect = null;
        }
    }
}

// Hide all grids
function hideGrids() {
    var rOptions;
    rOptions = {strokeOpacity: 0.0, fillOpacity: 0.0};
    for (var gridpt in accidents.datpt_grid) {
        if (accidents.datpt_grid[gridpt].rect !== null) {
            accidents.datpt_grid[gridpt].rect.setOptions(rOptions);
        }
    }
}

// Hide all grids on a map
// Default was: strokeOpacity: 0.6, fillOpacity: 0.35
function showGrids(map) {
    var rOptions;
    rOptions = {strokeOpacity: 0.7, fillOpacity: 0.8};
    for (var gridpt in accidents.datpt_grid) {
        if (accidents.datpt_grid[gridpt].rect !== null) {
            accidents.datpt_grid[gridpt].rect.setOptions(rOptions);
        }
    }
}

// Colorise the grids
// Default fillColor='#C2E0FF'
// Default strokeColor='#C2E0FF'
function colorizeGrid(grid, multiplier) {
    var rOptions;
    var range;
    var val;
    var hue;
    var colour;
    if (grid.rect !== null) {
        val = grid.total_value;
        range = accidents.max_pt_value - accidents.min_pt_value;
        hue = 200 + Math.round((val / range)*(360-200)*multiplier);
        if (hue > 360) hue = 360;
        colour = 'hsl(' + hue + ',100%,30%)';
        rOptions = {
            strokeWeight: 2,
            strokeColor: '#C2E0FF',
            fillColor: colour,
            strokeOpacity: 0.7, fillOpacity: 0.8
        };
        grid.rect.setOptions(rOptions);
    }
}

// Change grid darkness
function changeGridDarkness(multiplier) {
    for (var gridpt in accidents.datpt_grid) {
        if (accidents.datpt_grid[gridpt].rect !== null) {
            colorizeGrid(accidents.datpt_grid[gridpt], multiplier);
        }
    }
}


// -----------------------------------------------  
// Circle management
// -----------------------------------------------  

// Drawn circles on the map
function addCircles() {
    var circle;
    var gridsize;
    var myLatlng;
    var ccolour;

    for (var datpt in accidents.datpt_stats) {

        // Find grid coordinates
        var gridpt = gridPtRef(datpt);
        var pointvalue = accidents.datpt_stats[datpt].point_value;
        if (pointvalue < 0)
            ccolour = "#0000FF";
        else if (pointvalue > 0)
            ccolour = "#FF0000";
        else
            ccolour = "#F6F6F6";

        // Add circles but only if not displayed
        gridsize = getDistance(
            new google.maps.LatLng(accidents.datpt_stats[datpt].grid_fromlat, accidents.datpt_stats[datpt].grid_fromlong),
            new google.maps.LatLng(accidents.datpt_stats[datpt].grid_tolat, accidents.datpt_stats[datpt].grid_tolong));
        circle = new google.maps.Circle({
            strokeColor: ccolour,
            strokeOpacity: 0.0,
            strokeWeight: 2,
            fillColor: ccolour,
            fillOpacity: 0.35,
            map: accidents.curr_map,
            clickable: false,
            zIndex: 5,
            center: new google.maps.LatLng(accidents.datpt_stats[datpt].acc_lat, accidents.datpt_stats[datpt].acc_long),
            radiusStd: Math.sqrt(Math.abs(pointvalue)) * gridsize / 250.0,
            radius: Math.sqrt(Math.abs(pointvalue)) * gridsize / 250.0
        });
        accidents.circles.push(circle);
    }
}

// Remove all circles
function removeCircles() {
  for (var i = 0; i < accidents.circles.length; i++) {
    accidents.circles[i].setMap(null);
	accidents.circles[i] = null;
  }
  accidents.circles = [];
}

// Hide all circles
function hideCircles() {
  for (var i = 0; i < accidents.circles.length; i++) {
    accidents.circles[i].setMap(null);
  }
}

// Hide all circles on a map
function showCircles(map) {
  for (var i = 0; i < accidents.circles.length; i++) {
    accidents.circles[i].setMap(map);
  }
}

// Change radius of all circles
// The initial radius calculated and stored in accidents.circles[i].radiusStd
function changeCircleRadius(scale) {
  for (var i = 0; i < accidents.circles.length; i++) {
    accidents.circles[i].setRadius(
            Math.round(accidents.circles[i].radiusStd*scale));
  }
}




// -----------------------------------------------  
// Heat map management
// -----------------------------------------------  

// Drawn heatmap on the map
function addHeatmap() {
    var heatpoint;
    var heatarray;
    var gridsize;
    var myLatlng;
    var weight;

    for (var datpt in accidents.datpt_stats) {
        // Find grid coordinates
        var gridpt = gridPtRef(datpt);
        var pointvalue = accidents.datpt_stats[datpt].point_value;

        // What if pointvalue is negative
        // Rely on a more sophisticated gradient

        gridsize = getDistance(
            new google.maps.LatLng(accidents.datpt_stats[datpt].grid_fromlat, accidents.datpt_stats[datpt].grid_fromlong),
            new google.maps.LatLng(accidents.datpt_stats[datpt].grid_tolat, accidents.datpt_stats[datpt].grid_tolong));

        // Add heat point but only if not displayed
        // Use point value for intensity to multiply data points, then use weighted points
        // public WeightedLatLng(LatLng latLng, double intensity)
        heatpoint = new google.maps.LatLng(
            accidents.datpt_stats[datpt].acc_lat, 
            accidents.datpt_stats[datpt].acc_long);
        weight = heatWeight(accidents.min_pt_value, accidents.max_pt_value, pointvalue);
        //accidents.heatpoints.push({location: heatpoint, weight: weight});
        accidents.heatpoints.push(heatpoint);
    }

    // Show heat map
    heatarray = new google.maps.MVCArray(accidents.heatpoints);
    accidents.heatmap = new google.maps.visualization.HeatmapLayer({data: heatarray});
    accidents.heatmap.setMap(accidents.curr_map);

    // Prepare heat map parameters
    // set gradient based on the min and max values, as well as the number of points
    // set radius based on the gridsize
    accidents.heatmap.set('radius', 25);
    accidents.heatmap.set('opacity', 0.7);

}

function heatWeight(min, max, val) {
    var range;
    var val;
    var weight;
    
    range = max - min;
    //weight = Math.round(Math.log(val / range * 1000));
    return 1;
}

// Remove all circles
function removeHeatmap() {
    if (accidents.heatmap !== null) accidents.heatmap.setMap(null);
    accidents.heatpoints = [];
}

// Hide all circles
function hideHeatmap() {
    if (accidents.heatmap !== null) accidents.heatmap.setMap(null);
}

// Hide all circles on a map
function showHeatmap(map) {
    if (accidents.heatmap !== null) accidents.heatmap.setMap(map);
}

// Change radius of the heatmap elements
// The initial radius calculated and stored in accidents.circles[i].radiusStd
function changeHeatmapRadius(scale) {
  accidents.heatmap.set('radius', 
    Math.round(25*scale));
}



// -----------------------------------------------  
// Framing the map
// -----------------------------------------------  

// Adds a frame around the map
function addFrame(frame, map, fromLat, fromLong, toLat, toLong) {
    return new google.maps.Rectangle({
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#000000',
        fillOpacity: 0.0,
        map: map,
        clickable: false,
        zIndex: 7,
        bounds: new google.maps.LatLngBounds(
                new google.maps.LatLng(fromLat, fromLong),
                new google.maps.LatLng(toLat, toLong))
    });
}

// Removes a frame
function removeFrame(frame) {
    if (!(typeof variable_here === 'undefined') && frame) frame.setMap(null);
    return null;
}


// -----------------------------------------------------
// Now go
// -----------------------------------------------------

// Load and display the map
function initialize() {
    initMap();
}


google.maps.event.addDomListener(window, 'load', initialize);

    