function initializePieD3(div) {
	"use strict";

	var DATA_FORMAT_NONE = 0;
	var DATA_FORMAT_OBJECT = 1;
	var DATA_FORMAT_TIME = 2;
	var DATA_FORMAT_PERCENT = 3;

	var mainDiv = div;
	function Settings() {
		this.fontFamily = "helvetica";
		this.fontSize = 12;
		this.titleFontSize = 24;
		this.pointWidth = 8;

		this.precision = 2;
		this.showLegend = true;
		this.chartTitle = "";
		this.showPercentages = true;
		this.showZeroColumns = false;

		this.dataColumns = [];
		this.columnFormats = [];
		this.infoColumn = null;
		this.titleColumn = null;

		this.objectIDMap = {};

		this.formatterPrecision = null;
		this.formatter = null;

		this.colorMap = {};
		
		this.toJSTime = function toJSTime(timeValue) {
			// shift the time value, so that it is relative
			// to 1970, rather than the model start time
			// 11644473600 is windows file time (in seconds) for unix 0, Jan 1 1970
			var jsTime = (timeValue - 11644473600.0) * 1000;
			return jsTime;
		};

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

		var ss = this;
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

		this.hashString = function(s){
			return Math.abs(s
				.split("")
				.reduce(function(a,b){
					a = ((a<<5)-a) + b.charCodeAt(0);
					return a&a
				},0));              
		};

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
		};
	};

	mainDiv.settings = new Settings();

	function DrawData(div) {
		this.svg = d3.select(div).append("svg");

		this.chartTitle = this.svg.append("text")
			.attr("font-size", mainDiv.settings.titleFontSize);
		this.legendG = this.svg.append('g')
			.attr('id', 'legend');
		this.scrollDivHolder = this.svg.append('foreignObject');
		this.scrollDiv = this.scrollDivHolder.append('xhtml:div')
			.style('overflow-y', 'auto');
		this.chartSVG = this.scrollDiv.append('svg');
	};

	mainDiv.drawData = new DrawData(div);

	mainDiv.applySettings = function applySettings(jsonString) {
		try {
		if (typeof(jsonString) != "string")
			throw "invalid jsonStringArgument";

		var settingsObj = JSON.parse(jsonString);
		function applySetting(settingName) {
			if (typeof(settingsObj[settingName]) !== "undefined")
				mainDiv.settings[settingName] = settingsObj[settingName];
		}

		applySetting("chartTitle");
		applySetting("showLegend");
		applySetting("dataColumns");

		applySetting("fontSize");
		applySetting("titleFontSize");

		applySetting("precision");
		applySetting("showPercentages");
		applySetting("showZeroColumns");

		applySetting("infoColumn");
		applySetting("titleColumn");
		applySetting("columnFormats");

		applySetting("colorMap");

		} catch(e) {
			print('exception caught in pied3 mainDiv.applySettings()'); 
			printError(e, "pied3.js " + jsonSettingsStr + "- applySettings()");
		}
	};

	mainDiv.addObjectIDAndPath = function addObjectIDAndPath(id, path) {
		mainDiv.settings.objectIDMap[id] = path;
	};

	mainDiv.draw = function draw(bundle) {
		try {
		var dd = mainDiv.drawData;
		var settings = mainDiv.settings;

		var width = +mainDiv.offsetWidth;
		var height = +mainDiv.offsetHeight;

		dd.svg.attr("width", width).attr("height", height);

		// lay out the basic elements
		var padding = 5;

		// Place the title
		dd.chartTitle.html(settings.chartTitle)
			.attr('font-size', settings.titleFontSize + "px")
			.attr('font-family', settings.fontFamily)
		var chartTitleBBox = dd.chartTitle.node().getBBox();
		dd.chartTitle.attr('x', width / 2.0 - chartTitleBBox.width / 2.0)
			.attr('y', chartTitleBBox.height + padding);

		var legendTop = padding + chartTitleBBox.height + padding;

		// This happens if the user has not selected a table yet
		if (!bundle)
			return;

		var bundleHelper = new BundleHelper(mainDiv);
		bundleHelper.reset(bundle);
		bundleHelper.setKeyColumns(BundleHelper.KEY_BY_ROW);
		bundleHelper.setInfoColumns(settings.dataColumns);
		bundleHelper.update(bundle);

		var dataColumns = settings.dataColumns;
		if (!settings.showZeroColumns) {
			// find the zero columns
			var rows = (new Array(bundleHelper.bundle.nrEntries))
				.fill(0)
				.map(function(d, i) {
				return i;
			});
			dataColumns = settings.dataColumns.filter(function(col) {
				var nonZero = rows.reduce(function(prev, row) {
					return prev || (bundleHelper.bundle.getValue(row, col) != 0);
				}, false);
				return nonZero;	
			});
		};

		var columnNames = dataColumns.map(function (d, i) {
			return bundleHelper.bundle.getFieldName(d);
		});

		// Place the legend
		if (settings.showLegend) {
			var curX = padding;
			var curY = 0;
			var legendHeight = 0;
			var legendWidth = 0;
			var rowHeight = 0;
			var maxLegendX = width - 4 * padding;

			var legendItems = dd.legendG.selectAll("g.legend-item")
				.data(columnNames);

			legendItems.exit().remove();
			legendItems	
				.enter()
				.append("g").classed("legend-item", true)
				.merge(legendItems)
			.each(function (colName, colIndex) {
				var legendItem = d3.select(this);

				var rect = legendItem.selectAll("rect").data([colName]);
				rect.exit().remove();
				rect.enter().append("rect")
					.merge(rect)
					.attr('x', 0)
					.attr('y', 0)
					.attr('width', settings.pointWidth)
					.attr('height', settings.pointWidth)
					.attr('fill', function (d) {
						var col = dataColumns[colIndex];
						return settings.valueToColor(col);
					});

				var text = legendItem.selectAll("text").data([colName]);
				text.exit().remove();
				text.enter().append("text")
					.merge(text)
					.attr('x', settings.pointWidth + padding / 2.0)
					.attr('y', settings.fontSize / 2.0 + padding / 3.0)
					.attr('font-size', settings.fontSize + "px")
					.attr('font-family', settings.fontFamily)
					.html(function (d) { return d; })
			})
			.each(function(columnName, i, nodes) {
				var bbox = nodes[i].getBBox();
				var itemWidth = bbox.width;
				rowHeight = Math.max(rowHeight, bbox.height);

				// if the next item is too wide to go on this line, go to next line
				if (curX + itemWidth > maxLegendX) {
					curY += padding + rowHeight;
					rowHeight = 0;
					curX = padding;
				}

				var item = d3.select(nodes[i]);
				item.attr("transform", function() {
					return "translate(" + curX + ", " + curY + ")";
				});
				curX += itemWidth + 2 * padding;
			});
			dd.legendG.attr("transform", "translate(0 " + legendTop + ")");
		} else {
			dd.legendG.selectAll("g.legend-item").data([]).exit().remove();
		}

		var legendHeight = dd.legendG.node().getBBox().height;
		var legendBottom = legendTop + legendHeight;
		var graphTop = legendBottom;
		if (legendHeight > 0)
			graphTop += padding;

		var graphHeight = height - graphTop;

		// place the scrollDivHolder, the scrollDiv, and the chart svg
		dd.scrollDivHolder
			.attr('x', 0)
			.attr('y', graphTop)
			.attr('width', width)
			.attr('height', graphHeight)
		
		dd.scrollDiv.style('width', width).style('height', graphHeight);
		var maxChartSVGWidth = width - 17; // the scroll bar width
		
		var minPieAreaSize = 200;
		var pieCount = bundleHelper.dataSetArray.length;
		var pieColumns = Math.max(Math.floor(maxChartSVGWidth / minPieAreaSize), 1);
		var pieRows = Math.ceil(pieCount / pieColumns);

		var pieAreaWidth = Math.min(
			maxChartSVGWidth / Math.min(pieColumns, pieCount),
			graphHeight / pieRows
		);
		pieAreaWidth = Math.max(minPieAreaSize, pieAreaWidth);
		var offset = (width - pieAreaWidth * Math.min(pieColumns, pieCount)) / 2.0
		
		var chartSVGHeight = pieRows * pieAreaWidth;
		var chartSVGWidth = dd.scrollDiv.node().scrollWidth;
		dd.chartSVG.attr('height', chartSVGHeight)
			.attr('width', maxChartSVGWidth);
		var pieHolders = dd.chartSVG.selectAll("g.pie-holder")
			.data(bundleHelper.dataSetArray)
		
		pieHolders.exit().remove();
		pieHolders.enter().append('g')
			.classed('pie-holder', true)
			.merge(pieHolders)
		.each(function (dataSet, i) {
			var pieX = offset + i % pieColumns * pieAreaWidth + pieAreaWidth / 2.0;
			var pieY = Math.floor(i / pieColumns) * pieAreaWidth + pieAreaWidth / 2.0;

			var data = dataColumns.map(function (j) {
				return bundleHelper.bundle.getValue(i, j);
			});

			var sum = data.reduce(function(acc, val) { return acc + val; }, 0);
			
			if (settings.showPercentages) {
				data = data.map(function(d) { return sum == 0 ? 0 : (d / sum); });
			}

			var pieFunc = d3.pie();

			var arcObjects = pieFunc(data);
				
			var arcGenerator = d3.arc()
				.outerRadius(pieAreaWidth / 2.0 - 25)
				.innerRadius((pieAreaWidth / 2.0 - 25) * 0.8);

			var pieG = d3.select(this)
				.attr("transform", "translate(" + [pieX, pieY].join(" ") + ")");

			var segments = pieG.selectAll("g.segment").data(arcObjects);
			segments.exit().remove();

			segments.enter()
				.append('g')
				.classed('segment', true)
				.merge(segments)
			.each(function(arcObject, k) {
				var segment = d3.select(this);

				var title = segment.selectAll("title").data([arcObject]);
				title.exit().remove();
				title.enter()
					.append('title')
					.merge(title)
					.html(function(d) {
						var colNum = dataColumns[k];
						var format = settings.columnFormats[colNum];
						if (settings.showPercentages)
							format = DATA_FORMAT_PERCENT;
						var valueStr = settings.valueToString(d.data, format);
						return columnNames[k] + ": " + valueStr;
					})

				var arc = segment.selectAll("path").data([arcObject]);
				arc.exit().remove();
				arc.enter()
					.append('path')
					.merge(arc)
					.attr('d', function(d) { return arcGenerator(d); })
					.attr('fill', function(d) {
						var col = dataColumns[k];
						return settings.valueToColor(col);
					})
			});
			
			if (settings.infoColumn != null) {
				var info = pieG.selectAll("text.info").data([settings.infoColumn]);
				info.exit().remove();
				info.enter()
					.append("text")
					.classed("info", true)
					.merge(info)
					.html(function (d) {
						var columnName = bundleHelper.bundle.getFieldName(d);
						var value = bundleHelper.bundle.getValue(i, d);
						var format = settings.columnFormats[d];
						var dataColIndex = dataColumns.indexOf(d);
						if (dataColIndex != -1) {
							value = data[dataColIndex];
							if (settings.showPercentages)
								format = DATA_FORMAT_PERCENT;
						}
						var valueStr =  settings.valueToString(value, format);
						return columnName + ": " + valueStr;
					})
					.attr('font-size', settings.fontSize + "px")
					.attr('font-family', settings.fontFamily)
					.attr('x', function(d) {
						return -d3.select(this).node().getBBox().width / 2.0;
					})
			} else {
				pieG.selectAll("text.info").remove();
			}

			if (settings.titleColumn != null) {
				var title = pieG.selectAll("text.object-name").data([settings.titleColumn]);
				title.exit().remove();
				title.enter()
					.append("text")
					.classed("object-name", true)
					.merge(title)
					.html(function (d) {
						var columnName = bundleHelper.bundle.getFieldName(d);
						var value = bundleHelper.bundle.getValue(i, d);
						var format = settings.columnFormats[d];
						var valueStr =  settings.valueToString(value, format);
						return columnName + ": " + valueStr;
					})
					.attr('font-size', settings.fontSize + "px")
					.attr('font-family', settings.fontFamily)
					.attr('x', function(d) {
						return -d3.select(this).node().getBBox().width / 2.0;
					})
					.attr('y', -pieAreaWidth / 2.0 + settings.fontSize + padding);
			} else {
				pieG.selectAll("text.object-name").remove();
			}
		});

		mainDiv.lastBundle = bundle;
		} catch(e) {
			print("error in pied3.js: ");
			printError(e, "pied3.js");
			throw e;
		}
	};

	mainDiv.setProperties = function setProperties() {
		// a no-op, but required for compatibility
	};

	mainDiv.onResize = function onResize() {
		mainDiv.draw(mainDiv.lastBundle);
	}

	window.addEventListener("resize", mainDiv.onResize, false);
};