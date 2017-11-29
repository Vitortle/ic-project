/* Line Chart: a line chart
With a line chart, one bundle entry stores the values
for each series, so there's only one time entry for multiple data 
series values.
*/

function initializeLineChart(divTag){
	try{
	var mainDiv = divTag;
	var className = mainDiv.getAttribute('class');
	mainDiv.fullScreen = className && className.indexOf('fullscreen') >= 0;
	divTag.innerHTML = "<canvas width='10px' height='30px'>Not supported by this browser</canvas>";

	var canvas = mainDiv.getElementsByTagName("canvas")[0];
	var ctx = canvas.getContext('2d');

	canvas.viewMin = 0;
	canvas.viewMax = 0;
	canvas.analyzedNrEntries = 0;
	canvas.analyzedMaxValue = -10000000000;
	canvas.analyzedMinValue = 100000000000;

	var renderer = new XYPlotRenderer(canvas, ctx, mainDiv);

	canvas.draw = function draw(atTime){
	try{
		var curTime = undefined;
		if (typeof(atTime) !== "undefined")
			curTime = atTime;
		
		var e,f,val;
		canvas.width = mainDiv.offsetWidth - 2;
		canvas.height = mainDiv.offsetHeight - 2;
		ctx.clearRect(0,0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		//ctx.lineWidth = 1;
		// draw canvas title
		if(canvas.mainTitle){
			ctx.font = "bold " + (canvas.fontSize * 1.1) + "pt Tahoma";
			var titleWidth = ctx.measureText(canvas.mainTitle ).width;
			ctx.fillText(canvas.mainTitle, (canvas.width - titleWidth) / 2, canvas.fontSize *1.5);
		}

		if(!canvas.bundle || !canvas.objectList || !canvas.statList)
			return 0;

		var nrEntries = canvas.bundle.nrEntries;
		var nrFields = canvas.bundle.nrFields;
		ctx.font = canvas.fontSize + "pt Tahoma";
		var xReset = 13;
		var yInterval = canvas.fontSize * 1.3;
		var x = xReset, y = canvas.fontSize * 1.8;

		if(canvas.showLegend){
			var objectName, width;
			// draw object (color) legend
			for(f = 0; f<canvas.objectList.length; f++) {
				objectName = canvas.objectList[f];
				width = 20 + ctx.measureText(objectName).width;
				if(x + width > canvas.width){
					x = xReset;
					y += yInterval;
				}
				// draw the legend color box and the name of the object
				if (canvas.colors.length > 0)
					ctx.fillStyle = getRGBColor(canvas.colors, f);
				else
					ctx.fillStyle = getIndexedColor(f+1, [40,80], [50,80]);
				ctx.fillRect(x, y, canvas.fontSize, canvas.fontSize);
				ctx.strokeRect(pixelRound(x), pixelRound(y), canvas.fontSize, canvas.fontSize);
				ctx.fillStyle = "#000000";
				ctx.fillText(objectName, x + canvas.fontSize * 1.2, y + canvas.fontSize);
				x += width;
			}
			x = xReset;
			y += yInterval;
			yInterval += 3;
			ctx.lineWidth = 2;
			ctx.strokeStyle = "#888888";
			// draw stat (line-dash type) legend
			for(e = 0; e<canvas.statList.length; e++) {
				objectName = canvas.statList[e];
				var textWidth = ctx.measureText(objectName).width
				width = 10 + textWidth;
				if(x + width > canvas.width){
					x = xReset;
					y += yInterval;
				}
				// draw the legend texture line and the name of the stat
				renderer.setDashArray(e);
				renderer.dashedLine(x,pixelRound(y)+(canvas.fontSize * 1.4),x+textWidth,pixelRound(y)+(canvas.fontSize * 1.4));
				ctx.stroke();
				//ctx.strokeRect(pixelRound(x),pixelRound(y), 29, 10);
				ctx.fillStyle = "#000000";
				ctx.fillText(objectName, x, y + canvas.fontSize *1.2);
				x += width;
			}
			ctx.lineWidth = 1;
		}
		if(x != xReset) y += yInterval;

		// if I need to resize the canvas, then redraw it
		var headerBottom = Math.round(y + canvas.fontSize);

		if(nrEntries <= 1) {
			renderer.updateRange(0, curTime ? curTime : 1, 0, 1, 3, headerBottom, canvas.width - 8, canvas.height - headerBottom);
			renderer.drawGrid();
			return 0;
		}

		/* figure out the min and max range and domain values
		* This does a fast method by saving how far it's looked
		* on previous draws, so it only needs to look at marginally
		* added entries on subsequent draws*/
		var minTime = canvas.bundle.getValue(0,0);
		var maxTime = canvas.bundle.getValue(nrEntries-1,0);
		if (curTime > maxTime)
			maxTime = curTime;
		
		if(nrEntries < canvas.analyzedNrEntries) {
			canvas.analyzedNrEntries = 0;
			canvas.analyzedMaxValue = -10000000000;
			canvas.analyzedMinValue = 100000000000;
		}
		var minValue = canvas.analyzedMinValue;
		var maxValue = canvas.analyzedMaxValue;
		for(e = canvas.analyzedNrEntries; e < nrEntries; e++) {
			for(f = 1; f < nrFields; f++){
				val = canvas.bundle.getValue(e,f);
				if(val < minValue)
					minValue = val;
				if(val > maxValue)
					maxValue = val;
			}
		}

		canvas.analyzedNrEntries = nrEntries;
		canvas.analyzedMaxValue = maxValue;
		canvas.analyzedMinValue = minValue;

		renderer.updateRange(minTime, maxTime, minValue, maxValue, 3, headerBottom, canvas.width - 8, canvas.height - headerBottom);

		renderer.drawGrid();

		renderer.clipSortedEntries(nrEntries, function(index) {
			return canvas.bundle.getValue(index, 0);
		});

		ctx.lineWidth = 2;
		for(var f = 1; f < nrFields; f++){

			var colorindex = 0;
			if(canvas.statList.length > 1 && f%canvas.statList.length == 1) // only change color when the object changes
				colorindex = 1+Math.floor(f/canvas.statList.length);
			else if(canvas.statList.length <= 1) // only set the color at the beginning if there is only one object
				colorindex = f;
			if(colorindex > 0) {
				if (canvas.colors.length > 0)
					ctx.strokeStyle = getRGBColor(canvas.colors, colorindex -1);
				else
					ctx.strokeStyle = getIndexedColor(colorindex, [40,80], [50,80]);
			}
			var textureIndex = (f-1)%canvas.statList.length;
			renderer.setDashArray(textureIndex);

			renderer.drawSeries(nrEntries, function(index, returnPoint) {
				returnPoint.x = canvas.bundle.getValue(index,0);
				returnPoint.y = canvas.bundle.getValue(index, f)
			});
		}
		return 0;

	}catch(e){print('exception caught in linechart mainDiv.draw() '); printError(e, "linechart.js");}
	};

	// This prevents the cursor from changing to an i-beam in Chrome when clicking
	canvas.onselectstart = function () { return false; };


	mainDiv.initializeData = function initializeData(bundleHeader){
		try{
			canvas.bundle = Bundle.interpretHeader(bundleHeader);
			canvas.draw();
		}catch(e){print('exception caught in linechart mainDiv.initializeData()'); printError(e, "linechart.js");}
	};

	mainDiv.initializeTimeLegend = function initializeTimeLegend(bundleHeader,bundleData){
		try{
			var legendBundle = Bundle.interpretHeader(bundleHeader);
			legendBundle = Bundle.interpretData(bundleData, legendBundle);
			
			var nrFields = legendBundle.nrFields;
			var nrEntries = legendBundle.nrEntries;
			
			if (nrFields > 2 || nrEntries > 1) {
				canvas.statList = new Array(nrFields-2);
				for(var f=2; f<nrFields; f++)
					canvas.statList[f-2] = legendBundle.getFieldName(f);

				canvas.objectList = new Array(nrEntries-1);
				for(var e=1; e<nrEntries; e++) {
					var displayName = legendBundle.getValue(e, 1);
					canvas.objectList[e-1] = displayName.length > 0 ? displayName : legendBundle.getValue(e,0);
				}
			}
			
			if (renderer) 
				renderer.resetSlider();

			canvas.draw();
		}catch(e){print('exception caught in mainDiv.initializeTimeLegend() '); printError(e, "linechart.js");}
	};

	mainDiv.updateData = function updateData(bundleData, atTime){
		try{
			canvas.bundle = Bundle.interpretData(bundleData, canvas.bundle);
			canvas.draw(atTime);
		}catch(e){print('exception caught in linechart mainDiv.updateData() '); printError(e, "linechart.js");}
	};
	
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
			if(properties.chartType != CHART_TYPE_LINE && properties.chartType != "linechart")
				return initializeChart(this, properties, redraw);
			
			//If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
			if (properties.xAxisTitle == undefined)
				properties.xAxisTitle = mainDiv.getAttribute('data-x-axis-title') || "";
			if (properties.yAxisTitle == undefined)
				properties.yAxisTitle = mainDiv.getAttribute('data-y-axis-title') || "";
			if (properties.timeScale == undefined)
			    properties.timeScale = parseFloat(mainDiv.getAttribute('data-time-scale')) || 1;
			if (properties.dataScale == undefined)
				properties.dataScale = parseFloat(mainDiv.getAttribute('data-data-scale')) || 1;
			if (properties.showLegend == undefined)
				properties.showLegend = mainDiv.getAttribute('data-show-legend') == 'true';
			if (properties.colors == undefined)
				properties.colors = eval(mainDiv.getAttribute('data-colors')) || [];
			if (properties.fontSize == undefined)
			    properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 11;

			canvas.mainTitle = properties.title;
			canvas.showLegend = properties.showLegend;
			canvas.colors = properties.colors;
			canvas.fontSize = properties.fontSize;

			renderer.setFontSize(properties.fontSize);
			renderer.setAxisTitles(properties.xAxisTitle, properties.yAxisTitle);
			renderer.setTimeScale(properties.timeScale);
			renderer.setDataScale(properties.dataScale);
			
			if(redraw)
				canvas.draw();
		}catch(e){print('exception caught in linechart mainDiv.setProperties() '); printError(e, "linechart.js");}
	};

	//Called from dragresize.js
	mainDiv.onResize = function onResize() {
	    canvas.draw();
	}

	canvas.draw();
	window.addEventListener("resize", mainDiv.onResize, false);

	}catch(e){
		print('exception caught in initializeLineChart() '); printError(e, "linechart.js");
	}
}