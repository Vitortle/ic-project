

function initializeBarChart(divTag) {
	try{
	var mainDiv = divTag;
	var className = mainDiv.getAttribute('class');
	if(className && className.indexOf('fullscreen', 0) >= 0) {
		mainDiv.style['overflow-x'] = 'hidden';
		if(mainDiv.style.overflow)
			delete mainDiv.style.overflow;
	}
	
	divTag.innerHTML = "<canvas class='chartheader' width='10px' height='30px'>Not supported by this browser</canvas>\
		<div class='verticalscroll'><canvas width='10px' height='10px'></canvas></div>";

	var canvases = divTag.getElementsByTagName("canvas");
	var canvasHeader = canvases[0];
	var canvas = canvases[1];
	var ctx = canvas.getContext('2d');
	var headerCtx = canvasHeader.getContext('2d');
	var popup = document.getElementById("flexsimpopup");

	mainDiv.draw = function draw() {
	    try{
	    var graphDiv = canvas.parentNode;
	    canvasHeader.width = mainDiv.offsetWidth;
	    headerCtx.clearRect(0,0, canvasHeader.width, canvasHeader.height);
	    ctx.clearRect(0,0, canvas.width, canvas.height);
	        // draw canvas title
	    if (canvas.mainTitle) {
	        headerCtx.font = "bold " + (canvas.fontSize * 1.1) + "pt Tahoma";
	        var titleWidth = headerCtx.measureText(canvas.mainTitle ).width;
	        headerCtx.fillText(canvas.mainTitle, (canvasHeader.width - titleWidth) / 2, canvas.fontSize * 1.5);
	    }

		if(!canvas.bundle || !canvas.expandedGroups)
			return 0;
		var nrEntries = canvas.bundle.nrEntries;
		var nrFields = canvas.bundle.nrFields;
		headerCtx.font = (canvas.fontSize * 0.9) + "pt Tahoma";
		var xReset = 13;
		var defaultBarH = canvas.barSize;
		var smallBarH = Math.round(canvas.barSize * 0.6666667);
		var defaultBarGap = Math.round(canvas.barSize >= canvas.fontSize ? canvas.barSize *0.5 : canvas.fontSize *0.75);
		var smallBarGap = Math.round(canvas.fontSize *0.8);

		var yInterval = canvas.fontSize * 1.3;
		var x = xReset, y = canvas.fontSize * 1.8;
		var allUtilized = true;

		// 2 loops, one for utilized states, one for idle states
		for(var k = 0; k < 2; k++) {
			// go through each field
			for(var i = 2; i < nrFields; i++) {
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
				for(var j = 1; j < nrEntries; j++) {
					var timeInState = canvas.bundle.getValue(j,i) * canvas.dataScale;

					if(timeInState > 0) {
						// if it's a state to draw and I haven't drawn it yet, then draw the legend color for the state
						var stateName = canvas.bundle.getFieldName(i);
						var width = canvas.fontSize * 1.8 + headerCtx.measureText(stateName).width;
						if(x + width > canvas.width) {
							x = xReset;
							y += canvas.fontSize + defaultBarGap;
						}
						// draw the legend color box and the name of the state
						if (canvas.colors.length > 0)
							headerCtx.fillStyle = getRGBColor(canvas.colors, i-2, k==0?1:0.18);
						else
							headerCtx.fillStyle = getIndexedColor(i-1, [40,80], [50,80], k==0?1:0.18);
						headerCtx.fillRect(x, y, canvas.fontSize, canvas.fontSize);
						headerCtx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, canvas.fontSize, canvas.fontSize);
						headerCtx.fillStyle = "#000000";
						headerCtx.fillText(stateName, x + canvas.fontSize * 1.2, y + canvas.fontSize);
						x += width;
						break;
					}
				}
			}
		}
		y += 5;
		if (x != xReset) y += yInterval;
		// if I need to resize the canvas, then redraw it
		var headerBottom = Math.round(y + canvas.fontSize);
		if(headerBottom != canvasHeader.height) {
			canvasHeader.height = headerBottom;
		    this.draw();
			return 0;
		}
		if(nrEntries <= 1)
			return 0;

		if(mainDiv.sizeToNeeds) {
			if(mainDiv.offsetHeight != canvasHeader.height + canvas.height + 5)
				mainDiv.style.height = (canvasHeader.height + canvas.height + 5) + 'px';
		}
		else {
			if(graphDiv.offsetHeight != mainDiv.offsetHeight - canvasHeader.height - 2)
				graphDiv.style.height = (mainDiv.offsetHeight - canvasHeader.height - 2) + 'px';
		}

		canvas.width = graphDiv.offsetWidth - 15; //Subtract scroll bar

		var graphTop = -1;
		y = graphTop + 5;
		var maxNameWidth = 0;
		ctx.font = canvas.fontSize + "pt Tahoma";
		ctx.fillStyle = "#000000";
		var withinExpandedGroup = 0;
		var pickedExpander = null;

		// figure out how much horizontal space all the object names will take up
		var groupSize = [];
		for(var i = 1; i < nrEntries; i++) {
			var objectName = canvas.bundle.getValue(i,0);
			var groupFullName = canvas.bundle.getValue(i, 1);
			var groupName = groupFullName.replace("#sum", "");
			groupName = groupName.replace("#nototal", "");
			groupSize[i] = 0;
			var x = xReset;
			if(groupFullName.length > 0) {
				var firstInGroup = (i == 1 || groupFullName != canvas.bundle.getValue(i - 1, 1));
				if(firstInGroup) {
				    ctx.font = (canvas.fontSize * 0.8) + "pt Tahoma";
					var j;
					for(j = i; canvas.bundle.getValue(j, 1) == groupFullName; j++) {
						if(canvas.expandedGroups[i]) {
							var objectName = canvas.bundle.getValue(j,0);
							var width = ctx.measureText(objectName).width;
							if(x + 10 + width > maxNameWidth) maxNameWidth = x + 10 + width;
						}
					}
					if (j > i) { //Make sure it's a group
					    groupSize[i] = j - i;
						ctx.font = canvas.fontSize + "pt Tahoma";
						objectName = groupName;
						i = j - 1;
					} 
				}
			}
			
			var width = ctx.measureText(objectName).width;
			if(x + width > maxNameWidth) maxNameWidth = x + width;
		}
		
		var maxStateTime = 0;
		var maxTotalTime = 0;
		var totalTimes = new Array();
		var entryMaxStateTimes = new Array();
		for(var i = nrEntries - 1; i >= 1; i--) {
			totalTimes[i] = 0;
			entryMaxStateTimes[i] = 0;
			for(var j = 2; j < nrFields; j++) {
				var timeInState = canvas.bundle.getValue(i,j) * canvas.dataScale;
				var utilizedValue = canvas.bundle.getValue(0,j);
				var utilizedState = utilizedValue == STATE_UTILIZED;
				if(timeInState > entryMaxStateTimes[i] && (utilizedState || canvas.doUtilization != UTILIZATION_HIDE))
					entryMaxStateTimes[i] = timeInState;
				if(utilizedValue != STATE_EXCLUDED && (canvas.doUtilization != UTILIZATION_HIDE || utilizedState))
					totalTimes[i]  += timeInState;
			}
			if(entryMaxStateTimes[i] > maxStateTime)
				maxStateTime = entryMaxStateTimes[i];
			if(totalTimes[i]  > maxTotalTime)
				maxTotalTime = totalTimes[i] ;
			if(groupSize[i] > 1 && canvas.bundle.getValue(i, 1).indexOf("#sum") >= 0) {
				var sum1 = totalTimes[i];
				var sum2 = entryMaxStateTimes[i];
				for(var j = i + 1; j < i + groupSize[i]; j++) {
					sum1 += totalTimes[j];
					sum2 += entryMaxStateTimes[j];
				}
				if(sum1 > maxTotalTime)
					maxTotalTime = sum1;
				if(sum2 > maxStateTime)
					maxStateTime = sum2;
			}
		}

		var graphLeft = maxNameWidth + 5;
		var utilizedMargin = 0;
		if(!allUtilized) {
			if(canvas.byPercent)
			    utilizedMargin = ctx.measureText("100%" + utilizedMargin.toFixed(canvas.precision)).width;
			else utilizedMargin = ctx.measureText(maxTotalTime.toFixed(canvas.precision)).width + 10;
		}
		graphLeft += utilizedMargin;
		var graphWidth = canvas.width - graphLeft - 5;
		var graphRight = canvas.width - 5;
		if (graphWidth <= 0) return 0;

		y = graphTop;
		var yStart = y;

		var rangeMax, graphRangeMax;
		if(canvas.byPercent) {
			if(canvas.stacked) {
				rangeMax = 100, graphRangeMax = 100;
			} else {
				rangeMax = 100 * maxStateTime / maxTotalTime;
				graphRangeMax = Math.ceil(maxStateTime * 10 / maxTotalTime)*10;
			}
		} else {
			rangeMax = canvas.stacked ? maxTotalTime : maxStateTime;
			graphRangeMax = rangeMax;
		}
		ctx.strokeStyle = "#dddddd";
		headerCtx.strokeStyle = "#444444";
		headerCtx.strokeRect(Math.floor(graphLeft) + 0.5, Math.floor(headerBottom) - 0.5, graphWidth, 1);
		var xGrid = new XGrid(headerCtx, 0, graphRangeMax, graphLeft, graphWidth, !canvas.byPercent, canvas.fontSize);
		if(!canvas.byPercent)
			graphRangeMax = xGrid.adjustedMax;
		xGrid.draw(headerBottom - 3, 3, true, graphLeft, 10);
		xGrid.ctx = ctx;
		xGrid.draw(0, canvas.height, false);
		
		var pickedBar = null;
		
		// finally, go through and draw all the bars
		var withinExpandedGroup = 0;
		ctx.strokeStyle = "#444444";
		// go through each entry
		for(var i = 1; i < nrEntries; i++) {
			var x = graphLeft;
			//2 loops, one for utilized states and one for idle states
			var combineNrEntries = 1;
			var groupFullName = canvas.bundle.getValue(i, 1);
			var groupAsSum = groupFullName.indexOf("#sum") >= 0;
			var groupNoTotal = groupFullName.indexOf("#nototal") >= 0;
			var groupName = groupFullName.replace("#sum", "");
			groupName = groupName.replace("#nototal", "");
			var objectName = canvas.bundle.getValue(i, 0);

			var nexti = i; //Allows us to skip over entries in a non-expanded group
			var curEntry = i;
			var firstInGroup = false;
			if(groupFullName.length > 0) {
			    firstInGroup = (i == 1 || groupFullName != canvas.bundle.getValue(i - 1, 1));
			    if (firstInGroup && groupNoTotal) {
                    //Use the first entry in the group has the total row
			        objectName = groupName;
			        withinExpandedGroup = 0;
			        if (!canvas.expandedGroups[i]) {
			            while (nexti + 1 < nrEntries && groupFullName == canvas.bundle.getValue(nexti + 1, 1)) {
			                nexti++;
			            }
			        }
			    } else {
				    if(firstInGroup && withinExpandedGroup != i)
					    withinExpandedGroup = 0;
				    if(withinExpandedGroup == 0 && firstInGroup) {
					    objectName = groupName;
					    // draw the expander triangles
					    if(canvas.expandedGroups[i])
						    withinExpandedGroup = i;
					
					    while(i + 1 < nrEntries && groupFullName == canvas.bundle.getValue(i + 1, 1)) {
						    i++;
						    combineNrEntries++;
					    }
					    if (combineNrEntries > 1) { //Make sure it's a group
					        nexti = i;
						    if(canvas.expandedGroups[curEntry]) {
							    nexti = curEntry - 1;
							    withinExpandedGroup = curEntry;
						    }
					    } else {
                            //Not a group, just an object with a custom name
						    firstInGroup = 0;
						    withinExpandedGroup = 0;
					    }
				    }
			    }
			}
			else withinExpandedGroup = 0;

			var subBar = (combineNrEntries == 1 && withinExpandedGroup) || (groupNoTotal && !firstInGroup);
			var barH = defaultBarH;
			var barGap = defaultBarGap;
			if(subBar) {
				barH = smallBarH;
				barGap = smallBarGap;
			}
			y += barGap;

			// kind of weird here, but I do three loops.
			// the first loop traverses utilized states, but doesn't draw them
			// it just moves x over to figure out where to draw idle states
			// then the second loop draws idle states
			// and the third loop draws utilized states.
			// this is so that utilized states will always draw on top of 
			// idle states so you dont get weird anti-aliasing issues
			var totalUtilized = 0;
			var totalBarTime = 0;
			var objectStartY = y;

			var endK = canvas.stacked? 3 : 2;
			for(var j = 2; j < canvas.bundle.nrFields; j++) {
				var utilizedValue = canvas.bundle.getValue(0, j);
				if(utilizedValue != STATE_EXCLUDED) {
					for(var m = i; m > i - combineNrEntries; m--)
						totalBarTime += canvas.bundle.getValue(m, j) * canvas.dataScale;
				}
			}
            
			for(var k = 0; k < endK; k++) {
				if(k == 2)
					x = graphLeft;
				// go through each field.
				for(var j = 2; j < canvas.bundle.nrFields; j++) {
					// see if it's a utilized state
					var utilizedValue = canvas.bundle.getValue(0, j);
					if(utilizedValue == STATE_EXCLUDED) continue;
					var utilizedState = utilizedValue == STATE_UTILIZED || canvas.doUtilization == UTILIZATION_SHOW_ALL;
					// and make sure I'm on the right loop
					if(utilizedState && (k==1)) continue;
					else if(!utilizedState && (k!=1)) continue;
					if(!utilizedState && canvas.doUtilization == UTILIZATION_HIDE)
						continue;
					var barValue = 0;
					for(var m = i; m > i - combineNrEntries; m--)
						barValue += canvas.bundle.getValue(m, j) * canvas.dataScale;
					// and that the time in that state is > 0
					if (barValue == 0) {
						continue;
					}
					// get the percentage
					if(canvas.byPercent)
						barValue = 100 * barValue / totalBarTime;
					else if(!groupAsSum)
						barValue /= combineNrEntries;
					var percent = barValue / (graphRangeMax > 0 ? graphRangeMax : 1);
					// figure out where the right end of the bar is
					var right = Math.min(x + percent * graphWidth, Math.round(graphRight - 1));
					if(right <= x) continue;

					if(k > 0 || !canvas.stacked) {
						if(utilizedState)
							totalUtilized += barValue;
						var barY = y;
						// and draw the bar
						if (canvas.colors.length > 0)
							ctx.fillStyle = getRGBColor(canvas.colors, j-2, k!=1?1:0.18, ctx.createLinearGradient(x, barY, x, barY+barH));
						else
							ctx.fillStyle = getIndexedColor(j-1, [40,80], [50,80], k!=1?1:0.18,ctx.createLinearGradient(x, barY, x, barY+barH));
						ctx.fillRect(Math.floor(x)+0.5, Math.floor(barY), Math.round(right + 1 - x), Math.round(barH));
						if(!canvas.stacked) y += barH;
						if(k != 1)
							ctx.strokeRect(Math.floor(x)+0.5, Math.floor(barY)+0.5, Math.round(right + 1 - x), Math.round(barH-1));
						
						if(canvas.pickMode && !pickedBar
							&& canvas.pickCursorX > x && (canvas.pickCursorX < right || (!canvas.stacked && canvas.pickCursorX < graphLeft + 10))
							&& canvas.pickCursorY > barY && canvas.pickCursorY < barY + barH)
						{
							var text = canvas.bundle.getFieldName(j) + " : ";
							if (combineNrEntries > 1 && !canvas.byPercent) {
								if (groupAsSum)
									text += " Sum ";
								else
									text += " Average ";
							}
							text += barValue.toFixed(canvas.precision);
							if (canvas.byPercent)
								text += "%";
							
							pickedBar = {
								left: x, right:right, top:barY, bottom:barY + barH,
								text: text
							};
						}
					}

					if(canvas.stacked) x = right;
				}
			}

			if(canvas.stacked) y += barH;
			
			var centerY = 0.5*(objectStartY + y);
			var textY = centerY + 5;
			var textX = 13;
			if(subBar) {
			    ctx.font = (canvas.fontSize * 0.8) + "pt Tahoma";
				textY = centerY + 4;
				textX += 10;
			}
			else ctx.font = canvas.fontSize + "pt Tahoma";
			ctx.fillStyle = "#000000";
			
			if(!subBar && firstInGroup) {
                //Draw expander
			    ctx.beginPath();
				if(canvas.expandedGroups[curEntry]) {
					ctx.moveTo(2, Math.floor(centerY - 3));
					ctx.lineTo(10, Math.floor(centerY - 3));
					ctx.lineTo(6, Math.floor(centerY + 4));
				} else {
					ctx.moveTo(4, centerY - 4);
					ctx.lineTo(10, centerY + 0.5);
					ctx.lineTo(4, centerY + 5);
				}
				ctx.closePath();
				ctx.fill();
                
				if(canvas.pickMode == PICK_MODE_CLICK 
					&& canvas.pickCursorY > centerY - 8
					&& canvas.pickCursorY < centerY + 8 
					&& canvas.pickCursorX < graphLeft 
					&& canvas.pickCursorX > 1)
					pickedExpander = curEntry;
             
			}

			ctx.fillText(objectName, textX, textY);
			if(!allUtilized) {
				var text = totalUtilized.toFixed(canvas.precision);
				if(canvas.byPercent)
					text += "%";
				ctx.fillText(text, graphLeft - utilizedMargin + 5, textY, utilizedMargin);
			}
			if (!canvas.stacked) {
			    if (y < yStart + barH + barGap) y += barH;			    
			}
			yStart = y;

			i = nexti;
		}
		y += defaultBarGap;

		ctx.strokeStyle = "#444444";
		ctx.strokeRect(Math.floor(graphLeft)+0.5, Math.floor(graphTop)+0.5, Math.floor(graphWidth), Math.floor(y - graphTop));

		if(y + 1 != canvas.height) {
			canvas.height = y + 1;
			this.draw();
		}
		
		if(canvas.pickMode) {
			if(popup!=null) {
				if(pickedBar) {
					popup.style.display = "block";
					popup.innerHTML = pickedBar.text;
					var scrollPos = windowScrollPos();
					var pos = findDocumentPos(canvas);
					popup.style.left = (pos[0] - scrollPos.left + (pickedBar.left + pickedBar.right-popup.offsetWidth)/2)+'px';
					popup.style.top = (pos[1] - scrollPos.top - canvas.parentNode.scrollTop + pickedBar.top - popup.offsetHeight - 2)+'px';
				}
			}
			else popup.style.display = "`";
			if (pickedExpander) {
				canvas.expandedGroups[pickedExpander] = !canvas.expandedGroups[pickedExpander];
			}
		}
		return 0;

		}catch(e) {print('exception caught in mainDiv.draw() '); printError(e, "barchart.js");}
	}

	mainDiv.initializeData = function initializeData(bundleHeader) {
		try{
			canvas.bundle = Bundle.interpretHeader(bundleHeader);
			this.draw();
		}catch(e) {print('exception caught in barchart canvas.initializeData() '); printError(e, "barchart.js");}
	}

	mainDiv.updateData = function updateData(bundleData) {
		try{
			canvas.bundle = Bundle.interpretData(bundleData, canvas.bundle);
			if(!canvas.expandedGroups || canvas.bundle.nrEntries != canvas.expandedGroups.length) {
				canvas.expandedGroups = [];
				for(var i = 0; i < canvas.bundle.nrEntries; i++)
					canvas.expandedGroups.push(false);
			}
			if(popup && popup.style.display != 'none') {
				var e = {offsetX:canvas.pickCursorX, offsetY:canvas.pickCursorY, target:canvas};
				canvas.onMouseMove(e);
			}
			else this.draw();
		}catch(e) {print('exception caught in barchart canvas.updateData() '); printError(e, "barchart.js");}
	}

	mainDiv.setProperties = function setProperties(properties, redraw) {
		try{
			if(properties.chartType != CHART_TYPE_HORIZONTAL_BAR && properties.chartType != "barchart")
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
			if (properties.barSize == undefined)
			    properties.barSize = parseFloat(mainDiv.getAttribute('data-bar-size')) || 12;
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
			canvas.barSize = properties.barSize;
			canvas.precision = properties.precision;
			canvas.dataScale = properties.dataScale;
			
			if(redraw)
				this.draw();
				
		}catch(e) {print('exception caught in barchart mainDiv.setProperties() '); printError(e, "barchart.js");}
	}
	
	canvas.onMouseMove = function onMouseMove(e) {
		canvas.pickMode = PICK_MODE_HOVER;
		setMouseOffsets(e);
		canvas.pickCursorX = e.offsetX;
		canvas.pickCursorY = e.offsetY;
		mainDiv.draw();
		canvas.pickMode = 0;
	}
	canvas.onClick = function onClick(e) {
		canvas.pickMode = PICK_MODE_CLICK;
		setMouseOffsets(e);
		canvas.pickCursorX = e.offsetX;
		canvas.pickCursorY = e.offsetY;
		mainDiv.draw();
		canvas.pickMode = 0;
		mainDiv.draw();
	}
	
	//Called from dragresize.js
	mainDiv.onResize = function onResize() {
	    mainDiv.draw();
	}

	mainDiv.onselectstart = function () { return false; };

	canvas.addEventListener("mousemove", canvas.onMouseMove, false);
	canvas.addEventListener("mouseout", function onMouseOut() {if(popup!=null) {popup.style.display="none"}}, false);
	canvas.addEventListener("click", canvas.onClick, false);
	mainDiv.draw();
	window.addEventListener("resize", mainDiv.onResize, false);

	}catch(e) {
		print('exception caught in initializeBarChart() '); printError(e, "barchart.js");
	}
}