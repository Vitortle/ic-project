function initializeTableD3(div) {
	'use strict';

	var mainDiv = div;

	var DATA_FORMAT_NONE = 0;
	var DATA_FORMAT_OBJECT = 1;
	var DATA_FORMAT_TIME = 2;
	var DATA_FORMAT_PERCENT = 3;

	function Settings() {
		this.chartTitle = "";
		this.fontFamily = "helvetica";
		this.titleFontSize = 24;
		this.fontSize = 12;
		this.precision = 2;

		this.dataColumns = [];
		this.columnFormats = [];
		this.objectIDMap = {};

		this.formatterPrecision = null;
		this.formatter = null;
		
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
				return new Date(ss.toJSTime(value)).toUTCString().slice(0, -4);
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
		}
	};

	mainDiv.settings = new Settings();

	function DrawData(div) {
		this.svg = d3.select(div).append("svg")
			.attr("font-family", "helvetica")
		this.chartTitle = this.svg.append("text");
		this.tableHolder = this.svg.append("foreignObject");
		this.tableDiv = this.tableHolder.append("xhtml:div")
			.style("overflow-x", "auto")
			.style("overflow-y", "auto")
		this.table = this.tableDiv.append("xhtml:table")
	};

	mainDiv.drawData = new DrawData(mainDiv);

	mainDiv.addObjectIDAndPath = function addObjectIDAndPath(id, path) {
		mainDiv.settings.objectIDMap[id] = path;
	};

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
		applySetting("titleFontSize");
		applySetting("fontSize");
		applySetting("precision");

		applySetting("dataColumns");
		applySetting("columnFormats");

		} catch(e) {
			print('exception caught in pied3 mainDiv.applySettings()'); 
			printError(e, "pied3.js " + jsonSettingsStr + "- applySettings()");
		}
	};

	mainDiv.draw = function draw(bundle) {
		var dd = mainDiv.drawData;
		var settings = mainDiv.settings;

		var width = +mainDiv.offsetWidth;
		var height = +mainDiv.offsetHeight;

		dd.svg.attr("width", width).attr("height", height);

		// lay out the basic elements
		var padding = 5;

		// Place the title
		dd.chartTitle.html(settings.chartTitle)
			.attr('font-size', settings.titleFontSize + "px");
		var chartTitleBBox = dd.chartTitle.node().getBBox();
		var titleHeight = chartTitleBBox.height;

		dd.chartTitle.attr('x', width / 2.0 - chartTitleBBox.width / 2.0)
			.attr('y', titleHeight + padding);

		var tableTop = titleHeight + 2 * padding;
		var tableHeight = height - tableTop;
		dd.tableHolder
			.attr('x', 0)
			.attr('y', tableTop)
			.attr('width', width)
			.attr('height', tableHeight)

		dd.tableDiv
			.attr('width', width)
			.attr('height', tableHeight)
			.style('width', width)
			.style('height', tableHeight)

		dd.table
			.style('font-family', settings.fontFamily)
			.style('font-size', settings.fontSize + "px")
			.style('margin-left', 'auto')
			.style('margin-right', 'auto')

		var header = Bundle.interpretHeader(bundle);
		var data = Bundle.interpretData(bundle, header);

		// now build the html table
		var columnNames = settings.dataColumns.map(function(col) {
			return data.getFieldName(col);
		});

		var columnFormats = settings.dataColumns.map(function(col) {
			return settings.columnFormats[col];
		});

		var rows = Array(data.nrEntries).fill(0).map(function(v, i) {
			return i;
		});

		
			

		var headerRow = dd.table.selectAll("tr.header").data([1]);
		headerRow.exit().remove();
		var headerCells = headerRow.enter()
			.append("xhtml:tr")
			.classed("header", true)
			.merge(headerRow)
				.selectAll("th")
				.data(columnNames);

		headerCells.exit().remove();
		headerCells.enter().append("xhtml:th")
			.style('white-space', 'nowrap')
			.merge(headerCells)
			.html(function(d) { return d; });

		var tableRows = dd.table.selectAll("tr.row").data(rows);
		tableRows.exit().remove();
		
		var cells = tableRows.enter()
			.append("xhtml:tr")
			.classed("row", true)
			.merge(tableRows)
			.style('background-color', function(row) {
				var evenOdd = row % 2;
				return evenOdd ? "#EEE" : "#FFF";
			})
			.style('font-size', settings.fontSize + "px")
			.selectAll("td").data(function(row) {
				this.row = row;
				return settings.dataColumns;
			})
			

		cells.exit().remove();
		cells.enter()
			.append("xhtml:td")
			.style('text-align', function(d, i) {
				var format = columnFormats[i];
				var value = this.value;
				if (format == DATA_FORMAT_NONE && typeof(this.value) == "string")
					return 'left';
				return 'right';
			})
			.style('white-space', 'nowrap')
			.style('border-right', '1px solid #AAA')
			.style('border-left', '1px solid #AAA')
			.merge(cells)
			.html(function(col, i) { 
				var row = this.parentElement.row;
				var value = data.getValue(row, col);
				var format = columnFormats[i];
				this.value = value;
				return settings.valueToString(value, format);
			})

		mainDiv.lastBundle = data;
	};

	mainDiv.onResize = function onResize() {
		mainDiv.draw(mainDiv.lastBundle);
	}

	mainDiv.setProperties = function setProperties() {
		// a no-op, but required for compatibility
	};

	window.addEventListener("resize", mainDiv.onResize, false);
}