var PFM_CANVAS = 1;
var PFM_DATA_TABLE = 2;
var PFM_SUMMARY = 3;
var PFM_CORRELATION_PLOT = 4;



function initializePfm(chartTypeParam, focusParam) {
	var focus, chartType;
	if(chartTypeParam) {
		chartType = chartTypeParam;
		this.setAttribute('data-chart-type', chartTypeParam);
	}
	else chartType = this.getAttribute('data-chart-type');
	
	this.setAttribute('data-is-pfm-chart', 'true');
	if(focusParam != undefined) {
		focus = focusParam;
		this.setAttribute('data-focus', focus);
	}
	else focus = this.getAttribute('data-focus');
	if(this.fullScreen
			&& chartType != 'pfmdatatable'
			&& chartType != 'pfmsummary')
		this.style['overflow-y'] = 'hidden';
	else this.style['overflow-y'] = 'auto';
	if(chartType == "pfmchart" || chartType == "pfmhisto")
		initializePfmCanvas(this, focus, chartType);
	else if(chartType == "pfmdatatable")
		initializePfmDataTable(this, focus);
	else if(chartType == "pfmsummary")
		initializePfmSummary(this, focus);
	else if(chartType == "pfmcorrelationplot")
		initializePfmCorrelationPlot(this, focus);
		
	this.onResize = function () {
		if (this.canvas && this.canvas.onResize) {
			this.canvas.onResize();
			this.canvas.draw();
		}
	};
}

function pfmOnDocLoaded() {
	var divs = document.getElementsByTagName("div");
	for(var i = 0; i < divs.length; i++){
		var div = divs[i];
		if(!div.getAttribute('data-is-pfm-chart'))
			continue;
		div.fullScreen = div.className.indexOf('fullscreen') >= 0;
		div.initializePfm = initializePfm;
		div.setMember = function setMember(name, val) {
			this[name] = val;
		}
		div.initializePfm();
	}

	return 0;
}

