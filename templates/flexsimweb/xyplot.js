
var CONNECTION_LINES = 1;
var CONNECTION_STAIR_STEP = 2;
var CONNECTION_NONE = 3;
var GANTT_CHART = 4;
function XYPlotRenderer(canvas, ctx, containerDiv, footer, footerCtx) {

	var viewPort = {
		x:0,
		y:0,
		sx:canvas.width,
		sy:canvas.height
	};

	var range = {
		xMin:0,
		xMax:0,
		xRange:0,
		yMin:0,
		yMax:0,
		yRange:0,
		xMinSnap:true,
		xMaxSnap:true,
		drawViewXMin:0,
		drawViewXMax:0,
		drawViewXRange:0
	};
	//this.scaleYToScreen = 1;
	//this.scaleXToScreen = 1;
	//var screenX0 = 0;
	var sliderMoveRect = undefined;

	if (footer == undefined) {
	    footer = canvas;
	    footerCtx = ctx;
	}

	var yGrid = null;
	var xGrid = null;
	var sliderTop = 0;
	var sliderHeight = 8;
	var yPadding = 4;
	var wrap = false;
	var wrapTime = 1;
	var timeScale = 1;
	var dataScale = 1;
	var willDrawYGrid = true;
	var fontSize = 11;
	var popupData = null;
	var redrawOnScroll = false;
	var renderer = this;

	var xAxisTitle = {
		x:0,
		y:0,
		sx:0,
		sy:0,
		text:"",
		textWidth:0,
		drawTitle:false //unless setAxisTitles is called
	};
	var yAxisTitle = {
		x:0,
		y:0,
		sx:0,
		sy:0,
		text:"",
		textWidth:0,
		drawTitle:false //unless setAxisTitles is called
	};

	this.setRedrawOnScroll = function setRedrawOnScroll(shouldRedraw) {
	    redrawOnScroll = shouldRedraw;
	}
	
	this.setFontSize = function setFontSize(size) {
	    fontSize = size;
	}
	
	this.saveViewSettings = function(settings) {
		if (range.scrollingFixedTimeWindow != undefined)
			settings.scrollingFixedTimeWindow = range.scrollingFixedTimeWindow;
	}
	this.loadViewSettings = function(settings) {
		if (settings.scrollingFixedTimeWindow != undefined) {
			range.scrollingFixedTimeWindow = settings.scrollingFixedTimeWindow;
		}
	}
     
	this.setAxisTitles = function setAxisTitles(xAxisTitleText, yAxisTitleText) {
		xAxisTitle.text= xAxisTitleText ? xAxisTitleText : "";
		yAxisTitle.text= yAxisTitleText ? yAxisTitleText : "";
		
		//measure the text width
		var oldFont = ctx.font;
		ctx.font = "bold " + fontSize * .9 + "pt Tahoma";
		if(xAxisTitle.text.length > 0) {
		    xAxisTitle.textWidth = ctx.measureText(xAxisTitle.text).width;
		    xAxisTitle.sy = fontSize + 2 * yPadding;
			xAxisTitle.drawTitle = true;
		} else {
		    xAxisTitle.sy = 0;
		}
		if(yAxisTitle.text.length > 0) {
		    yAxisTitle.textWidth = ctx.measureText(yAxisTitle.text).width;
		    yAxisTitle.sx = fontSize + 2 * yPadding;
			yAxisTitle.drawTitle = true;
		} else {
		    yAxisTitle.sx = 0;
		}
		ctx.font = oldFont;		    
	}
	
	this.drawAxisTitles = function drawAxisTitles() {
	    ctx.save();
	    footerCtx.save();
		ctx.font = "bold " + fontSize * .9 + "pt Tahoma";
		footerCtx.font = ctx.font;

		if(xAxisTitle.drawTitle) {
			//draw the x-axis title centered in its view port
			footerCtx.fillText(xAxisTitle.text, xAxisTitle.x + ( xAxisTitle.sx - xAxisTitle.textWidth ) / 2, xAxisTitle.y + fontSize + yPadding);
		}
		if(yAxisTitle.drawTitle) {
			//draw the y-axis title sideways, centered in it's view port
			ctx.rotate( 3*Math.PI/2);
			ctx.fillText(yAxisTitle.text, -yAxisTitle.y - (yAxisTitle.sy + yAxisTitle.textWidth) / 2, yAxisTitle.x + fontSize);
			ctx.rotate(-3*Math.PI/2);
		}
		footerCtx.restore();
		ctx.restore();
	};

	this.setTimeScale = function setTimeScale(scale) {
	    timeScale = scale;
	}
	
	this.setDataScale = function setDataScale(scale) {
		dataScale = scale;
	};
	
	this.setWrap = function setWrap(value) {
	    wrap = value;
	}
	
	this.setWrapTime = function setWrapTime(value) {
	    wrapTime = value;
	}
	
	this.updateViewRange = function updateViewRange() {
		if (range.xMinSnap == true) {
			range.drawViewXMin = range.xMin;
		}
		
		if (range.xMaxSnap) {
			if (range.scrollingFixedTimeWindow != undefined) {
				if (range.xMax - range.drawViewXMin > range.scrollingFixedTimeWindow)
					range.drawViewXMin = range.xMax - range.scrollingFixedTimeWindow;
			}
			range.drawViewXMax = range.xMax;
		}
		print("uvr xms " + range.xMinSnap + " xms " + range.xMaxSnap + " sftw " + range.scrollingFixedTimeWindow + " dvxm " + range.drawViewXMin)
		range.drawViewXRange = range.drawViewXMax - range.drawViewXMin;
	};
	
	this.hideYGrid = function hideYGrid() {
		willDrawYGrid = false;
	}

	this.getBottomHeight = function getBottomHeight() {
	    if (timeScale < 0)
	        return fontSize * 2.75 + sliderHeight + 2 * yPadding + xAxisTitle.sy;
	    return fontSize + sliderHeight + 2 * yPadding + xAxisTitle.sy;
	}

	this.updateRange = function updateRange(xMin, xMax, yMin, yMax, viewPortX, viewPortY, viewPortSX, viewPortSY, scrollable) {
	    try {
		range.xMin = xMin;
		range.xMax = xMax;
		range.xRange = xMax - xMin;
		range.yMin = yMin * dataScale;
		range.yMax = (yMax == 0 || yMax == undefined ? dataScale : yMax * dataScale);
		
		viewPort.y = pixelRound(viewPortY);
		viewPort.sy = Math.round(viewPortSY) - (scrollable ? 0 : this.getBottomHeight());
        
		yGrid = new YGrid(ctx, range.yMin, range.yMax, viewPort.y, viewPort.sy, 20, true);
		range.yMax = yGrid.adjustedMax;
		range.yRange = range.yMax - range.yMin;

		viewPort.x = pixelRound(viewPortX + (yMax == undefined ? 0 : yGrid.width) + yAxisTitle.sx);
		viewPort.sx = Math.round(viewPortSX - (yMax == undefined ? 0 : yGrid.width) - yAxisTitle.sx);

		if(xAxisTitle.drawTitle) {
			xAxisTitle.x = viewPort.x;
			xAxisTitle.y = footer.height - fontSize - 2*yPadding;//(yMax == 0 || yMax == undefined? 0 : viewPort.y + viewPort.sy) + fontSize + 2*yPadding + sliderHeight;
			xAxisTitle.sx = viewPort.sx;
		}
		if(yAxisTitle.drawTitle) {
			yAxisTitle.x = viewPort.x - yGrid.width - yAxisTitle.sx;
			yAxisTitle.y = viewPort.y;
			yAxisTitle.sy = viewPort.sy;
		}
		var date = new Date("1/1/1601");
		var date2 = new Date("1/1/1970");
		sliderTop = footer.height - xAxisTitle.sy - sliderHeight;

		this.updateViewRange();
		
		if (timeScale < 0) {
		    xGrid = new DateBasedGrid(ctx, range.xMin, range.xMax, range.drawViewXMin, range.drawViewXMax, viewPort.x, viewPort.sx, fontSize *2.75 + 2 * yPadding, fontSize, footerCtx);
		} else {
		    xGrid = new XGrid(ctx, range.drawViewXMin * timeScale, range.drawViewXMax * timeScale, viewPort.x, viewPort.sx, 0, fontSize, footerCtx);
		}
		}catch(e){printError(e);}
	};

	var dashArrays = [
		[20],
		[6,3],
		[6,3,1,3],
		[6,3,6,3,1,3,1,3],
		[6,3,6,3,1,3,1,3,1,3],
		[6,3,6,3,6,3,1,3,1,3,1,3],
		[6,3,6,3,6,3,1,3,1,3,1,3,1,3],
		[6,3,6,3,6,3,6,3,1,3,1,3,1,3,1,3],
		[6,3,6,3,6,3,6,3,6,3,1,3,1,3,1,3,1,3],
		[6,3,6,3,6,3,6,3,6,3,1,3,1,3,1,3,1,3,1,3]
	];

	var dashArray = dashArrays[0];
	var distAlongDash = 0;
	var dashIndex = 0;
	var dashCount = dashArray.length;
	var draw=true;
	this.setDashArray = function setDashArray(index) {
		dashArray = dashArrays[index % dashArrays.length];
		dashIndex = 0;
		distAlongDash = 0;
		dashCount = dashArray.length;
		draw = true;
	};

	this.dashedLine = function dashedLine(x,y,x2,y2) {
		ctx.moveTo(x, y);
		var dx = (x2-x), dy = (y2-y);
		var slope =  dy/(dx ? dx : 1);
		var distRemaining = Math.sqrt( dx*dx + dy*dy );
		while (distRemaining>=0.1){
			var dashLength = dashArray[dashIndex%dashCount] - distAlongDash;
			var nextDraw = draw;
			if (dashLength > distRemaining) {
				dashLength = distRemaining;
				distAlongDash += distRemaining;
			}
			else {
				dashIndex++;
				nextDraw = !draw || dashArray.length == 1;
				distAlongDash = 0;
			}
			if(dx) {
				var xStep = Math.sqrt( dashLength*dashLength / (1 + slope*slope) );
				x += xStep;
				y += slope*xStep;
			}
			else y += dashLength * (dy > 0 ? 1 : -1);
			ctx[draw ? 'lineTo' : 'moveTo'](x,y);
			distRemaining -= dashLength;
			draw = nextDraw;
		}
	};

	this.drawGrid = function drawGrid() {
		try {
			ctx.strokeStyle = "#eeeeee";
			ctx.fillStyle = "#000000";
			
			if (!yGrid || !xGrid || !yGrid.draw || !xGrid.draw)
				return 0;
			if (willDrawYGrid)
				yGrid.draw(viewPort.x, viewPort.sx);
			xGrid.draw(viewPort.y + viewPort.sy, -viewPort.sy);
	
			this.drawAxisTitles();
	
			//Draw Graph Outline
			ctx.strokeStyle = "#808080";
			ctx.strokeRect(viewPort.x, viewPort.y, viewPort.sx, viewPort.sy);
	
			var sliderBottom = sliderTop + sliderHeight;
			var slideX1 = viewPort.x + viewPort.sx * (range.drawViewXMin - range.xMin) / (range.xMax - range.xMin);
			var slideX2 = viewPort.x + viewPort.sx * (range.drawViewXMax - range.xMin) / (range.xMax - range.xMin);
			slideX2 = Math.max(slideX2, slideX1 + 25);
	
			sliderMoveRect = {
				left: pixelRound(slideX1),
				right: pixelRound(slideX2),
				top: pixelRound(sliderTop + 1),
				bottom: pixelRound(sliderBottom)
			};
			// draw slider
			footerCtx.fillStyle = "#eeeeee";
			var sliderRadius = sliderHeight / 2;
			var sliderYCenter = Math.ceil(sliderTop + sliderRadius);
			footerCtx.beginPath();
			footerCtx.arc(viewPort.x + sliderRadius, sliderYCenter, sliderRadius, Math.PI / 2, 3 * Math.PI / 2, false);
			footerCtx.arc(viewPort.x + viewPort.sx - sliderRadius, sliderYCenter, sliderRadius, -Math.PI / 2, Math.PI / 2, false);
			footerCtx.closePath();
			footerCtx.fill();
			footerCtx.fillStyle = "#d0d0d0";
			footerCtx.strokeStyle = "#aaaaaa";
			footerCtx.beginPath();
			footerCtx.arc(sliderMoveRect.left + sliderRadius, sliderYCenter, sliderRadius, Math.PI / 2, 3 * Math.PI / 2, false);
			footerCtx.arc(sliderMoveRect.right - sliderRadius, sliderYCenter, sliderRadius, -Math.PI / 2, Math.PI / 2, false);
			footerCtx.closePath();
			footerCtx.fill();
			footerCtx.strokeStyle = "#888888";
			// draw slider grabbers
			for (var l = 2; l <= 4; l++) {
				footerCtx.strokeRect(pixelRound(slideX1) + 2 * l, pixelRound(sliderTop) + 2, 0, sliderBottom - sliderTop - 5);
				footerCtx.strokeRect(pixelRound(slideX2) - 2 * l, pixelRound(sliderTop) + 2, 0, sliderBottom - sliderTop - 5);
			}
		} catch (e) { printError(e); }
	};

	var clippedEntries = null;

	// a binary search to clip the entries to the currently viewable range
	// this assumes that all the entries are sorted
	this.clipSortedEntries = function clipSortedEntries(nrEntries, callBack) {
		try{
		clippedEntries = {min:0, max:nrEntries};
		if(nrEntries == 0)
			return 0;
		var firstEntryX = callBack(0);
		if(firstEntryX < range.drawViewXMin) {
			var minEntryWindow = {min:1, max:nrEntries};
			while(minEntryWindow.max > minEntryWindow.min) {
				var testEntry = Math.floor((minEntryWindow.max + minEntryWindow.min) / 2);
				var x = callBack(testEntry);
				if(x >= range.drawViewXMin) {
					var prevX = callBack(testEntry - 1);
					if(prevX < range.drawViewXMin) {
						clippedEntries.min = testEntry - 1;
						break;
					}
					else minEntryWindow.max = testEntry;
				}
				else minEntryWindow.min = testEntry + 1;
			}
			if(minEntryWindow.max == minEntryWindow.min)
				clippedEntries.min = minEntryWindow.min;
		}

		var lastEntryX = nrEntries > 1 ? callBack(nrEntries - 2) : range.drawViewXMax;
		if(lastEntryX > range.drawViewXMax) {
			var maxEntryWindow = {min:clippedEntries.min, max:nrEntries - 1};
			while(maxEntryWindow.max > maxEntryWindow.min) {
				var testEntry = Math.floor((maxEntryWindow.max + maxEntryWindow.min) / 2);
				var x = callBack(testEntry);
				if(x > range.drawViewXMax) {
					var prevX = callBack(testEntry - 1);
					if(prevX <= range.drawViewXMax) {
						clippedEntries.max = testEntry + 1;
						break;
					}
					else maxEntryWindow.max = testEntry;
				}
				else maxEntryWindow.min = testEntry + 1;
			}
			if(maxEntryWindow.max == maxEntryWindow.min)
				clippedEntries.max = Math.min(nrEntries, maxEntryWindow.min + 2);
		}
		}catch(e){printError(e);}
	};

	this.unclipSortedEntries = function unclipSortedEntries(nrEntries, callBack) {
		clippedEntries = null;
	};

	var printOverflowError = function printOverflowError() {
		ctx.save();
		ctx.textAlign = "center";
		ctx.font = "11pt Tahoma";
		ctx.fillStyle = "#cccccc";
		ctx.fillText("Too many data points", viewPort.x + viewPort.sx / 2, viewPort.y + viewPort.sy / 2 - 8, viewPort.sx);
		ctx.fillText("Some data has been skipped", viewPort.x + viewPort.sx / 2, viewPort.y + viewPort.sy / 2 + 8, viewPort.sx);
		ctx.restore();
	}

	this.drawSeriesDots  = function drawSeriesDots(nrEntries, callBack) {
		try{
		// draw the line
		var graphBottom = viewPort.y + viewPort.sy;

		var point = {};
		var startEntry = clippedEntries ? clippedEntries.min : 0;
		var endEntry = clippedEntries ? clippedEntries.max : nrEntries;

		var drawRects = false;
		var stride = 1;
		if(endEntry - startEntry > 1000)
		{
			drawRects = true;
			if(endEntry - startEntry > 10000)
				stride = Math.ceil((endEntry - startEntry) / 10000);
			ctx.save();
			ctx.fillStyle = ctx.strokeStyle;
		}

		if(!drawRects)
			ctx.beginPath();
		for(e = startEntry; e < endEntry; e+=stride) {
			callBack(e, point);
			mx = viewPort.x + (point.x-range.drawViewXMin)*viewPort.sx/range.drawViewXRange;
			my = graphBottom - (point.y  * dataScale -range.yMin)*viewPort.sy/range.yRange;
			if(!drawRects) {
				ctx.moveTo(mx, my);
				ctx.arc(mx, my, ctx.lineWidth / 2, 0, Math.PI*2, false);
			}
			else ctx.fillRect(Math.round(mx - 1), pixelRound(my - 1), 2, 2);
		}
		if(!drawRects)
			ctx.stroke();
		else ctx.restore();

		}catch(e){printError(e);}
	}

	this.drawSeriesLines = function drawSeriesLines(nrEntries, callBack) {
		try{
		// draw the line
		ctx.beginPath();
		var graphBottom = viewPort.y + viewPort.sy;

		var point = {};
		var startEntry = clippedEntries ? clippedEntries.min : 0;
		var endEntry = clippedEntries ? clippedEntries.max : nrEntries;

		callBack(startEntry, point);
		var lx = viewPort.x + (point.x-range.drawViewXMin)*viewPort.sx/range.drawViewXRange;
		var ly = graphBottom - (point.y  * dataScale -range.yMin)*viewPort.sy/range.yRange;
		var sumY = ly;
		var sumYNr = 1;
		var sumX = lx;
		var sumXNr = 1;

		var stride = 1;
		if(endEntry - startEntry > 10000)
			stride = Math.ceil((endEntry - startEntry) / 10000);

		for(e = startEntry + 1; e < endEntry; e+=stride) {
			callBack(e, point);

			mx = viewPort.x + (point.x-range.drawViewXMin)*viewPort.sx/range.drawViewXRange;
			my = graphBottom - (point.y  * dataScale -range.yMin)*viewPort.sy/range.yRange;
			if(Math.abs(mx - lx) + Math.abs(my - ly) >= 8 || dashArray.length == 1) {
				var x = sumX / sumXNr;
				var y = sumY / sumYNr;
				this.dashedLine(lx,ly,x,y,dashArray);
				lx = x;
				ly = y;
				sumY = 0;
				sumYNr = 0;
				sumX = 0;
				sumXNr = 0;
			}
			sumY += my;
			sumYNr++;
			sumX += mx;
			sumXNr++;
		}
		this.dashedLine(lx, ly, sumX/sumXNr, sumY/sumYNr, dashArray);
		ctx.stroke();

		}catch(e){printError(e);}
	}

	this.drawSeriesStairStep = function drawSeriesStairStep(nrEntries, callBack) {
		try{
		// draw the line
		ctx.beginPath();
		var graphBottom = viewPort.y + viewPort.sy;

		var point = {};
		var startEntry = clippedEntries ? clippedEntries.min : 0;
		var endEntry = clippedEntries ? clippedEntries.max : nrEntries;

		callBack(startEntry, point);
		var lx = viewPort.x + (point.x-range.drawViewXMin)*viewPort.sx/range.drawViewXRange;
		var ly = graphBottom - (point.y * dataScale -range.yMin)*viewPort.sy/range.yRange;
		var sumY = ly;
		var sumYNr = 1;
		var sumX = lx;
		var sumXNr = 1;

		var stride = 1;
		if(endEntry - startEntry > 10000)
			stride = Math.ceil((endEntry - startEntry) / 10000);

		for(e = startEntry + 1; e < endEntry; e+=stride) {
			callBack(e, point);

			mx = viewPort.x + (point.x-range.drawViewXMin)*viewPort.sx/range.drawViewXRange;
			my = graphBottom - (point.y * dataScale -range.yMin)*viewPort.sy/range.yRange;
			if(Math.abs(mx - lx) >= 4 || dashArray.length == 1) {
				var x = sumX / sumXNr;
				var y = sumY / sumYNr;
				this.dashedLine(lx,ly,x,ly);
				this.dashedLine(x,ly,x,y);
				lx = x;
				ly = y;
				sumY = 0;
				sumYNr = 0;
				sumX = 0;
				sumXNr = 0;
			}
			sumY += my;
			sumYNr++;
			sumX += mx;
			sumXNr++;
		}
		var x = sumX/sumXNr;
		this.dashedLine(lx, ly, x, ly, dashArray);
		this.dashedLine(x, ly, x, sumY/sumYNr, dashArray);
		ctx.stroke();

		}catch(e){printError(e);}
	}
	
	this.drawGanttSegment = function drawGanttSegment(series, entrynum, legend, span, start, end, y, sy, startTime, endTime) {
	    var drawXRange = Math.max(range.drawViewXRange, 1); //Avoid divide by 0
	    var startX = Math.max(viewPort.x +0.5, viewPort.x + (start - range.drawViewXMin) * viewPort.sx / drawXRange);
	    var endX = Math.min(viewPort.x + viewPort.sx, viewPort.x + (end - range.drawViewXMin) * viewPort.sx / drawXRange);

	    var width = Math.max(Math.round(endX - startX), 1);
        
	    if (span == 0) {
			 var gradient = ctx.createLinearGradient(startX, y, startX, y + sy);
	        if (canvas.multipleSpans) {
	            var adjust = canvas.spanBarSize - canvas.barSize;
	            y += adjust * 0.5;
	        }
	        if (canvas.colors.length > 0)
	            ctx.fillStyle = getRGBColor(canvas.colors, legend - 1, 1, gradient);
	        else
	            ctx.fillStyle = getIndexedColor(legend, [40, 90], [50, 80], 1, gradient);
	    } else {
            sy = canvas.spanBarSize;
	        if (canvas.colors.length > 0)
	            ctx.fillStyle = getRGBColor(canvas.colors, legend - 1, 1, 0, 0.7);
	        else
	            ctx.fillStyle = getIndexedColor(legend, [30, 70], [80, 90], 1, 0);
	    }
		
        ctx.fillRect(Math.floor(startX) + 0.5, Math.floor(y), width, sy);
        
        if (canvas.pickCursorX > startX && canvas.pickCursorX < endX &&
            canvas.pickCursorY > y && canvas.pickCursorY < y + sy) {
	        popupData = {
	            left: startX, right: endX, top: y,
	            legend: legend, startTime: startTime, endTime: endTime,
	            series: series, legend: legend, bundleIndex: entrynum
	        };
	    }
	}

	this.drawGantt = function drawGantt(nrEntries, callBack) {
		try{
		var wrapHeight = viewPort.sy / canvas.numWraps; //if !wrap then numWraps == 1
		var diff = canvas.fontSize > canvas.totalBarSize ? (canvas.fontSize - canvas.totalBarSize) * 0.5 : 0;
		var gap = (wrapHeight + diff - canvas.totalBarSize * canvas.nrDrawnSeries) / (canvas.nrDrawnSeries + 1);
		var yInterval = gap + canvas.totalBarSize;
		
	    //Go through the each of entries and draw the bar
		popupData = null;
		var y;
		var data = {};
		var scroll = canvas.parentNode.scrollTop;
		
        //Check to see if any of the series have a span > 1, if so, we need to draw those entries first
		var cycle = 1;
		if (canvas.multipleSpans)
		    cycle = 2;
	    for (var c = 0; c < cycle; c++) {
	        for (var i = 0; i < nrEntries; i++) {
	            callBack(i, data);
                
	            var series = data.series;
	            var startTime = data.startTime;
	            var endTime = data.endTime;
	            var legend = data.legend;
	            var span = data.span;
	            var drawIndex = data.drawIndex;
				
				if (legend < 1)
					continue;

                //If there are series with a span == 1, the first cycle we'll draw all of the span == 1, then the second cycle we'll draw everything else
	            if (cycle == 2) {
	                if (c == 0) {
	                    if (span == 0)
	                        continue;
	                } else {
	                    if (span == 1)
	                        continue;
	                }
	            }

	            //Don't draw times that are greater than our modelTime (when collecting data over a defined time interval)
	            if (startTime > canvas.modelTime)
	                continue;

	            if (endTime < 0)
	                endTime = canvas.modelTime;

	            var sy = canvas.barSize;
                
	            if (wrap) {
	                var baseTime = range.xMin;
	                var offsetStartTime = startTime - baseTime;
	                var offsetEndTime = offsetEndTime - baseTime;
	                var wrapNum = Math.ceil(offsetStartTime / wrapTime);
	                var theTime = startTime;
	                var duration = endTime - startTime;
			   
	                while (duration > 0) {
	                    var left = theTime;
	                    var right = left + duration;
	                    var lastWrapNum = wrapNum;
	                    if (right > wrapTime * wrapNum + baseTime) {
	                        right = wrapTime * wrapNum + baseTime;
	                        duration -= right - left;
	                        theTime = right;
	                        wrapNum++;
	                    } else {
	                        duration = 0; //Exit the loop
	                    }
			        
	                    //Move the left and right limits to within the current wrap
	                    left = (left - (lastWrapNum - 1) * wrapTime);
	                    right = (right - (lastWrapNum - 1) * wrapTime);
			        
	                    if (right >= range.drawViewXMin && left <= (range.drawViewXMin + range.drawViewXRange)) {
	                        if (canvas.multipleSpans) {
	                            y = yInterval * drawIndex + gap + wrapHeight * (lastWrapNum - 1);
	                        } else {
	                            y = yInterval * series + gap + wrapHeight * (lastWrapNum - 1);
	                        }
							if (y + sy >= scroll && y < scroll + viewPort.sy)
								this.drawGanttSegment(series, i, legend, span, left, right, y, sy, startTime, endTime);
	                    }
	                }
	            } else {
					if (endTime >= startTime) {
						if (endTime >= range.drawViewXMin && startTime <= (range.drawViewXMin + range.drawViewXRange)) {
							if (canvas.multipleSpans) {
								y = yInterval * drawIndex + gap;
							} else {
								y = yInterval * series + gap;
							}
							if (y + sy >= scroll && y < scroll + viewPort.sy)
								this.drawGanttSegment(series, i, legend, span, startTime, endTime, y, sy, startTime, endTime);
						}
					}
	            }
	        }
		}

		//Draw lines between each wrap
		if (wrap) {
		    ctx.fillStyle = "#000000";
		    for (var i = 0; i < canvas.numWraps -1; i++) {
		        y = yInterval * canvas.nrDrawnSeries + gap + wrapHeight * i;
				if (y + sy >= scroll && y < scroll + viewPort.sx)
				   ctx.fillRect(viewPort.x, Math.floor(y) - 0.5, viewPort.sx, 1);
		    }
		}
        
		}catch(e){printError(e);}
	}

	this.getPopupData = function getPopupData() {
	    return popupData;
	}

	this.drawSeries = function drawSeries(nrEntries, callBack, connectionType, clipToGraph) {
		var shouldClip = true;
		if (clipToGraph !== undefined)
			shouldClip = clipToGraph;
	
		if (shouldClip) {
			ctx.save();
			// set the clip rectangle
			ctx.beginPath();
			this.setClipRegion();
		}
		if(!connectionType || connectionType == CONNECTION_LINES)
			this.drawSeriesLines(nrEntries, callBack);
		else if(connectionType == CONNECTION_STAIR_STEP)
			this.drawSeriesStairStep(nrEntries, callBack);
		else if(connectionType == GANTT_CHART)
			this.drawGantt(nrEntries, callBack);
		else 
			this.drawSeriesDots(nrEntries, callBack);
		
		if (shouldClip) 
			ctx.restore();
	};
	
	this.setClipRegion = function setClipRegion() {
		ctx.rect(viewPort.x, viewPort.y, viewPort.sx, viewPort.sy);
		ctx.clip();
	}

	this.resetSlider = function resetSlider() {
		range.drawViewXMin = 0;
		range.drawViewXMax = 0;
		range.xMaxSnap = true;
		range.xMinSnap = true;
	}
	
	var PICK_MODE_MOVE_SLIDER = 1;
	var PICK_MODE_SIZE_SLIDER_LEFT = 2;
	var PICK_MODE_SIZE_SLIDER_RIGHT = 3;
	var pickMode = 0;
	var nrMouseMoveRepaints = 0;

	this.onMouseMove = function onMouseMove(e){
	    try {
			if(typeof sliderMoveRect == "undefined")
				return;
			var mousePos = getMousePos(footer, e);

			footer.style.cursor = "auto";
			if( mousePos.y >= sliderMoveRect.top &&
				mousePos.y <= sliderMoveRect.bottom )
			{
				var sliderWidth = sliderMoveRect.right - sliderMoveRect.left;

				var leftEdge = sliderMoveRect.left;
				var rightEdge = leftEdge + Math.min(20, sliderWidth*0.2);
				if( mousePos.x >= leftEdge && mousePos.x <= rightEdge )
				    footer.style.cursor = "e-resize";

				rightEdge = sliderMoveRect.right;
				leftEdge = rightEdge - Math.min(20, sliderWidth*0.2);
				if( mousePos.x >= leftEdge && mousePos.x <= rightEdge )
				    footer.style.cursor = "e-resize";
			}

			if(typeof lastX == 'undefined')
				return;
			var dx = lastX - mousePos.x;

			if(dx != 0)
			{
				var startMin = range.drawViewXMin;
				var startMax = range.drawViewXMax;
				var minTime = range.xMin;
				var maxTime = range.xMax;
				var minSize = 25 * (maxTime-minTime)/viewPort.sx;
				var dPixels = -dx*(maxTime-minTime)/viewPort.sx;
				if(pickMode == PICK_MODE_MOVE_SLIDER)
				{
					range.xMinSnap = false;
					range.xMaxSnap = false;
					
					if (startMax + dPixels >= maxTime - 0.01 * range.xRange) {
						dPixels = maxTime - startMax;
						range.xMaxSnap = true;
						
					} else if (startMin + dPixels <= minTime + 0.01 * range.xRange) {
						dPixels = minTime - startMin;
						range.xMinSnap = true;
					} else {
						lastX = mousePos.x;
					}

					range.drawViewXMin += dPixels;
					range.drawViewXMax += dPixels;
				}
				else if(pickMode == PICK_MODE_SIZE_SLIDER_LEFT)
				{
					range.xMinSnap = false;
					range.scrollingFixedTimeWindow = 0.0;
					if (startMin + dPixels <= minTime + 0.01 * range.xRange) {
						dPixels = minTime - startMin;
						range.xMinSnap = true;
						delete range.scrollingFixedTimeWindow;
					} else if (startMin + dPixels >= startMax - minSize) {
						dPixels = startMax - minSize - startMin;
					} else {
						lastX = mousePos.x;
					}
					
					range.drawViewXMin += dPixels;
				}
				else if(pickMode == PICK_MODE_SIZE_SLIDER_RIGHT)
				{
					range.xMaxSnap = false;
					if (startMax + dPixels >= maxTime - 0.01 * range.xRange) {
						dPixels = maxTime - startMax;
						range.xMaxSnap = true;
					} else if (startMax + dPixels <= startMin + minSize) {
						dPixels = startMin + minSize - startMax;
					} else {
						lastX = mousePos.x;
					}
					
					range.drawViewXMax += dPixels;
				}
				if (pickMode != 0 && range.scrollingFixedTimeWindow != undefined) {
					range.scrollingFixedTimeWindow = range.drawViewXMax - range.drawViewXMin;
				}
				if(range.drawViewXMin != startMin || range.drawViewXMax != startMax)
				{
					nrMouseMoveRepaints++;
					function checkRepaint() {
						if(nrMouseMoveRepaints) {
						    nrMouseMoveRepaints = 0;
						    canvas.redraw = true;
						    canvas.draw();
						}
					}
					timeoutId = setTimeout(checkRepaint, 100);
				}
			}
		}catch(e){print('exception caught in XYPlotRenderer.onMouseMove() '); printError(e);}
	};

	this.onMouseDown = function onMouseDown(e){
	    try {
			if(typeof sliderMoveRect == "undefined")
			    return;
			var mousePos = getMousePos(footer, e);
			if( mousePos.y >= sliderMoveRect.top &&
				mousePos.y <= sliderMoveRect.bottom )
			{
			    var sliderWidth = sliderMoveRect.right - sliderMoveRect.left;

				var leftEdge = sliderMoveRect.left;
				var rightEdge = leftEdge + Math.min(20, sliderWidth * 0.2);
				if( mousePos.x >= leftEdge && mousePos.x <= rightEdge )
					pickMode = PICK_MODE_SIZE_SLIDER_LEFT;

				leftEdge = rightEdge+1;
				rightEdge = Math.max(sliderMoveRect.right - 21, sliderMoveRect.left + sliderWidth * 0.8);
				if( mousePos.x >= leftEdge && mousePos.x <= rightEdge )
					pickMode = PICK_MODE_MOVE_SLIDER;

				leftEdge = rightEdge+1;
				rightEdge = sliderMoveRect.right;
				if( mousePos.x >= leftEdge && mousePos.x <= rightEdge )
					pickMode = PICK_MODE_SIZE_SLIDER_RIGHT;

				lastX = mousePos.x;
			}

		    //For dragresize.js
			if (pickMode != 0)
			    document.ignoreMouse = true;

			return false;
		}catch(e){print('exception caught in footer.onMouseDown() '); printError(e);}
	};

	this.onMouseUp = function onMouseUp() {
	    pickMode = 0;
	    //For dragresize.js
	    document.ignoreMouse = false;
	};

	this.onMouseWheel = function onMouseWheel(e) {
	    var direction = e.wheelDelta < 0 ? -1 : 1;
	    var viewRange = range.drawViewXMax - range.drawViewXMin;
	    var totalRange = range.xMax - range.xMin;
	    if (e.shiftKey) {
	        //Horizontal Scroll
	        if (direction < 0) {
	            range.drawViewXMin -= viewRange;
	            if (range.drawViewXMin < range.xMin)
	                range.drawViewXMin = range.xMin;
	            range.drawViewXMax = range.drawViewXMin + viewRange;
	        } else {
	            range.drawViewXMax += viewRange;
	            if (range.drawViewXMax > range.xMax)
	                range.drawViewXMax = range.xMax;
	            range.drawViewXMin = range.drawViewXMax - viewRange;
	        }
	        
	        canvas.draw();

	        e.preventDefault();
	        fireFlexsimEvent("clearMouseWheel");
	    } else if (e.altKey) {
	        //Zoom
	        range.xMinSnap = false;
	        range.xMaxSnap = false;

	        var mousePos = getMousePos(canvas, e);
	        var cursorTime = totalRange * ((mousePos.x + range.drawViewXMin - viewPort.x) / viewPort.sx);
	        var leftDiff = Math.abs(cursorTime - range.drawViewXMin) / totalRange;
	        var rightDiff = Math.abs(range.drawViewXMax - cursorTime) / totalRange;
	        
	        range.drawViewXMin += direction * viewRange * leftDiff * (direction > 0 ? 0.5 : 2);
	        range.drawViewXMax -= direction * viewRange * rightDiff * (direction > 0 ? 0.5 : 2);
	        
	        if (range.drawViewXMin < range.xMin)
	            range.drawViewXMin = range.xMin;
            if (range.drawViewXMax > range.xMax)
                range.drawViewXMax = range.xMax;

	        canvas.draw();

	        e.preventDefault();
	        fireFlexsimEvent("clearMouseWheel");
	    }
	};
	
	this.getPointMapInfo = function() {
		try{
			var returnInfo = [];
			returnInfo.push(viewPort.x);
			returnInfo.push(range.drawViewXMin);
			returnInfo.push(viewPort.sx);
			returnInfo.push(range.drawViewXRange);
			
			var graphBottom = viewPort.y + viewPort.sy;
			returnInfo.push(graphBottom);
			returnInfo.push(range.yMin);
			returnInfo.push(viewPort.sy);
			returnInfo.push(range.yRange);
			
			return returnInfo;
		} catch (e) {
			return e;
		}
	};
	
	this.scroll = function scroll(e) {
	    if (redrawOnScroll)
	        canvas.draw();
	}

	footer.addEventListener("mousemove", this.onMouseMove, false);
	footer.addEventListener("mousedown", this.onMouseDown, false);
	footer.addEventListener("mouseup", this.onMouseUp, false);
	footer.addEventListener("mouseout", this.onMouseUp, false);

	var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel" //FF doesn't recognize mousewheel as of FF3.x

	if (canvas.attachEvent) //if IE (and Opera depending on user setting)
	    canvas.attachEvent("on" + mousewheelevt, this.onMouseWheel)
	else if (canvas.addEventListener) //WC3 browsers
	    canvas.addEventListener(mousewheelevt, this.onMouseWheel, false)

	canvas.parentNode.addEventListener("scroll", this.scroll, false);
		
	return this;
}
