function initializeGanttD3(div) {
	'use strict';

	var mainDiv = div;
	var DATA_FORMAT_NONE = 0;
	var DATA_FORMAT_OBJECT = 1;
	var DATA_FORMAT_TIME = 2;
	var DATA_FORMAT_PERCENT = 3;

	function Settings() {
		this.precision = 2;

		this.markSize = 10;

		this.fontSize = 10;
		this.titleFontSize = 14;
		this.fontFamily = 'helvetica';

		this.showLegend = false;
		this.chartTitle = "";
		this.xAxisTitle = "";
		this.modelStartTime = 0;

		this.objectIndex = 0;
		this.objectFormat = 0;
		this.startValueIndex = 1;
		this.endValueIndex = 2;
		this.stateValueIndex = 3;
		this.stateValueFormat = 0;

		this.colorMap = {};

		this.objectIDMap = {};

		this.colors = d3.schemeCategory20.slice(0, 20);
		
		var colorParts = ["00", "33", "66", "99", "CC", "FF"];
		var possiblities = Math.pow(colorParts.length, 3);
		var indices = [0, 0, 0]; // rgb indices
		for (var i = 0; i < possiblities - 1; i++) {
			indices[i % 3] = i % colorParts.length;
			indices[(i + 1) % 3] = Math.floor(i / colorParts.length) % colorParts.length;
			indices[(i + 2) % 3] = Math.floor(i / colorParts.length / colorParts.length);

			this.colors.push("#" 
				+ colorParts[indices[0]]
				+ colorParts[indices[1]]
				+ colorParts[indices[2]]
				// + "FF"
			);
		}

		this.toJSTime = function toJSTime(timeValue) {
			// shift the time value, so that it is relative
			// to 1970, rather than the model start time
			// 11644473600 is windows file time (in seconds) for unix 0, Jan 1 1970
			var jsTime = (timeValue - 11644473600.0) * 1000;
			return jsTime;
		}

		this.hashString = function(s){
			return Math.abs(s
				.split("")
				.reduce(function(a,b){
					a = ((a<<5)-a) + b.charCodeAt(0);
					return a&a
				},0));              
		};

		var ss = this;
		this.valueToColor = function(value) {
			var colorMapValue = ss.colorMap[value];
			if (colorMapValue != undefined)
				return colorMapValue;
			
			if (typeof(value) == "string") {
				value = ss.hashString(value);
			}
			var color = ss.colors[value % ss.colors.length];  
			ss.colorMap[value] = color;
			return color;
		}

		this.valueToString = function valueToString(value, format) {
			switch (format) {
			case DATA_FORMAT_OBJECT:
				return "" + ss.objectIDMap[value];
			case DATA_FORMAT_TIME:
				return new Date(ss.toJSTime(xVal)).toUTCString().slice(0, -4);
			case DATA_FORMAT_PERCENT:
				if (!ss.formatter || ss.formatterPrecision != ss.precision) {
					ss.formatterPrecision = ss.precision;
					ss.formatter = d3.format("." + ss.precision + "p");
				}
					
				return ss.formatter(value);
			}
			if (typeof(value) === "number")
				return value.toFixed(ss.precision);
			return value;
		};
	};

	mainDiv.objectBundleHelper = new BundleHelper(div);
	mainDiv.stateBundleHelper = new BundleHelper(div);
	mainDiv.maxTime = null;

	var settings = new Settings();
	mainDiv.settings = settings;

	function DrawData() {
		var dd = this;

		this.width = 100;
		this.height = 100;

		this.rowCount = 0;

		// graph constants
		this.padding = 5;

		this.svg = d3.select(div).append('svg');
		this.svgElement = this.svg.node();

		this.axisSized = false;

		this.y = d3.scaleOrdinal();
		this.yAxis = d3.axisLeft(this.y);
	
		// canvas data
		this.scrollWrapper = this.svg.append('foreignObject')
			.attr("scroll", "none");
		this.scrollDiv = this.scrollWrapper.append('xhtml:div')
			.style("overflow-y", "scroll");
		this.bigDiv = this.scrollDiv.append('xhtml:div')
			.style('overflow-y', 'none');
		this.canvas = this.bigDiv.append('xhtml:canvas')
			.style('position', 'relative')
		this.drawScaleX = null;
		this.drawScaleY = null;

		this.x = d3.scaleUtc();
		this.xAxis = d3.axisBottom(this.x);
		this.xAxisG = this.svg.append("g").classed('x-axis', true);
		this.xAxisHeight = 0;

		this.scrollG = this.svg.append("g");
		this.scrollBackground = this.scrollG.append("path");
		this.scrollBackground.attr("fill", "gray");

		this.scrollBar = this.scrollG.append("g")
			.attr("fill", "lightGray")
			;

		// I add the center of the scroll bar first
		this.scrollCenter = this.scrollBar.append("rect")
			.attr("fill", "lightGray");
		this.scrollLeft = this.scrollBar.append("path")
			.attr("fill", "silver");
		this.scrollRight = this.scrollBar.append("path")
			.attr("fill", "silver");

		this.lastScrollData = null;

		// The position of the scroll
		this.scrollTop = 0;

		// The height of the scroll bar
		this.scrollHeight = 10.0;

		// scroll state variables
		this.scrollRightPos = 0;
		this.scrollLeftPos = 100;

		this.scrollCustom = false;
		this.scrollLockedRight = true;

		// Titles
		this.xAxisText = this.svg.append("text").classed("axis-title", true);
		this.chartTitleText = this.svg.append("text").classed("chart-title", true);

		// Legend
		this.legendG = this.svg.append("g");

		// Tick lines
		this.tickG = this.svg.append("g");

		this.doResize = true;
		this.resize = function resize(atTime) {
			var settings = mainDiv.settings;
			var stateBundleHelper = mainDiv.stateBundleHelper;
			var objectBundleHelper = mainDiv.objectBundleHelper;

			dd.doResize = false;
			dd.width = +mainDiv.offsetWidth;
			dd.height = +mainDiv.offsetHeight;

			dd.fontSize = settings.fontSize;
			dd.titleFontSize = settings.titleFontSize;

			// Make sure the main svg fills the graph space
			dd.svg.attr('width', dd.width)
				.attr('height', dd.height)

			var padding = dd.padding;

			// Place the chart title
			dd.chartTitleText.text(mainDiv.settings.chartTitle)
				.attr("font-size", settings.titleFontSize + "px")
				.attr("font-family", settings.fontFamily)
				;
			var chartTitleBBox = dd.chartTitleText.node().getBBox();
			dd.chartTitleText
				.attr("x", dd.width / 2.0 - chartTitleBBox.width / 2.0)
				.attr("y", padding + chartTitleBBox.height / 2.0);

			if (!mainDiv.bundle)
				return;

			// handle the legend
			var legendTop = padding + chartTitleBBox.height + padding;
			dd.showLegend = settings.showLegend;
			if (dd.showLegend) {
			try {
				var curX = dd.padding;
				var curY = 0;
				var legendHeight = 0;
				var legendWidth = 0;
				var rowHeight = 0;
				var maxLegendX = dd.width - 2 * padding;

				var selection = dd.legendG.selectAll("g.legend-item")
					.data(stateBundleHelper.dataSetArray);

				selection.exit().remove();

				selection.enter()
					.append("g")
					.classed("legend-item", true)
					.merge(selection)
				.each(function (dataSet, i, node) {
					var legendItem = d3.select(this);

					var rect = legendItem.selectAll('rect').data([dataSet]);
					rect.exit().remove();
					rect.enter()
						.append('rect')
						.merge(rect)
						.attr("x", 0)
						.attr("y", settings.fontSize / 2.0 - settings.markSize / 2.0)
						.attr("width", settings.markSize)
						.attr("height", settings.markSize)
						.attr("fill", function(dataSet, i) {
							var colName = stateBundleHelper.bundle.getFieldName(settings.stateValueIndex);
							var value = dataSet.keyInfo[colName];
							return settings.valueToColor(value);
						})
						;
					
					var text = legendItem.selectAll('text').data([dataSet]);
					text.exit().remove();
					text.enter()
						.append('text')
						.merge(text)
						.attr("x", settings.markSize + padding)
						.attr("y", settings.fontSize - 2)
						.attr("font-size", settings.fontSize + "px")
						.attr("font-family", settings.fontFamily)
						.html(function getLegendText(d) {							
							var index = settings.stateValueIndex;
							var colName = stateBundleHelper.bundle.getFieldName(index);
							var value = d.keyInfo[colName];
							if (settings.stateValueFormat == DATA_FORMAT_OBJECT)
								value = settings.objectIDMap[value]
							
							return value;
						})
						;
				})
				.each(function(dataSet, i, nodes) {
					dd.legendItems++;
					var bbox = nodes[i].getBBox();
					var itemWidth = bbox.width;
					rowHeight = Math.max(rowHeight, bbox.height);

					// if the next item is too wide to go on this line, go to next line
					if (curX + itemWidth + 3 * dd.padding > maxLegendX) {
						curY += dd.padding + rowHeight;
						rowHeight = 0;

						curX = dd.padding;
					}

					var item = d3.select(nodes[i]);
					item.attr("transform", function() {
						return "translate(" + curX + ", " + curY + ")";
					});
					curX += itemWidth + 3 * padding;
				});

				dd.legendG.attr("transform", "translate(0," + legendTop + ")");
			} catch(e) {
				print("error in legend");
				printError(e);
			}
			} else {
				dd.legendG.selectAll("g.legend-item").data([]).exit().remove();
			}
			dd.stateCount = stateBundleHelper.dataSetArray.length;

			var legendHeight = dd.legendG.node().getBBox().height;

			// Place the x title (in y)
			var xAxisTextY = dd.height - padding;
			dd.xAxisText
				.attr("font-size", settings.titleFontSize + "px")
				.attr("font-family", settings.fontFamily)
				.attr('y', dd.height - padding)
				.html(settings.xAxisTitle);
			var xAxisBBox = dd.xAxisText.node().getBBox();
			var xAxisTextWidth = xAxisBBox.width;
			var xAxisTextHeight = xAxisBBox.height;

			dd.scrollTop = xAxisTextY - xAxisTextHeight 
				- dd.scrollHeight - padding;

			var viewTop = legendTop + legendHeight + padding;
			var viewBottom = dd.scrollTop - padding - dd.scrollHeight - settings.fontSize;

			var viewHeight = viewBottom - viewTop;

			var viewLeft = 0;
			var viewRight = dd.width;
			var viewWidth = viewRight - viewLeft;

			// move all the wrapped divs
			dd.scrollWrapper
				.attr('x', viewLeft)
				.attr('y', viewTop)
				.attr('width', viewWidth)
				.attr('height', viewHeight)
				;

			dd.scrollDiv
				.style('width', viewWidth)
				.style('height', viewHeight)
				;

			// Now figure out how tall the big div is supposed to be
			var rowCount = objectBundleHelper.dataSetArray.length;
			var rowHeight = Math.max(settings.fontSize, settings.markSize) + padding;
			// the text is centered on the row,
			// so the marks are half above and below the top and bottom
			// so add in another row
			var yAxisHeight = (Math.max(rowCount, 1) + 0.1) * rowHeight;

			// And some padding for good measure
			var bigDivHeight = yAxisHeight + 2 * padding;

			dd.bigDiv.style('height', bigDivHeight);
			var paintWidth = dd.scrollDiv.node().clientWidth;
			dd.bigDiv
				.style('width', paintWidth)

			// now make the canvas the right size (position in paint)
			dd.canvas
				.attr('width', paintWidth)
				.attr('height', viewHeight)
				.style('width', paintWidth)
				.style('height', viewHeight)
				;

			// also, set the canvas font
			var ctx = dd.canvas.node().getContext('2d');
			ctx.font = settings.fontSize + "px " + settings.fontFamily;

			// now find the longest text, and make that the
			// y axis width
			// While I'm at it, I also set the y axis
			var objColName = objectBundleHelper.bundle.getFieldName(settings.objectIndex);
			var prefix = "";
			var longestStr = prefix;
			dd.rowStrings = [];
			objectBundleHelper.dataSetArray.forEach(function(dataSet) {
				var keyStr = dataSet.keyInfo[objColName];
				var valueStr =  settings.valueToString(keyStr, settings.objectFormat);
				var rowStr = prefix + valueStr;
				dd.rowStrings.push(rowStr);
				if (rowStr.length > longestStr.length)
					longestStr = rowStr;
			});

			dd.y.domain(dd.rowStrings).range(dd.rowStrings.map(function(str, i) {
				return (rowHeight) * (i + 0.5);
			}));

			var yAxisWidth = ctx.measureText(longestStr).width + 8;
			var xAxisLeft = padding + yAxisWidth;
			var rightMargin = 20;
			if (viewWidth > paintWidth)
				rightMargin = padding;
			var xAxisWidth = paintWidth - xAxisLeft - rightMargin;

			// Now I have the width and the height
			var yAxisTop = padding;
			var yAxisBottom = yAxisTop + yAxisHeight;
			var yAxisBottom = yAxisTop + yAxisHeight;
			var xAxisLeft = Math.max(20, padding + yAxisWidth);

			// cache off the variables I need state for
			dd.xAxisWidth = xAxisWidth;
			dd.xAxisLeft = xAxisLeft;
			dd.xAxisRight = xAxisLeft + xAxisWidth;
			dd.yAxisBottom = yAxisBottom;
			dd.yAxisTop = yAxisTop;

			dd.rowHeight = rowHeight;

			dd.viewTop = viewTop;
			dd.viewBottom = viewBottom;
		};

		this.handleXAxisOnDraw = function handleXAxisOnDraw(atTime) {

			// scroll points
			var r = dd.scrollHeight / 2.0; // r is radius
			var top = dd.scrollTop;
			var bottom = top + dd.scrollHeight;
			var left = dd.xAxisLeft + r;
			var right = dd.xAxisLeft + dd.xAxisWidth - r;

			// Draw the scroll background
			dd.scrollBackground.attr("d", function() {
				var pathData = [
					'M', left, top,
					'L', right, top,
					'A', r, r, 0, 0, 1, right, bottom,
					'L', left, bottom,
					'A', r, r, 0, 0, 1, left, top
				];

				return pathData.join(" ");
			});

			var min = settings.modelStartTime;
			var max = mainDiv.maxTime;
			if (max - min <= 0)
				max = min + 1;

			// use the current time (sometimes)
			if (!dd.scrollCustom || dd.scrollLockedRight) {
				max = Math.max(max, atTime);
			}

			// Now figure out where the scroll pos ought to be
			var scrollScale = d3.scaleLinear()
				.domain([min, max])
				.range([dd.xAxisLeft, dd.xAxisLeft + dd.xAxisWidth])

			if (!dd.lastScrollData) {
				dd.scrollCustom = false;
				dd.scrollLockedRight = false;
			} else if (dd.scrollCustom && dd.lastScrollData.manualUpdate) {
				var oldRange = dd.lastScrollData.max - dd.lastScrollData.min;
				// make sure the user stays in bounds
				if (dd.lastScrollData.min < min)
					dd.lastScrollData.min = min;

				if (dd.lastScrollData.max >= max) {
					dd.lastScrollData.max = max;
					dd.scrollLockedRight = true;
				} else {
					dd.scrollLockedRight = false;
				}

				if (dd.lastScrollData.manualUpdateCenter) {
					if (dd.lastScrollData.max == max)
						dd.lastScrollData.min = max - oldRange;

					if (dd.lastScrollData.min == min)
						dd.lastScrollData.max = min + oldRange;

				} else {
					// make sure they don't overlap
					var minDist = scrollScale.invert(2 * r) - scrollScale.invert(0);
					if (dd.lastScrollData.max - dd.lastScrollData.min < minDist) {
						if (dd.lastScrollData.manualUpdateLeft) {
							dd.lastScrollData.min = dd.lastScrollData.max - minDist;
						} else if (dd.lastScrollData.manualUpdateRight) {
							dd.lastScrollData.max = dd.lastScrollData.min + minDist;
						}
					}
				}
			}

			// Figure out the range of data represented by the scroll bar
			if (dd.scrollCustom) {
				var dRange = max - dd.lastScrollData.max;
				min = dd.lastScrollData.min
				max = dd.lastScrollData.max

				if (dd.scrollLockedRight) {
					min += dRange;
					max += dRange;
				}
				// otherwise, keep the window exactly where it is
			}

			// If the range between min and max is too tiny, the chart crashes
			if (Math.abs(min - max) < 0.001)
				max = min + 0.001;

			dd.scrollPosLeft = scrollScale(min);
			dd.scrollPosRight = scrollScale(max);

			var left = dd.scrollPosLeft + r;
			var right = dd.scrollPosRight - r;

			// put the scroll at the beginning and end
			dd.scrollLeft.attr("d", function() {
				var pathData = [
					'M', left, top,
					'L', left + r, top,
					'L', left + r, bottom,
					'L', left, bottom,
					'A', r, r, 0, 0, 1, left, top
				];

				return pathData.join(" ");
			});

			dd.scrollRight.attr("d", function() {
				var pathData = [
					'M', right, top,
					'A', r, r, 0, 0, 1, right, bottom,
					'L', right - r, bottom,
					'L', right - r, top,
					'L', right, top
				];

				return pathData.join(" ");
			});

			dd.scrollCenter
				.attr("x", left)
				.attr("y", top)
				.attr("width", right - left)
				.attr("height", dd.scrollHeight)
				;

			// place the x title
			dd.xAxisText.attr('x', function() {
				var center =  dd.xAxisLeft + dd.xAxisWidth / 2.0;
				var width = dd.xAxisText.node().getBBox().width;
				return center - width / 2.0;
			})

			dd.drawScaleX = d3.scaleLinear()
				.domain([min, max])
				.range([dd.xAxisLeft, dd.xAxisRight])

			dd.x.domain([settings.toJSTime(min), settings.toJSTime(max)])
				.range([dd.xAxisLeft, dd.xAxisLeft + dd.xAxisWidth]);
			var tickValues = dd.x.ticks(4);
			dd.xAxis.ticks(4);
			dd.xAxisG.call(dd.xAxis);
			dd.xAxisG.selectAll("text")
				.attr("font-size", settings.fontSize + "px")
				.attr("font-family", settings.fontFamily)

			dd.xAxisG.attr("transform", function(d) {
				return "translate(" 
					+ [0, dd.viewBottom].join(" ") 
					+ ")";
			});

			// draw the tick lines

			var selection = dd.tickG.selectAll("line")
				.data(tickValues);

			selection.exit().remove();
			selection.enter().append("line")
				.attr("stroke", "gray")
				.attr("stroke-width", 1)

			dd.tickG.selectAll("line")
				.attr("x1", function(d) { return dd.x(d);})
				.attr("x2", function(d) { return dd.x(d);})
				.attr("y1", dd.viewTop)
				.attr("y2", dd.viewBottom);

			// cache off the last scroll data
			dd.lastScrollData = {
				min: min,
				max: max,
				atTime: atTime,
				scrollScale: scrollScale,
				manualUpdate: false,
			};
		};

		this.needsResize = function needsResize() {
			if (dd.doResize)
				return true;

			if (dd.width != +dd.svg.node().parentElement.offsetWidth)
				return true;

			if (dd.height != +dd.svg.node().parentElement.offsetHeight)
				return true;

			if (dd.showLegend != settings.showLegend)
				return true;

			if (dd.objectCount != mainDiv.objectBundleHelper.dataSetArray.length)
				return true;

			if (dd.stateCount != mainDiv.stateBundleHelper.dataSetArray.length)
				return true;

			if (dd.fontSize != settings.fontSize)
				return true;

			if (dd.titleFontSize != settings.titleFontSize)
				return true;

			return false;
		};

		this.onLeftDrag = function onLeftDrag(d) {
			// Move the last scroll min
			var scale = dd.lastScrollData.scrollScale;
			var dMin = scale.invert(+d3.event.dx) - scale.invert(0);

			dd.lastScrollData.min += dMin;		
			dd.lastScrollData.manualUpdate = true;
			dd.lastScrollData.manualUpdateLeft = true;

			dd.scrollCustom = true;
			div.draw(dd.lastScrollData.atTime);
		};

		this.onRightDrag = function onRightDrag(d) {
			// Move the last scroll max
			var scale = dd.lastScrollData.scrollScale;
			var dMax = scale.invert(+d3.event.dx) - scale.invert(0);

			dd.lastScrollData.max += dMax;
			dd.lastScrollData.manualUpdate = true;
			dd.lastScrollData.manualUpdateRight = true;

			dd.scrollCustom = true;
			div.draw(dd.lastScrollData.atTime);
		};

		this.onCenterDrag = function onCenterDrag(d) {
			// Move the last max and min
			var scale = dd.lastScrollData.scrollScale;
			var dRange = scale.invert(+d3.event.dx) - scale.invert(0);

			dd.lastScrollData.min += dRange;
			dd.lastScrollData.max += dRange;
			dd.lastScrollData.manualUpdate = true;
			dd.lastScrollData.manualUpdateCenter = true;

			div.draw(dd.lastScrollData.atTime);
		};

		this.dragging = false;

		this.scrollLeft.call(d3.drag()
			.on("drag", dd.onLeftDrag)
			.on("start", function() { dd.dragging = true;})
			.on("end", function() { dd.dragging = false;}));
		this.scrollRight.call(d3.drag()
			.on("drag", dd.onRightDrag)
			.on("start", function() { dd.dragging = true;})
			.on("end", function() { dd.dragging = false;}));
		this.scrollCenter.call(d3.drag()
			.on("drag", dd.onCenterDrag)
			.on("start", function() { dd.dragging = true;})
			.on("end", function() { dd.dragging = false;}));

	}; // DrawData

	mainDiv.drawData = new DrawData();

	mainDiv.reset = function reset(bundle) {
		mainDiv.objectBundleHelper = new BundleHelper(mainDiv);
		mainDiv.stateBundleHelper = new BundleHelper(mainDiv);

		mainDiv.objectBundleHelper.reset(bundle);
		mainDiv.stateBundleHelper.reset(bundle);
	
		mainDiv.objectBundleHelper.setKeyColumns([mainDiv.settings.objectIndex]);
		mainDiv.stateBundleHelper.setKeyColumns([mainDiv.settings.stateValueIndex]);
		mainDiv.stateBundleHelper.setInfoColumns([
			mainDiv.settings.startValueIndex,
			mainDiv.settings.endValueIndex
		]);

		mainDiv.drawData.scrollCustom = false;
		mainDiv.drawData.scrollLockedRight = false;

		mainDiv.doResize = true;
	};

	mainDiv.updateData = function updateData(bundle) {
		mainDiv.bundle = bundle;
		if (bundle) {
			mainDiv.objectBundleHelper.update(bundle);
			mainDiv.stateBundleHelper.update(bundle);
			// There are probably fewer states than objects
			var startRange = mainDiv.stateBundleHelper.getRange(settings.startValueIndex);
			var endRange = mainDiv.stateBundleHelper.getRange(settings.endValueIndex);
		}

		mainDiv.maxTime = Math.max(startRange.max, endRange.max);
	}

	mainDiv.hitTest = false;
	mainDiv.draw = function draw(atTime) {
		
		var drawData = mainDiv.drawData;
		var stateBundleHelper = mainDiv.stateBundleHelper;
		var objectBundleHelper = mainDiv.objectBundleHelper;
		var settings = mainDiv.settings;
		if (!mainDiv.hitTest) {
			if (drawData.needsResize())
				drawData.resize();

			if (mainDiv.bundle)
				drawData.handleXAxisOnDraw(atTime);
		}
		mainDiv.lastDrawTime = atTime ? atTime : 0;
		if (mainDiv.bundle)
			mainDiv.paint();
	};

	mainDiv.paint = function paint() {
		var drawData = mainDiv.drawData;
		var dd = drawData;
		var stateBundleHelper = mainDiv.stateBundleHelper;
		var objectBundleHelper = mainDiv.objectBundleHelper;
		var settings = mainDiv.settings;

		var objectDataSetMap = {};
		var objectIndexMap = {};

		var yOffset = dd.scrollDiv.node().scrollTop;

		var canvas = drawData.canvas;
		canvas.style('top', yOffset);
		
		var ctx = canvas.node().getContext('2d');
		var canvasWidth = +canvas.attr("width");
		var canvasHeight = +canvas.attr("height");

		ctx.clearRect(0, 0, canvasWidth, canvasHeight);

		var xAxisDrawLeft = Math.floor(dd.xAxisLeft) - 0.5;

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 1.0;
		// draw the y axis
		ctx.beginPath();
		
		ctx.moveTo(xAxisDrawLeft, 0);
		ctx.lineTo(xAxisDrawLeft, canvasHeight);
		ctx.stroke();

		ctx.textAlign = 'right';
		ctx.fillStyle = "#000";

		// draw ticks/text
		dd.rowStrings.forEach(function(rowString) {
			var y = dd.y(rowString) - yOffset;
			if (y + settings.markSize < 0)
				return;

			if (y > canvasHeight)
				return;

			y = Math.floor(y) - 0.5;

			ctx.beginPath();
			ctx.moveTo(xAxisDrawLeft, y);
			ctx.lineTo(xAxisDrawLeft - 6, y);
			ctx.stroke();

			y += settings.fontSize / 2.0;
			ctx.fillText(rowString, xAxisDrawLeft - 8, y);
		});

		var backgroundDrawnSet = new Set();

		var bundle = objectBundleHelper.bundle;
		var entryCount = objectBundleHelper.analyzedEntries;
		for (var i = 0; i < entryCount; i++) {
			var object = bundle.getValue(i, settings.objectIndex);
			var startValue = bundle.getValue(i, settings.startValueIndex);
			var endValue = bundle.getValue(i, settings.endValueIndex);
			if (endValue == null)
				endValue = mainDiv.lastDrawTime;
			var state = bundle.getValue(i, settings.stateValueIndex);

			var objectDataSet = objectDataSetMap[object];
			if (objectDataSet === undefined) {
				// find the object's data set
				objectDataSet = objectBundleHelper.dataSets["" + object];
				objectDataSetMap[object] = objectDataSet;
				objectIndexMap[object] = objectBundleHelper.dataSetArray.indexOf(objectDataSet);
			}

			var objIndex = objectIndexMap[object];
			var key = drawData.rowStrings[objIndex];

			var y = drawData.y(key) - yOffset;

			// On the first pass for this row, draw the background bar
			if (objIndex % 2 == 1 && !backgroundDrawnSet.has(objIndex)) {
				ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
				ctx.fillRect(xAxisDrawLeft + 1, y - dd.rowHeight / 2.0, 
					dd.xAxisWidth, dd.rowHeight);
				backgroundDrawnSet.add(objIndex);
			}

			var viewMin = drawData.lastScrollData.min;
			var viewMax = drawData.lastScrollData.max;
			if (endValue < viewMin)
				continue;

			if (startValue < viewMin)
				startValue = viewMin;

			if (startValue > viewMax)
				continue;

			if (endValue > viewMax)
				endValue = viewMax;

			var x = drawData.drawScaleX(startValue);
			var x2 = drawData.drawScaleX(endValue);

			var width = x2 - x;
			
			if (y + height < 0)
				continue;

			if (y > canvasHeight)
				continue;

			var height = settings.markSize;
			ctx.fillStyle = settings.valueToColor(state);
			ctx.fillRect(x, y - height / 2.0, width, height);
		}
	};

	mainDiv.drawData.scrollDiv.on('scroll', mainDiv.paint, false);

	mainDiv.applySettings = function applySettings(settingsStr) {
		if (typeof(settingsStr) !== 'string') {
			settingsStr = mainDiv.getAttribute('data-series-settings');
			if (typeof(settingsStr) !== 'string') {
				return;
			}
		}

		try {
			var settingsObj = JSON.parse(settingsStr);
		} catch(e) {
			print("Error in mainDiv.applySettings");
			printError(e);
		}

		function applySetting(settingName) {
			if (typeof(settingsObj[settingName]) !== "undefined")
				mainDiv.settings[settingName] = settingsObj[settingName];
		}

		applySetting("chartTitle");
		applySetting("xAxisTitle");
		applySetting("showLegend");
		applySetting("modelStartTime");

		applySetting("fontSize");
		applySetting("titleFontSize");
		applySetting("precision");

		applySetting("objectIndex");
		applySetting("objectFormat");
		applySetting("startValueIndex");
		applySetting("endValueIndex");
		applySetting("stateValueIndex");
		applySetting("stateValueFormat");

		applySetting("colorMap");
	};

	mainDiv.addObjectIDAndPath = function addObjectIDAndPath(id, path) {
		settings.objectIDMap[id] = path;
	};

	// a no-op, for compatibility
	mainDiv.setProperties = function setProperties(properties, redraw) {

	};

	mainDiv.onResize = function onResize() {
		mainDiv.drawData.doResize = true;
		mainDiv.draw();
	};

	window.addEventListener('resize', mainDiv.onResize, false);
};