function initializePfmCanvas(pfmDiv, pfmIndex, chartType) {
	if(!pfmDiv)
		return;

	var FLT_MAX = 100000000000000000000000.0;

	pfmDiv.focus = pfmData[pfmIndex];
	var nrScenarios = pfmScenarioNames.length;

	pfmDiv.showHisto = chartType == 'pfmhisto';

	if(!pfmDiv.showHisto) {
		if(pfmDiv.showPoints == undefined) {
			if(pfmDiv.getAttribute('data-show-points') != undefined)
				pfmDiv.showPoints = pfmDiv.getAttribute('data-show-points') != 'none';
			else pfmDiv.showPoints = true;
		}
		if(pfmDiv.showBoxPlot == undefined) {
			if(pfmDiv.getAttribute('data-show-box-plot') != undefined)
				pfmDiv.showBoxPlot = pfmDiv.getAttribute('data-show-box-plot') != 'none';
			else pfmDiv.showBoxPlot = true;
		}
		if(pfmDiv.showMeanConfidence == undefined) {
			if(pfmDiv.getAttribute('data-show-mean-std-dev') != undefined)
				pfmDiv.showMeanConfidence = pfmDiv.getAttribute('data-show-mean-std-dev') != 'none';
			else pfmDiv.showMeanConfidence = false;
		}
	}

	if(pfmDiv.showHisto && pfmDiv.nrHistoBuckets == undefined) {
		if(pfmDiv.getAttribute('data-nr-histo-buckets') != undefined)
			pfmDiv.nrHistoBuckets = pfmDiv.getAttribute('data-nr-histo-buckets');
		else pfmDiv.nrHistoBuckets = 10;
	}

	pfmDiv.chartType = PFM_CANVAS;

	if (!pfmDiv.confidence) {
		pfmDiv.confidence = pfmDiv.getAttribute('data-confidence');
		if (pfmDiv.confidence == undefined)
			pfmDiv.confidence = 90;
	}

	var innerHTML = "<canvas>This chart is not supported in this browser</canvas>";
	pfmDiv.innerHTML = innerHTML;
	var canvas = pfmDiv.getElementsByTagName("canvas")[0];
	canvas.onResize = function() {
		if(!pfmDiv.fullScreen) {
			canvas.width = pfmDiv.clientWidth - 3;
			canvas.height = pfmDiv.clientHeight - 5;
		}
	};
	canvas.onResize();

	var ctx = canvas.getContext('2d');
	var popup = document.getElementById("flexsimpopup");
	if(!pfmDiv.focus.sortedData)
	{
		var sortedData = [];
		for(var i = 0; i < nrScenarios; i++) {
			var scenario = [];
			// first copy the unsorted data to a new array
			var nrReps = pfmDiv.focus.data[i].length;
			for(var j = 0; j < nrReps; j++)
				scenario.push(pfmDiv.focus.data[i][j]);

			// next sort the new array.
			function sortFunc(a, b) { return a - b; }
			scenario.sort(sortFunc);
			sortedData.push(scenario);
		}
		pfmDiv.focus.sortedData = sortedData;
	}
	var CONF_90 = 0;
	var CONF_95 = 1;
	var CONF_99 = 2;

	if(!pfmDiv.focus.boxPlot) {
		pfmDiv.focus.confidenceMaxRange = [{ min: FLT_MAX, max: -FLT_MAX }, { min: FLT_MAX, max: -FLT_MAX }, { min: FLT_MAX, max: -FLT_MAX }];
		function resolveConfidence(maxRange, boxPlot, index, confidence)
		{
			boxPlot.confidenceDist[index] = calculateConfidence(boxPlot.stdDev, nrReps, confidence);
			maxRange[index].max = Math.max(boxPlot.mean + boxPlot.confidenceDist[index], maxRange[index].max);
			maxRange[index].min = Math.min(boxPlot.mean - boxPlot.confidenceDist[index], maxRange[index].min);
		}
		var data = pfmDiv.focus.sortedData;
		var boxPlot = [];
		pfmDiv.focus.boxPlot = boxPlot;
		var base, percentInto;

		function calcPercentile(scenario, percentile, nrReps) {
			var floatIndex = percentile*(nrReps-1);
			var baseIndex = Math.floor(floatIndex);
			var percentInto = floatIndex - baseIndex;
			var base = data[scenario][baseIndex];
			return base + percentInto * (baseIndex < nrReps - 1 ? data[scenario][baseIndex + 1] - base : 0);
		}
		
		for(var i = 0; i < nrScenarios; i++) {
			var temp = {};
			boxPlot.push(temp);
			var nrReps = pfmDiv.focus.data[i].length;
			temp.boxBottom = calcPercentile(i, 0.25, nrReps);
			temp.boxTop = calcPercentile(i, 0.75, nrReps);
			temp.median = calcPercentile(i, 0.5, nrReps);
			var sum = 0;
			for(var j = 0; j < nrReps; j++)
				sum += data[i][j];
			temp.mean = sum / nrReps;
		}
		for(var i = 0; i < nrScenarios; i++) {
			var sumSqrDiff = 0;
			var nrReps = pfmDiv.focus.data[i].length;
			for(var j = 0; j < nrReps; j++) {
				var diff = boxPlot[i].mean - data[i][j];
				sumSqrDiff += diff * diff;
			}
			boxPlot[i].stdDev = Math.sqrt(sumSqrDiff / Math.max(1, nrReps - 1));
			boxPlot[i].confidenceDist = [0,0,0];
			resolveConfidence(pfmDiv.focus.confidenceMaxRange, boxPlot[i], CONF_90, 90);
			resolveConfidence(pfmDiv.focus.confidenceMaxRange, boxPlot[i], CONF_95, 95);
			resolveConfidence(pfmDiv.focus.confidenceMaxRange, boxPlot[i], CONF_99, 99);
		}
	}

	canvas.draw = function draw() {
		var focus = pfmDiv.focus;

		var pickedObj = null;

		ctx.strokeStyle = "#c0c0c0";
		ctx.fillStyle = "black";

		// figure out the view y range by going through and finding the max and min values in the data
		var maxY = -10000000000.0, minY = 10000000000.0;
		for(var i = 0; i < nrScenarios; i++) {
			var nrReps = focus.sortedData[i].length;
			if(focus.sortedData[i][nrReps-1] > maxY) maxY = focus.sortedData[i][nrReps-1];
			if(focus.sortedData[i][0] < minY) minY = focus.sortedData[i][0];
		}
		var rangeMax = maxY, rangeMin = minY;
		var confIndex = pfmDiv.confidence == 90 ? CONF_90 : (pfmDiv.confidence == 95 ? CONF_95 : CONF_99);
		if(!pfmDiv.showHisto) {
			var marginY = (maxY - minY)*0.1;
			if(marginY == 0) marginY = 1;
			rangeMax += marginY;
			rangeMin -= marginY;
			if (rangeMin < 0 && minY >= 0)
				rangeMin = 0;
			if (pfmDiv.showMeanConfidence) {
				rangeMax = Math.max(rangeMax, pfmDiv.focus.confidenceMaxRange[confIndex].max);
				rangeMin = Math.min(rangeMin, pfmDiv.focus.confidenceMaxRange[confIndex].min);
			}
		}
		var range = rangeMax - rangeMin;
	    // now figure out the precision
		var precision = 0;
		var tempRange = range;
		while (tempRange < 40 && tempRange > 0) {
		    precision++;
		    tempRange *= 10;
		}

		var marginTop = 10.5;
		if(pfmDiv.getAttribute('data-title') != 'none') {
			// draw the title
			ctx.font = "bold 13pt Tahoma";
			ctx.textAlign = "center";
			var title = pfmDiv.getAttribute('data-title') || focus.name;
			ctx.fillText(title, canvas.width / 2, 18);
			ctx.textAlign = "left";
			marginTop += 20;
		}

		var marginLeft = 5.5, marginRight = 10.5, marginBottom = 35.5;
		var graphBottom = this.height - marginBottom;
		var graphSy = this.height - (marginTop + marginBottom);
		if(graphSy < 5)
			return;

		ctx.font = "10pt Tahoma";

		if(pfmDiv.showHisto) {
			var bucketRange = range / pfmDiv.nrHistoBuckets;
			var maxBucketSize = 0;
			// find the maximum bucket size
			var histograms = [];
			var histogramMaxes = [];
			var maxScenarioNameWidth = 0;
			var maxBucketSizeSum = 0;


			ctx.font = "10pt Tahoma";
			var xReset = 13;
			var yInterval = 18;
			var x = xReset, y = 25;

			ctx.strokeStyle = "#555555";
			var objectName, width;
			// draw object (color) legend
			for(var i = 0; i < nrScenarios; i++) {
				objectName = pfmScenarioNames[i];
				width = 20 + ctx.measureText(objectName).width;
				if(x + width > canvas.width){
					x = xReset;
					y += yInterval;
				}
				// draw the legend color box and the name of the object
				ctx.fillStyle = nrScenarios <= 1 ?  "#99aadd" : getIndexedColor(i+1, [40,80], [50,80]);
				ctx.fillRect(x,y, 10, 10);
				ctx.strokeRect(pixelRound(x),pixelRound(y), 10, 10);
				ctx.fillStyle = "#000000";
				ctx.fillText(objectName, x + 15, y + 10);
				x += width;
			}
			if(x != xReset) y += yInterval;
			y += 5;
			var graphTop = pixelRound(y);
			var graphBottom = pixelRound(canvas.height - marginBottom);
			graphSy = graphBottom - graphTop;
			var maxNrReps = 1;

			for(var i = 0; i < nrScenarios; i++) {
				var width = ctx.measureText(pfmScenarioNames[i]).width;
				var nrReps = focus.sortedData[i].length;
				maxNrReps = Math.max(maxNrReps, nrReps);
				var index = 0;
				var scenarioBuckets = [];
				var maxScenarioBucketSize = 0;
				for(var j = 0, curBucketMax = rangeMin + bucketRange; j < pfmDiv.nrHistoBuckets; j++, curBucketMax += bucketRange) {
					var startIndex = index;
					while(index < nrReps && focus.sortedData[i][index] <= curBucketMax)
						index++;
					var bucketSize = index - startIndex;
					if(bucketSize > maxScenarioBucketSize)
						maxScenarioBucketSize = bucketSize;
					scenarioBuckets.push(bucketSize);
				}
				maxScenarioBucketSize *= 1.1;
				histogramMaxes.push(maxScenarioBucketSize);
				maxBucketSizeSum += maxScenarioBucketSize;
				if(maxScenarioBucketSize > maxBucketSize)
					maxBucketSize = maxScenarioBucketSize;
				histograms.push(scenarioBuckets);
			}


			var yGrid = new YGrid(ctx, 0, maxBucketSize / maxNrReps, graphTop, graphSy, 20, false);
			marginLeft += yGrid.width;
			graphSx = canvas.width - (marginLeft + marginRight);

			var bucketSx = graphSx / pfmDiv.nrHistoBuckets;
			if (nrScenarios > 1) {
                // stripe the histogram with background gray every other bucket
                // to better distinguish each bucket on multiple scenarios
			    ctx.fillStyle = "#eeeeee";
			    for (var j = 0; j < pfmDiv.nrHistoBuckets; j += 2) {
			        var bucketLeft = marginLeft + (j * bucketSx);
			        ctx.fillRect(bucketLeft, graphTop, bucketSx, graphSy);
			    }
			}

			ctx.strokeStyle = "#a0a0a0";
			ctx.fillStyle = "black";
			yGrid.draw(marginLeft, graphSx);

			var xGrid = new XGrid(ctx, rangeMin, rangeMax, marginLeft, graphSx);
			xGrid.draw(graphBottom + 3, -3);


			ctx.lineWidth = 1;
			ctx.strokeStyle = "#707070";
			var barMargin = Math.min(8, bucketSx*0.15);
			var barSx = (bucketSx - 2*barMargin)/nrScenarios;
			for(var j = 0; j < pfmDiv.nrHistoBuckets; j++) {
				var bucketLeft = marginLeft + (j * bucketSx);
				for(var i = 0; i < nrScenarios; i++) {
					var left = pixelRound(bucketLeft + barMargin + i*barSx);
					var right = pixelRound(bucketLeft + barMargin + (i+1)*barSx);
					ctx.fillStyle = nrScenarios == 1 ? "#99aadd" : getIndexedColor(i+1, [40,80], [50,80]);
					var bucketSy = Math.floor(graphSy * histograms[i][j] / maxBucketSize);
					ctx.fillRect(left, graphBottom, right - left, -bucketSy);
					ctx.strokeRect(left, graphBottom, right - left, -bucketSy);
					if(canvas.pickMode == PICK_MODE_HOVER
							&& canvas.pickCursorX < right
							&& canvas.pickCursorX > left
							&& canvas.pickCursorY > graphBottom - bucketSy
							&& canvas.pickCursorY < graphBottom) {
						var min = rangeMin + j * bucketRange, max = min + bucketRange;
						canvas.pickedObj = {left:left, right:right, top:graphBottom - bucketSy,
						    text: pfmScenarioNames[i]
                                + '<br/>Range: ' + min.toFixed(precision)
                                    + ' - ' + max.toFixed(precision)
                                + '<br/>Proportion: ' + (histograms[i][j] / focus.sortedData[i].length).toFixed(2)
                                + '<br/># Replications: ' + histograms[i][j]
						};
					}
				}
			}
			ctx.strokeStyle = "#a0a0a0";
			ctx.lineWidth = 1;
			ctx.strokeRect(marginLeft, graphTop, graphSx, graphSy);
		} else {

			if(focus.valueName && focus.valueName != 'Value') {
				ctx.save();
				ctx.translate(0, marginTop + 0.5*graphSy);
				ctx.rotate(-Math.PI / 2);
				ctx.textAlign = "center";
				ctx.fillText(focus.valueName, 0, 13);
				ctx.restore();
				marginLeft += 15;
			}

			var yGrid = new YGrid(ctx, rangeMin, rangeMax, marginTop, graphSy, 18);
			marginLeft += yGrid.width;
			var graphSx = this.width - (marginLeft + marginRight);
			if(graphSx < 5)
				return;
			yGrid.draw(marginLeft, graphSx);

			var scenarioWidth = graphSx / nrScenarios;
			var x = marginLeft;
			for(var i = 0; i < nrScenarios; i++) {
				ctx.lineWidth = 1;
				ctx.strokeStyle = "#c0c0c0";
				if(i > 0)
					ctx.strokeRect(Math.floor(x) + 0.5, marginTop, 0, graphSy);
				var scenarioX = x;
				var nrReps = focus.data[i].length;
				var xCenter = x + 0.5*scenarioWidth;
				if(pfmDiv.showPoints) {
					ctx.fillStyle = getIndexedColor(i+1, 50, 50);
					var incX = scenarioWidth / (nrReps + 1);
					x += incX;
					for(var j = 0; j < nrReps; j++) {
						var val = focus.data[i][j];
						var y = Math.floor(graphBottom - graphSy * (val - rangeMin)/range) + 0.5;
						var tempX = Math.floor(x) + 0.5;
						ctx.beginPath();
						ctx.moveTo(tempX, y + 3);
						ctx.lineTo(tempX - 3, y);
						ctx.lineTo(tempX, y - 3);
						ctx.lineTo(tempX + 3, y);
						ctx.closePath();
						ctx.fill();
						if(canvas.pickMode
								&& canvas.pickCursorX < x + 3
								&& canvas.pickCursorX > x - 3
								&& canvas.pickCursorY > y - 3
								&& canvas.pickCursorY < y + 3) {
							if(canvas.pickMode == PICK_MODE_HOVER)
								canvas.pickedObj = {top:y - 3,left:x,right:x,isPoint:true,text:'Replication: ' + (j + 1) + '<br/>Value: ' + focus.data[i][j].toFixed(precision)};
							else canvas.pickedPoint = {scenario:i+1,replication:j+1};
						}
						x += incX;
					}
				}
				if(pfmDiv.showBoxPlot) {
					var boxYMin = Math.floor(graphBottom - graphSy * (focus.boxPlot[i].boxBottom - rangeMin)/range);
					var boxYMax = Math.floor(graphBottom - graphSy * (focus.boxPlot[i].boxTop - rangeMin)/range);
					var yMedian = Math.floor(graphBottom - graphSy * (focus.boxPlot[i].median - rangeMin)/range);
					var sampleYMin = Math.floor(graphBottom - graphSy * (focus.sortedData[i][0] - rangeMin)/range);
					var sampleYMax = Math.floor(graphBottom - graphSy * (focus.sortedData[i][nrReps - 1] - rangeMin)/range);
					ctx.strokeStyle = "#000000";
					ctx.lineWidth = 2;
					var boxWidth = Math.min(scenarioWidth, 30);
					ctx.strokeRect(Math.floor(xCenter - 0.5*boxWidth), boxYMin, boxWidth, boxYMax - boxYMin);
					ctx.strokeRect(Math.floor(xCenter - 0.5*boxWidth), yMedian, boxWidth, 0);
					ctx.beginPath();
					ctx.moveTo(xCenter, boxYMin);
					ctx.lineTo(xCenter, sampleYMin);
					ctx.moveTo(xCenter - 0.4*boxWidth, sampleYMin);
					ctx.lineTo(xCenter + 0.4*boxWidth, sampleYMin);
					ctx.moveTo(xCenter, boxYMax);
					ctx.lineTo(xCenter, sampleYMax);
					ctx.moveTo(xCenter - 0.4*boxWidth, sampleYMax);
					ctx.lineTo(xCenter + 0.4*boxWidth, sampleYMax);
					ctx.stroke();
					if(canvas.pickMode == PICK_MODE_HOVER
							&& canvas.pickCursorX < xCenter + 0.5*boxWidth
							&& canvas.pickCursorX > xCenter - 0.5*boxWidth
							&& canvas.pickCursorY < sampleYMin + 3
							&& canvas.pickCursorY > sampleYMax - 3) {
						if(canvas.pickCursorY > sampleYMin - 3
								&& canvas.pickCursorY < sampleYMin + 3) {
							canvas.pickedObj = {top:sampleYMin - 3,left:xCenter - 0.5*boxWidth,right:xCenter + 0.5*boxWidth,
								text:'Min: ' + focus.sortedData[i][0].toFixed(precision)};
						}
						else if(canvas.pickCursorY > sampleYMax - 3
								&& canvas.pickCursorY < sampleYMax + 3) {
							canvas.pickedObj = {top:sampleYMax - 3,left:xCenter - 0.5*boxWidth,right:xCenter + 0.5*boxWidth,
							    text: 'Max: ' + focus.sortedData[i][nrReps - 1].toFixed(precision)
							};
						}
						else if(canvas.pickCursorY > boxYMin - 3
								&& canvas.pickCursorY < boxYMin + 3) {
							canvas.pickedObj = {top:boxYMin - 3,left:xCenter - 0.5*boxWidth,right:xCenter + 0.5*boxWidth,
							    text: '25%: ' + focus.boxPlot[i].boxBottom.toFixed(precision)
							};
						}
						else if(canvas.pickCursorY > boxYMax - 3
								&& canvas.pickCursorY < boxYMax + 3) {
							canvas.pickedObj = {top:boxYMax - 3,left:xCenter - 0.5*boxWidth,right:xCenter + 0.5*boxWidth,
							    text: '75%: ' + focus.boxPlot[i].boxTop.toFixed(precision)
							};
						}
						else if(canvas.pickCursorY > yMedian - 3
								&& canvas.pickCursorY < yMedian + 3) {
							canvas.pickedObj = {top:yMedian - 3,left:xCenter - 0.5*boxWidth,right:xCenter + 0.5*boxWidth,
							    text: 'Median: ' + focus.boxPlot[i].median.toFixed(precision)
							};
						}
					}
				}
				if(pfmDiv.showMeanConfidence) {
					var meanY = Math.floor(graphBottom - graphSy * (focus.boxPlot[i].mean - rangeMin) / range);
					var confidenceDist = focus.boxPlot[i].confidenceDist[confIndex];
					var stdDevDistY = graphSy * (confidenceDist / range);
					ctx.strokeStyle = "#909090";
					ctx.lineWidth = 4;
					ctx.lineCap = 'round';
					ctx.beginPath();
					ctx.arc(xCenter, meanY, 3, 0, 2*Math.PI, 0);
					ctx.moveTo(xCenter, meanY - 3);
					ctx.lineTo(xCenter, meanY - stdDevDistY);
					ctx.moveTo(xCenter, meanY + 3);
					ctx.lineTo(xCenter, meanY + stdDevDistY);
					ctx.stroke();
					ctx.lineCap = 'butt';

					if(canvas.pickMode == PICK_MODE_HOVER
							&& canvas.pickCursorX < xCenter + 6
							&& canvas.pickCursorX > xCenter - 6
							&& canvas.pickCursorY < meanY + stdDevDistY
							&& canvas.pickCursorY > meanY - stdDevDistY) {
						if(canvas.pickCursorY > meanY - 6
								&& canvas.pickCursorY < meanY + 6) {
							canvas.pickedObj = {top:meanY - 7,left:xCenter - 0.5*scenarioWidth,right:xCenter + 0.5*scenarioWidth,
							    text: 'Sample Mean: ' + focus.boxPlot[i].mean.toFixed(precision)
							};
						} else if(canvas.pickCursorX < xCenter + 2
								&& canvas.pickCursorX > xCenter - 2) {
							canvas.pickedObj = {top:meanY - stdDevDistY,left:xCenter - 0.5*scenarioWidth,right:xCenter + 0.5*scenarioWidth,
								text: 'Confidence Interval: ' + (focus.boxPlot[i].mean - confidenceDist).toFixed(precision)
										+ ' - ' + (focus.boxPlot[i].mean + confidenceDist).toFixed(precision)
							};
						}
					}
				}
				x = scenarioX + scenarioWidth;
			}
			ctx.lineWidth = 1;
			ctx.fillStyle = "#000000";
			x = marginLeft;
			ctx.textAlign = "center";
			for(var i = 0; i < nrScenarios; i++) {
				var name = pfmScenarioNames[i];
				var width = ctx.measureText(name).width;
				if(width > scenarioWidth - 5)
					name = "S" + (i + 1);
				ctx.fillText(name, x + 0.5*scenarioWidth, graphBottom + 12, scenarioWidth - 10);
				x += scenarioWidth;
			}
			ctx.textAlign = "left";


			if(pfmDiv.showBoxPlot || pfmDiv.showMeanConfidence) {
				ctx.font = "8pt Tahoma";
				ctx.fillStyle = "#404040";
				ctx.strokeStyle = "#404040";
				ctx.lineWidth = 1;
				var y = canvas.height - 5.5;
				var x = 5.5;
				if(pfmDiv.showBoxPlot) {
					ctx.strokeRect(x, y, 10, -10);
					ctx.strokeRect(x, y - 5, 10, 0);
					var text = "25% - 50% - 75%";
					ctx.fillText(text, x + 15, y - 1);
					x += 15 + ctx.measureText(text).width + 20;

					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(x + 10, y);
					ctx.moveTo(x + 5, y);
					ctx.lineTo(x + 5, y - 10);
					ctx.moveTo(x, y - 10);
					ctx.lineTo(x + 10, y - 10);
					ctx.stroke();
					text = "Min - Max";
					ctx.fillText(text, x + 15, y - 1);
					x += 15 + ctx.measureText(text).width + 20.5;
				}

				if(pfmDiv.showMeanConfidence) {
					ctx.beginPath();
					ctx.arc(x, y - 5, 2, 0, 2*Math.PI, 0);
					ctx.moveTo(x, y - 7);
					ctx.lineTo(x, y - 11);
					ctx.moveTo(x, y - 3);
					ctx.lineTo(x, y + 1);
					ctx.stroke();

					text = "Mean Confidence Interval";
					ctx.fillText(text, x + 8, y - 1);
					x += 8 + ctx.measureText(text).width + 20.5;
				}
			}

			/*
			// draw resizer thumbnail (commented because there were issues)
			if(!pfmDiv.fullScreen) {
				ctx.strokeStyle = 'gray';
				ctx.beginPath();
				ctx.moveTo(canvas.width - 12, canvas.height);
				ctx.lineTo(canvas.width, canvas.height - 12);
				ctx.moveTo(canvas.width - 8, canvas.height);
				ctx.lineTo(canvas.width, canvas.height - 8);
				ctx.moveTo(canvas.width - 4, canvas.height);
				ctx.lineTo(canvas.width, canvas.height - 4);
				ctx.stroke();

				if(canvas.pickMode == PICK_MODE_CLICK
						&& canvas.pickCursorX > canvas.width - 10
						&& canvas.pickCursorY > canvas.height - 10)
				{
					pfmDiv.resizingNow = true;
					pfmDiv.resizeStartCursorX = canvas.pickCursorX;
					pfmDiv.resizeStartCursorY = canvas.pickCursorY;
					pfmDiv.resizeStartSx = pfmDiv.offsetWidth;
					pfmDiv.resizeStartSy = pfmDiv.offsetHeight;
				}
			}
			*/

			ctx.strokeStyle = "#a0a0a0";
			ctx.lineWidth = 1;
			ctx.strokeRect(marginLeft, marginTop, graphSx, graphSy);
		}
	}

	pfmDiv.canvas = canvas;
	pfmDiv.repaint = function repaint() {ctx.clearRect(0,0, canvas.width, canvas.height); canvas.draw();};

	canvas.onMouseMove = function onMouseMove(e){
		setMouseOffsets(e);
		if(pfmDiv.resizingNow) {
			var diffX = e.offsetX - pfmDiv.resizeStartCursorX;
			var diffY = e.offsetY - pfmDiv.resizeStartCursorY;
			var newWidth = (pfmDiv.resizeStartSx + diffX);
			var newHeight = (pfmDiv.resizeStartSy + diffY);
			pfmDiv.style.width = newWidth + 'px';
			pfmDiv.style.height = newHeight + 'px';
			canvas.width = newWidth - 3;
			canvas.height = newHeight - 5;
			ctx.clearRect(0,0,canvas.width, canvas.height);
			canvas.draw();
			return;
		}
		if (!popup)
		    return;
		canvas.pickMode = PICK_MODE_HOVER;
		canvas.pickedObj = null;
		var docPos = findDocumentPos(canvas);
		canvas.pickCursorX = e.offsetX || (e.clientX + docPos[0]);
		canvas.pickCursorY = e.offsetY || (e.clientY + docPos[1]);
		canvas.getContext('2d').clearRect(0,0,canvas.width, canvas.height);
		canvas.draw();
		canvas.pickMode = 0;
		var pickedObj = canvas.pickedObj;
		if(pickedObj) {
			popup.style.display = "block";
			var innerHTML = pickedObj.text;
			if(pickedObj.isPoint
				&& pfmDiv.focus.statDataFocus != undefined
				&& window.validStatData && window.validStatData[pfmDiv.focus.statDataFocus] == 1)
				innerHTML += "<br/><span style='font-size:70%;font-style:italic;color:gray'>double-click...</span>";
			popup.innerHTML = innerHTML;
			var pos = findDocumentPos(canvas);
			var scrollPos = windowScrollPos();
			popup.style.left = (pos[0] - scrollPos.left + Math.max(0,pickedObj.left + pickedObj.right-popup.offsetWidth)/2)+'px';
			popup.style.top = (pos[1] - scrollPos.top - pfmDiv.scrollTop + pickedObj.top - popup.offsetHeight - 5)+'px';
		}
		else popup.style.display = "none";
	}
	/*
	canvas.onMouseDown = function onMouseDown(e){
		canvas.pickMode = PICK_MODE_CLICK;
		canvas.pickCursorX = e.offsetX;
		canvas.pickCursorY = e.offsetY;
		canvas.getContext('2d').clearRect(0,0,canvas.width, canvas.height);
		canvas.draw();
		canvas.pickMode = 0;
		if(pfmDiv.resizingNow)
			canvas.addEventListener('mouseout', canvas.onMouseMove, false);
	}
	canvas.onMouseUp = function onMouseUp(e){
		if(pfmDiv.resizingNow) {
			canvas.removeEventListener('mouseout', canvas.onMouseMove, false);
			pfmDiv.resizingNow = false;
		}
	}*/

	canvas.onWindowResize = function onWindowResize(){
		if(pfmDiv.fullScreen){
			var vp = viewport();
			canvas.width = vp.width - 3;
			canvas.height = vp.height - 7;
		}
		canvas.draw();
	}

	canvas.addEventListener('mousemove', canvas.onMouseMove, false);
	//canvas.addEventListener('mousedown', canvas.onMouseDown, false);
	//canvas.addEventListener('mouseup', canvas.onMouseUp, false);
	canvas.onWindowResize();
	if(pfmDiv.fullScreen)
			window.addEventListener("resize", canvas.onWindowResize, false);
	if(pfmDiv.focus.statDataFocus != undefined
			&& validStatData && validStatData[pfmDiv.focus.statDataFocus] == 1) {
		canvas.onDblClick = function onDblClick(e) {
			canvas.pickMode = PICK_MODE_CLICK;
			var docPos = findDocumentPos(canvas);
			canvas.pickCursorX = e.offsetX || (e.clientX + docPos[0]);
			canvas.pickCursorY = e.offsetY || (e.clientY + docPos[1]);
			canvas.pickedPoint = null;
			canvas.getContext('2d').clearRect(0,0,canvas.width, canvas.height);
			canvas.draw();
			canvas.pickMode = 0;
			if(canvas.pickedPoint) {
				var data, replicationData;
				if(window.statData) {
					data = window.statData[pfmDiv.focus.statDataFocus];
					replicationData = data.replicationData[canvas.pickedPoint.scenario - 1][canvas.pickedPoint.replication - 1];
				}
				else {
					if(window.fireFlexsimEvent) {
						window.globalStatData = null;
						pfmDiv.updateStatData = function (updateScript) {
							eval(updateScript);
							data = window.globalStatData;
							replicationData = data.data;
						}
						fireFlexsimEvent('updateStatData', canvas.pickedPoint.scenario, canvas.pickedPoint.replication);
					}
				}
				if(data) {
					// for some reason I have to show the overlay twice to get the canvas to scale right
					showOverlay(true);
					var dialogDiv = document.getElementById('dialogdiv');
					dialogDiv.innerHTML = data.html;
					dialogDiv.children[0].sizeToNeeds = true;
					dialogDiv.children[0].style.width = Math.min(600, Math.max(300, viewport().width - 200)) + 'px';
					dialogDiv.children[0].style.height = '200px';
					var title = dialogDiv.children[0].getAttribute('data-title');
					if(title)
						dialogDiv.children[0].setAttribute('data-title', title + " - " + pfmScenarioNames[canvas.pickedPoint.scenario - 1]
								+ " Replication " + canvas.pickedPoint.replication);

					data.initialize(dialogDiv.children[0], replicationData);
					showOverlay(true);
				}
			}
			canvas.pickedPoint = null;
		}
		canvas.addEventListener('dblclick', canvas.onDblClick, false);
	}
}

