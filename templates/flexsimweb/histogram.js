
function initializeTimeSeriesHistogram(mainDiv) {
	try{
	var className = mainDiv.getAttribute('class');
	mainDiv.fullScreen = className && className.indexOf('fullscreen') >= 0;
	mainDiv.innerHTML = "<canvas width='10px' height='30px'>Not supported by this browser</canvas>";

	var canvas = mainDiv.getElementsByTagName("canvas")[0];
	var ctx = canvas.getContext('2d');
	var minY = 0, maxY = 0, histoMinY = 0, histoMaxY = 0, regenBuckets = true, nrBuckets = 10,
			timeWeighted = false, bucketWidth = 0, maxBucketSY = 0, gridMaxY = 0;

	var dataSeries = [];
	var xGrid = null, yGrid = null;
	var yGridLastSY = -1;
	var graphLeft = 0, graphRight = 0, graphWidth = 0;
	var graphTop = 0, graphBottom = 0, graphHeight = 0;
	var pickMode = 0;
	var pickAtts = {};
	var normalize = 0, regenGrids = false;


	canvas.checkAdjustExtents = function checkAdjustExtents(series, y, bucketSY)
	{
	    if (y < minY) {
	        if (y < histoMinY || maxY == minY)
	            regenBuckets = true;
	        minY = y;
	    }
	    if (y > maxY) {
            if (y > histoMaxY || maxY == minY)
	            regenBuckets = true;
	        maxY = y;
	    }
	    if (bucketSY > series.largestBucket) {
	        series.largestBucket = bucketSY;
	        if (series.largestBucket > maxBucketSY)
	            maxBucketSY = series.largestBucket;
	    }
	}

	canvas.addEntryToHistogram = function addEntryToHistogram(series, entryNum,
        subtract/*optional boolean to "remove" the entry, i.e. subtract what was added*/,
        endTime/*optional explicit endTime*/)
	{
	    var multiplier = subtract ? -1.0 : 1.0;
	    var bundle = series.bundle;
	    var isKineticLevel = series.isKineticLevel;
		var y = bundle.getValue(entryNum, 1) * canvas.dataScale;
		var rate = isKineticLevel ? bundle.getValue(entryNum, 2) * canvas.dataScale : 0;
		var bucketNum = Math.floor((y - histoMinY) / bucketWidth);
		if (endTime == undefined && series.timeWeighted)
		    endTime = bundle.getValue(entryNum + 1, 0);
		if (rate == 0) {
			var weight = (series.timeWeighted ? endTime - bundle.getValue(entryNum, 0) : 1) * multiplier;
			series.buckets[bucketNum] += weight;
			series.sumWeight += weight;
			canvas.checkAdjustExtents(series, y, series.buckets[bucketNum]);
		} else if (series.timeWeighted) {
		    var curTime = bundle.getValue(entryNum, 0);
			while (curTime < endTime) {
			    var bucketEdgeVal = histoMinY + (bucketNum + (rate > 0 ? 1 : 0)) * bucketWidth;
				var timeAtBucketEdge = curTime + (bucketEdgeVal - y) / rate;
				var timeInBucket = Math.min(timeAtBucketEdge, endTime) - curTime;
				series.buckets[bucketNum] += timeInBucket * multiplier;
				series.sumWeight += timeInBucket * multiplier;
				canvas.checkAdjustExtents(series, y + 0.5 * timeInBucket * rate, series.buckets[bucketNum]);
				curTime = timeAtBucketEdge;
				bucketNum += (rate > 0 ? 1 : -1);
				y += rate * timeInBucket;
			}
		}
	}

	canvas.applySeriesLastEntryToHisto = function applySeriesLastEntryToHisto(series, curTime)
	{
	    var endEntry = series.bundle.nrEntries - 1;
	    if (endEntry >= 0 && curTime != undefined && curTime > series.lastUpdateTime) {
	        var lastEndEntry = series.analyzedNrEntries;
	        var lastEndEntryTime = series.bundle.getValue(lastEndEntry, 0);
	        if (series.lastUpdateTime > lastEndEntryTime) {
	            // subtract off the last entry time that was added (I'm going to add it on again)
	            canvas.addEntryToHistogram(series, lastEndEntry, true, series.lastUpdateTime)
	        }
	        canvas.addEntryToHistogram(series, endEntry, false, curTime)
	        series.lastUpdateTime = curTime;
	    }
	}

	var regenerateBuckets = function regenerateBuckets() {
		if(nrBuckets == 0 || dataSeries.length == 0)
			return 0;
		var range = (maxY - minY);
		var originalMaxY = maxY;
		var originalMinY = minY;
		histoMaxY = maxY + 0.1*range;
		histoMinY = minY - 0.1*range;
		if(minY >= 0 && histoMinY < 0)
		    histoMinY = 0;
		bucketWidth = (histoMaxY - histoMinY) / nrBuckets;
		if (bucketWidth == 0)
		    bucketWidth = 1;
		maxBucketSY = 0;
		regenBuckets = false;
		for(var i = 0; i < dataSeries.length; i++) {
			var series = dataSeries[i];
			series.buckets = [];
			series.largestBucket = 0;
			series.sumWeight = 0;
			var oldLastUpdateTime = series.lastUpdateTime;
			series.lastUpdateTime = 0;
			for(var j = 0; j < nrBuckets; j++)
				series.buckets.push(0);

			var bundle = series.bundle;
			var isKineticLevel = series.timeWeighted && bundle.nrFields > 2;
			var endEntry = bundle.nrEntries;
			if (series.timeWeighted)
			    endEntry--;
			for (var j = 0; j < endEntry; j++) {
			    canvas.addEntryToHistogram(series, j);
			}
			series.analyzedNrEntries = endEntry;
            if (series.timeWeighted)
			    canvas.applySeriesLastEntryToHisto(series, oldLastUpdateTime);
		}
		if (histoMaxY == histoMinY && maxBucketSY > 0)
		    histoMaxY = histoMinY + nrBuckets;
		if (originalMaxY != maxY || originalMinY != minY)
		    regenerateBuckets();
		regenGrids = true;
	}

	canvas.draw = function drawHistogram(){
	try{
		var e,f,val;
		canvas.width = mainDiv.offsetWidth - 2;
		canvas.height = mainDiv.offsetHeight - 2;
		ctx.clearRect(0,0, canvas.width, canvas.height);
		ctx.lineWidth = 1;
		//ctx.lineWidth = 1;
		// draw canvas title
		if(canvas.mainTitle){
			ctx.font = "bold " + (canvas.fontSize * 1.1) + "pt Tahoma";
			var titleWidth = ctx.measureText(canvas.mainTitle).width;
			ctx.fillText(canvas.mainTitle, (canvas.width - titleWidth) / 2, 18);
		}

		if(dataSeries.length == 0)
			return 0;

		if (regenBuckets || (histoMaxY - histoMinY <= 0 && maxBucketSY > 0))
			regenerateBuckets();

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
					ctx.fillStyle = dataSeries.length <= 1 ?  "#99aadd" : getIndexedColor(i+1, [40,80], [50,80]);
				ctx.fillRect(x,y, 10, 10);
				ctx.strokeRect(pixelRound(x),pixelRound(y), 10, 10);
				ctx.fillStyle = "#000000";
				ctx.fillText(objectName, x + 15, y + 10);
				x += width;
			}
		}
		if(x != xReset) y += yInterval;
		y += 5;

		if(maxBucketSY <= 0 || histoMaxY - histoMinY <= 0)
			return 0;  

		// if I need to resize the canvas, then redraw it
		var headerBottom = y;
		graphBottom = canvas.height - 23;
		graphTop = y;
		graphHeight = graphBottom - y;

		var tempGridSY = maxBucketSY;
		if(normalize) {
			tempGridSY = 0;
			for(var i = 0; i < dataSeries.length; i++) {
				var percent = dataSeries[i].largestBucket / dataSeries[i].sumWeight;
				if(percent > tempGridSY)
					tempGridSY = percent;
			}
		}

		if(yGridLastSY != tempGridSY || regenGrids || normalize) {
			regenGrids = true;
			yGridLastSY = tempGridSY;
			yGrid = new YGrid(ctx, 0, tempGridSY, y, graphHeight, 20, true);
			gridMaxY = yGrid.adjustedMax;
		}
		graphLeft = 18 + yGrid.width;
		graphWidth = canvas.width - 5 - graphLeft;
		graphRight = graphLeft + graphWidth;

		if(regenGrids)
			xGrid = new XGrid(ctx, histoMinY, histoMaxY, graphLeft, graphWidth, 0);

		regenGrids = false;
		ctx.save();
		ctx.translate(13, graphBottom - graphHeight/2);
		ctx.rotate(-Math.PI/2);
		ctx.font = "bold " + canvas.fontSize + "pt Tahoma";
		ctx.textAlign = "center";
		ctx.fillText("Frequency", 0,0);
		ctx.restore();

		var bucketPixelWidth = graphWidth / nrBuckets;
		var bucketSeriesMargin = dataSeries.length > 1 ? Math.min(5, bucketPixelWidth * 0.15) : 0;
		var bucketSeriesWidth = (bucketPixelWidth - 2*bucketSeriesMargin) / dataSeries.length;

		if(dataSeries.length > 1) {
			ctx.fillStyle = "#f6f6f6";
			var x = graphLeft;
			for(var i = 1; i < nrBuckets; i+=2) {
				var x = graphLeft + i*bucketPixelWidth;
				ctx.fillRect(x, graphTop, bucketPixelWidth, graphHeight);
			}
			ctx.fillStyle = "black";
		}

		ctx.strokeStyle = "#eeeeee";
		yGrid.draw(graphLeft, graphWidth);


		if(dataSeries.length <= 1)
			ctx.fillStyle = "#99aadd";
		ctx.strokeStyle = "#666666";

		for(var i = 0; i < nrBuckets; i++)
		{
			var bucketLeft = pixelRound(graphLeft + (i * bucketPixelWidth) + bucketSeriesMargin);
			var bucketRight = pixelRound(graphLeft + ((i + 1) * bucketPixelWidth) - bucketSeriesMargin);
			for(var j = 0; j < dataSeries.length; j++){
				if (canvas.colors.length > 0)
					ctx.fillStyle = getRGBColor(canvas.colors, j, 1);
				else if(dataSeries.length > 1)
					ctx.fillStyle = getIndexedColor(j + 1, [40,80], [50,80]);
				var sy = dataSeries[j].buckets[i];
				if(sy <= 0) continue;
				if(normalize && dataSeries[j].sumWeight > 0)
					sy *= 1 / dataSeries[j].sumWeight;
				var barLeft = pixelRound(bucketLeft + (j * bucketSeriesWidth));
				var barRight = pixelRound(bucketLeft + ((j+1) * bucketSeriesWidth));
				if(j == dataSeries.length - 1)
					barRight = bucketRight;
				var pixelSY = Math.round(sy * graphHeight / gridMaxY);
				var barTop = pixelRound(graphBottom - pixelSY);
				ctx.fillRect(barLeft, barTop, barRight - barLeft, pixelSY);
				ctx.strokeRect(barLeft, barTop, barRight - barLeft, pixelSY);
				if(pickMode && pickAtts.offsetX > barLeft && pickAtts.offsetX < barRight && pickAtts.offsetY > barTop)
					pickAtts.picked = {name:dataSeries[j].name, value:sy, y:barTop};
			}
		}
		ctx.fillStyle = "black";
		ctx.strokeStyle = "#aaaaaa";
		xGrid.draw(graphBottom + 4, -4, 15, 5);
		ctx.strokeRect(pixelRound(graphLeft), pixelRound(graphBottom - graphHeight), Math.round(graphWidth), Math.round(graphHeight));
		return 0;

	}catch(e){printError(e, "histogram.js");}
	};

	var popupShowing = false;
	var popup = document.getElementById('flexsimpopup');
	canvas.onMouseMove = function onMouseMove(e) {
		if(graphWidth == 0 || graphHeight == 0 || dataSeries.length == 0 || (histoMaxY - histoMinY <= 0) || nrBuckets == 0)
			return;

		setMouseOffsets(e);
		if(e.offsetY > graphTop && e.offsetY < graphBottom
			&& e.offsetX > graphLeft && e.offsetX < graphRight) {
			pickAtts.offsetX = e.offsetX;
			pickAtts.offsetY = e.offsetY;
			pickAtts.picked = null;
			pickMode = 1;
			canvas.draw();
			pickMode = 0;
			var bucketPixelWidth = graphWidth / nrBuckets;
			var bucketNr = Math.floor((e.offsetX - graphLeft) / bucketPixelWidth);
			var bucketMinY = histoMinY + bucketNr * bucketWidth;
			var bucketMaxY = bucketMinY + bucketWidth;
			var popupText = bucketMinY.toFixed(canvas.precision) + ' - ' + bucketMaxY.toFixed(canvas.precision);
			if(pickAtts.picked)
				popupText = pickAtts.picked.name + '<br/>' + popupText + '<br/>Frequency: ' + pickAtts.picked.value.toFixed(canvas.precision);
			else if(dataSeries.length <= 1)
				return 0;

			popupShowing = true;
			popup.style.display = "block";
			popup.innerHTML = popupText;
			var pos = findDocumentPos(canvas);
			var scrollPos = windowScrollPos();
			popup.style.left = Math.floor(pos[0] - scrollPos.left + graphLeft + (bucketNr + 0.5) * bucketPixelWidth - popup.offsetWidth*0.5)+'px';
			popup.style.top = Math.floor(pos[1] - scrollPos.top + (pickAtts.picked ? pickAtts.picked.y - popup.offsetHeight : graphTop + 5))+'px';
		}
		else if(popupShowing) {
			popupShowing = false;
			popup.style.display = 'none';
		}
	}
	canvas.addEventListener('mousemove', canvas.onMouseMove, false);

	canvas.addEventListener('mouseout', function onMouseOut(e) {
		if(popupShowing && e.relatedTarget != popup) {
			popupShowing = false;
			popup.style.display = 'none';
		}
	}, false);

	// This prevents the cursor from changing to an i-beam in Chrome when clicking
	canvas.onselectstart = function () { return false; };

	mainDiv.resetDataSeries = function resetDataSeries() {
		dataSeries = [];
		minY = 1000000000;
		maxY = -10000000000;
		histoMinY = 0;
		histoMaxY = 0;
		regenBuckets = true;
		maxSum = 0;
	};

	mainDiv.addDataSeries = function addDataSeries(seriesName, newBundle, timeW){
	    try {
	        var series = {
	            name: seriesName,
	            bundle: Bundle.interpretHeader(newBundle),
	            analyzedNrEntries: 0,
	            timeWeighted: timeW,
	            buckets: [],
	            largestBucket: 0,
	            sumWeight: 0,
                lastUpdateTime: 0
	        };
	        series.isKineticLevel = series.bundle.nrFields > 2;
			dataSeries.push(series);
		}catch(e){printError(e, "histogram.js");}
	};

	mainDiv.updateDataSeries = function updateDataSeries(index, newBundle, connectionType, curTime){
		try{
			if(index >= dataSeries.length)
				return 0;
			var series = dataSeries[index];
			series.bundle = Bundle.interpretData(newBundle, series.bundle);
			series.isKineticLevel = series.bundle.nrFields > 2;
			var endEntry = series.bundle.nrEntries;
			if (series.timeWeighted) {
			    endEntry--;
			    canvas.applySeriesLastEntryToHisto(series, curTime);
			}
			for (var i = series.analyzedNrEntries; i < endEntry; i++) {
			    canvas.addEntryToHistogram(series, i);
			}
			series.analyzedNrEntries = endEntry;
		}catch(e){printError(e, "histogram.js");}
	};
	mainDiv.draw = function (newNrBuckets, newNormalize) {
		if(newNrBuckets != nrBuckets) {
			nrBuckets = newNrBuckets;
			regenBuckets = true;
		}
		normalize = newNormalize;
		if(popupShowing) {
			var e = {offsetX:pickAtts.offsetX, offsetY:pickAtts.offsetY, target:canvas};
			canvas.onMouseMove(e);
		}
		else canvas.draw();
	}

	mainDiv.setProperties = function setProperties(properties, redraw){
		try{
			if(properties.chartType != CHART_TYPE_TIME_SERIES_HISTOGRAM && properties.chartType != "timeserieshistogram")
				return initializeChart(this, properties, redraw);
				
			//If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
			if (properties.showLegend == undefined)
				properties.showLegend = mainDiv.getAttribute('data-show-legend') == 'true';
			if (properties.fontSize == undefined)
			    properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 10;
			if (properties.precision == undefined)
			    properties.precision = parseFloat(mainDiv.getAttribute('data-precision')) || 1;
			if (properties.dataScale == undefined)
				properties.dataScale = parseFloat(mainDiv.getAttribute('data-data-scale')) || 1;
			if (properties.colors == undefined)
			    properties.colors = eval(mainDiv.getAttribute('data-colors')) || [];
			
			canvas.mainTitle = properties.title;
			canvas.showLegend = properties.showLegend;
			canvas.fontSize = properties.fontSize;
			canvas.precision = properties.precision;
			canvas.dataScale = properties.dataScale;
			canvas.colors = properties.colors;
			
			if(redraw)
				canvas.draw();
		}catch(e){printError(e, "histogram.js");}
	};

	//Called from dragresize.js
	mainDiv.onResize = function onResize() {
	    regenGrids = true;
	    canvas.draw();
	}

	canvas.draw();
	window.addEventListener("resize", mainDiv.onResize, false);

	}catch(e){
		printError(e, "histogram.js");
	}
}