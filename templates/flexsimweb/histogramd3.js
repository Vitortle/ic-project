function initializeHistogramD3(div) {
	'use strict';
	var mainDiv = div;

	var DATA_FORMAT_NONE = 0;
	var DATA_FORMAT_OBJECT = 1;
	var DATA_FORMAT_TIME = 2;
	var DATA_FORMAT_PERCENT = 3;

	function Settings() {
		this.fontSize = 12;
		this.titleFontSize = 24;
		this.fontFamily = "helvetica";
		this.markSize = 4.0;
		this.precision = 2.0;
		this.showLegend = true;
		this.bucketWidth = 10;
		this.bucketOffset = 0;

		this.fixedBuckets = true;
		this.bucketCount = 10;

		this.xAxisTitle = "";
		this.yAxisTitle = "";
		this.chartTitle = "";

		this.normalizeValues = 0;
		this.showLabels = 0;

		this.dataIndex = 0;
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
		var dd = this;

		this.width = 100;
		this.height = 100;

		this.svg = d3.select(div).append('svg');
		this.svgElement = this.svg.node();

		this.xAxisG = this.svg.append("g");
		this.yAxisG = this.svg.append("g");

		this.padding = 5;
		
		this.xAxisTitle = this.svg.append("text").classed("axis-title", true);
		this.yAxisTitle = this.svg.append("text").classed("axis-title", true);
		this.chartTitle = this.svg.append("text").classed("chart-title", true);

		this.legendG = this.svg.append("g");
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
			var legendItems = dd.legendG.selectAll("g.legend-item")
				.data(bundleHelper.dataSetArray);

			legendItems.exit().remove();
			var newLegendItems = legendItems.enter()
				.append("g")
				.classed("legend-item", true)
				;

			var allLegendItems = newLegendItems.merge(legendItems);
			var legendItemCount = allLegendItems.size();

			var text = allLegendItems.selectAll("text")
				.data(function(dataSet) {
					if (settings.keyColumns.length == 0)
						return [1];
					return Object.keys(dataSet.keyInfo); 
				})

			text.exit().remove();
			text.enter()
				.append("text")	
				.attr("x", settings.markSize * 2 + dd.padding)
				.merge(text)
				.html(function (key) {
					if (settings.keyColumns.length == 0)
						return "Total";
					var dataSet = d3.select(this.parentElement).datum();
					var format = settings.columnFormats[columnNameMap[key]];
					var value = settings.valueToString(dataSet.keyInfo[key], format);
					return key + ": " + value;
				})
				.attr("font-family", settings.fontFamily)
				.attr("font-size", settings.fontSize)
				.attr("y", function (key, i) {
					var height = this.getBBox().height;
					return (i + 1) * height;
				})
				;

			newLegendItems.append("rect")
				.attr("x", 0)
				.attr("width", settings.markSize * 2)
				.attr("height", settings.markSize * 2)
				.attr("fill", function(dataSet, i) {
					return d3.schemeCategory20[i % 20];
				})
				;

			allLegendItems.selectAll("rect")
				.attr("y", function (dataSet) {
					var legendItemHeight = this.parentElement.getBBox().height;
					return legendItemHeight / 2.0 - settings.markSize / 2.0;
				})

			var maxWidth = 0;
			var maxHeight = 0;
			allLegendItems.each(function (dataSet, i, nodes) {
				var bbox = this.getBBox();
				maxWidth = Math.max(bbox.width, maxWidth);
				maxHeight = Math.max(bbox.height, maxHeight);
			});
			maxWidth += 4 * dd.padding;
			maxHeight += dd.padding;

			var maxColCount = Math.max(
				Math.floor((dd.width - 2 * dd.padding) / maxWidth), 1);
			var legendColumns = Math.min(legendItemCount, maxColCount);
			var legendRows = Math.ceil(legendItemCount / legendColumns);

			allLegendItems.each(function (dataSet, i) {
				var colIndex = i % legendColumns;
				var rowIndex = Math.floor(i / legendColumns);
				var x = dd.padding + colIndex * maxWidth;
				var y = dd.padding + rowIndex * maxHeight;
				d3.select(this).attr("transform",
					"translate(" + [x, y].join(" ") + ")");
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
		dd.xAxisG.call(dummyXAxis)
			.selectAll("g>text")
			.attr("font-family", settings.fontFamily)
			.attr("font-size", settings.fontSize + "px");
		var xAxisHeight = dd.xAxisG.node().getBBox().height;

		var yAxisHeight = dd.height
			- dd.graphTop
			- xTitleHeight 
			- (xTitleHeight > 0 ? dd.padding : 0)
			- dd.padding
			- xAxisHeight
			;

		var yAxisBottom = dd.graphTop + yAxisHeight;

		// now set up the y axis
		var yMax = bundleHelper.getHistogramMax(settings.dataIndex);
		if (settings.normalizeValues)
			yMax = bundleHelper.getHistogramMaxRatio(settings.dataIndex);
		
		var y = d3.scaleLinear()
			.domain([0, yMax])
			.range([yAxisBottom, dd.graphTop])

		// add in some extra space at the max end
		var low = y.invert(yAxisBottom);
		var high = y.invert(yAxisBottom - 4 * dd.padding);
		var dMax = high - low;
		y.domain([0, yMax + dMax]);

		// cache of the yRange for later
		dd.yMin = 0;
		dd.yMax = yMax + dMax;

		// finally, draw and position the y axis
		var yTicks = y.ticks(Math.ceil(yAxisHeight / (2 * settings.fontSize)));
		var yAxisFormat = settings.normalizeValues ? "p" : "d";

		var yAxis = d3.axisLeft(y).ticks(yTicks.length, yAxisFormat);
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

		// now draw the x axis
		var xAxisLeft = yAxisLeft;
		var xAxisRight = dd.width - 4 * dd.padding;
		var xAxisWidth = xAxisRight - xAxisLeft;

		var range = bundleHelper.getHistogramRange(settings.dataIndex);
		var x = d3.scaleLinear()
			.domain([range.min, range.max])
			.range([xAxisLeft, xAxisRight])
			;

		var bucketCount = range.bucketCount;
		var bucketWidth = settings.fixedBuckets 
			? (range.max - range.min) / bucketCount : settings.bucketWidth;
		var tickValues = Array(bucketCount + 1).fill(0).map(function(d, i) {
			if (i == 0)
				return range.min;
			
			return range.min + i * bucketWidth;
		});

		var maxTickCount = Math.max(xAxisWidth / 5 / settings.fontSize, 1);
		var divisor = 1;
		while ((tickValues.length / divisor) > maxTickCount)
			divisor++;
		
		tickValues = tickValues.filter(function(d, i) {
			return i % divisor == 0;
		});

		var xAxis = d3.axisBottom(x).tickValues(tickValues);

		dd.xAxisG.call(xAxis)
			.attr("transform", "translate(0 " + yAxisBottom + ")")
			.selectAll("g>text")
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

		dd.y = y;
		dd.x = x;
		dd.bucketWidth = bucketWidth;
	};

	mainDiv.reset = function reset(bundle) {
		mainDiv.bundleHelper = new BundleHelper(mainDiv);
		var bundleHelper = mainDiv.bundleHelper;
		var settings = mainDiv.settings;

		bundleHelper.reset(bundle);
		bundleHelper.setKeyColumns(settings.keyColumns);
		bundleHelper.setHistogramColumns([settings.dataIndex]);
		bundleHelper.fixedBuckets = settings.fixedBuckets;
		bundleHelper.bucketWidth = settings.bucketWidth;
		bundleHelper.bucketCount = settings.bucketCount;
		bundleHelper.bucketOffset = settings.bucketOffset;

		var dd = mainDiv.drawData;
		dd.svg.selectAll("g.data-set").remove();
	}

	mainDiv.update = function update(newBundle){
		mainDiv.bundleHelper.update(newBundle);
	};

	mainDiv.draw = function draw() {
		var settings = mainDiv.settings;
		var dd = mainDiv.drawData;
		var bundleHelper = mainDiv.bundleHelper;

		dd.width = +dd.svgElement.parentElement.offsetWidth;
		dd.height = +dd.svgElement.parentElement.offsetHeight;

		dd.svg
			.attr("width", dd.width)
			.attr("height", dd.height)
			.attr("font-size", settings.fontSize + "px")

		mainDiv.handleTitleAndLegend();
		mainDiv.handleGraphElements();

		var columnNames = settings.keyColumns.map(function(col) {
			return bundleHelper.bundle.getFieldName(col);
		});

		var dataSetCount = bundleHelper.dataSetArray.length;
		var bucketWidth = dd.bucketWidth;
		var barWidth = bucketWidth / dataSetCount;

		var dataSets = dd.svg.selectAll("g.data-set")
			.data(bundleHelper.dataSetArray);
		dataSets.exit().remove();

		var rectGroups = dataSets.enter()
			.append("g")
			.classed("data-set", true)
			.merge(dataSets)
			.selectAll("g.rect-group")
			.data(function(dataSet, i) {
				this.index = i;
				return dataSet.histograms[settings.dataIndex].getBuckets();
			});

		rectGroups.exit().remove();

		var newRectGroups = rectGroups.enter()
			.insert("g")
			.classed("rect-group", true)

		newRectGroups.append("title");
		newRectGroups.append("rect")
			.attr("fill", function(d) {
				var index = this.parentElement.parentElement.index;
				return d3.schemeCategory20[index % 20];
			});
		newRectGroups.append("text");

		var allRectGroups = newRectGroups.merge(rectGroups);
		allRectGroups.select("title")
			.html(function(bucket) {
				var dataSet = d3.select(this.parentElement.parentElement).datum();
				var text = "";
				settings.keyColumns.forEach(function(keyCol, i) {
					var colName = columnNames[i];
					var value = dataSet.keyInfo[colName];
					var format = settings.columnFormats[keyCol];
					if (i > 0)
						text += "\r\n";
					text += colName + ": " + settings.valueToString(value, format);
				});

				if (settings.keyColumns.length)
					text += "\r\n";

				var rangeStart = settings.valueToString(bucket.startValue, DATA_FORMAT_NONE);
				var rangeEnd = settings.valueToString(bucket.startValue + dd.bucketWidth, DATA_FORMAT_NONE);
				text += "Range: [" + rangeStart + ", " + rangeEnd + ")";

				if (settings.normalizeValues) {
					var value = bucket.getPercent();
					text += "\r\nTotal: " 
						+ settings.valueToString(value, DATA_FORMAT_PERCENT);
				} else {
					var value = bucket.count;
					text += "\r\nTotal: " + value;
				}
				return text;
			})
			;

		allRectGroups.select("rect")
			.attr("x", function(bucket) {
				var index = this.parentElement.parentElement.index;
				var offset = index * barWidth;
				var startValue = bucket.startValue;
				return dd.x(offset + startValue);
			})
			.attr("y", function (bucket) {
				if (settings.normalizeValues) {
					var dataSet = d3.select(this.parentElement.parentElement).datum();
					var histogram = dataSet.histograms[settings.dataIndex];
					var value = bucket.count / dataSet.rows.length;
					bucket.y = dd.y(value);
				} else {
					bucket.y = dd.y(bucket.count);
				}
				return bucket.y;
			})
			.attr("width", dd.x(barWidth) - dd.x(0))
			.attr("height", function(bucket) {
				return dd.y(0) - bucket.y;
			})
			;

		allRectGroups.select("text")
			.html(function(bucket) {
				if (!settings.showLabels)
					return "";

				var text = "";
				var value = bucket.count;
				if (value == 0)
					return "";
				if (settings.normalizeValues) {
					value = bucket.getPercent();
					text = settings.valueToString(value, DATA_FORMAT_PERCENT);
				} else {
					text = value.toFixed(0);
				}
				return text;
			})
			.attr("x", function(d) {
				// get the rect x
				var rect = d3.select(this.parentElement).select("rect");
				var x = +rect.attr("x");
				var width = +rect.attr("width");
				return x + width / 2.0 - this.getBBox().width / 2.0;
			})
			.attr("y", function(d) {
				// get the rect y
				var y = +d3.select(this.parentElement).select("rect").attr("y");
				return y - dd.padding;
			})
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

			applySetting("xAxisTitle");
			applySetting("yAxisTitle");
			applySetting("chartTitle");
			applySetting("showLegend");

			applySetting("fontSize");
			applySetting("titleFontSize");

			applySetting("dataIndex");
			applySetting("keyColumns");
			applySetting("columnFormats");

			applySetting("bucketWidth");
			applySetting("bucketOffset");
			applySetting("fixedBuckets");
			applySetting("bucketCount");
			applySetting("normalizeValues");
			applySetting("showLabels");

			// This one should only exist for offline initialization
			applySetting("objectIDMap");
		} catch (e) {
			print('exception caught in timeplotd3 mainDiv.applySettings()'); 
			printError(e, "timeplotd3.js " + jsonSettingsStr + "- apply settings");
		}
	};

	mainDiv.addObjectIDAndPath = function addObjectIDAndPath(id, path) {
		try {
			if (typeof(id) !== "number")
				throw "invalid id";
			
			if (typeof(path) !== "string")
				throw "invalid path";

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
		mainDiv.draw();
	};

	window.addEventListener("resize", mainDiv.onResize, false);
};