function appendCol(tagName, value, row) {
	var col = document.createElement(tagName);
	col.innerHTML = value;
	row.appendChild(col);
	return col;
}


function initializePfmDataTable(pfmDiv, pfmIndex) {
	if(!pfmDiv)
		return;

	pfmDiv.focus = pfmData[pfmIndex];
	var focus = pfmDiv.focus;
	var nrScenarios = pfmScenarioNames.length;
	var maxNrReps = 0;
	for(var i = 0; i < nrScenarios; i++)
		if(pfmDiv.focus.data[i].length > maxNrReps)
			maxNrReps = pfmDiv.focus.data[i].length;
	pfmDiv.chartType = PFM_DATA_TABLE;
	
	if(!focus.dataTable) {
		focus.dataTable = document.createElement('table');
		var table = focus.dataTable;
		table.style.margin = 'auto';
		table.className = 'pfmdatatable';
		if(pfmDiv.getAttribute('data-title') != 'none') {
			var row = document.createElement('tr');
			var title = pfmDiv.getAttribute('data-title') || pfmDiv.focus.name;
			appendCol('th', title, row).setAttribute('colspan', maxNrReps + 5)
			table.appendChild(row);
		}
		var row = document.createElement('tr');
		table.appendChild(row);
		for(var i = 0; i <= maxNrReps; i++) {
			var col = document.createElement('th');
			row.appendChild(col);
			if(i > 0)
				col.innerHTML = i;
		}
		for(var i = 0; i < nrScenarios; i++) {
			var row = document.createElement('tr');
			table.appendChild(row);
			var col = document.createElement('th');
			col.className = 'rowhead';
			row.appendChild(col);
			col.innerHTML = pfmScenarioNames[i];
			var nrReps = pfmDiv.focus.data[i].length;
			for(var j = 0; j < maxNrReps; j++) {
				var col = document.createElement('td');
				if(j < nrReps)
					col.innerHTML = pfmDiv.focus.data[i][j];
				row.appendChild(col);
			}
		}
	}
	pfmDiv.innerHTML = '';
	pfmDiv.appendChild(focus.dataTable);
}
function initializePfmSummary(pfmDiv, pfmIndex) {
	if(!pfmDiv)
		return;
	
	pfmDiv.focus = pfmData[pfmIndex];
	var focus = pfmDiv.focus;
	var nrScenarios = pfmScenarioNames.length;
	pfmDiv.chartType = PFM_SUMMARY;
	if(!pfmDiv.confidence) {
		pfmDiv.confidence = pfmDiv.getAttribute('data-confidence');
		if(pfmDiv.confidence == undefined)
			pfmDiv.confidence = 90;
	}
	
	if(!focus.summary) {
		focus.summary = [];
		for(var i = 0; i < nrScenarios; i++) {
			var scenSummary = {};
			scenSummary.min = focus.data[i][0];
			scenSummary.max = focus.data[i][0];
			var sum = focus.data[i][0];
			var nrReps = focus.data[i].length;
			for(var j = 1; j < nrReps; j++) {
				var temp = focus.data[i][j];
				sum += temp;
				if(temp > scenSummary.max) scenSummary.max = temp;
				if(temp < scenSummary.min) scenSummary.min = temp;
			}
			scenSummary.mean = sum / nrReps;
			var sumSqrDev = 0;
			for(var j = 0; j < nrReps; j++) {
				var temp = focus.data[i][j] - scenSummary.mean;
				sumSqrDev += temp * temp;
			}
			if(nrReps > 1)
				scenSummary.stdDev = Math.sqrt(sumSqrDev / (nrReps - 1));
			else scenSummary.stdDev = 0;
			scenSummary.confidenceDist90 = calculateConfidence(scenSummary.stdDev, nrReps, 90);
			scenSummary.confidenceDist95 = calculateConfidence(scenSummary.stdDev, nrReps, 95);
			scenSummary.confidenceDist99 = calculateConfidence(scenSummary.stdDev, nrReps, 99);
			focus.summary.push(scenSummary);
		}
	}
	// find the minimum min-max range of all the scenarios. This will determine the precision to use
	var FLT_MAX = 100000000000000000000000.0;
	var minRange = FLT_MAX;
	var dataMax = 0.0;
	var dataMin = FLT_MAX;
	for (var i = 0; i < nrScenarios; i++) {
		if (focus.summary[i].max > dataMax)
			dataMax = focus.summary[i].max;
		if (focus.summary[i].min < dataMin)
			dataMin = focus.summary[i].min;
		var range = focus.summary[i].max - focus.summary[i].min;
		if (range > 0 && range < minRange)
			minRange = range;
		var confidenceDist = focus.summary[i].confidenceDist90;
		if (confidenceDist > 0 && confidenceDist < minRange)
			minRange = confidenceDist;
	}

	// now figure out the precision
	var precision = 0;
	if (dataMax - dataMin > 0 && minRange == FLT_MAX)
		minRange = dataMax - dataMin;

	if (minRange != FLT_MAX) {
		while (minRange < 10) {
			precision++;
			minRange *= 10;
		}
	} else precision = 2;
	
	if(!focus.summaryTable) {
		focus.summaryTable = document.createElement('table');
		focus.summaryTable.style.margin = 'auto';
		focus.meanMinCells = [];
		focus.meanMaxCells = [];
		var table = focus.summaryTable;
		table.className = 'pfmsummary';
		if(pfmDiv.getAttribute('data-title') != 'none') {
			var row = document.createElement('tr');
			var title = pfmDiv.getAttribute('data-title') || pfmDiv.focus.name;
			var col = appendCol('th', title, row);
			col.setAttribute('style', 'text-align:center;font-size:120%;font-weight:bold');
			col.setAttribute('colspan', 9);
			table.appendChild(row);
		}
		var row = document.createElement('tr');
		table.appendChild(row);
		appendCol('td', ' ', row);
		focus.meanTitleCell = appendCol('th', ' ', row);
		focus.meanTitleCell.setAttribute('colspan', 5);
		appendCol('th', 'Sample Std Dev', row);
		appendCol('th', 'Min', row);
		appendCol('th', 'Max', row);

        // now go through and build the table html
		for(var i = 0; i < nrScenarios; i++) {
			var row = document.createElement('tr');
			table.appendChild(row);
			appendCol('th', pfmScenarioNames[i], row).className = 'rowhead';
			focus.meanMinCells.push(appendCol('td', '', row));
			appendCol('td', '<', row);
			appendCol('td', focus.summary[i].mean.toFixed(precision), row);
			appendCol('td', '<', row);
			focus.meanMaxCells.push(appendCol('td', '', row));
			appendCol('td', focus.data[i].length > 1 ? focus.summary[i].stdDev.toFixed(precision) : "N/A", row);
			appendCol('td', focus.summary[i].min.toFixed(precision), row);
			appendCol('td', focus.summary[i].max.toFixed(precision), row);
		}
	}

	focus.meanTitleCell.innerHTML = 'Mean (' + pfmDiv.confidence + '% Confidence)';
	for(var i = 0; i < nrScenarios; i++) {
		var confidenceDist = pfmDiv.confidence == 90 ? focus.summary[i].confidenceDist90
				: (pfmDiv.confidence == 95 ? focus.summary[i].confidenceDist95 : focus.summary[i].confidenceDist99);
		if (confidenceDist > 0) {
		    focus.meanMinCells[i].innerHTML = (focus.summary[i].mean - confidenceDist).toFixed(precision);
		    focus.meanMaxCells[i].innerHTML = (focus.summary[i].mean + confidenceDist).toFixed(precision);
		} else {
		    focus.meanMinCells[i].innerHTML = "N/A";
		    focus.meanMaxCells[i].innerHTML = "N/A";
		}
	}

	pfmDiv.innerHTML = "";
	pfmDiv.appendChild(focus.summaryTable);
}

