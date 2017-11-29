/* Time Plot: a time plot is a plot with the x-axis being time
The time plot's data is based on each series having its own bundle, i.e.
each series data point has its own time value associated with it. 
This is unlike the line chart where one bundle entry stores the values
for each series, so there's only one time entry for multiple data 
series values.
*/
function initializeTimePlot(divTag) {
	try{
	var mainDiv = divTag;
	var className = mainDiv.getAttribute('class');
	mainDiv.fullScreen = className && className.indexOf('fullscreen') >= 0;
	divTag.innerHTML = "<canvas width='10px' height='30px'>Not supported by this browser</canvas>";

	var canvas = mainDiv.getElementsByTagName("canvas")[0];
	var ctx = canvas.getContext('2d');

	var dataSeries = [];
	var connected = true;
	
	var renderer = new XYPlotRenderer(canvas, ctx, mainDiv);

	var curTime = 0;
	
	canvas.draw = function draw(atTime) {
	try{
	    if (atTime != undefined)
	        curTime = atTime;
		var e,f,val;
		if (mainDiv.offsetWidth == 0) {
			var width = mainDiv.style.width;
			if (width.substring(width.length - 2, width.length) == "px")
				width = width.substring(0, width.length - 2);
			canvas.width = width - 2;
		} else {
			canvas.width = mainDiv.offsetWidth - 2;
		}
		if (mainDiv.offsetHeight == 0) {
			var height = mainDiv.style.height;
			if (height.substring(height.length - 2, height.length) == "px")
				height = height.substring(0, height.length - 2);
			canvas.height = height;
		} else {
			canvas.height = mainDiv.offsetHeight - 2;
		}
	
		ctx.clearRect(0,0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		//ctx.lineWidth = 1;
		// draw canvas title
		if(canvas.mainTitle){
			ctx.font = "bold " + (canvas.fontSize * 1.1) + "pt Tahoma";
			var titleWidth = ctx.measureText(canvas.mainTitle ).width;
			ctx.fillText(canvas.mainTitle, (canvas.width - titleWidth) / 2, 18);
		}

		if(dataSeries.length == 0)
			return 0;

		ctx.font = canvas.fontSize + "pt Tahoma";
		var xReset = 13;
		var yInterval = 18;
		var x = xReset, y = 25;

		if(canvas.showLegend){
			var objectName, width;
			// draw object (color) legend
			for(var i = 0; i < dataSeries.length; i++) {
				objectName = dataSeries[i].name;
				width = 20 + ctx.measureText(objectName).width;
				if(x + width > canvas.width){
					x = xReset;
					y += yInterval;
				}
				// draw the legend color box and the name of the object
				if (canvas.colors.length > 0)
					ctx.fillStyle = getRGBColor(canvas.colors, i, 1);
				else
					ctx.fillStyle = getIndexedColor(i+1, [40,80], [50,80]);
				ctx.fillRect(x,y, 10, 10);
				ctx.strokeRect(pixelRound(x),pixelRound(y), 10, 10);
				ctx.fillStyle = "#000000";
				ctx.fillText(objectName, x + 15, y + 10);
				x += width;
			}
		}
		if(x != xReset) y += yInterval;

		// if I need to resize the canvas, then redraw it
		var headerBottom = y;

		/* figure out the min and max range and domain values
		* This does a fast method by saving how far it's looked
		* on previous draws, so it only needs to look at marginally
		* added entries on subsequent draws*/
		var minTime = 10000000000;
		var maxTime = -100000000000;
		var minY = 10000000000;
		var maxY = -10000000000;
		for(var i = 0; i < dataSeries.length; i++) {
			var series = dataSeries[i];
			if (series.bundle.nrEntries == 0)
				continue;
			for(var j = series.analyzedNrEntries; j < series.bundle.nrEntries; j++) {
				var y = series.bundle.getValue(j, 1);
				if(y < series.analyzedMinY) series.analyzedMinY = y;
				if(y > series.analyzedMaxY) series.analyzedMaxY = y;
			}
			series.analyzedNrEntries = series.bundle.nrEntries;
			if(series.analyzedMinY < minY) minY = series.analyzedMinY;
			if(series.analyzedMaxY > maxY) maxY = series.analyzedMaxY;
			var seriesMinTime = series.bundle.getValue(0, 0);
			if(seriesMinTime < minTime) minTime = seriesMinTime;
			var seriesMaxTime = series.bundle.getValue(series.bundle.nrEntries - 1, 0);
			if(seriesMaxTime > maxTime) maxTime = seriesMaxTime;
		}
		if (curTime > 0 && maxTime < curTime)
		    maxTime = curTime;

		renderer.updateRange(minTime, maxTime, minY, maxY, 3, headerBottom, canvas.width - 8, canvas.height - headerBottom);
		renderer.drawGrid();
		ctx.lineWidth = 2;
		for(var i = 0; i < dataSeries.length; i++){
			if (canvas.colors.length > 0)
				ctx.strokeStyle = getRGBColor(canvas.colors, i, 1);
			else
				ctx.strokeStyle = getIndexedColor(i + 1, [40,80], [50,80]);
			var seriesBundle = dataSeries[i].bundle;
			var numEntries = seriesBundle.nrEntries;
			var type = dataSeries[i].connectionType;
			if (type == CONNECTION_STAIR_STEP || (type == CONNECTION_LINES && seriesBundle.nrFields > 2) && curTime > 0)
			    numEntries++;
			renderer.clipSortedEntries(numEntries, function (index) {
			    if (index < seriesBundle.nrEntries)
			        return seriesBundle.getValue(index, 0);
			    else {
			        var time = seriesBundle.getValue(seriesBundle.nrEntries - 1, 0);
			        if (curTime > time)
			            time = curTime;
			        return time;
			    }
			});

			if (numEntries > 0) {
				renderer.drawSeries(numEntries, function (index, returnPoint) {
					if (index < seriesBundle.nrEntries) {
						returnPoint.x = seriesBundle.getValue(index, 0);
						returnPoint.y = seriesBundle.getValue(index, 1);
					} else {
						var lastEntryTime = seriesBundle.getValue(seriesBundle.nrEntries - 1, 0);
						returnPoint.x = seriesBundle.getValue(seriesBundle.nrEntries - 1, 0);
						if (curTime > lastEntryTime)
							returnPoint.x = curTime;
						else returnPoint.x = lastEntryTime;
						returnPoint.y = seriesBundle.getValue(seriesBundle.nrEntries - 1, 1);
						if (seriesBundle.nrFields > 2 && type == CONNECTION_LINES && curTime > lastEntryTime)
							returnPoint.y += seriesBundle.getValue(seriesBundle.nrEntries - 1, 2) * (curTime - lastEntryTime);
					}
				}, dataSeries[i].connectionType);
			}
		}
		return 0;

	}catch(e){print('exception caught in timeplot canvas.draw() '); printError(e, "timeplot.js");}
	};

	// This prevents the cursor from changing to an i-beam in Chrome when clicking
	canvas.onselectstart = function () { return false; };

	mainDiv.resetDataSeries = function resetDataSeries() {
		dataSeries = [];
		if (renderer) 
			renderer.resetSlider();
	};

	mainDiv.addDataSeries = function addDataSeries(seriesName, newBundle){
		try{
			dataSeries.push({
				name:seriesName,
				bundle:Bundle.interpretHeader(newBundle),
				analyzedNrEntries:0,
				analyzedMaxY:0,
				analyzedMinY:0
			});
		}catch(e){print('exception caught in timeplot mainDiv.addDataSeries()'); printError(e, "timeplot.js");}
	};
	mainDiv.updateDataSeries = function updateDataSeries(index, newBundle, connectionType){
	    try {
			if(index >= dataSeries.length)
				return 0;
			dataSeries[index].bundle = Bundle.interpretData(newBundle, dataSeries[index].bundle);
			dataSeries[index].connectionType = connectionType;
		}catch(e){print('exception caught in timeplot mainDiv.updateDataSeries()'); printError(e, "timeplot.js");}
	};
	mainDiv.draw = function(atTime) {canvas.draw(atTime); }

	mainDiv.saveViewSettings = function()
	{
		var settings = {};
		renderer.saveViewSettings(settings);
		return JSON.stringify(settings);
	}
	mainDiv.loadViewSettings = function(settingsStr)
	{
		var settings = JSON.parse(settingsStr);
		renderer.loadViewSettings(settings);
	}
	
	mainDiv.setProperties = function setProperties(properties, redraw){
	    try{
			if(properties.chartType != CHART_TYPE_TIME_PLOT && properties.chartType != "timeplot")
				return initializeChart(this, properties, redraw);
				
			//If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
			if (properties.xAxisTitle == undefined)
				properties.xAxisTitle = mainDiv.getAttribute('data-x-axis-title') || "";
			if (properties.yAxisTitle == undefined)
				properties.yAxisTitle = mainDiv.getAttribute('data-y-axis-title') || "";
			if (properties.timeScale == undefined)
			    properties.timeScale = parseFloat(mainDiv.getAttribute('data-time-scale')) || 1;
			if (properties.showLegend == undefined)
				properties.showLegend = mainDiv.getAttribute('data-show-legend') == 'true';
			if (properties.fontSize == undefined)
			    properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 10;
			if (properties.dataScale == undefined)
				properties.dataScale = parseFloat(mainDiv.getAttribute('data-data-scale')) || 1;
			if (properties.colors == undefined)
			    properties.colors = eval(mainDiv.getAttribute('data-colors')) || [];
			
			canvas.mainTitle = properties.title;
			canvas.showLegend = properties.showLegend;
			canvas.fontSize = properties.fontSize;
			canvas.colors = properties.colors;

			renderer.setAxisTitles(properties.xAxisTitle, properties.yAxisTitle);
			renderer.setTimeScale(properties.timeScale);
			renderer.setDataScale(properties.dataScale);

			if(redraw)
				canvas.draw();
		}catch(e){print('exception caught in timeplot mainDiv.setProperties() '); printError(e, "timeplot.js");}
	};

    //Called from dragresize.js
	mainDiv.onResize = function onResize() {
	    canvas.draw();
	}

	canvas.draw();
	window.addEventListener("resize", mainDiv.onResize, false);

	}catch(e){
		print('exception caught in initializeLineChart() '); printError(e, "timeplot.js");
	}
}