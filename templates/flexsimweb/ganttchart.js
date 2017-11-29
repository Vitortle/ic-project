

function initializeGanttChart(divTag) {
    try {
	var mainDiv = divTag;
	var className = mainDiv.getAttribute('class');
	if(className && className.indexOf('fullscreen', 0) >= 0) {
		mainDiv.style['overflow-x'] = 'hidden';
		if(mainDiv.style.overflow)
	    	delete mainDiv.style.overflow;
	}
	
	divTag.innerHTML = "<canvas class='chartheader' width='10px' height='30px'>Not supported by this browser</canvas>\
		<div class='verticalscroll'><canvas width='10px' height='10px'></canvas></div><canvas width='10px' height='10px'></canvas>";

	var canvases = divTag.getElementsByTagName("canvas");
	var canvasHeader = canvases[0];
	var canvas = canvases[1];
	var canvasFooter = canvases[2];
	var footerCtx = canvasFooter.getContext('2d');
	var ctx = canvas.getContext('2d');
	var headerCtx = canvasHeader.getContext('2d');
	var popup = document.getElementById("flexsimpopup");
	var renderer = new XYPlotRenderer(canvas, ctx, mainDiv, canvasFooter, footerCtx);
	renderer.setRedrawOnScroll(true);
	renderer.hideYGrid();
	canvas.modelTime = 0;
	canvas.lastModelTime = 0;
	canvas.numWraps = 1;
	canvas.multipleSpans = false;

	var SPAN = 1;
	var DRAW_INDEX = 2;
	var SERIES = 0;
	var START_TIME = 1;
	var END_TIME = 2;
	var LEGEND = 3;

	var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

	mainDiv.draw = function draw() {
		try{

	    if (canvas.modelTime == canvas.lastModelTime && !canvas.redraw)
	        return;
	    
		var graphDiv = canvas.parentNode;
		canvasHeader.width = mainDiv.offsetWidth;
		headerCtx.clearRect(0, 0, canvasHeader.width, canvasHeader.height);
		footerCtx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.clearRect(0,0, canvas.width, canvas.height);
		// draw canvas title
		if(canvas.mainTitle) {
			headerCtx.font = "bold " + (canvas.fontSize * 1.1) + "pt Tahoma";
			var titleWidth = headerCtx.measureText(canvas.mainTitle ).width;
			headerCtx.fillText(canvas.mainTitle, (canvasHeader.width - titleWidth) / 2, canvas.fontSize *1.5);
		}
		
		if(!canvas.bundle)
			return 0;
		
		var nrEntries = canvas.bundle.nrEntries;
		var nrEntryLegends = canvas.entryLegend.nrEntries;
		
		if (nrEntries == 0 || canvas.modelTime == 0)
			return 0;
		
		headerCtx.font = (canvas.fontSize * 0.9) + "pt Tahoma";
		var xReset = 13;
		var barGap = Math.round(canvas.fontSize * 0.5);
		canvas.totalBarSize = canvas.multipleSpans ? Math.max(canvas.spanBarSize, canvas.barSize) : canvas.barSize;
		var yInterval = Math.round(Math.max(canvas.fontSize, canvas.totalBarSize)) + barGap;
		var x = xReset, y = Math.round(canvas.fontSize *1.8);
		
		//Resize the width in order to layout the legend
		canvas.width = graphDiv.offsetWidth - 15;

		//Draw the Legend
		if (canvas.showLegend) {
		    for (var i = 0; i < nrEntryLegends; i++) {
				var included = canvas.entryLegend.getValue(i, 1);
				if (!included) continue;
				var found = false;
				if (included == 1) {
				    //Check to see if the entry legend is displayed anywhere
				    for (var j = 0; j < nrEntries; j++) {
				        if (canvas.bundle.getValue(j, LEGEND) == i + 1) {
				            found = true;
				            break;
				        }
				    }
				} else {
                    //In the item and custom gantt chart, all entry legends are used
				    found = true;
				}
				if (found) {
					//Draw the legend color box and legend name
					var legendName = canvas.entryLegend.getValue(i, 0);
					var width = canvas.fontSize * 1.8 + headerCtx.measureText(legendName).width;
					if(x + width > canvas.width) {
						x = xReset;
						y += canvas.fontSize + barGap;
					}
					if (canvas.colors.length > 0)
						headerCtx.fillStyle = getRGBColor(canvas.colors, i, 1);
					else
						headerCtx.fillStyle = getIndexedColor(i +1, [40,80], [50,80], 1);
					headerCtx.fillRect(x,y, canvas.fontSize, canvas.fontSize);
					headerCtx.strokeRect(Math.floor(x)+0.5,Math.floor(y)+0.5, canvas.fontSize, canvas.fontSize);
					headerCtx.fillStyle = "#000000";
					headerCtx.fillText(legendName, x + canvas.fontSize * 1.2, y + canvas.fontSize);
					x += width;
				}
			}
			y += canvas.fontSize *.5;
		}
		
		// if I need to resize the header, then redraw it
		var headerBottom = Math.round(y + canvas.fontSize);
		if (headerBottom != canvasHeader.height) {
		    canvasHeader.height = headerBottom;
		    canvas.redraw = true;
			this.draw();
			return 0;
		}

		//Resize the height now that we have the legend size
		var offset = canvas.totalBarSize > canvas.fontSize ? (canvas.totalBarSize - canvas.fontSize) * .5 : 0;
		//Series with a span of 1 will not be drawn normally
		var perWrapHeight = canvas.nrDrawnSeries * yInterval;
		if (canvas.wrap && canvas.timeScale < 0) {
		    //Make sure there's room for the dates
		    ctx.font = canvas.fontSize * 0.85 + "pt Tahoma";
		    var maxHeight = ctx.measureText("Dec 30").width;
		    if (maxHeight > perWrapHeight) {
		        offset = (maxHeight - perWrapHeight) / 2;
		        perWrapHeight = maxHeight;
		    }
		}
		var graphHeight = (perWrapHeight + barGap) * canvas.numWraps;
		canvas.height = graphHeight; //Take into account bottom numbers, slider and title
		canvasFooter.height = renderer.getBottomHeight() + 5;
		canvasFooter.width = canvas.width;
		graphDiv.style.height = (Math.min(canvas.height, (mainDiv.offsetHeight - canvasHeader.height - canvasFooter.height))) + 'px';
		
		ctx.font = canvas.fontSize + "pt Tahoma";
		footerCtx.font = ctx.font;
		ctx.fillStyle = "#000000";

		//Draw all the object names
		//Figure out how much horizontal space all the object names will take up
		var maxNameWidth = 0;
		y = offset + canvas.fontSize + barGap;
		for (var i = 0; i < canvas.nrSeries; i++) {
		    if (canvas.series.getValue(i, SPAN) == 1)
		        continue;
			var objectName = canvas.series.getValue(i, 0);
			var x = 13;
			var width = ctx.measureText(objectName).width;
			ctx.fillText(objectName, x, y);
			if(x + width > maxNameWidth) 
			    maxNameWidth = x + width;
			y += yInterval;
		}
		maxNameWidth += 10;
        
		//If wrapping, draw the object names for each wrap
		if (canvas.wrap) {
		    var wrapHeight = graphHeight / canvas.numWraps;
		    //If this is date based, we'll also need to draw the date next to the object name
		    if (canvas.timeScale < 0) {
		        var offsetTime = canvas.startTime * canvas.timeMultiple * 1000 + 3600000; //Add an hour to ensure we're on the correct day
		        for (var i = 0; i < canvas.numWraps; i++) {
		            ctx.save();
		            ctx.font = canvas.fontSize * .85 + "pt Tahoma";

		            var tempDate = new Date(canvas.modelStartDateTime.getTime() + offsetTime + 604800 * 1000 * i);
		            var dateStr = (months[tempDate.getUTCMonth()] + " " + tempDate.getUTCDate());
		            var width = ctx.measureText(dateStr).width;
		            var yLoc = (i + 0.5) * wrapHeight - width *0.5;

		            ctx.translate(maxNameWidth, yLoc);
		            ctx.rotate(Math.PI / 2);
		            ctx.translate(-maxNameWidth, -yLoc);
		            ctx.fillText(dateStr, maxNameWidth, yLoc);
		            ctx.restore();
                    
		        }
                
		        maxNameWidth += canvas.fontSize;
		    }
            
		    y = offset + canvas.fontSize + barGap;
		    for (var i = 0; i < canvas.nrSeries; i++) {
		        if (canvas.series.getValue(i, SPAN) == 1)
		            continue;
		        for (var j = 1; j < canvas.numWraps; j++) {
		            var objectName = canvas.series.getValue(i, 0);
		            ctx.fillText(objectName, 13, y + j * wrapHeight);
		        }
		        y += yInterval;
		    }
		}
		
		//Draw Graph
		var graphWidth = canvas.width - maxNameWidth - 5;
		var startTime = (canvas.isTimeWindow ? canvas.bundle.getValue(0, 1) : canvas.startTime);
		var endTime = (canvas.wrap ? canvas.wrapTime + canvas.startTime : canvas.modelTime);
		renderer.updateRange(startTime, endTime, 0, undefined, maxNameWidth, 0, graphWidth, canvas.height, true);
		renderer.drawGrid();
		
		renderer.drawSeries(nrEntries, function(index, data) {
				data.series = canvas.bundle.getValue(index, SERIES) -1;
				data.startTime = canvas.bundle.getValue(index, START_TIME);
				data.endTime = canvas.bundle.getValue(index, END_TIME);
				data.legend = canvas.bundle.getValue(index, LEGEND);
				data.span = canvas.series.getValue(data.series, SPAN);
				data.drawIndex = canvas.series.getValue(data.series, DRAW_INDEX) -1;
		    }, GANTT_CHART);

        //Draw the top and bottom of the graph
		headerCtx.fillStyle = "#808080";
		headerCtx.fillRect(Math.floor(maxNameWidth) + 0.5, Math.floor(headerBottom) - 0.5, graphWidth, 1);
		footerCtx.fillStyle = "#808080";
		footerCtx.fillRect(Math.floor(maxNameWidth) + 0.5, 0, graphWidth, 1);

        //Display popup if needed
		if (canvas.pickMode) {
			if (popup != null) {
			    var popupData = renderer.getPopupData();
			    if (popupData) {
			        popup.style.display = "block";
			        var startTime = popupData.startTime.toFixed(2);
			        var endTime = popupData.endTime.toFixed(2);
			        var duration = (endTime - startTime).toFixed(2);
			        if (canvas.wrap && canvas.timeScale < 0) {
			            var startSec = (popupData.startTime) * canvas.timeMultiple;
			            var endSec = (popupData.endTime) * canvas.timeMultiple;
			            //Convert to date
			            var startDate = new Date(canvas.modelStartDateTime.getTime() + startSec * 1000);
			            var endDate = new Date(canvas.modelStartDateTime.getTime() + endSec * 1000);
			            var startHour = startDate.getUTCHours();
			            var startMin = startDate.getUTCMinutes();
			            var startSecond = startDate.getUTCSeconds();
			            var endHour = endDate.getUTCHours();
			            var endMin = endDate.getUTCMinutes();
			            var endSecond = endDate.getUTCSeconds();
			            startTime = ((startHour < 10 ? ("0" + startHour) : startHour) + ":" + (startMin < 10 ? ("0" + startMin) : startMin)
                                    + ":" + (startSecond < 10 ? ("0" + startSecond) : startSecond)
                                        + " " + months[startDate.getUTCMonth()] + " " + startDate.getUTCDate());
			            endTime = ((endHour < 10 ? ("0" + endHour) : endHour) + ":" + (endMin < 10 ? ("0" + endMin) : endMin)
                                    + ":" + (endSecond < 10 ? ("0" + endSecond) : endSecond)
                                        + " " + months[endDate.getUTCMonth()] + " " + endDate.getUTCDate());
                        //Calculate Duration
			            var mSecsBetween = endDate - startDate;
			            var secondMs = 1000;
			            var minuteMs = 60 * secondMs;
			            var hourMs = 60 * minuteMs;
			            var dayMs = 24 * hourMs;
			            var days = Math.floor(mSecsBetween / dayMs);
			            mSecsBetween -= days * dayMs;
			            var hours = Math.floor(mSecsBetween / hourMs);
			            mSecsBetween -= hours * hourMs;
			            var minutes = Math.floor(mSecsBetween / minuteMs);
			            mSecsBetween -= minutes * minuteMs;
			            var seconds = Math.floor(mSecsBetween / secondMs);
			            
			            duration = (days > 0 ? days + " Day" + (days > 1 ? "s" : "") + " " : "") + (hours < 10 ? "0" + hours : hours) + ":" +
                                    (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
			        }
			        popup.innerHTML = canvas.entryLegend.getValue(popupData.legend -1, 0) + ": " + startTime + " - " + endTime + " (" + duration + ")";
			        var scrollPos = windowScrollPos();
			        var pos = findDocumentPos(canvas);
			        popup.style.left = (pos[0] - scrollPos.left + (popupData.left + popupData.right - popup.offsetWidth) / 2) + 'px';
			        popup.style.top = (pos[1] - scrollPos.top - canvas.parentNode.scrollTop + popupData.top - popup.offsetHeight - 2) + 'px';
			    }
			    else popup.style.display = "none";
			}
		}
		canvas.lastModelTime = canvas.modelTime;
		canvas.redraw = false;
		
		}catch(e) {print('exception caught in ganttchart mainDiv.draw() '); printError(e, "ganttchart.js");}
	}

	mainDiv.initializeData = function initializeData(dataHeader, seriesHeader, legendHeader) {
		try{
		    canvas.bundle = Bundle.interpretHeader(dataHeader);
		    canvas.series = Bundle.interpretHeader(seriesHeader);
		    canvas.entryLegend = Bundle.interpretHeader(legendHeader);

		    if (renderer)
		        renderer.resetSlider();

		    this.draw();
		}catch(e) {print('exception caught in ganttchart canvas.initializeData() '); printError(e, "ganttchart.js");}
	}
    
	mainDiv.updateSeries = function updateSeries(series) {
	    canvas.series = Bundle.interpretData(series, canvas.series);
	    canvas.nrSeries = canvas.series.nrEntries;
	    canvas.redraw = true;
	    //Check to see if any series have a span == 1
	    canvas.nrDrawnSeries = 0;
	    for (var i = 0; i < canvas.nrSeries; i++) {
	        if (canvas.series.getValue(i, SPAN) == 1) {
	            canvas.multipleSpans = true;
	        } else {
	            canvas.nrDrawnSeries++;
	        }
	    }
	}

	mainDiv.updateEntryLegend = function updateEntryLegend(entryLegend) {
	    canvas.entryLegend = Bundle.interpretData(entryLegend, canvas.entryLegend);
	    canvas.redraw = true;
	}

	mainDiv.updateData = function updateData(bundleData, modelTime) {
		try{
			canvas.bundle = Bundle.interpretData(bundleData, canvas.bundle);
			canvas.modelTime = modelTime;
			canvas.numWraps = Math.max((canvas.wrap ? Math.ceil((canvas.modelTime - canvas.startTime) / canvas.wrapTime) : 1), 1);
			this.draw();
		}catch(e) {print('exception caught in ganttchart canvas.updateData() '); printError(e, "ganttchart.js");}
	}
	
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

	Date.prototype.stdTimezoneOffset = function () {
	    var jan = new Date(this.getFullYear(), 0, 1);
	    var jul = new Date(this.getFullYear(), 6, 1);
	    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
	}

	Date.prototype.dst = function () {
	    return this.getTimezoneOffset() < this.stdTimezoneOffset();
	}

	mainDiv.setProperties = function setProperties(properties, redraw) {
		try{
			if(properties.chartType != CHART_TYPE_GANTT && properties.chartType != "gantt")
			    return 0;

			//If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
			if (properties.colors == undefined)
			    properties.colors = eval(mainDiv.getAttribute('data-colors')) || [];
			if (properties.fontSize == undefined)
			    properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 11;
			if (properties.barSize == undefined)
			    properties.barSize = parseFloat(mainDiv.getAttribute('data-bar-size')) || 12;
			if (properties.xAxisTitle == undefined)
			    properties.xAxisTitle = mainDiv.getAttribute('data-x-axis-title') || "";
			if (properties.timeScale == undefined)
			    properties.timeScale = parseFloat(mainDiv.getAttribute('data-time-scale')) || 1;
			if (properties.showLegend == undefined)
				properties.showLegend = mainDiv.getAttribute('data-show-legend') == 'true';
			if (properties.wrap == undefined)
				properties.wrap = mainDiv.getAttribute('data-wrap') == 'true';
			if (properties.wrapTime == undefined)
				properties.wrapTime = parseFloat(mainDiv.getAttribute('data-wrap-time')) || 1;
			if (properties.startTime == undefined)
				properties.startTime = parseFloat(mainDiv.getAttribute('data-start-time')) || 0;
			if (properties.modelStartDateTime == undefined)
			    properties.modelStartDateTime = parseFloat(mainDiv.getAttribute('data-model-start-date-time')) || 0;
			if (properties.isTimeWindow == undefined)
			    properties.isTimeWindow = parseFloat(mainDiv.getAttribute('data-is-time-window')) || 0;
			if (properties.timeMultiple == undefined)
			    properties.timeMultiple = parseFloat(mainDiv.getAttribute('data-time-multiple')) || 1;
            if (properties.spanBarSize == undefined)
                properties.spanBarSize = parseFloat(mainDiv.getAttribute('data-span-bar-size')) || 18;

			canvas.mainTitle = properties.title;
			canvas.colors = properties.colors;
			canvas.fontSize = properties.fontSize;
			canvas.barSize = properties.barSize;
			canvas.showLegend = properties.showLegend;
			canvas.wrap = properties.wrap;
			canvas.wrapTime = Math.max(properties.wrapTime, 1);
			canvas.startTime = properties.startTime;
			canvas.isTimeWindow = properties.isTimeWindow;
			canvas.timeScale = properties.timeScale;
			canvas.spanBarSize = properties.spanBarSize;

		    //The model start date and time is in seconds since 1/1/1601, convert to 1/1/1970
			var date = new Date(Date.UTC(1601, 0, 1, 0, 0, 0, 0) + properties.modelStartDateTime * 1000);
			canvas.modelStartDateTime = date;
			/*if (properties.modelStartDateTime > 0) {
				var date1601 = new Date("01/01/1601");
				canvas.modelStartDateTime = new Date(date1601.getTime() + properties.modelStartDateTime * 1000);
				if (canvas.modelStartDateTime.dst()) { //If we're in daylight savings time, we need to subtract an hour
					var hours = canvas.modelStartDateTime.getHours();
					canvas.modelStartDateTime.setHours(hours - 1);
				}
				print(canvas.modelStartDateTime.dst() + " ");
				print(canvas.modelStartDateTime + " ");
			}
			*/
			canvas.timeMultiple = properties.timeMultiple; //We need to be able to convert the time data in our bundle to date/times
			
            //If timeScale < 0, then we're using a date based time scale
			renderer.setTimeScale(properties.timeScale);
			renderer.setFontSize(properties.fontSize);
			renderer.setAxisTitles(properties.xAxisTitle, "");
            renderer.setWrap(canvas.wrap);
            renderer.setWrapTime(canvas.wrap ? canvas.wrapTime : 1);
			
			canvas.redraw = redraw;
			if(redraw)
				this.draw();
		}catch(e) {print('exception caught in ganttchart canvas.updateData() '); printError(e, "ganttchart.js");}
	}
	
	canvas.onMouseMove = function onMouseMove(e) {
		canvas.pickMode = PICK_MODE_HOVER;
		setMouseOffsets(e);
		canvas.pickCursorX = e.offsetX;
		canvas.pickCursorY = e.offsetY;
		canvas.redraw = true;
		mainDiv.draw();
		canvas.pickMode = 0;
	}

	canvas.onMouseUp = function onMouseUp(e) {
	    if (window.validFireFlexsimEvent) {
	        var popupData = renderer.getPopupData();
	        if (popupData) {
	            var LEFT_RELEASE = 3;
	            fireFlexsimEvent("clickCallback", LEFT_RELEASE, popupData.series +1, popupData.legend, popupData.bundleIndex);
            }
	    }
	}
	canvas.onMouseDown = function onMouseDown(e) {
	    if (window.validFireFlexsimEvent) {
	        var popupData = renderer.getPopupData();
	        if (popupData) {
	            var LEFT_PRESS = 2;
	            fireFlexsimEvent("clickCallback", LEFT_PRESS, popupData.series +1, popupData.legend, popupData.bundleIndex);
	        }
	    }
	}

	canvas.draw = function draw() {
	    canvas.redraw = true;
	    mainDiv.draw();
	}

	canvasFooter.onMouseMove = function onMouseMove(e) {
	    canvas.redraw = true;
	    mainDiv.draw();
	}

    //Called from dragresize.js
	mainDiv.onResize = function onResize() {
		canvas.redraw = true; 
		mainDiv.draw();
	}
	
	mainDiv.onselectstart = function () { return false; };

	canvas.addEventListener("mousemove", canvas.onMouseMove, false);
	canvasFooter.addEventListener("mousemove", canvasFooter.onMouseMove, false);
	canvas.addEventListener("mouseout", function onMouseOut() {if(popup!=null) {popup.style.display="none"}}, false);
	canvas.addEventListener("mouseup", canvas.onMouseUp, false);
	canvas.addEventListener("mousedown", canvas.onMouseDown, false);

	mainDiv.draw();
	window.addEventListener("resize", mainDiv.onResize, false);

	}catch(e) {
		print('exception caught in initializeGanttChart() '); printError(e, "ganttchart.js");
	}
}