function initializePfmCorrelationPlot(pfmDiv, pfmIndex) {
	if(!pfmDiv)
		return;

	// erase any correlation data if I've switched focuses
	if(pfmDiv.focus && pfmDiv.focus != pfmData[pfmIndex])
		pfmDiv.correlationData = null;

	pfmDiv.focus = pfmData[pfmIndex];
	var toPfmIndex = pfmDiv.correlateToIndex;
	if(toPfmIndex == undefined || toPfmIndex == null)
		toPfmIndex = pfmDiv.getAttribute('data-correlate-to');
	if(toPfmIndex == undefined || toPfmIndex == null)
		toPfmIndex = 0;


	pfmDiv.correlateTo = pfmData[toPfmIndex];
	var focus = pfmDiv.focus;
	var correlateTo = pfmDiv.correlateTo;
	var nrScenarios = pfmScenarioNames.length;
	pfmDiv.chartType = PFM_CORRELATION_PLOT;

	pfmDiv.innerHTML = "<canvas>This chart is not supported in this browser</canvas>";
	var canvas = pfmDiv.getElementsByTagName("canvas")[0];
	pfmDiv.canvas = canvas;
	canvas.onResize = function() {
		if(!pfmDiv.fullScreen) {
			canvas.width = pfmDiv.clientWidth - 3;
			canvas.height = pfmDiv.clientHeight - 5;
		}
	};
	
	canvas.onResize();

	var ctx = canvas.getContext('2d');
	var popup = document.getElementById("flexsimpopup");

	if(!pfmDiv.correlationData)
		pfmDiv.correlationData = [];
	while(pfmDiv.correlationData.length <= toPfmIndex)
		pfmDiv.correlationData.push({});
	var corData = pfmDiv.correlationData[toPfmIndex];
	if(!corData.scenarios) {
		corData.scenarios = [];
		corData.xMin = 10000000000;
		corData.xMax = -10000000000;
		corData.yMin = 10000000000;
		corData.yMax = -10000000000;
		for(var i = 0; i < nrScenarios; i++) {
			var temp = {};
			var sumX = 0, sumY = 0, sumXY = 0;
			var nrReps = Math.min(focus.data[i].length, correlateTo.data[i].length);
			for(var j = 0; j < nrReps; j++) {
				var x = focus.data[i][j], y = correlateTo.data[i][j];
				if(x > corData.xMax) corData.xMax = x;
				if(x < corData.xMin) corData.xMin = x;
				if(y > corData.yMax) corData.yMax = y;
				if(y < corData.yMin) corData.yMin = y;
				sumX += x;
				sumY += y;
				sumXY += x * y;
			}
			var meanX = sumX / nrReps, meanY = sumY / nrReps;
			var rNumeratorSum = 0, rDenominatorSumX = 0, rDenominatorSumY = 0;
			for(var j = 0; j < nrReps; j++) {
				var diffX = focus.data[i][j] - meanX;
				var diffY = correlateTo.data[i][j] - meanY;
				rNumeratorSum += diffX * diffY;
				rDenominatorSumX += diffX * diffX;
				rDenominatorSumY += diffY * diffY;
			}
			temp.r = rNumeratorSum / (Math.sqrt(rDenominatorSumX) * Math.sqrt(rDenominatorSumY));
			temp.slope = rNumeratorSum / rDenominatorSumX;
			temp.yIntercept = meanY - temp.slope * meanX;

			corData.scenarios.push(temp);
		}
		// give some margins to the range and domain
		var marginX = (corData.xMax - corData.xMin) * 0.1;
		if(marginX <= 0) marginX = 1;
		corData.xMax += marginX;
		if(corData.xMin > 0 && corData.xMin - marginX < 0)
			corData.xMin = 0;
		else corData.xMin -= marginX;

		var marginY = (corData.yMax - corData.yMin) * 0.1;
		if(marginY <= 0) marginY = 1;
		corData.yMax += marginY;
		if(corData.yMin > 0 && corData.yMin - marginY < 0)
			corData.yMin = 0;
		else corData.yMin -= marginY;

		// now go through and find the intersections of the correlation line with the
		// box boundaries
		for(var i = 0; i < nrScenarios; i++) {
			var scenario = corData.scenarios[i];
			scenario.linePoints = [];
			// y = mx + b where m = scenario.slope and b = scenario.yIntercept
			// solve for x = corData.xMin
			var leftY = scenario.slope * corData.xMin + scenario.yIntercept;
			if(leftY >= corData.yMin && leftY <= corData.yMax)
				scenario.linePoints.push({x:corData.xMin, y:leftY});
			// solve for x = corData.xMax
			var rightY = scenario.slope * corData.xMax + scenario.yIntercept;
			if(rightY >= corData.yMin && rightY <= corData.yMax)
				scenario.linePoints.push({x:corData.xMax, y:rightY});

			// solve for y = corData.yMin
			var bottomX = (corData.yMin - scenario.yIntercept) / scenario.slope;
			if(bottomX >= corData.xMin && bottomX <= corData.xMax)
				scenario.linePoints.push({x:bottomX, y:corData.yMin});
			// solve for y = corData.yMax
			var topX = (corData.yMax - scenario.yIntercept) / scenario.slope;
			if(topX >= corData.xMin && topX <= corData.xMax)
				scenario.linePoints.push({x:topX, y:corData.yMax});
		}
	}

	canvas.draw = function draw() {
		var focus = pfmDiv.focus;

		var pickedObj = null;

		var rangeX = corData.xMax - corData.xMin;
		var rangeY = corData.yMax - corData.yMin;
		var marginTop = 20.5;
		if(pfmDiv.getAttribute('data-title') != 'none') {
			// draw the title
			ctx.font = "bold 13pt Tahoma";
			ctx.fillStyle = "#000000";
			var title = pfmDiv.getAttribute('data-title') || (focus.name + ' (x) vs ' + pfmDiv.correlateTo.name + ' (y)' );
			ctx.textAlign = "center";
			ctx.fillText(title, canvas.width / 2, 18);
			ctx.textAlign = "left";
			marginTop += 20;
		}
		var marginLeft = 5.5, marginRight = 10.5, marginBottom = 28.5;
		if(focus.valueName && focus.valueName != 'Value')
			marginBottom += 15;
		var graphBottom = this.height - marginBottom;

		ctx.font = "10pt Tahoma";
		var graphSy = this.height - (marginTop + marginBottom);
		if(graphSy < 5)
			return;

		if(correlateTo.valueName && correlateTo.valueName != 'Value') {
			ctx.save();
			ctx.translate(0, marginTop + 0.5*graphSy);
			ctx.rotate(-Math.PI / 2);
			ctx.textAlign = "center";
			ctx.fillText(correlateTo.valueName, 0, 13);
			ctx.restore();
			marginLeft += 15;
		}

		ctx.strokeStyle = "#e0e0e0";
		var yGrid = new YGrid(ctx, corData.yMin, corData.yMax, marginTop, graphSy, 18);
		marginLeft += yGrid.width;
		var graphSx = this.width - (marginLeft + marginRight);
		if(graphSx < 5)
			return;
		yGrid.draw(marginLeft, graphSx);

		var scenarioWidth = graphSx / nrScenarios;

		var x = marginLeft;
		ctx.lineWidth = 1;

		var xGrid = new XGrid(ctx, corData.xMin, corData.xMax, marginLeft, scenarioWidth);
		for(var i = 0; i < nrScenarios; i++) {
			var scenarioX = x;

			ctx.fillStyle = "black";
			ctx.strokeStyle = "#e0e0e0";
			xGrid.graphLeft = scenarioX;
			xGrid.draw(graphBottom, -graphSy);

			ctx.fillStyle = getIndexedColor(i+1, 50, 50);
			var nrReps = Math.min(focus.data[i].length, correlateTo.data[i].length);
			for(var j = 0; j < nrReps; j++) {
				var valX = focus.data[i][j];
				var valY = correlateTo.data[i][j];
				var x = Math.floor(scenarioX + scenarioWidth * (valX - corData.xMin)/rangeX) + 0.5;
				var y = Math.floor(graphBottom - graphSy * (valY - corData.yMin)/rangeY) + 0.5;
				ctx.beginPath();
				ctx.moveTo(x, y + 3);
				ctx.lineTo(x - 3, y);
				ctx.lineTo(x, y - 3);
				ctx.lineTo(x + 3, y);
				ctx.closePath();
				ctx.fill();
				if(canvas.pickMode == PICK_MODE_HOVER
						&& canvas.pickCursorX < x + 3
						&& canvas.pickCursorX > x - 3
						&& canvas.pickCursorY > y - 3
						&& canvas.pickCursorY < y + 3)
					pickedObj = {top:y - 3,left:x,right:x,text:'Replication: ' + (j + 1)
							+ '<br/>' + focus.name + ' (x): ' + focus.data[i][j].toFixed(2)
							+ '<br/>' + correlateTo.name + ' (y): ' + correlateTo.data[i][j].toFixed(2)};
			}

			var scenario = corData.scenarios[i];
			if(scenario.linePoints.length > 1) {
				ctx.strokeStyle = ctx.fillStyle;
				ctx.beginPath();
				var x = scenarioX + scenarioWidth * (scenario.linePoints[0].x - corData.xMin)/rangeX;
				var y = graphBottom - graphSy * (scenario.linePoints[0].y  - corData.yMin)/rangeY;
				ctx.moveTo(x, y);
				x = scenarioX + scenarioWidth * (scenario.linePoints[1].x - corData.xMin)/rangeX;
				y = graphBottom - graphSy * (scenario.linePoints[1].y  - corData.yMin)/rangeY;
				ctx.lineTo(x, y);
				ctx.stroke();
			}
			x = scenarioX + scenarioWidth;
		}
		ctx.fillStyle = "#000000";
		ctx.strokeStyle = "#808080";
		x = marginLeft;
		for(var i = 0; i < nrScenarios; i++) {
			var text = pfmScenarioNames[i] + ', r=' + corData.scenarios[i].r.toFixed(2);
			var textWidth = ctx.measureText(text).width;
			if(textWidth > scenarioWidth - 10) {
				text = 'S' + (i + 1) + ', r=' + corData.scenarios[i].r.toFixed(2);
				textWidth = ctx.measureText(text).width;
			}
			if(i > 0)
				ctx.strokeRect(Math.floor(x) + 0.5, marginTop, 0, graphSy);
			ctx.fillText(text, x + 0.5*(scenarioWidth - textWidth), marginTop - 3, scenarioWidth);
			x += scenarioWidth;
		}
		
		if(focus.valueName && focus.valueName != 'Value') {
			ctx.textAlign = "center";
			ctx.fillText(focus.valueName, marginLeft + 0.5*graphSx, graphBottom + 25)
			ctx.textAlign = "left";
		}

		ctx.lineWidth = 1;
		ctx.strokeRect(marginLeft, marginTop, graphSx, graphSy);

		ctx.font = "8pt Tahoma";
		ctx.fillStyle = "#a0a0a0";
		ctx.fillText("Correlation Coefficient [-1 <= r <=  1] where 0 = none, -1=strong negative, 1=strong positive", 10, this.height - 5);

		if(canvas.pickMode) {
			if(popup!=null) {
				if(pickedObj) {
					popup.style.display = "block";
					popup.innerHTML = pickedObj.text;
					var pos = findDocumentPos(canvas);
					var scrollPos = windowScrollPos();
					popup.style.left = (pos[0] - scrollPos.left + (pickedObj.left + pickedObj.right-popup.offsetWidth)/2)+'px';
					popup.style.top = (pos[1] - scrollPos.top - pfmDiv.scrollTop + pickedObj.top - popup.offsetHeight - 5)+'px';

				}
				else popup.style.display = "none";
			}
		}
	}

	pfmDiv.repaint = function repaint() {ctx.clearRect(0,0, canvas.width, canvas.height); canvas.draw();};

	canvas.onMouseMove = function onMouseMove(e) {
		canvas.pickMode = PICK_MODE_HOVER;
		canvas.pickCursorX = e.offsetX;
		canvas.pickCursorY = e.offsetY;
		canvas.getContext('2d').clearRect(0,0,canvas.width, canvas.height);
		canvas.draw();
		canvas.pickMode = 0;
	}

	canvas.onWindowResize = function onWindowResize() {
		if(pfmDiv.fullScreen) {
			var vp = viewport();
			canvas.width = vp.width - 3;
			canvas.height = vp.height - 7;
		}
		canvas.draw();
	}

	canvas.addEventListener('mousemove', canvas.onMouseMove, false);
	canvas.onWindowResize();
	if(pfmDiv.fullScreen)
		window.addEventListener("resize", canvas.onWindowResize, false);

}

