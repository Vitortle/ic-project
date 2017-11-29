function initializeBarD3(div) {
	'use strict'

	var mainDiv = div;

	var DATA_FORMAT_NONE = 0;
	var DATA_FORMAT_OBJECT = 1;
	var DATA_FORMAT_TIME = 2;
	var DATA_FORMAT_PERCENT = 3;

	function Settings() {
		this.fontFamily = "helvetica";
		this.fontSize = 12;
		this.titleFontSize = 24;
		this.pointWidth = 8;

		this.precision = 2;
		this.showLegend = true;
		this.chartTitle = "";
		this.showPercentages = true;
		this.stacked = true;
		this.showZeroColumns = false;
		this.barThickness = 12;

		this.dataColumns = [];
		this.columnFormats = [];
		this.titleColumn = null;

		this.colorMap = {};
		this.objectIDMap = {};

		this.formatterPrecision = null;
		this.formatter = null;

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
		};

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
			.attr("font-size", mainDiv.settings.titleFontSize)
			.attr("font-family", mainDiv.settings.fontFamily)
		this.legendG = this.svg.append('g')
			.attr('id', 'legend');
		this.scrollDivHolder = this.svg.append('foreignObject');
		this.scrollDiv = this.scrollDivHolder.append('xhtml:div')
			.style('overflow-y', 'auto');
		this.chartSVG = this.scrollDiv.append('svg');
		this.yAxisLine = this.chartSVG.append('line')
			.attr('width', 1 + "px")
			.attr('stroke', 'black')

		this.y = d3.scaleOrdinal();
		this.yAxis = d3.axisLeft(this.y);
		this.yAxisG = this.chartSVG.append("g").classed('y-axis', true);

		this.xAxisG = this.svg.append('g').classed('x-axis', true);
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
		applySetting("stacked");
		applySetting("showZeroColumns");

		applySetting("columnFormats");
		applySetting("titleColumn");

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
		dd.chartTitle
			.attr('font-family', settings.fontFamily)
			.attr('font-size', settings.titleFontSize + "px")
			.html(settings.chartTitle);
		var chartTitleBBox = dd.chartTitle.node().getBBox();
		dd.chartTitle.attr('x', width / 2.0 - chartTitleBBox.width / 2.0)
			.attr('y', chartTitleBBox.height + padding);

		if (!bundle)
			return;

		var header = Bundle.interpretHeader(bundle);
		var data = Bundle.interpretData(bundle, header);
		var rowCount = data.nrEntries;
		var rows = (new Array(data.nrEntries)).fill(0).map(function(d, i) {
			return i;
		});
		
		// determine the data columns
		var dataColumns = settings.dataColumns;
		if (!settings.showZeroColumns) {
			// find the zero columns
			dataColumns = settings.dataColumns.filter(function(col) {
				var nonZero = rows.reduce(function(prev, row) {
					return prev || (data.getValue(row, col) != 0);
				}, false);
				return nonZero;	
			});
		};

		var legendTop = padding + chartTitleBBox.height + padding;
		var columnNames = dataColumns.map(function (d, i) {
			return data.getFieldName(d);
		});

		// Place the legend
		dd.legendG.selectAll("g.legend-item").remove();
		if (settings.showLegend) {
			var legendItems = dd.legendG.selectAll("g.legend-item").data(columnNames)
				.enter()
				.append("g").classed("legend-item", true);

			legendItems.append("rect")
				.attr('x', 0)
				.attr('y', 0)
				.attr('width', settings.pointWidth)
				.attr('height', settings.pointWidth)
				.attr('fill', function (d, i) {
					var col = dataColumns[i];
					return settings.valueToColor(col);
				});

			legendItems.append('text')
				.attr('x', settings.pointWidth + padding / 2.0)
				.attr('y', settings.fontSize / 2.0 + padding / 3.0)
				.attr('font-size', settings.fontSize + "px")
				.attr('font-family', settings.fontFamily)
				.html(function (d) { return d; })

			var curX = padding;
			var curY = 0;
			var legendHeight = 0;
			var legendWidth = 0;
			var rowHeight = 0;
			var maxLegendX = width - 4 * padding;
			legendItems.each(function(columnName, i, nodes) {
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
		}

		// now draw the inner graph; that gets used to size and place all
		// other elements
		var yAxisWidth = 0;
		var maxX = 0;
		var minX = 0;
		if (settings.showPercentages && settings.stacked)
			maxX = 1;

		var x = d3.scaleLinear();
		var xAxis = d3.axisBottom(x);
		if (settings.showPercentages) {
			xAxis.ticks(4, 'p');
		} else {
			xAxis.ticks(4, 'f');
		}

		var rowElements = dd.chartSVG.selectAll('g.row').data(rows);
		rowElements.exit().remove();
		var allRowElements = rowElements.enter()
			.append('g')
			.classed('row', true)
			.merge(rowElements)
			;
		// Create and measure the names; also create the background rect
		allRowElements.each(function (row, index) {
			var rowG = d3.select(this);
			var rowName = "";
			if (settings.titleColumn != null) {
				var value = data.getValue(row, settings.titleColumn);
				var format = settings.columnFormats[settings.titleColumn];
				rowName = settings.valueToString(value, format);
			}

			var text = rowG.selectAll('text').data([rowName]);
			text.exit().remove();
			text = text.enter().append('text')
				.merge(text)
				.attr('text-anchor', 'end')
				.attr('font-size', settings.fontSize + "px")
				.attr('font-family', settings.fontFamily)
				.attr('y', settings.fontSize)
				.html(function(rowName) { return rowName; })

			if (rowName.length) {
				var axisMarkWidth = text.node().getBBox().width + 8;
				yAxisWidth = Math.max(axisMarkWidth, yAxisWidth);
			}

			var backgroundRect = rowG.selectAll('rect').data([rowName]);
			backgroundRect.exit().remove();
			backgroundRect.enter()
				.append('rect')
				.classed('background', true)
				.merge(backgroundRect)
				.attr('fill', function () {
					return (row % 2) ? '#F5F5F5' : 'white';
				})
				;
		});

		var yAxisLeft = padding + yAxisWidth;
		// now I can set the range of the x axis
		x.range([yAxisLeft, width - 4 * padding]);
		var xAxisWidth = x.range()[1] - x.range()[0];
		
		// analyze the values
		var yAxisHeight = 0;
		allRowElements.each(function (row, index) {
			var rowG = d3.select(this);
			var sum = 0;
			var max = 0;
			var min = 0;
			this.values = dataColumns.reduce(function(filtered, col) {
				var value = data.getValue(row, col);
				if (value) {
					value = +value;
					filtered.push({col: col, start: 0, end: value})
					sum += Math.abs(value);
					max = Math.max(value, max);
					min = Math.min(value, min);
				}
				return filtered;
			}, []);

			var barCount = settings.stacked ? 1 : Math.max(1, this.values.length);
			yAxisHeight +=  barCount * settings.barThickness
				+ 2 * padding;

			// set the maxX and minX
			// minX only matters in the non-stacked case
			if (settings.showPercentages) {
				if (!settings.stacked) {
					maxX = Math.max(maxX, max / sum);
					minX = Math.min(minX, min / sum);
				}
			} else {
				if (settings.stacked)
					maxX = Math.max(maxX, sum)
				else {
					maxX = Math.max(maxX, max);
					minX = Math.min(minX, min);
				}
			}

			// normalize values
			if (settings.showPercentages) {
				this.values.forEach(function (value) {
					value.end /= sum;
				});
			}

			// stack the values
			if (settings.stacked) {
				this.values = this.values.reduce(function (updated, value) {
					// ignore negative values
					if (value.end < 0)
						return updated;
					
					// each bar starts where the previous picked up
					if (!updated.length)
						updated.push(value);
					else {
						var last = updated[updated.length - 1];
						var width = value.end - value.start;
						value.start = last.end;
						value.end = value.start + width;
						updated.push(value);
					}
					return updated;
				}, []);
			}
		});

		// now I can set the domain of the x axis
		if (maxX == 0)
			maxX = 1;
		x.domain([minX, maxX]);
		// add in some extra space
		var diff = x.invert(padding) - x.invert(0);
		maxX += diff;
		if (!settings.stacked && minX < 0)
			minX -= diff;
		x.domain([minX, maxX + diff]);

		// create the actual bars
		allRowElements.each(function (row, index) {
			var rowG = d3.select(this);

			// for each bar, create a group with title and rect
			var barGroups = rowG.selectAll('g.bar').data(this.values);
			barGroups.exit().remove();
			barGroups.enter()
				.append('g')
				.classed('bar', true)
				.merge(barGroups)
			.each(function (value, valueIndex) {
				var barGroup = d3.select(this);

				var title = barGroup.selectAll('title').data([value]);
				title.exit().remove();
				title.enter().append('title')
					.merge(title)
					.html(function(d) {
						var text = "";
						var value = d.end - d.start;
						var col = d.col;
						var format = settings.columnFormats[col];
						if (settings.showPercentages)
							format = DATA_FORMAT_PERCENT;
						text = data.getFieldName(col)
							+ ": "
							+ settings.valueToString(value, format);
						return text;
					})
					;
				
				var rect = barGroup.selectAll('rect').data([value]);
				rect.exit().remove();
				rect.enter().append('rect')
					.merge(rect)
					.attr('x', function(d) { return x(Math.min(d.end, d.start)); })
					.attr('y', function(d) {
						var offset = padding;
						if (!settings.stacked)
							offset += valueIndex * settings.barThickness
						
						return offset;
					})
					.attr('width', function(d) {
						return Math.abs(x(d.start) - x(d.end));
					})
					.attr('height', settings.barThickness)
					.attr('fill', function(d) {
						return settings.valueToColor(d.col);
					})
					;
			})
		});

		// place the groups in the right place
		var curY = 0;
		allRowElements.each(function (row, index, nodes) {
			var rowG = d3.select(this);
			var barCount = settings.stacked ? 1 : Math.max(1, this.values.length);
			var rowHeight = barCount * settings.barThickness + 2 * padding;
			rowG.selectAll('text')
				.attr('x', yAxisLeft - padding)
				.attr('y', rowHeight / 2.0 + settings.fontSize / 2.0)
				;

			rowG.selectAll('rect.background')
				.attr('x', yAxisLeft)
				.attr('y', 0)
				.attr('width', xAxisWidth)
				.attr('height', rowHeight)
				;

			rowG.attr('transform', 'translate(0, ' + curY + ')');
			curY += rowHeight;
		});

		var yAxisHeight = curY;

		var graphHeight = curY;
		var xAxisHeight = 6 + settings.fontSize;

		var xAxisY = height - xAxisHeight;

		var legendHeight = dd.legendG.node().getBBox().height;
		var legendBottom = legendTop + legendHeight;
		var graphTop = legendBottom;
		var graphBottom = xAxisY;

		var maxGraphHeight = graphBottom - graphTop;
		var visibleGraphHeight = Math.min(maxGraphHeight, graphHeight);
		var chartBottom = legendBottom + visibleGraphHeight;
		
		// so I set the div's size, so that scroll bars might appear
		dd.scrollDiv.style('width', width).style('height', visibleGraphHeight);
			

		// then I set the svg height, which will force the scroll bar
		dd.chartSVG.attr('height', graphHeight);
		var clientWidth = dd.scrollDiv.node().clientWidth;

		// now that the scroll width is known, I set the svg width
		dd.chartSVG.attr('width', clientWidth);

		// place the scrollDivHolder
		dd.scrollDivHolder
			.attr('x', 0)
			.attr('y', graphTop)
			.attr('width', width)
			.attr('height', visibleGraphHeight);


		// Now I'm ready to draw
		// and I start by drawing the yAxisLine
		dd.yAxisLine
			.attr('x1', yAxisLeft)
			.attr('x2', yAxisLeft)
			.attr('y1', padding)
			.attr('y2', padding + yAxisHeight)
			;

		dd.xAxisG.call(xAxis)
			.selectAll('text')
			.attr('font-family', settings.fontFamily)
			.attr('font-size', settings.fontSize + "px")	
			;
		dd.xAxisG.attr('transform', 'translate(0 ' + chartBottom + ')');


		mainDiv.lastBundle = data;
		} catch (e) {
			print("Error in bar chart draw(bundle) ");
			printError(e, "bard3.js");
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