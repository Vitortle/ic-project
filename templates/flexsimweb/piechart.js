

function initializePieChart(divTag){
	try{
	var mainDiv = divTag;
	var className = mainDiv.getAttribute('class');
	if(className && className.indexOf('fullscreen', 0) >= 0){
		mainDiv.style['overflow-x'] = 'hidden';
		mainDiv.style['overflow-y'] = 'hidden';
		if(mainDiv.style.overflow)
			delete mainDiv.style.overflow;
	}
	divTag.innerHTML = "<canvas width='10px' height='30px'>Not supported by this browser</canvas>";

	var canvas = divTag.children[0];
	if (mainDiv.offsetWidth == 0) {
		var width = mainDiv.style.width;
		if (width.substring(width.length - 2, width.length) == "px")
			width = width.substring(0, width.length - 2);
		canvas.width = width - 5;
	} else {
		canvas.width = mainDiv.offsetWidth - 5;
	}
	if (mainDiv.offsetHeight == 0) {
		var height = mainDiv.style.height;
		if (height.substring(height.length - 2, height.length) == "px")
			height = height.substring(0, height.length - 2);
		canvas.height = height;
	} else {
		canvas.height = mainDiv.offsetHeight;
	}
	var ctx = canvas.getContext('2d');
	var popup = document.getElementById("flexsimpopup");
	mainDiv.draw = function draw(){
		try{
		ctx.clearRect(0,0, canvas.width, canvas.height);
		// draw canvas title
		if(canvas.mainTitle){
			ctx.textAlign = 'center';
			ctx.font = "bold " + (canvas.fontSize * 1.1) + "pt Tahoma";
			ctx.fillStyle = "black";
			ctx.fillText(canvas.mainTitle, canvas.width / 2, canvas.fontSize *1.5);
			ctx.textAlign = 'left';
		}
		if(!canvas.bundle)
			return 0;
		var nrEntries = canvas.bundle.nrEntries;
		var nrFields = canvas.bundle.nrFields;
		ctx.font = canvas.fontSize + "pt Tahoma";
		var xReset = 13;
		var yInterval = canvas.fontSize * 1.3;
		var x = xReset, y = canvas.fontSize * 1.8;
		var allUtilized = true;

		// figure out if everything is "utilized" and if needed, draw the legend
		// 2 loops, one for utilized states, one for idle states

		for(var k = 0; k < 2; k++){
			// go through each field
			for(var i = 2; i < nrFields; i++){
				// see if that field represents a "utilized" state
				var utilizedValue = canvas.bundle.getValue(0, i);
				if(utilizedValue == STATE_EXCLUDED) continue;
				var utilizedState = utilizedValue == STATE_UTILIZED 
					|| (canvas.doUtilization == UTILIZATION_SHOW_ALL && utilizedValue != STATE_EXCLUDED);
				// if it's not a utilized state, then this is a utilization chart, instead of just a state bar chart
				if(!utilizedState) allUtilized = false;
				if(!canvas.showLegend) continue;
				// if the utilizedState-ness of the field is not the same as my current k loop, skip it
				if(utilizedState == k || (!utilizedState && canvas.doUtilization == UTILIZATION_HIDE)) continue;
				// now go through each entry, and first, see if there are any object with non-zero state
				// and second, get the total utilized time for each object
				for(var j = 1; j < nrEntries; j++){
					var timeInState = canvas.bundle.getValue(j,i) * canvas.dataScale;

					if(timeInState > 0){
						// if it's a state to draw and I haven't drawn it yet, then draw the legend color for the state
						var stateName = canvas.bundle.getFieldName(i);
						var width = canvas.fontSize *1.8 + ctx.measureText(stateName).width;
						if(x + width > canvas.width){
							x = xReset;
							y += yInterval;
						}
						// draw the legend color box and the name of the state
						if (canvas.colors.length > 0)
							ctx.fillStyle = getRGBColor(canvas.colors, i-2, k==0?1:0.18);
						else
							ctx.fillStyle = getIndexedColor(i-1, [40,80], [50,80], k==0?1:0.18);
						ctx.fillRect(x,y, canvas.fontSize, canvas.fontSize);
						ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, canvas.fontSize, canvas.fontSize);
						ctx.fillStyle = "#000000";
						ctx.fillText(stateName, x + canvas.fontSize *1.2, y + canvas.fontSize);
						x += width;
						break;
					}
				}
			}
		}
		if(x != xReset) y += yInterval;
		if(nrEntries <= 1)
			return 0;

		var nrPieCharts = 1;
		if(!canvas.stacked) {
			var lastGroupName = "";
			nrPieCharts = 0;
			for(var i = 1; i < nrEntries; i++) {
				var groupName = canvas.bundle.getValue(i, 1);
				if(groupName == "" || groupName != lastGroupName)
					nrPieCharts++;
				lastGroupName = groupName;
			}
		}
		var chartHeaderHeight = nrPieCharts == 1 ? (canvas.doUtilization ? canvas.fontSize * 1.2 : 0) : (canvas.doUtilization ? canvas.fontSize * 2.4 : canvas.fontSize * 1.2);

		if(mainDiv.sizeToNeeds) {
			var preferredDiameter = 100;
			if(mainDiv.offsetHeight != y + chartHeaderHeight + preferredDiameter + 5)
				mainDiv.style.height = (y + chartHeaderHeight + preferredDiameter + 5) + 'px';

			mainDiv.style.height = canvas.height + 'px'; //Hack, for some reason the canvas is larger than the mainDiv making the Add Chart button unclickable
				
			if(canvas.height < y + chartHeaderHeight + preferredDiameter) {
				canvas.height = y + chartHeaderHeight + preferredDiameter +1;
				this.draw();
				return 0;
			}
		}

		var availableWidth = canvas.width - 10;
		var availableHeight = canvas.height - y;
		var availableArea = availableWidth * availableHeight;
		var areaPerChart = availableArea / nrPieCharts;
		// formula: radius * (radius + chartHeaderHeight) = areaPerChart
		// solve for radius
		// radius^2 + chartHeaderHeight*radius - areaPerChart = 0
		// use the quadratic formula
		// x = (-b +- sqrt(b^2 - 4ac)) / 2a
		var sqrtfactor = Math.sqrt(chartHeaderHeight*chartHeaderHeight - 4*-areaPerChart);
		var solution1 = (-chartHeaderHeight + sqrtfactor)/2;
		var solution2 = (-chartHeaderHeight - sqrtfactor)/2;

		var chartW = Math.max(solution1, solution2);
		var chartH = chartW + chartHeaderHeight;
		var nrChartsWide = Math.floor(availableWidth / chartW);
		var nrChartsHigh = Math.floor(availableHeight / chartH);
		while(nrChartsWide * nrChartsHigh < nrPieCharts) {
			var diffToOneMoreWide = nrChartsHigh == 0 ? 1000000 : chartW - (availableWidth / (nrChartsWide + 1));
			var diffToOneMoreHigh = nrChartsWide == 0 ? 1000000 : chartH - (availableHeight / (nrChartsHigh + 1));
			var diff = Math.min(diffToOneMoreWide, diffToOneMoreHigh) + 0.5;
			chartW -= diff;
			chartH -= diff;
			nrChartsWide = Math.floor(availableWidth / chartW);
			nrChartsHigh = Math.floor(availableHeight / chartH);
		}
		var radius = chartW/2 - 3;
		if(radius < 5)
			return 0;

		var startX = (canvas.width - Math.min(nrPieCharts, nrChartsWide)*chartW)/2;
		var x = startX;

		var rowCount = 0;
		var entryNr = 1;
		ctx.textAlign = "center";
		for(var chart = 0; chart < nrPieCharts; chart++, entryNr++) {
			var centerX = x + chartW/2, centerY = y + chartHeaderHeight + chartW/2;
			var startEntryNr = entryNr;
			var combineNrEntries = 1;
			var groupName = canvas.bundle.getValue(entryNr, 1);
			var sumGroup = groupName.indexOf("#sum") >= 0 && !canvas.byPercent;
			var objName = canvas.bundle.getValue(entryNr, 0);
			if (canvas.stacked) {
				combineNrEntries = nrEntries - 1;
				entryNr = nrEntries - 1;
			}
			else if(groupName.length > 0) {
				objName = groupName.replace("#sum", "");;
				while(entryNr < nrEntries - 1 && canvas.bundle.getValue(entryNr+1, 1) == groupName) {
					combineNrEntries++;
					entryNr++;
				}
			}
			var angle = 0;
			var totalTotal = 0;
			for(var i = 2; i < nrFields; i++) {
				var utilizedValue = canvas.bundle.getValue(0, i);
				if(utilizedValue == STATE_EXCLUDED) continue;

				for(var j = startEntryNr; j <= entryNr; j++)
					totalTotal += canvas.bundle.getValue(j, i) * canvas.dataScale;
			}
			var mouseInCircle = false, mouseAngleFromCenter = 0;
			if(canvas.pickMode) {
				var diffX = canvas.pickCursorX - centerX;
				var diffY = canvas.pickCursorY - centerY;
				var dist = Math.sqrt(diffX*diffX + diffY*diffY);
				mouseInCircle = (dist <= radius);
				if(mouseInCircle) {
					mouseAngleFromCenter = Math.atan2(diffY, diffX);
					if(mouseAngleFromCenter < 0) mouseAngleFromCenter += 2*Math.PI;
				}
			}
			//ctx.strokeStyle = "#666666"
			var totalUtilized = 0;
			ctx.lineWidth = 1;
			for(var k = 1; k >= 0; k--) {
				ctx.strokeStyle = k == 0 ? "#555555" : "aaaaaa";
				for(var i = 2; i < nrFields; i++) {
					var utilizedValue = canvas.bundle.getValue(0, i);
					if(utilizedValue == STATE_EXCLUDED) continue;
					var utilizedState = utilizedValue == STATE_UTILIZED
						|| (canvas.doUtilization == UTILIZATION_SHOW_ALL && utilizedValue != STATE_EXCLUDED);

					// if the utilizedState-ness of the field is not the same as my current k loop, skip it
					if(utilizedState == k || (!utilizedState && canvas.doUtilization == UTILIZATION_HIDE)) continue;
					var total = 0;
					for(var j = startEntryNr; j <= entryNr; j++)
						total += canvas.bundle.getValue(j, i) * canvas.dataScale;

					if(k == 0) totalUtilized += total;

					var percent = totalTotal > 0 ? total / totalTotal : 0;
					if(percent > 0)
					{
						var mainColor;
						var darkColor;
						if (canvas.colors.length > 0) {
							mainColor = getRGBColor(canvas.colors, i-2, k!=1?1:0.18);
							var r = canvas.colors[i-2][0] *0.67;
							var g = canvas.colors[i-2][1] *0.67;
							var b = canvas.colors[i-2][2] *0.67;
							darkColor = ["rgba(", r.toFixed(0), ", ", g.toFixed(0), ",", b.toFixed(0), ",", k!=1?1:0.18, ")"].join("");
						} else {
							mainColor = getIndexedColor(i-1,[40,80], [50,80], k!=1?1:0.18);
							darkColor = getIndexedColor(i-1,[20,60], [30,60], k!=1?1:0.18);
						}
						var gradient = ctx.createRadialGradient(centerX, centerY, radius - Math.min(6, 0.1*radius), centerX, centerY, radius);
						gradient.addColorStop(0, mainColor);
						gradient.addColorStop(1, darkColor);
						ctx.fillStyle = gradient;
						ctx.beginPath();
						ctx.moveTo(centerX, centerY);
						var angleDiff = percent*2*Math.PI;
						ctx.arc(centerX, centerY, radius, angle, angle + angleDiff, 0);
						ctx.lineTo(centerX, centerY);
						ctx.closePath();
						ctx.fill();
						//ctx.stroke();
						if(mouseInCircle && mouseAngleFromCenter >= angle && mouseAngleFromCenter < angle + angleDiff) {
							var middleAngle = angle + 0.5*angleDiff;
							var displayTotal = sumGroup ? total : total / combineNrEntries;
							canvas.pickedWedge = {fieldIndex:i, total:displayTotal, percent:100*percent,
								x: centerX + 0.5*radius*Math.cos(middleAngle),
								y: centerY + 0.5*radius*Math.sin(middleAngle),
								combineNrEntries:combineNrEntries,
								sumGroup: sumGroup};
						}
						angle += angleDiff;
					}
				}
			}

			
			ctx.fillStyle = "black";
			var topText = "";
			var bottomText = "";
			if (nrPieCharts > 1) {
				topText = objName;
			} else {
				bottomText = (canvas.stacked ? "Average" : objName) + " ";
			}
			
			if(canvas.doUtilization) {
				if(canvas.byPercent)
					bottomText += numToString(totalTotal > 0 ? 100 * totalUtilized / totalTotal : 0, canvas.precision) + "%";
				else if (sumGroup)
					bottomText += numToString(totalUtilized, canvas.precision);
				else 
					bottomText += numToString(totalUtilized / combineNrEntries, canvas.precision);
			}
			var width = Math.max(ctx.measureText(topText).width, ctx.measureText(bottomText).width);
			ctx.clearRect(centerX - 0.5*width - 3, y, width + 6, chartHeaderHeight);
			if(nrPieCharts > 1)
				ctx.fillText(topText, centerX, y + canvas.fontSize);
			if(canvas.doUtilization)
				ctx.fillText(bottomText, centerX, y + chartHeaderHeight);


			x += chartW;
			rowCount++;
			if(rowCount >= nrChartsWide) {
				y += chartH;
				x = startX;
				rowCount = 0;
			}
		}


		return 0;

		}catch(e){print('exception caught in piechart mainDiv.draw() '); printError(e, "piechart.js");}
	}

	mainDiv.initializeData = function initializeData(bundleHeader){
		try{
			canvas.bundle = Bundle.interpretHeader(bundleHeader);
			this.draw();
		}catch(e){print('exception caught in piechart canvas.initializeData() '); printError(e, "piechart.js");}
	}

	mainDiv.updateData = function updateData(bundleData){
		try{
			canvas.bundle = Bundle.interpretData(bundleData, canvas.bundle);
			if(!canvas.expandedGroups || canvas.bundle.nrEntries != canvas.expandedGroups.length){
				canvas.expandedGroups = [];
				for(var i = 0; i < canvas.bundle.nrEntries; i++)
					canvas.expandedGroups.push(false);
			}
			if(popup && popup.style.display != 'none') {
				var e = {offsetX:canvas.pickCursorX, offsetY:canvas.pickCursorY, target:canvas};
				canvas.onMouseMove(e);
			}
			else this.draw();
		}catch(e){
			print('exception caught in piechart canvas.updateData() ');
			printError(e, "piechart.js");
		}
	}

	mainDiv.setProperties = function setProperties(properties, redraw){
		try{
			if(properties.chartType != CHART_TYPE_PIE && properties.chartType != "piechart")
				return initializeChart(this, properties, redraw);
			
			//If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
			if (properties.stacked == undefined)
				properties.stacked = mainDiv.getAttribute('data-stacked') == 'true';
			if (properties.byPercent == undefined)
				properties.byPercent = mainDiv.getAttribute('data-by-percent') == 'true';
			if (properties.doUtilization == undefined)
				properties.doUtilization = mainDiv.getAttribute('data-do-utilization') == 'true';
			if (properties.showLegend == undefined)
				properties.showLegend = mainDiv.getAttribute('data-show-legend') == 'true';
			if (properties.colors == undefined)
			    properties.colors = eval(mainDiv.getAttribute('data-colors')) || [];
			if (properties.fontSize == undefined)
			    properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 11;
			if (properties.precision == undefined)
				properties.precision = parseFloat(mainDiv.getAttribute('data-precision')) || 1;
			if (properties.dataScale == undefined)
				properties.dataScale = parseFloat(mainDiv.getAttribute('data-data-scale')) || 1;
			
			canvas.mainTitle = properties.title;
			canvas.stacked = properties.stacked;
			canvas.byPercent = properties.byPercent;
			canvas.doUtilization = properties.doUtilization;
			canvas.showLegend = properties.showLegend;
			canvas.colors = properties.colors;
			canvas.fontSize = properties.fontSize;
			canvas.precision = properties.precision;
			canvas.dataScale = properties.dataScale;
			
			if(redraw)
				this.draw();
		}catch(e){
			print('exception caught in piechart canvas.setProperties() ');
			printError(e, "piechart.js");
		}
	}
	canvas.onMouseMove = function onMouseMove(e){
		try{
		canvas.pickMode = PICK_MODE_HOVER;
		popup.style.display = "none";
		setMouseOffsets(e);
		canvas.pickCursorX = e.offsetX;
		canvas.pickCursorY = e.offsetY;
		canvas.pickedWedge = null;
		mainDiv.draw();
		canvas.pickMode = 0;
		if(canvas.pickedWedge) {
			popup.style.display = "block";
			var html = canvas.bundle.getFieldName(canvas.pickedWedge.fieldIndex) + ": ";
			if(canvas.pickedWedge.combineNrEntries > 1 && !canvas.byPercent) {
				if (canvas.pickedWedge.sumGroup)
					html += "Total ";
				else
					html += "Average ";
			}
			html += numToString(canvas.byPercent ? canvas.pickedWedge.percent : canvas.pickedWedge.total, canvas.precision);
			if(canvas.byPercent)
				html += "%";
			
			popup.innerHTML = html;
			var pos = findDocumentPos(canvas);
			popup.style.left = (pos[0] + canvas.pickedWedge.x - popup.offsetWidth/2)+'px';
			popup.style.top = (pos[1] + canvas.pickedWedge.y - popup.offsetHeight/2)+'px';
		}
		}catch(e){
			printError(e, "piechart.js");
		}

	}

	//Called from dragresize.js
	mainDiv.onResize = function onResize() {
	    canvas.width = mainDiv.offsetWidth - 5;
	    canvas.height = mainDiv.offsetHeight;
	    mainDiv.draw();
	}

	mainDiv.onselectstart = function () { return false; };

	canvas.addEventListener("mousemove", canvas.onMouseMove, false);
	canvas.addEventListener("mouseout", function onMouseOut(e){
		if(popup!=null && e.toElement != popup) {
			popup.style.display="none";
		}}, false);

	mainDiv.draw();
	window.addEventListener("resize", mainDiv.onResize, false);

	}catch(e){
		print('exception caught in initializePieChart() '); printError(e, "piechart.js");
	}
}