function showOverlay(show) {
	var overlayDiv = document.getElementById('dialogoverlay');
	if(!overlayDiv) return;
	overlayDiv.style.display = show ? 'block' : 'none';
	var container = document.getElementById('dialogcontainer');
	container.style.display = show ? 'block' : 'none';
	if(show) {
		document.getElementById('flexsimpopup').style.display = 'none';
		container.style.marginLeft = (-container.offsetWidth / 2) + 'px';
	}
}

/* 
calculated for confidence 90, 95, and 99

Please note that this table actually corresponds to the 95, 97.5, and 99.5 confidence
entries for the t distribution. The t distribution entries use the values to find the
probability that the actual mean is below a certain point. We want to calculate whether
the actual mean is below AND above certain points. So a 95% confidence that the mean is
below a certain value corresponds to a 90% confidence that the mean is below one value
and above another (since it is a symmetric bell curve).
*/
var qTable = 
[
[1,		6.314,  12.706,  63.657],
[2,		2.920,  4.303,  9.925],
[3,		2.353,  3.182,  5.841],
[4,		2.132,  2.776,  4.604],
[5,		2.015,  2.571,  4.032],
[6,		1.943,  2.447,  3.707],
[7,		1.895,  2.365,  3.499],
[8,		1.860,  2.306,  3.355],
[9,		1.833,  2.262,  3.250],
[10,	1.812,  2.228,  3.169],
[11,	1.796,  2.201,  3.106],
[12,	1.782,  2.179,  3.055],
[13,	1.771,  2.160,  3.012],
[14,	1.761,  2.145,  2.977],
[15,	1.753,  2.131,  2.947],
[16,	1.746,  2.120,  2.921],
[17,	1.740,  2.110,  2.898],
[18,	1.734,  2.101,  2.878],
[19,	1.729,  2.093,  2.861],
[20,	1.725,  2.086,  2.845],
[21,	1.721,  2.080,  2.831],
[22,	1.717,  2.074,  2.819],
[23,	1.714,  2.069,  2.807],
[24,	1.711,  2.064,  2.797],
[25,	1.708,  2.060,  2.787],
[26,	1.706,  2.056,  2.779],
[27,	1.703,  2.052,  2.771],
[28,	1.701,  2.048,  2.763],
[29,	1.699,  2.045,  2.756],
[30,	1.697,  2.042,  2.750],

[40,	1.684,  2.021,  2.704],

[50,	1.676,  2.009,  2.678],

[75,	1.665,  1.992,  2.643],

[100,	1.660,  1.984,  2.626],

[1000,	1.646,  1.962,  2.581]

];

