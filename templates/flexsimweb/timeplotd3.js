function initializeTimeplotd3(div) {
	"use strict"
	var mainDiv = div;
	var className = div.getAttribute('class');
	if(className && className.indexOf('fullscreen', 0) >= 0) {
		mainDiv.style['overflow-x'] = 'hidden';
		if(mainDiv.style.overflow)
			delete mainDiv.style.overflow;
	}
	mainDiv.className = className;

	var LINE_STYLE_POINTS = 0;
	var LINE_STYLE_LINES = 1;
	var LINE_STYLE_STAIRS = 2;

	var DATA_FORMAT_NONE = 0;
	var DATA_FORMAT_OBJECT = 1;
	var DATA_FORMAT_TIME = 2;
	var DATA_FORMAT_PERCENT = 3;

	function Settings() {
		this.modelStartTime = 0;
		this.showLegend = true;

		this.markSize = 3;
		this.fontSize = 12;
		this.titleFontSize = 14;
		this.fontFamily = "helvetica";
		this.precision = 2;

		this.xAxisTitle = "";
		this.yAxisTitle = "";
		this.chartTitle = "";

		this.xAxisIndex = 0;
		this.yAxisIndex = 0;
		
		this.style = 0;
		this.keyColumns = [];
		this.columnFormats = [];

		this.objectIDMap = {};

		this.formatterPrecision = null;
		this.percentFormatter = null;
	
		this.toJSTime = function toJSTime(timeValue) {
			// shift the time value, so that it is relative
			// to 1970, rather than the model start time
			// 11644473600 is windows file time (in seconds) for unix 0, Jan 1 1970
			var jsTime = (timeValue - 11644473600.0) * 1000;
			return jsTime;
		};

		var ss = this;
		this.valueToString = function valueToString(value, format) {
			switch (format) {
			case DATA_FORMAT_OBJECT:
				return "" + ss.objectIDMap[value];
			case DATA_FORMAT_TIME:
				return new Date(ss.toJSTime(xVal)).toUTCString().slice(0, -4);
			case DATA_FORMAT_PERCENT:
				if (!ss.precentFormatter || ss.formatterPrecision != ss.precision) {
					ss.formatterPrecision = ss.precision;
					ss.precentFormatter = d3.format("." + ss.precision + "p");
				}
				return ss.precentFormatter(value);
			}
			if (typeof(value) === "number")
				return value.toFixed(ss.precision);
			return value;
		}
	};

	function DrawData(div) {
		this.width = 100;
		this.height = 100;

		this.scrollHeight = 10.0;

		this.svg = d3.select(div).append('svg');
		this.svgElement = this.svg.node();

		this.xAxisG = this.svg.append("g");
		this.yAxisG = this.svg.append("g");

		this.scrollG = this.svg.append("g");
		this.scrollBackground = this.scrollG.append("path");
		this.scrollBackground.attr("fill", "gray");

		this.scrollBar = this.scrollG.append("g");

		// I add the center of the scroll bar first
		this.scrollCenter = this.scrollBar.append("rect")
			.attr("fill", "lightGray");
		this.scrollLeft = this.scrollBar.append("path")
			.attr("fill", "silver");
		this.scrollRight = this.scrollBar.append("path")
			.attr("fill", "silver");

		this.scrollCenter.append("title");
		
		this.scrollRightPos = 0;
		this.scrollLeftPos = 100;

		this.scrollCustom = false;
		this.scrollLockedRight = true;

		this.xAxisTitle = this.svg.append("text").classed("axis-title", true);
		this.yAxisTitle = this.svg.append("text").classed("axis-title", true);
		this.chartTitle = this.svg.append("text").classed("chart-title", true);

		this.legendG = this.svg.append("g");

		this.gridG = this.svg.append("g").classed("grid", true);

		this.canvasHolder = this.svg.append("foreignObject");
		this.canvas = this.canvasHolder.append("xhtml:canvas")
			.style("border", "1px solid #000");
		this.ctx = this.canvas.node().getContext('2d');

		this.padding = 5;
		var dd = this;
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
	};

	mainDiv.settings = new Settings();
	mainDiv.drawData = new DrawData(div);
	mainDiv.bundleHelper = new BundleHelper(div);

	mainDiv.handleTitleAndLegend = function handleTitleAndLegend() {
		var dd = mainDiv.drawData;
		var settings = mainDiv.settings;
		var bundleHelper = mainDiv.bundleHelper;

		var columnNameMap = {};
		settings.keyColumns.forEach(function(d, i) {
			columnNameMap[bundleHelper.bundle.getFieldName(d)] = d;
		});

		var titleTop = dd.padding;
		dd.chartTitle
			.attr("font-family", settings.fontFamily)
			.attr("font-size", settings.titleFontSize + "px")
			.html(settings.chartTitle);
		var chartTitleBBox = dd.chartTitle.node().getBBox();
		var chartTitleHeight = chartTitleBBox.height;
		var chartTitleWidth = chartTitleBBox.width;

		dd.chartTitle
			.attr("y", titleTop + chartTitleHeight)
			.attr("x", dd.width / 2.0 - chartTitleWidth / 2.0);

		var legendTop = dd.padding;
		if (chartTitleHeight > 0)
			legendTop += chartTitleHeight + dd.padding;

		if (settings.showLegend) {
			var curX = dd.padding;
			var curY = 0;
			var legendHeight = 0;
			var legendWidth = 0;
			var rowHeight = 0;
			var maxLegendX = dd.width - 4 * dd.padding;

			var legendItems = dd.legendG.selectAll("g.legend-item")
				.data(bundleHelper.dataSetArray);

			legendItems.exit().remove();
			legendItems.enter()
				.append("g")
				.classed("legend-item", true)
				.merge(legendItems)
			.each(function (dataSet, i) {
				var legendItem = d3.select(this);

				var text = legendItem.selectAll("text")
					.data(function() {
						if (settings.keyColumns.length == 0)
							return [1];
						return Object.keys(dataSet.keyInfo); 
					})

				text.exit().remove();
				text.enter().append("text")
					.merge(text)
					.attr("font-family", settings.fontFamily)
					.attr("font-size", settings.fontSize)
					.html(function (key) {
						if (settings.keyColumns.length == 0)
							return bundleHelper.bundle.getFieldName(settings.yAxisIndex);

						var dataSet = d3.select(this.parentElement).datum();
						var format = settings.columnFormats[columnNameMap[key]];
						var value = settings.valueToString(dataSet.keyInfo[key], format);
						return key + ": " + value;
					})
					.attr("x", settings.markSize * 2 + dd.padding)
					.attr("y", function (key, i) {
						var height = this.getBBox().height;
						return (i + 1) * height;
					})


				var rect = legendItem.selectAll("rect").data([dataSet]);
				rect.exit().remove();
				rect.enter().append("rect")
					.merge(rect)
					.attr("x", 0)
					.attr("y", function (dataSet) {
						var legendItemHeight = this.parentElement.getBBox().height;
						return legendItemHeight / 2.0 - settings.markSize / 2.0;
					})
					.attr("width", settings.markSize * 2)
					.attr("height", settings.markSize * 2)
					.attr("fill", function(dataSet) {
						return d3.schemeCategory20[i % 20];
					})
					;
			})
			.each(function(columnName, i, nodes) {
				var bbox = nodes[i].getBBox();
				var itemWidth = bbox.width;
				rowHeight = Math.max(rowHeight, bbox.height);

				// if the next item is too wide to go on this line, go to next line
				if (curX + itemWidth > maxLegendX) {
					curY += dd.padding + rowHeight;
					rowHeight = 0;
					curX = dd.padding;
				}

				var item = d3.select(nodes[i]);
				item.attr("transform", function() {
					return "translate(" + curX + ", " + curY + ")";
				});
				curX += itemWidth + 2 * dd.padding;
			});

			dd.legendG.attr("transform", "translate(0 " + legendTop + ")");	
		} else {
			dd.legendG.selectAll("g.legend-item").remove();
		}

		// cache of the important values for other functions
		var legendBottom = legendTop;
		var legendHeight = dd.legendG.node().getBBox().height;
		if (legendHeight > 0)
			legendBottom += legendHeight + 4 * dd.padding;

		dd.graphTop = legendBottom;
	};

	mainDiv.handleGraphElements = function handleGraphElements(atTime) {
		var dd = mainDiv.drawData;
		var settings = mainDiv.settings;
		var bundleHelper = mainDiv.bundleHelper;

		// set the x axis title, to get its height; position it later
		dd.xAxisTitle
			.attr("font-family", settings.fontFamily)
			.attr("font-size", settings.titleFontSize + "px")
			.html(settings.xAxisTitle);
		var xTitleBBox = dd.xAxisTitle.node().getBBox();
		var xTitleHeight = xTitleBBox.height;
		var xTitleWidth = xTitleBBox.width;

		// set the y axis title, to get its width; position it later
		dd.yAxisTitle
			.attr("font-family", settings.fontFamily)
			.attr("font-size", settings.titleFontSize + "px")
			.html(settings.yAxisTitle);
		var yTitleBBox = dd.yAxisTitle.node().getBBox();
		var yTitleHeight = yTitleBBox.height;
		var yTitleWidth = yTitleBBox.width;

		// draw the x axis with dummy values, to get its height
		var dummyX = d3.scaleLinear().domain([0, 100]).range([0, 1]);
		var dummyXAxis = d3.axisBottom(dummyX);
		dd.xAxisG.call(dummyXAxis);
		dd.xAxisG.selectAll("text")
			.attr("font-family", settings.fontFamily)
			.attr("font-size", settings.fontSize);
		var xAxisHeight = dd.xAxisG.node().getBBox().height;

		var yAxisHeight = dd.height
			- dd.graphTop
			- xTitleHeight 
			- (xTitleHeight > 0 ? dd.padding : 0)
			- dd.scrollHeight
			- dd.padding
			- xAxisHeight
			;

		var yAxisBottom = dd.graphTop + yAxisHeight;

		// now set up the y axis
		var range = bundleHelper.getRange(settings.yAxisIndex);
		if (range.min >= range.max)
			range.max = range.min + 1;

		var yFormat = settings.columnFormats[settings.yAxisIndex];
		var y = d3.scaleLinear()
			.domain([range.min, range.max])
			.range([yAxisBottom, dd.graphTop])

		// add in some extra space at the max end
		var low = y.invert(yAxisBottom);
		var high = y.invert(yAxisBottom - 2 * dd.padding);
		var dMax = high - low;
		var dMaxY = dMax;
		y.domain([range.min, range.max + dMax]);

		// cache of the yRange for later
		dd.yMin = range.min;
		dd.yMax = range.max + dMax;
		
		// maybe it needs to be a time axis
		if (yFormat == DATA_FORMAT_TIME) {
			y = d3.scaleUtc().domain([
					settings.toJSTime(range.min),
					settings.toJSTime(range.max + dMax)
				])
				.range([yAxisBottom, dd.graphTop])
		}
		
		// finally, draw and position the y axis
		var yTicks = y.ticks(Math.ceil(yAxisHeight / (2 * settings.fontSize)));
		var yAxis = d3.axisLeft(y).ticks(yTicks.length);
		dd.yAxisG.call(yAxis);
		dd.yAxisG.selectAll("g>text")
			.attr("font-family", settings.fontFamily)
			.attr("font-size", settings.fontSize + "px");
		var yAxisBBox = dd.yAxisG.node().getBBox();
		var yAxisWidth = yAxisBBox.width;

		var yAxisLeft = dd.padding
			+ yTitleHeight
			+ (yTitleHeight > 0 ? dd.padding : 0)
			+ yAxisWidth
			;

		dd.yAxisG.attr("transform", "translate(" + yAxisLeft + " 0)");

		// Now handle the scroll bar (it affects the x axis)
		var r = dd.scrollHeight / 2.0;
		var xAxisLeft = yAxisLeft;
		var xAxisRight = dd.width - 4 * dd.padding;
		range = bundleHelper.getRange(settings.xAxisIndex);
	
		var xFormat = settings.columnFormats[settings.xAxisIndex];
		var min = range.min;
		var max = range.max;
		if (xFormat == DATA_FORMAT_TIME) {
			min = settings.modelStartTime;
			max = Math.max(atTime, max);
		}

		
		if (min >= max)
			max = min + 1;

		var scrollScale = d3.scaleLinear()
			.domain([min, max])
			.range([xAxisLeft, xAxisRight])

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

		if (xFormat == DATA_FORMAT_TIME) {
			// If the range between min and max is too tiny, the chart crashes
			if (Math.abs(min - max) < 0.001)
				max = min + 0.001;
		}

		dd.scrollPosLeft = scrollScale(min);
		dd.scrollPosRight = scrollScale(max);

		var maxLeft = scrollScale.range()[0] + r;
		var maxRight = scrollScale.range()[1] - r;
		var left = dd.scrollPosLeft + r;
		var right = dd.scrollPosRight - r;
		var bottom = dd.height
			- dd.padding
			- xTitleHeight
			;
		var top = bottom - dd.scrollHeight;

		// Draw the scroll background
		dd.scrollBackground.attr("d", function() {
			var pathData = [
				'M', maxLeft, top,
				'L', maxRight, top,
				'A', r, r, 0, 0, 1, maxRight, bottom,
				'L', maxLeft, bottom,
				'A', r, r, 0, 0, 1, maxLeft, top
			];

			return pathData.join(" ");
		});

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

		// now set up the x axis
		var x = d3.scaleLinear()
			.domain([min, max])
			.range([yAxisLeft, xAxisRight])

		low = x.invert(xAxisRight);
		high = x.invert(xAxisRight + dd.padding);
		dMax = high - low;
		var dMaxX = dMax;
		x.domain([min, max + dMax]);

		// maybe it needs to be a time axis
		if (xFormat == DATA_FORMAT_TIME) {
			x = d3.scaleUtc().domain([
					settings.toJSTime(min),
					settings.toJSTime(max + dMax)
				])
				.range([yAxisLeft, xAxisRight])
		}

		var xAxisWidth = xAxisRight - yAxisLeft;

		// finally, draw and position the x axis

		// Figure out tick counts
		var tickLabelWidthGuess = settings.fontSize * 5;
		var maxTickCount = Math.ceil(xAxisWidth / tickLabelWidthGuess);

		var xTicks = x.ticks(maxTickCount);
		var minTickCount = 2;
		var tickHint = 1;
		if (xTicks.length > maxTickCount) {
			xTicks = x.ticks(tickHint++);
		}
		while (xTicks.length < minTickCount) {
			xTicks = x.ticks(tickHint++);
		}
		if (maxTickCount >= 2 && xTicks.length > maxTickCount) {
			var dt = (xTicks[1] - xTicks[0]) / 1000.0 || 0;
			// If it minutes, go to two minues
			switch (dt) {
			case 60: xTicks = x.ticks(d3.timeMinute.every(2)); break;
		 	case 120: xTicks = x.ticks(d3.timeMinute.every(3)); break;
			case 180: x.ticks(d3.timeMinute.every(5)); break;
			case 300: xTicks = x.ticks(d3.timeMinute.every(10)); break;
			case 600: x.ticks(d3.timeMinute.every(15)); break;
			case 900: xTicks = x.ticks(d3.timeMinute.every(20)); break;
			case 1200: xTicks = x.ticks(d3.timeMinute.every(30)); break;
			}
		}

		var xAxis = d3.axisBottom(x).tickValues(xTicks);
		var translation = "translate(0 " + yAxisBottom + ")";
		dd.xAxisG
			.attr("font-size", settings.fontSize)
			.call(xAxis)
			.attr("transform", translation);
		dd.xAxisG.selectAll("g>text")
			.attr("font-family", settings.fontFamily)
			.attr("font-size", settings.fontSize + "px");
		// position the titles
		dd.xAxisTitle
			.attr("x", yAxisLeft + (xAxisRight - yAxisLeft) / 2.0 - xTitleWidth / 2.0)
			.attr("y", dd.height - dd.padding);

		var yTitleX = dd.padding + yTitleHeight;
		var yTitleY = dd.graphTop + yAxisHeight / 2.0 + yTitleWidth / 2.0;
		dd.yAxisTitle
			.attr("x", yTitleX)
			.attr("y", yTitleY)
			.attr("transform", " rotate(-90, "
				+ yTitleX + " " + yTitleY
				+ ")"
			);
			
		// draw the x/y grid
		var xLines = dd.gridG.selectAll("line.x-grid").data(xTicks);
		xLines.exit().remove();
		xLines.enter().append("line")
			.classed("x-grid", true)
			.attr("stroke-width", 1)
			.attr("stroke", "lightGray")
			.merge(xLines)
			.attr("x1", function(d) { return x(d); })
			.attr("x2", function(d) { return x(d); })
			.attr("y1", yAxisBottom)
			.attr("y2", yAxisBottom - yAxisHeight)
			;

		var yLines = dd.gridG.selectAll("line.y-grid").data(yTicks)
		yLines.exit().remove();
		yLines.enter().append("line")
			.classed("y-grid", true)
			.attr("stroke-width", 1)
			.attr("stroke", "lightGray")
			.merge(yLines)
			.attr("x1", xAxisLeft + 2)
			.attr("x2", xAxisRight)
			.attr("y1", function(d) { return y(d); })
			.attr("y2", function(d) { return y(d); })
			;

		// move and size the canvas
		dd.canvasHolder
			.attr("x", xAxisLeft)
			.attr("y", dd.graphTop)
			.attr("width", xAxisWidth + 1)
			.attr("height", yAxisHeight)

		// the canvas I adjust because it has a border
		dd.canvas
			.attr("width", xAxisWidth - 2)
			.attr("height", yAxisHeight - 1)
			.style("width", xAxisWidth - 2)
			.style("height", yAxisHeight - 1);

		// cache off the last scroll data
		dd.lastScrollData = {
			min: min,
			max: max,
			dMaxX: dMaxX,
			dMaxY: dMaxY,
			atTime: atTime,
			scrollScale: scrollScale,
			manualUpdate: false,
		};
	}

	mainDiv.reset = function reset(bundle) {
		var bundleHelper = mainDiv.bundleHelper;
		var settings = mainDiv.settings;
		var dd = mainDiv.drawData;

		bundleHelper.reset(bundle);
		bundleHelper.setInfoColumns([settings.xAxisIndex, settings.yAxisIndex]);
		bundleHelper.setKeyColumns(settings.keyColumns);
		dd.scrollCustom = false;
		dd.scrollLockedRight = false;
	};

	mainDiv.update = function update(bundle) {
		mainDiv.bundleHelper.update(bundle);
	};

	mainDiv.draw = function draw(atTime) {
		var dd = mainDiv.drawData;
		var settings = mainDiv.settings;
		var bundleHelper = mainDiv.bundleHelper;
		var data = bundleHelper.bundle;

		dd.width = +dd.svgElement.parentElement.offsetWidth;
		dd.height = +dd.svgElement.parentElement.offsetHeight;

		dd.svg
			.attr("width", dd.width)
			.attr("height", dd.height)
			.attr("font-size", settings.fontSize + "px")

		mainDiv.handleTitleAndLegend();
		mainDiv.handleGraphElements(atTime);

		// Now draw the data
		var ctx = dd.ctx;
		var width = dd.canvas.node().offsetWidth - 2;
		var height = dd.canvas.node().offsetHeight;

		var xMin = dd.lastScrollData.min;
		var xMax = dd.lastScrollData.max + dd.lastScrollData.dMaxX;

		var xCol = settings.xAxisIndex;
		var yCol = settings.yAxisIndex;

		var x = d3.scaleLinear()
			.domain([xMin, xMax])
			.range([0, width])

		var y = d3.scaleLinear()
			.domain([dd.yMin, dd.yMax])
			.range([height, 0])

		var size = settings.markSize;
		var halfMarkSize = size / 2.0;
		ctx.lineWidth = settings.markSize;
		ctx.clearRect(0, 0, width, height)
		bundleHelper.dataSetArray.forEach(function(dataSet, i) {
			ctx.fillStyle = d3.schemeCategory20[i % 20];
			ctx.strokeStyle = d3.schemeCategory20[i % 20];	
			var rowCount = dataSet.rows.length;	

			var curValue = {
				x: 0, 
				y: 0,
				defined: false,
				nextX: 0,
				nextY: 0,
				nextDefined: false,
			};
			switch (settings.style) {
			case LINE_STYLE_LINES:
			case LINE_STYLE_STAIRS:
				var generator = d3.line()
					.x(function(d) {
						var value = x(curValue.x);
						return value;
					})
					.y(function(d) {
						var value = y(curValue.y);
						return value;
					})
					.defined(function(d, i) {
						if (i == 0) {
							curValue.defined = true;
							curValue.x = data.getValue(d, xCol);
							curValue.y = data.getValue(d, yCol);
							if (isNaN(curValue.x) || curValue.x == null)
								curValue.defined = false;

							if (isNaN(curValue.y) || curValue.y == null)
								curValue.defined = false;
						} else {
							curValue.x = curValue.nextX;
							curValue.y = curValue.nextY;
							curValue.defined = curValue.nextDefined;
						}

						if (i < rowCount - 1) {
							var nextIndex = dataSet.rows[i + 1];
							curValue.nextDefined = true;
							curValue.nextX = data.getValue(nextIndex, xCol);
							curValue.nextY = data.getValue(nextIndex, yCol);

							if (isNaN(curValue.nextX) || curValue.nextX == null)
								curValue.nextDefined = false;

							if (isNaN(curValue.nextY) || curValue.nextY == null)
								curValue.nextDefined = false;
						} else {
							curValue.nextDefined = false;
						}

						// now I see if either the cur value or next value are
						// in the x min or max
						if (curValue.defined) {
							if (curValue.x >= xMin || curValue.x <= xMax)
								return true;
						}

						if (curValue.nextDefined) {
							if (curValue.nextX >= xMin || curValue.nextX <= xMax)
								return true;
						}

						return false;
					})
					.context(ctx);

				if (settings.style == LINE_STYLE_STAIRS)
					generator.curve(d3.curveStepAfter);
				else
					generator.curve(d3.curveLinear);

				ctx.beginPath();
				generator(dataSet.rows);
				ctx.stroke();
				break;
			case LINE_STYLE_POINTS:
				dataSet.rows.forEach(function (d) {
					var xValue = +data.getValue(d, xCol);
					
					if (isNaN(xValue) || xValue == null)
						return
					if (xValue < xMin || xValue > xMax)
						return;

					var yValue = +data.getValue(d, yCol);
					if (isNaN(yValue) || yValue == null)
						return;
					
					var cx = x(xValue);
					var cy = y(yValue);
					ctx.fillRect(cx - size, cy - halfMarkSize, size, size);
				})


				break;
			}
		});

		mainDiv.lastDrawTime = atTime;
	};

	mainDiv.applySettings = function applySettings(jsonSettingsStr) {
		try {
			if (typeof(jsonSettingsStr) === 'undefined') {
				var settingsAttr = mainDiv.getAttribute('data-settings');
				if (typeof(settingsAttr) !== 'undefined')
					jsonSettingsStr = settingsAttr;
				else
					jsonSettingsStr = "{}";
			}

			var settingsObj = JSON.parse(jsonSettingsStr);

			function applySetting(settingName) {
				if (typeof(settingsObj[settingName]) !== "undefined")
					mainDiv.settings[settingName] = settingsObj[settingName];
			}

			applySetting("modelStartTime");
			applySetting("xAxisTitle");
			applySetting("yAxisTitle");
			applySetting("chartTitle");
			applySetting("showLegend");

			applySetting("fontSize");
			applySetting("titleFontSize");
			
			applySetting("xAxisIndex");
			applySetting("yAxisIndex");
			applySetting("style");
			applySetting("keyColumns");
			applySetting("columnFormats");

			// This one should only exist for offline initialization
			applySetting("objectIDMap");
		} catch (e) {
			print('exception caught in timeplotd3 mainDiv.applySettings()'); 
			printError(e, "timeplotd3.js " + jsonSettingsStr + "- apply settings");
		}
	};

	mainDiv.addObjectIDAndPath = function addObjectIDAndPath(id, path) {
		try {
			mainDiv.settings.objectIDMap[id] = path;
		} catch (e) {
			print('exception caught in timeplotd3 mainDiv.addObjectIDPath(' + id + ', ' + path + ')'); 
			printError(e, "timeplotd3.js");
		}
	};

	// a no-op, for compatibility
	mainDiv.setProperties = function setProperties(properties, redraw) {

	};

	mainDiv.onResize = function onResize() {
		mainDiv.draw(mainDiv.lastDrawTime);
	};

	window.addEventListener("resize", mainDiv.onResize, false);
};