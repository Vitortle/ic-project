
function initializeOptimizerStatus(divTag) {
	try {
	
		{var OBJECTIVE_SINGLE = 1;
		var OBJECTIVE_WEIGHTED = 2;
		var OBJECTIVE_PATTERN = 3;

		// These are graph options
		var xAxisIndex = 0;
		var yAxisIndex = 1;
		var highlightBest = false;
		var showLegend = false;
		var someInfeasible = false;
		var hasLicense = true;
		
		var topMargin = 10;
		var leftMargin = 30;
		var rightMargin = 40;
		var bottomMargin = 30;
		
		var legendWidth = 0;
		var legendTextLoc = 30;
		
		var statusHeight = 0;
		
		var markerSize = 0;
		var smallDotSize = 2;
		var medDotSize = 3;
		var largeDotSize = 4;
		var bestSize = 6;
		var selectionRingSize = 9;
		var lineSize = 3;
		
		var selectedSolutions = [];
		var currentSolution = undefined;

		// These are properties of the bundle; they are set by flexsim
		var nrObjs = 0;
		var nrVars = 0;
		var nrPfms = 0;
		var nrConstraints = 0;
		var usesReps = 0;
		
		// These are calculated from the various group sizes and bundle properties
		var solutionIndex = 0;
		var rankIndex = Number.NaN;
		var frontierIndex = Number.NaN;
		var feasibleIndex = 0;
		var paretoIndex = Number.NaN;
		var singleObjIndex = Number.NaN;
		var bestIterationIndex = Number.NaN;
		var repsIndex = Number.NaN;
		var stdDevIndex = Number.NaN;
		var repTermIndex = Number.NaN;
		var objIndex = 0;
		var varIndex = 0;
		var pfmIndex = 0;
		var constraintIndex = Number.NaN;
		
		// These values can be used to figure out which columns are present in the bundle
		var searchMode = 1;
		var numFrontiers = 1;
		
		// These are the max's and min's of the current axes.
		// They must be updated when x || yAxisIndex is changed
		var minYVal = 10000000000;
		var maxYVal = -10000000000;
		var minXVal = 10000000000;
		var maxXVal = -10000000000;

		// These store the data from the bundle. They update
		// with the bundle.
		var bundleData = []; // this stores bundle data by frontier (3D array)
		var bundleCopy = []; // this is a simple copy of the bundle data, easy to sort
		var colorIndex = 0;
		var finished = false;

		// This contains information about the mapping from pixel to coordinate
		var pointMapInfo = [];

		// These are useful colors
		var greenLine = "rgba(10, 169, 0, 0.5)";
		var gray = "rgb(128, 128, 128)";
		var black = "rgb(0, 0, 0)";
		var blue = "rgb(30, 56, 255)";
		var purple = "rgb(126, 27, 188)";
		var red = "rgb(188, 27, 27)";
		var orange = "rgb(215, 103, 28)";
		var gold = "rgb(215, 160, 28)";
		var lime = "rgb(52, 128, 11)"
		var colors = [blue, orange, purple, gold, red, lime];

		var lBlue = "rgba(30, 56, 255, 0.5)";
		var lPurple = "rgba(126, 27, 188, 0.5)";
		var lRed = "rgba(188, 27, 27, 0.5)";
		var lOrange = "rgba(215, 103, 28, 0.5)";
		var lGold = "rgba(215, 160, 28, 0.5)";
		var lLime = "rgba(52, 128, 11, 0.5)";
		var lColors = [lBlue, lOrange, lPurple, lGold, lRed, lLime];
		
		var hueStep = 65;
		var numHues = Math.floor(360/hueStep);
	
		var mainDiv = divTag;
		var className = mainDiv.getAttribute('class');
		var popup = document.getElementById('flexsimpopup');
		var popupShowing = false;}
		
		if(className && className.indexOf('fullscreen', 0) >= 0) {
			mainDiv.style['overflow-x'] = 'hidden';
			if(mainDiv.style.overflow)
				delete mainDiv.style.overflow;
		}
		
		divTag.style.position = 'relative';
		divTag.innerHTML = "<canvas class='chartheader' width='10px' height='30px'>Not supported by this browser</canvas>"
			+ "<div class='verticalscroll'>" 
			+ "<canvas width='10px' height='10px' style=\"float:left\"></canvas>"
			+ "<canvas width='10px' height='10px' style=\"float:right\"></canvas>"
			+ "</div>"
			+ "<canvas width='10px' height='50px' style=\"clear:both\"></canvas>"
			+ "<div id=\"noLicenseImgDiv\"><img src=\"flexsimweb/NoLicense.png\" alt=\"No OptQuest License Found\"></div>";
			
		var canvases = divTag.getElementsByTagName("canvas");
		var headerCanvas = canvases[0];
		var canvas = canvases[1];
		var legendCanvas = canvases[2];
		var statusCanvas = canvases[3];
		var ctx = canvas.getContext('2d');
		var headerCtx = headerCanvas.getContext('2d');
		var legendCtx = legendCanvas.getContext('2d');
		var statusCtx = statusCanvas.getContext('2d');
		var noLicenseDiv = document.getElementById("noLicenseImgDiv");
		
		mainDiv.renderer = new XYPlotRenderer(canvas, ctx, mainDiv);
		var renderer = mainDiv.renderer;
		canvas.draw = function drawGraph() {mainDiv.draw();}
		
		mainDiv.arrange = function() {
			try {
			
				if (!hasLicense) {
					for (var i = 0; i < mainDiv.children.length; i++) 
						mainDiv.children[i].style.display = "none";
					
					noLicenseDiv.style.display = "block";
					return;
				}
				
				noLicenseDiv.hidden = true;
		
				headerCanvas.height = 30;
				headerCanvas.width = mainDiv.offsetWidth;
				
				legendWidth = mainDiv.getLegendWidth();
				statusHeight = mainDiv.getStatusHeight();
				legendCanvas.style.display = "none";
				statusCanvas.style.display = "none";
				
				canvas.width = mainDiv.offsetWidth;
				canvas.height =  mainDiv.offsetHeight - headerCanvas.height;
				
				if (statusHeight) {
					statusCanvas.style.display = "block";
					statusCanvas.height = statusHeight;
					statusCanvas.width = canvas.offsetWidth;
					canvas.height -= statusHeight;
				}
				
				if (legendWidth) {
					legendCanvas.style.display = "block";
					legendCanvas.width = legendWidth;
					legendCanvas.height = canvas.offsetHeight;
					canvas.width -= legendWidth;
					legendCanvas.left = canvas.width;	
				}
			} catch (e) {
				mainDiv.printError("arrange", e);
			}
		}
		
		// This function is mostly for testing purposes
		mainDiv.drawOutlines = function() {
			headerCtx.save();
			headerCanvas.style.cursor = "crosshair";
			headerCtx.fillStyle = "rgba(255, 0, 0, 0.5)";
			headerCtx.fillRect(0, 0, headerCanvas.width, headerCanvas.height);
			headerCtx.restore();
			
			ctx.save();
			ctx.fillStyle = "rgba(0, 255, 0, 0.5)";
			ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
			ctx.restore();
			
			legendCtx.save();
			legendCtx.fillStyle = "rgba(255, 255, 0, 0.5)";
			legendCtx.fillRect(0, 0, legendCanvas.width, legendCanvas.height);
			legendCtx.restore();
			
			statusCtx.save();
			statusCtx.fillStyle = "rgba(0, 0, 255, 0.5)";
			statusCtx.fillRect(0, 0, statusCanvas.width, statusCanvas.height);
			statusCtx.restore();
			
		}
			
		mainDiv.draw = function(){
			try {
				if (!hasLicense) {
					//mainDiv.drawSample();
					return;
				}	
				
				headerCtx.clearRect(0,0, headerCanvas.width, headerCanvas.height);
				ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
				legendCtx.clearRect(0, 0, legendCanvas.width, legendCanvas.height);
				statusCtx.clearRect(0, 0, statusCanvas.width, statusCanvas.height);
				
				// draw canvas title
				if(!canvas.mainTitle && mainDiv.getAttribute("name"))
					canvas.mainTitle = mainDiv.getAttribute("name");
				if(canvas.mainTitle){
					headerCtx.fillStyle = "black";
					headerCtx.font = "bold 11pt Tahoma";
					var titleWidth = headerCtx.measureText(canvas.mainTitle).width;
					headerCtx.fillText(canvas.mainTitle, (headerCanvas.width - titleWidth) / 2, 18);
				}
				
				
				if (!canvas.bundle) 
					return 0;
				
				// Always draw the status bar, even if there are no entries
				if (!finished && statusCanvas.bundle)
					mainDiv.drawStatus();
				
				if (!canvas.bundle.nrEntries)
					return 0;
				
				// Set the titles on the renderer
				var xAxisName = canvas.bundle.getFieldName(xAxisIndex);
				var yAxisName = canvas.bundle.getFieldName(yAxisIndex);
				renderer.setAxisTitles(xAxisName, yAxisName);
					
				
				// If the settings are right to draw the best value lines . . .
				if ((xAxisIndex == solutionIndex) 
					&& (searchMode != 3)
					&& (yAxisIndex == singleObjIndex)) {
					//throw("drawing best");
					
					mainDiv.updateRange(false);
					renderer.updateRange(minXVal, maxXVal, minYVal, maxYVal, leftMargin, topMargin, 
						canvas.width - rightMargin, canvas.height - bottomMargin);
					ctx.save();	
					renderer.drawGrid();
					ctx.restore();
					pointMapInfo = renderer.getPointMapInfo();
					
					ctx.save();
					ctx.lineWidth = medDotSize + markerSize;
					
					for (var i = 0; i < bundleData.length; i++) {
						
						// draw the best line
						
						ctx.fillStyle = lColors[(colorIndex + i) % 6];
						var minx = bundleData[i][0][xAxisIndex];
						var maxx = bundleData[i][bundleData[i].length - 1][xAxisIndex];
						var bestIndex = bundleData[i][0][bestIterationIndex] - 1;
						
						if (bundleCopy.length > bestIndex) {
							var yval = bundleCopy[bestIndex][yAxisIndex];
							mainDiv.drawLine({x:minx, y:yval}, {x:maxx, y:yval});
						}
						// draw the solution values
						ctx.strokeStyle = colors[(colorIndex + i) % 6];
						renderer.drawSeries(bundleData[i].length, function(index, returnPoint) {
								returnPoint.x = bundleData[i][index][xAxisIndex];
								returnPoint.y = bundleData[i][index][yAxisIndex];
							}, CONNECTION_NONE);	
						
					}
					ctx.restore();	
					
				} else {
					//throw("drawing normal");
					mainDiv.updateRange(false);
					renderer.updateRange(minXVal, maxXVal, minYVal, maxYVal, leftMargin, topMargin, 
						canvas.width - rightMargin, canvas.height - bottomMargin);
					ctx.save();	
					renderer.drawGrid();
					ctx.restore();
					pointMapInfo = renderer.getPointMapInfo();
					
					ctx.save();
					ctx.lineWidth = medDotSize + markerSize;
					
					for (var i = 0; i < bundleData.length; i++) {
						ctx.strokeStyle = colors[(colorIndex + i) % 6];
						renderer.drawSeries(bundleData[i].length, function(index, returnPoint) {
								returnPoint.x = bundleData[i][index][xAxisIndex];
								returnPoint.y = bundleData[i][index][yAxisIndex];
							}, CONNECTION_NONE);
					}
					ctx.restore();
				}
				
				ctx.save();
				mainDiv.drawInfeasible(yAxisIndex);
				if (highlightBest)
					mainDiv.drawBest(colorIndex, yAxisIndex);
					
				if (showLegend)
					mainDiv.drawLegend(colorIndex);
				
				for (var i = 0; i < selectedSolutions.length; i++) {
					mainDiv.drawSelection(i, false);
				}
				
				mainDiv.drawCurrentSolution();
				ctx.restore();
				//mainDiv.drawOutlines();
				return 0;
				
			} catch (e) {
				mainDiv.printError("draw", e);
			}
		};
		
		mainDiv.drawBest = function(firstColorIndex, highlightIndex) {
			try {
				if (searchMode == 3) {
					mainDiv.drawPareto();
					return 0;
				}
			
				if (isNaN(frontierIndex)) {
					mainDiv.drawTop10(firstColorIndex, highlightIndex);
					return 0;
				}
				
				ctx.lineWidth = bestSize + markerSize;
				for (var i = 0; i < bundleData.length; i++) {
					ctx.strokeStyle = lColors[(firstColorIndex + i) % 6];
					renderer.drawSeries(1, function(index, returnPoint) {
							var bestRow = bundleData[i][0][bestIterationIndex] - 1;
							returnPoint.x = bundleCopy[bestRow][xAxisIndex];
							returnPoint.y = bundleCopy[bestRow][highlightIndex];
						}, CONNECTION_NONE);
				}
			
			
			} catch(e) {
				mainDiv.printError("drawBest", e);
			}
		};
		
		mainDiv.drawTop10 = function(firstColorIndex, highlightIndex) {
			try {
				ctx.save();
				// sort the bundle by the best values
				var sortedBundle = bundleCopy.slice(); //Copy the bundle
				sortedBundle.sort(function(a, b) {return a[rankIndex] - b[rankIndex]});
				// fading, big disks
				ctx.lineWidth = bestSize + markerSize;
				
				// for each top 10 winner
				var numWinners = sortedBundle.length >= 10 ? 10 : sortedBundle.length;
				for (var j = 0; j < numWinners; j++) {
					var currAlpha = 1 - 0.1*j;

					ctx.strokeStyle = mainDiv.setAlpha(lColors[(firstColorIndex) % 6], currAlpha);
					renderer.drawSeries(1, function(index, returnPoint) {
							returnPoint.x = sortedBundle[j][xAxisIndex];
							returnPoint.y = sortedBundle[j][highlightIndex];
						}, CONNECTION_NONE);
					//throw("here " + bundleData[i][row][yAxisIndex]);	
				}
				ctx.restore();
			} catch(e) {
				mainDiv.printError("drawTop10", e);
			}
		};
		
		mainDiv.drawPareto = function() {
			try {
				// faded, big disks
				ctx.save();
				ctx.lineWidth = bestSize + markerSize;
				ctx.strokeStyle = lColors[(colorIndex + 2) % 6];
				for (var i = 0; i < bundleCopy.length; i++) {
					if (bundleCopy[i][paretoIndex]) {
						renderer.drawSeries(1, function(index, returnPoint) {
							returnPoint.x = bundleCopy[i][xAxisIndex];
							returnPoint.y = bundleCopy[i][yAxisIndex];
						}, CONNECTION_NONE);
					}
				}
				ctx.restore();
				
			} catch(e) {
				mainDiv.printError("drawPareto", e);
			}
		}
		
		mainDiv.drawInfeasible = function(highlightIndex) {
			try {
				ctx.save();
				ctx.strokeStyle = gray;
				ctx.lineWidth = medDotSize + markerSize;
				for (var i = 0; i < bundleData.length; i++) {
					for (var j = 0; j < bundleData[i].length; j++) {
						if (bundleData[i][j][feasibleIndex] == 0) {
							renderer.drawSeries(1, function(index, returnPoint) {
								returnPoint.x = bundleData[i][j][xAxisIndex];
								returnPoint.y = bundleData[i][j][highlightIndex];
							}, CONNECTION_NONE);
						}
					}
				}
				ctx.restore();
			} catch(e) {
				mainDiv.printError("drawInfeasible", e);
			}
		};
		
		mainDiv.drawLine = function(point1, point2) {
			try {
				ctx.save();
				var pixPoint1 = mainDiv.graphPointToPixel(point1);
				var pixPoint2 = mainDiv.graphPointToPixel(point2);
				var lineHeight = lineSize + markerSize;
				
				// Ensure that the line is clipped
				ctx.beginPath();
				renderer.setClipRegion();
				
				// draws horizontal caps, reguardless of angle.
				ctx.beginPath();
				ctx.arc(pixPoint1.x, pixPoint1.y, lineHeight/2.0, Math.PI/2.0, 3 * Math.PI/2.0, false);
				ctx.arc(pixPoint2.x, pixPoint2.y, lineHeight/2.0, 3 * Math.PI/2.0, Math.PI/2.0, false);
				ctx.closePath();
				
				ctx.fill();
				ctx.restore();
				
			} catch(e) {
				mainDiv.printError("drawLine", e);
			}
		};
		
		mainDiv.drawLegend = function(firstColorIndex) {
			try {
				var markerCenter = legendTextLoc/2;
				var rowSpacing = 15 + markerSize;
				
				// Draw title
				ctx.save();
				legendCtx.font = "bold 10pt Tahoma";
				legendCtx.fillStyle = black;
				var titleStart = legendCanvas.width/2 - legendCtx.measureText("Legend").width/2;
				legendCtx.fillText("Legend", titleStart, 12);
				
				legendCtx.font = "8pt Tahoma";
				var rowLoc = 30;
				
				// if best value lines need to be drawn, draw them
				if (yAxisIndex == singleObjIndex && xAxisIndex == solutionIndex) {
					var bestText = "Best Value";
					if (frontierIndex) bestText = "Best Value (F1)";
					
					for (var i = 0; i < bundleData.length; i++) {
						legendCtx.fillText(bestText, legendTextLoc, rowLoc);
						legendCtx.save();
						legendCtx.fillStyle = lColors[(firstColorIndex + i) % 6];		
						var lineHeight = lineSize + markerSize;
						
						legendCtx.beginPath();
						legendCtx.arc(markerCenter - 10, rowLoc - 3, lineHeight/2.0, Math.PI/2.0, 3 * Math.PI/2.0, false);
						legendCtx.arc(markerCenter + 10, rowLoc - 3, lineHeight/2.0, 3 * Math.PI/2.0, Math.PI/2.0, false);
						legendCtx.fill();
						legendCtx.restore();
						bestText = "Best Value " + " (F" + (i + 2) + ")";
						rowLoc += rowSpacing;
					}
				}
				// If drawing constraints, legend must show it
				var shift = (constraintIndex && yAxisIndex >= constraintIndex && xAxisIndex == solutionIndex) ? 1 : 0;
				
				var text = canvas.bundle.getFieldName(yAxisIndex);
				if (frontierIndex)
					text += " (F1)";
				
				var shiftText = canvas.bundle.getFieldName(yAxisIndex + shift);
				if (frontierIndex)
					shiftText += " (F1)";
				
				for (var i = 0; i < bundleData.length; i++) {	
					if (shift) {
						legendCtx.lineWidth = largeDotSize + markerSize;
						legendCtx.strokeStyle = lColors[(firstColorIndex + i) % 6];
						legendCtx.fillText(text, legendTextLoc, rowLoc);
						mainDiv.drawPoint(legendCtx, markerCenter, rowLoc - 3);
						rowLoc += rowSpacing;
						
						legendCtx.lineWidth = smallDotSize + markerSize;
						legendCtx.strokeStyle = colors[(firstColorIndex + i) % 6];
						legendCtx.fillText(shiftText, legendTextLoc, rowLoc);
						mainDiv.drawPoint(legendCtx, markerCenter, rowLoc - 3);
						rowLoc += rowSpacing;
					} else {
						legendCtx.lineWidth = medDotSize + markerSize;
						legendCtx.strokeStyle = colors[(firstColorIndex + i) % 6];
						legendCtx.fillText(text, legendTextLoc, rowLoc);
						mainDiv.drawPoint(legendCtx, markerCenter, rowLoc - 3);
						rowLoc += rowSpacing;
					}
					text = canvas.bundle.getFieldName(yAxisIndex);
					text += " (F" + (i + 2) + ")";
					
					shiftText = canvas.bundle.getFieldName(yAxisIndex + shift);
					shiftText += " (F" + (i + 2) + ")";
				}
				
				if (highlightBest) {
					bestText = "Best Solutions";
					if (searchMode == 3)
						bestText = "Optimal Solutions";
					if (frontierIndex)
						bestText += " (F1)";
						
					for (var i = 0; i < bundleData.length; i++) {
						legendCtx.lineWidth = bestSize + markerSize;
						if (searchMode == 3) {
							legendCtx.strokeStyle = lColors[(firstColorIndex + i + 2) % 6];
						} else {
							legendCtx.strokeStyle = lColors[(firstColorIndex + i) % 6];
						}	
						legendCtx.fillText(bestText, legendTextLoc, rowLoc);
						mainDiv.drawPoint(legendCtx, markerCenter, rowLoc - 3);
						rowLoc += rowSpacing;
						bestText = "Best Solutions";
						if (searchMode == 3)
							bestText = "Optimal Solutions";
						if (frontierIndex)
							bestText += " (F" + (i + 2) + ")";
					}
				}
				
				if (someInfeasible) {
					legendCtx.lineWidth = medDotSize + markerSize;
					legendCtx.strokeStyle = gray;
					legendCtx.fillText("Infeasible Solution", legendTextLoc, rowLoc);
					mainDiv.drawPoint(legendCtx, markerCenter, rowLoc - 3);
					rowLoc += rowSpacing;
				}
				
				rowLoc += rowSpacing;
				rowSpacing += 6;
				
				for (var i = 0; i < selectedSolutions.length; i++) {
					mainDiv.drawRing(legendCtx, {x:markerCenter, y:rowLoc - 3}, i);
					legendCtx.fillText("Solution " + selectedSolutions[i], legendTextLoc, rowLoc);
					
					rowLoc += rowSpacing;
				}
				ctx.restore();
				
			} catch(e) {
				mainDiv.printError("drawLegend", e);
			}
		};
		
		mainDiv.drawPoint = function(currCtx, x, y) {
			try {
				ctx.save();
				currCtx.beginPath();
				currCtx.moveTo(x, y);
				currCtx.arc(x, y, currCtx.lineWidth/2, 0, Math.PI*2, false);
				currCtx.stroke();
				ctx.restore();
			} catch (c) {
				mainDiv.printError("drawPoint", e);
			}
		};
		
		mainDiv.drawRing = function(currCtx, pixPoint, numParam) {
			try {
				currCtx.save();
				
				var hueIndex = numParam;
				var h = hueIndex < hues.length ? hues[hueIndex] : (hueIndex * 8479) % 360;
				var s = 70;
				var l = 50;
				
				if (numParam < 0) currCtx.strokeStyle = "rgba(0, 0, 0, 0.2)";
				else currCtx.strokeStyle = ["hsla(", h, ", ", s, "%, ", l, "%, ", 1,")"].join("");
				
				currCtx.beginPath();
				currCtx.lineWidth = lineSize;
				currCtx.moveTo(pixPoint.x + selectionRingSize + markerSize, pixPoint.y);
				currCtx.arc(pixPoint.x, pixPoint.y, selectionRingSize + markerSize, 0, Math.PI*2, false);
				currCtx.stroke();
				currCtx.restore();
			} catch (e) {
				mainDiv.printError("drawRing", e);
			}
		}
		
		mainDiv.graphPointToPixel = function(point) {
			try {
				var pixPointX = pointMapInfo[0] 
					+ (point.x - pointMapInfo[1])*pointMapInfo[2]/pointMapInfo[3];
				var pixPointY = pointMapInfo[4] 
					- (point.y - pointMapInfo[5])*pointMapInfo[6]/pointMapInfo[7];
					
				return {x: pixPointX, y: pixPointY};	
			} catch (e) {
				mainDiv.printError("graphPointToPixel", e);
			}
		};
		
		mainDiv.drawStatus = function() {
			// the bundle has three columns: solutionID, repNr, time
			// each entry is a concurrent solution
			try {
				if (!statusCanvas.bundle)
					return 0;
					
				var numSolutions = statusCanvas.bundle.nrEntries;
				var hMargin = 15;
				var vMargin = 10;
				var textBuffer = 3;
				
				var statusBarWidth = statusCanvas.width - (hMargin * 2);
				var statusBarHeight = 15;
				var statusBarX = hMargin;
				var statusBarY = statusCanvas.height - statusBarHeight - 5;
				
				var boxWidth = statusBarWidth/numSolutions;
				var leftEdges = new Array(numSolutions);
				var centerLines = new Array(numSolutions);
				
				for (var i = 0; i < numSolutions; i++) {
					var currX = statusBarX + (i * boxWidth);
					leftEdges[i] = currX;
					centerLines[i] = currX + (boxWidth / 2);
				}
				
				var greenFillStyle = getIndexedColor(2, [60,90], [20,60], 1,
					statusCtx.createLinearGradient(0, statusBarY, 0, statusBarY + statusBarHeight));
				
				var redFillStyle = getIndexedColor(1, [60,90], [50,60], 1,
					statusCtx.createLinearGradient(0, statusBarY, 0, statusBarY + statusBarHeight));
					
				var hTextLoc = vMargin + 3;
				// Draw Border
				statusCtx.strokeStyle = "rgba(0, 0, 0, 1.0)";
				statusCtx.lineWidth = 1;
				statusCtx.strokeRect(5, 0, statusCanvas.width - 10, statusCanvas.height);
				
				// Draw Text
				statusCtx.fillStyle = "rgba(0, 0, 0, 1.0)";
				statusCtx.font = "bold 10pt Tahoma";
				statusCtx.textAlign = "center";
				statusCtx.fillText("Status", statusCanvas.width/2, hTextLoc);
				hTextLoc += 10 + textBuffer;
				
				statusCtx.font = "8pt Tahoma";
				statusCtx.fillText("Solution/Replication", statusCanvas.width/2, hTextLoc);

				// Fill the background color
				statusCtx.fillStyle = redFillStyle;
				statusCtx.fillRect(statusBarX, statusBarY,
					statusBarWidth, statusBarHeight);
				
				// draw each box to the fraction, and a black border, and the info
				for (var i = 0; i < numSolutions; i++) {
					var currX = leftEdges[i];
					var currY = statusBarY;
					var blueEdge = statusCanvas.bundle.getValue(i, 2) * boxWidth;
					
					var currText = statusCanvas.bundle.getValue(i, 0) 
						+ "/" + statusCanvas.bundle.getValue(i, 1);
					var textHeight = 4;	
					
					statusCtx.strokeRect(currX, currY, boxWidth, statusBarHeight);
					statusCtx.fillStyle = "black";
					statusCtx.fillText(currText, centerLines[i], currY - textHeight - textBuffer);
					
					statusCtx.fillStyle = greenFillStyle;
					statusCtx.fillRect(currX, currY, blueEdge, statusBarHeight);
				}
			} catch (e) {
				mainDiv.printError("drawStatus", e);
			}
			
		};
		
		mainDiv.drawCurrentSolution = function() {
			if (currentSolution) {
				mainDiv.drawSelection(currentSolution, true);
			}	
		};
		
		mainDiv.initializeStatusBundle = function(statusBundleHeader) {
			statusCanvas.bundle = undefined;
			if (!statusBundleHeader)
				return;
			statusCanvas.bundle = Bundle.interpretHeader(statusBundleHeader);
		};
		
		mainDiv.updateStatusBundle = function(statusBundle) {
			try {
				
				statusCanvas.bundle = Bundle.interpretData(statusBundle, statusCanvas.bundle);
				
			} catch (e) {
				mainDiv.printError("updateStatusBundle", e);
			}
		};
		
		mainDiv.setLicenseFalse = function() {
			try{
				hasLicense = false;
			} catch (e) {
				mainDiv.printError("setLicenseFalse", e);
			}
		}
		
		mainDiv.onMouseMove = function onMouseMove(e) {
			try {
				var mousePos = getMousePos(canvas, e);
				setMouseOffsets(e);
				mousePos.x = e.offsetX;
				mousePos.y = e.offsetY;
				
				// if the mouse is over the graph
				if (mousePos.x > pointMapInfo[0] &&
					mousePos.x < pointMapInfo[2] + pointMapInfo[0] &&
					mousePos.y < pointMapInfo[4] &&
					mousePos.y > pointMapInfo[6] - pointMapInfo[4]) {
					currentSolution = undefined;
					
					for (var i = 0; i < bundleData.length; i++) {
						for (var j = 0; j < bundleData[i].length; j++) {
							var pointX = bundleData[i][j][xAxisIndex];
							var shift = 0;
							var pointY = bundleData[i][j][yAxisIndex + shift];
							
							var pixPoint = mainDiv.graphPointToPixel({x:pointX, y:pointY});
							
							if (pixPoint.x < mousePos.x + 4 + markerSize 
								&& pixPoint.x > mousePos.x - 2 - markerSize
								&& pixPoint.y < mousePos.y + 2 + markerSize 
								&& pixPoint.y > mousePos.y - 2 - markerSize) {
								
								currentSolution = bundleData[i][j][solutionIndex];
								
								var xRes = (maxXVal - minXVal)/100.0;
								var yRes = (maxYVal - minYVal)/100.0;
								
								var xPower = 0;
								while (Math.pow(10, xPower) > xRes)
									xPower--;
									
								var yPower = 0;
								while (Math.pow(10, yPower) > yRes)
									yPower--;
								
								popupShowing = true;
								var popupText = "";
								if (!isNaN(frontierIndex))
									popupText += ("Frontier: " + (i + 1) + "<br/>");
								popupText += (canvas.bundle.getFieldName(xAxisIndex) 
									+ ": " + pointX.toFixed(-1*xPower) + "<br/>");
								popupText += (canvas.bundle.getFieldName(yAxisIndex + shift) 
									+ ": " + pointY.toFixed(-1*yPower) + "<br/>");
								
								if (!isNaN(rankIndex))
									popupText += ("Rank: " + bundleData[i][j][rankIndex] + "<br/>");
									
								if (!bundleData[i][j][feasibleIndex]) {
									popupText += ("<br/>Violated Constraints<br/>");
									
									for (var k = constraintIndex; k < constraintIndex + nrConstraints; k++) {
										if (!bundleData[i][j][k]) {
											popupText += "&bull;&nbsp;" + canvas.bundle.getFieldName(k) + "<br/>";
										}
									}
								}
								
								popup.style.display = "block";
								popup.innerHTML = popupText;
								
								popup.style.height = "auto";
								
								var pos = findDocumentPos(canvas);
								var popupMousePos = {x:0, y:0};
								var scrollPos = windowScrollPos();
								
								
								popupMousePos.x = pos[0] - scrollPos.left + mousePos.x;
								popupMousePos.y = pos[1] - scrollPos.top + mousePos.y;
								
								var left = popupMousePos.x - popup.offsetWidth - 5;
								var top = popupMousePos.y - popup.offsetHeight - 11;
								
								if (left < 0) left = 0;
								if (top < 0) top = 0;
								
								popup.style.left = left + "px";
								popup.style.top = top + "px";
								//throw(bundleData);
								
								break;
							} 
						}
						if (currentSolution)
							break;
					}
					
					if (popupShowing && !currentSolution) {
						popupShowing = false;
						popup.style.display = "none";
					}
				
					mainDiv.draw();
				}
			} catch(e1) {
				mainDiv.printError("onMouseMove", e);
			}
		};
		
		mainDiv.onClick = function onClick(e) {
			try {
				if (currentSolution) {
					for (var i = 0; i < selectedSolutions.length; i++) {
						if (selectedSolutions[i] == currentSolution) {
							var part1 = selectedSolutions.slice(0, i);
							var part2 = selectedSolutions.slice(i + 1, selectedSolutions.length);
							selectedSolutions = part1;
							for (var j = 0; j < part2.length; j++)
								selectedSolutions.push(part2[j]);
							
							var removeSolutionEvent = new CustomEvent('removeSolution', { 'detail': currentSolution });
							mainDiv.dispatchEvent(removeSolutionEvent);
							
							fireFlexsimEvent("removeSolution", currentSolution);	
							return 0;	
						}
					}
					var addSolutionEvent = new CustomEvent('addSolution', { 'detail': currentSolution });
					mainDiv.dispatchEvent(addSolutionEvent);
					
					selectedSolutions.push(currentSolution);
					fireFlexsimEvent("addSolution", currentSolution);
					return 0;
				}
				
			} catch(e) {
				mainDiv.printError("onClick", e);
			}
		};
		
		mainDiv.restoreSelectedSolution = function(solutionID) {
			try {
				for (var i = 0; i < selectedSolutions.length; i++) {
					if (selectedSolutions[i] == solutionID)
						return 0;
				}
				selectedSolutions.push(solutionID);
			} catch (e) {
				mainDiv.printError("restoreSelectedSolution", e);
			}
		}
		
		mainDiv.drawSelection = function(numParam, temp) {
			try {
				var solutionID;
				if (temp) solutionID = numParam;
				else solutionID = selectedSolutions[numParam];
			
				var centerX = bundleCopy[solutionID - 1][xAxisIndex];
				var centerY = bundleCopy[solutionID - 1][yAxisIndex];
				var pixPoint = mainDiv.graphPointToPixel({x:centerX, y:centerY});
				
				mainDiv.drawRing(ctx, pixPoint, temp ? -1 : numParam);
			
			} catch (e) {
				mainDiv.printError("drawSelection", e);
			}
		};
		
		mainDiv.getLegendWidth = function() {
			try {
				if (!showLegend)
					return 0;
			
				var maxTextWidth = -1;
				var shift = ((yAxisIndex == singleObjIndex || (yAxisIndex >= constraintIndex && constraintIndex)) && xAxisIndex == 0) ? 1 : 0;		
				var frontierText = isNaN(frontierIndex) ? "" : " (F" + bundleData.length + ")";
				
				// Check the current yAxisIndex
				var textWidth = legendCtx.measureText(canvas.bundle.getFieldName(yAxisIndex + shift) + frontierText).width;
				maxTextWidth = maxTextWidth < textWidth ? textWidth : maxTextWidth;
				
				if (yAxisIndex == singleObjIndex && xAxisIndex == solutionIndex) {
					var currText = "Single Objective";
					if (searchMode == 2)
						currText = "Composite Objective";
					textWidth = legendCtx.measureText(currText + frontierText).width;
					maxTextWidth = maxTextWidth < textWidth ? textWidth : maxTextWidth;
				}
				
				// Check if the best values are being displayed
				if (highlightBest) {
					textWidth = legendCtx.measureText("Best Solution" + frontierText).width;
					maxTextWidth = maxTextWidth < textWidth ? textWidth : maxTextWidth;	
				}
				
				if (searchMode == 3) {
					textWidth = legendCtx.measureText("Optimal Solutions").width;
					maxTextWidth = maxTextWidth < textWidth ? textWidth : maxTextWidth;	
				}
				
				// check if there are infeasible solutions
				// if so, check that length
				someInfeasible = false;
				for (var i = 0; i < bundleData.length; i++) {
					for (var j = 0; j < bundleData[i].length; j++) {
						if (bundleData[i][j][feasibleIndex] == 0) {
							someInfeasible = true;
							break;
						}
					}
				}

				if (someInfeasible) {
					textWidth = legendCtx.measureText("Infeasible Solutions").width;
					maxTextWidth = maxTextWidth < textWidth ? textWidth : maxTextWidth;	
				}
				
				if (selectedSolutions.length > 0) {
					textWidth = legendCtx.measureText("Solution " + bundleCopy.size);
					maxTextWidth = maxTextWidth < textWidth ? textWidth : maxTextWidth;	
				}
				
				var rightBuffer = 7;
				return maxTextWidth + legendTextLoc + rightBuffer;
			} catch(e) {
				mainDiv.printError("getLegendWidth", e);
			}
		};
		
		mainDiv.getStatusHeight = function() {
			if (finished || !statusCanvas.bundle)
				return 0;
			
			return 67;
		}
		
		mainDiv.setGraphOptions = function(hBest, lgnd, xAxis, yAxis, clr, size) {
			try {
				highlightBest = hBest;
				showLegend = lgnd;
				xAxisIndex = xAxis;
				yAxisIndex = yAxis;
				colorIndex = clr;
				markerSize = size;
				
			} catch (e) {
				mainDiv.printError("setGraphOptions", e);
			}
		}
		
		mainDiv.setFinished = function(done) {
			try {
				if (done) { 
					finished = true;
					mainDiv.updateStatusBundle(0);
				}
				else finished = false;
			} catch (e) {
				mainDiv.printError("setFinished", e);
			}
		};
			
		mainDiv.initializeData = function(bundleHeader){
			try {
				if (!bundleHeader)
					return;
				
				canvas.bundle = Bundle.interpretHeader(bundleHeader);
			} catch(e) {
				mainDiv.printError("initializeData", e);
			}
		};

		mainDiv.updateData = function(bundle_data){
			try {
				if (!bundle_data) {
					canvas.bundle = undefined;
					return 0;
				}
			
				canvas.bundle = Bundle.interpretData(bundle_data, canvas.bundle);
				mainDiv.updateBundleArray();
				mainDiv.setIndices();
			} catch(e) {
				mainDiv.printError("updateData", e);
				printError(e);
			}
		};
			
		mainDiv.updateBundleArray = function() {
			try {
				// sort by first index (SolutionID)
				// still sort by frontiers
			
				bundleData = [];
				bundleCopy = [];
				for (var i = 0; i < canvas.bundle.nrEntries; i++) {
					bundleCopy[i] = [];
					for (var j = 0; j < canvas.bundle.nrFields; j++) {
						bundleCopy[i][j] = canvas.bundle.getValue(i, j);
					}
				}
				
				bundleCopy.sort(function(a, b) {return a[solutionIndex] - b[solutionIndex]});
					
				if (frontierIndex)
					numFrontiers = bundleCopy[bundleCopy.length - 1][frontierIndex] + 1;
				
				if (numFrontiers == 1) {
					bundleData[0] = bundleCopy;
				} else {
					var row = 0;
					for (var i = 0; i < numFrontiers; i++) {
						bundleData[i] = [];
						while (row < bundleCopy.length
							&& bundleCopy[row][frontierIndex] == i) {
							bundleData[i].push(bundleCopy[row]);
							row++;
						}
					}
				}
				
			} catch(e) {
				mainDiv.printError("updateBundleArray", e);
			}
		};
		
		mainDiv.updateRange = function(includeNext) {
			try {
				var yChanged = false;
				var xChanged = false;
				var shift = 0;
				if (includeNext) shift = 1;
				
				minYVal = 0xFFFFFFFF;
				maxYVal = -0xFFFFFFFF;
				minXVal = 0xFFFFFFFF;
				maxXVal = -0xFFFFFFFF;

				for (var i = 0; i < bundleCopy.length; i++) {	
					if (bundleCopy[i][yAxisIndex] < minYVal) {
						minYVal = bundleCopy[i][yAxisIndex];
						yChanged = true;
					}
					if (bundleCopy[i][yAxisIndex] > maxYVal) { 
						maxYVal = bundleCopy[i][yAxisIndex];
						yChanged = true;
					}
					if (shift) {
						if (bundleCopy[i][yAxisIndex + shift] < minYVal) {
							minYVal = bundleCopy[i][yAxisIndex + shift];
							yChanged = true;
						}
						if (bundleCopy[i][yAxisIndex + shift] > maxYVal) { 
							maxYVal = bundleCopy[i][yAxisIndex + shift];
							yChanged = true;
						}
					}
					if (bundleCopy[i][xAxisIndex] < minXVal) { 
						minXVal = bundleCopy[i][xAxisIndex];
						xChanged = true;
					}
					if (bundleCopy[i][xAxisIndex] > maxXVal) { 
						maxXVal = bundleCopy[i][xAxisIndex];
						xChanged = true;
					}
				} 
				
				if (maxXVal < minXVal) {
					throw (minXVal + " " + maxXVal);
				}
				
				// Put a 5% buffer on all edges
				if (xChanged) {
					var xDiff = (maxXVal - minXVal)*0.05;
					maxXVal += xDiff;
					minXVal -= xDiff;
				}

				if (yChanged) {
					var yDiff = (maxYVal - minYVal)*0.05;
					maxYVal += yDiff;
					minYVal -= yDiff;
				}
				
				if (minYVal == maxYVal) {
					minYVal -= 1;
					maxYVal += 1;
				}
				
				if (minXVal == maxXVal) {
					minXVal -= 1;
					maxXVal += 1;
				}
				
			} catch(e) {
				mainDiv.printError("updateRange", e);
			}
		};
		
		mainDiv.reset = function() {
			try {
				nrObjs = 0;
				nrVars = 0;
				nrPfms = 0;
				nrConstraints = 0;
				usesReps = 0;
				
				markerSize = 0;
				
				colorIndex = 0;
				
				finished = false;
				selectedSolutions = [];
				currentSolution = 0;
				
				solutionIndex = 0;
				rankIndex = Number.NaN;
				frontierIndex = Number.NaN;
				feasibleIndex = 0;
				paretoIndex = Number.NaN;
				singleObjIndex = Number.NaN;
				bestIterationIndex = Number.NaN;
				repsIndex = Number.NaN;
				stdDevIndex = Number.NaN;
				repTermIndex = Number.NaN;
				objIndex = 0;
				varIndex = 0;
				pfmIndex = 0;
				constraintIndex = Number.NaN;
				
				xAxisIndex = solutionIndex;
				yAxisIndex = objIndex;
				highlightBest = false;
				showLegend = false;
				someInfeasible = false;
				hasLicense = true;
				legendWidth = 0;
				
				searchMode = 1;
				numFrontiers = 1;
				
				minYVal = 10000000000;
				maxYVal = -10000000000;
				minXVal = 10000000000;
				maxXVal = -10000000000;
				
				bundleData = [];
				bundleCopy = [];
			} catch(e) {
				mainDiv.printError("reset", e);
			}
		};
		
		mainDiv.setBundleProperties = function(mode, nObjs, nVars, nPfms, nConstraints, uReps) {
			try {
				searchMode = mode;	
				nrObjs = nObjs;
				nrVars = nVars;
				nrPfms = nPfms;
				nrConstraints = nConstraints;
				usesReps = uReps;
			} catch(e) {
				mainDiv.printError("setBundleProperties", e);
			}
		};
		
		// This function uses the numbers of various factors to calculate useful indices
		mainDiv.setIndices = function() {
			try {
				if (!canvas.bundle) return 0;
				if (feasibleIndex) return 0;
				var currIndex = 0;
				solutionIndex = currIndex++;
				if (searchMode != 3) {
					if (canvas.bundle.getFieldName(currIndex) == "Rank")
						rankIndex = currIndex++;
					else
						frontierIndex = currIndex++;
				}
				
				feasibleIndex = currIndex++;
				
				if (searchMode != 3) {
					singleObjIndex = currIndex++;
					bestIterationIndex = currIndex++;
				}
				
				if (searchMode == 3)
					paretoIndex = currIndex++;
				
				objIndex = currIndex; 
				currIndex += nrObjs;
				if (usesReps) {
					repsIndex = currIndex++;
					stdDevIndex = currIndex; 
					currIndex += nrObjs;
					repTermIndex = currIndex++;
				}
		
				varIndex = currIndex; currIndex += nrVars;
				pfmIndex = currIndex; currIndex += nrPfms;
				if (nrConstraints)
					constraintIndex = currIndex;
					
			} catch(e) {
				mainDiv.printError("setIndices", e);
			}
		};
		
		mainDiv.setAlpha = function(rgbaColorString, alpha) {
			try {
				return rgbaColorString.replace("0.5", alpha.toString());
			} catch (e) {
				mainDiv.printError("setAlpha", e);
			}
		};
		
		mainDiv.printError = function(msg, e) {
			headerCanvas.height = 30;
			headerCanvas.width = mainDiv.offsetWidth;
		
			headerCtx.save();
			headerCtx.fillStyle = "red";
			headerCtx.font = "13pt Tahoma";
			headerCtx.fillText(msg + ": " + e, 10, 13);			
			headerCtx.restore();
		}
		
		window.addEventListener("resize", function() {mainDiv.arrange(); mainDiv.draw();}, false);
		canvas.addEventListener("mousemove", mainDiv.onMouseMove, false);
		canvas.addEventListener("click", mainDiv.onClick, false);
		fireFlexsimEvent("onOptimizerLoaded");		
	
	} catch (e) {
		headerCtx.font = "11pt Tahoma";
		headerCtx.fillText(e, 10, 10);
		print('exception caught in optimizer mainDiv'); 
		printError(e);
	}
};

function onDocLoadedOpt() {
	var optStatus = document.getElementById('optimizerStatus');
	if(optStatus)
		initializeOptimizerStatus(optStatus);	
};

if(document.addEventListener)
	document.addEventListener('DOMContentLoaded', onDocLoadedOpt, false);
else if(document.attachEvent)
	document.attachEvent('onDOMContentLoaded',onDocLoadedOpt);