function qStudentT(quant, df) {
	if(df <= 0) return 0;
	var index = 0;

	if(df <= 30)
		index = df - 1;
	else
	{
		for(var j = 34; j > 28; j--) {
			if(df >= qTable[j][0] ) {
				index = j;
				break;
			}
		}
	}

	if(quant <= .90001) return qTable[index][1];
	else if(quant <= .95001) return qTable[index][2];
	else return qTable[index][3];
	return 0;
}


function calculateConfidence(stdDev, nrPoints, confidence) {
	confidence *= 0.01;
	var quant = qStudentT(confidence, nrPoints - 1);
	return  stdDev*quant/Math.sqrt(nrPoints);
}

//javascript functions for exported experiment reports
//class functions from http://snippets.dzone.com/posts/show/2630

// ----------------------------------------------------------------------------
// HasClassName
//
// Description : returns boolean indicating whether the object has the class name
//    built with the understanding that there may be multiple classes
//
// Arguments:
//    objElement              - element to manipulate
//    strClass                - class name to add
//
function HasClassName(objElement, strClass)
   {

   // if there is a class
   if ( objElement.className )
      {

      // the classes are just a space separated list, so first get the list
      var arrList = objElement.className.split(' ');

      // get uppercase class for comparison purposes
      var strClassUpper = strClass.toUpperCase();

      // find all instances and remove them
      for ( var i = 0; i < arrList.length; i++ )
         {

         // if class found
         if ( arrList[i].toUpperCase() == strClassUpper )
            {

            // we found it
            return true;

            }

         }

      }

   // if we got here then the class name is not there
   return false;

   }
//
// HasClassName
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// AddClassName
//
// Description : adds a class to the class attribute of a DOM element
//    built with the understanding that there may be multiple classes
//
// Arguments:
//    objElement              - element to manipulate
//    strClass                - class name to add
//
function AddClassName(objElement, strClass, blnMayAlreadyExist)
   {

   // if there is a class
   if ( objElement.className )
      {

      // the classes are just a space separated list, so first get the list
      var arrList = objElement.className.split(' ');

      // if the new class name may already exist in list
      if ( blnMayAlreadyExist )
         {

         // get uppercase class for comparison purposes
         var strClassUpper = strClass.toUpperCase();

         // find all instances and remove them
         for ( var i = 0; i < arrList.length; i++ )
            {

            // if class found
            if ( arrList[i].toUpperCase() == strClassUpper )
               {

               // remove array item
               arrList.splice(i, 1);

               // decrement loop counter as we have adjusted the array's contents
               i--;

               }

            }

         }

      // add the new class to end of list
      arrList[arrList.length] = strClass;

      // add the new class to beginning of list
      //arrList.splice(0, 0, strClass);

      // assign modified class name attribute
      objElement.className = arrList.join(' ');

      }
   // if there was no class
   else
      {
      // assign modified class name attribute
      objElement.className = strClass;
      }
   }
//
// AddClassName
// ----------------------------------------------------------------------------


// ----------------------------------------------------------------------------
// RemoveClassName
//
// Description : removes a class from the class attribute of a DOM element
//    built with the understanding that there may be multiple classes
//
// Arguments:
//    objElement              - element to manipulate
//    strClass                - class name to remove
//
function RemoveClassName(objElement, strClass)
   {
   // if there is a class
   if ( objElement.className )
      {
      // the classes are just a space separated list, so first get the list
      var arrList = objElement.className.split(' ');
      // get uppercase class for comparison purposes
      var strClassUpper = strClass.toUpperCase();
      // find all instances and remove them
      for ( var i = 0; i < arrList.length; i++ )
         {
         // if class found
         if ( arrList[i].toUpperCase() == strClassUpper )
            {
            // remove array item
            arrList.splice(i, 1);
            // decrement loop counter as we have adjusted the array's contents
            i--;
            }
         }
      // assign modified class name attribute
      objElement.className = arrList.join(' ');
      }
   // if there was no class
   // there is nothing to remove
   }
//
// RemoveClassName
// ----------------------------------------------------------------------------


function toggleElementView(elmid){
	elm = document.getElementById(elmid+"_raw");
	if(elm!=null){
		if(HasClassName(elm, "show")){
			RemoveClassName(elm, "show");
			AddClassName(elm, "noshow");

			obj = document.getElementById(elmid+"_toggle");
			if(obj!=null){
				obj.className = "expand";
				obj.innerHTML = "<span>+</span>";
			}
		}
		else{
			RemoveClassName(elm, "noshow");
			AddClassName(elm, "show");

			obj = document.getElementById(elmid+"_toggle");
			if(obj!=null){
				obj.className = "collapse";
				obj.innerHTML = "<span>-</span>";
			}
		}
	}
}


document.addEventListener('DOMContentLoaded', pfmOnDocLoaded, false);
