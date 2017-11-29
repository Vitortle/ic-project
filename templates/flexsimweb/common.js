
function convertBufferToString(dataView, offset){
	var array = [];
	var c = dataView.getUint8(offset);
	for(var i = offset+1; c; i++)
	{
		array.push(String.fromCharCode(c));
		c = dataView.getUint8(i);
	}
	return array.join("");
}

function numToString(val, precision){
	var multiplier = Math.pow(10, precision);
	return Math.round(val * multiplier) / multiplier;
}

function viewport()
{
	var e = window, a = 'inner';
	if ( !( 'innerWidth' in window ) )
	{
		a = 'client';
		e = document.documentElement || document.body;
	}
	return { width : e[ a+'Width' ] , height : e[ a+'Height' ] }
}

function getMousePos(canvas, evt){
	// get canvas position
	var obj = canvas;
	var top = 0;
	var left = 0;
	while (obj && obj.tagName != 'BODY') {
		top += obj.offsetTop;
		left += obj.offsetLeft;
		obj = obj.offsetParent;
	}
	// return relative mouse position
	var mouseX = evt.clientX - left + window.pageXOffset;
	var mouseY = evt.clientY - top + window.pageYOffset;
	//var scrollOffset = windowScrollPos();
	return {
		x: mouseX,// - scrollOffset.left,
		y: mouseY// - scrollOffset.top
	};
}

function setMouseOffsets(e) {
	if(e.offsetX == undefined) {
		var pos = getMousePos(e.target, e);
		e.offsetX = pos.x;
		e.offsetY = pos.y;
	}
}

function pixelRound(value)
{
	return Math.floor(value)+0.5;
}

function windowScrollPos() {
	return {
		left:f_filterResults (
				window.pageXOffset ? window.pageXOffset : 0,
				document.documentElement ? document.documentElement.scrollLeft : 0,
				document.body ? document.body.scrollLeft : 0
		),
		top:f_filterResults (
			window.pageYOffset ? window.pageYOffset : 0,
			document.documentElement ? document.documentElement.scrollTop : 0,
			document.body ? document.body.scrollTop : 0
		)
	};
}
function f_scrollTop() {
	return ;
}
function f_filterResults(n_win, n_docel, n_body) {
	var n_result = n_win ? n_win : 0;
	if (n_docel && (!n_result || (n_result > n_docel)))
		n_result = n_docel;
	return n_body && (!n_result || (n_result > n_body)) ? n_body : n_result;
}


var FIELD_TYPE_DOUBLE = 1;
var FIELD_TYPE_INT = 2;
var FIELD_TYPE_STR = 3;
var FIELD_TYPE_FLOAT = 4;

var BUNDLE_FIELD_SIZE = 70;

var UTILIZATION_SHOW_ALL = 0;
var UTILIZATION_TRANSLUCENT = 1;
var UTILIZATION_HIDE = 2;

var PICK_MODE_HOVER = 1;
var PICK_MODE_CLICK = 2;

var STATE_NON_UTILIZED = 0;
var STATE_UTILIZED = 1;
var STATE_EXCLUDED = 2;

function saveStringToBuffer(str, dataView, offset){
	for(var i = 0; i < str.length; i++)
		dataView.setUint8(i + offset, str.charCodeAt(i));
}

var console = null;
function clearconsole(){
	if(console)
	{
		console.innerHTML = "";
		if(console.style)
			console.style.display = "none";
	}
}
function print(msg){
	if(window.validFireFlexsimEvent)
		fireFlexsimEvent("print", msg);
	else if(console)
	{
		if(console.style)
			console.style.display = "block";
		if(console.innerText)
			console.innerText += msg;
		else console.innerHTML += msg;
	}
}
function println(msg){
	print(msg);
	print('<br/>');
}
function getStackTrace(e) {
	try{
		var callstack = [];
		var isCallstackPopulated = false;

		var currentFunction = arguments.callee.caller.caller;
		while (currentFunction) {
			var fn = currentFunction.toString();
			var fname = fn.substring(0, fn.indexOf(')') + 1) || 'anonymous';
			callstack.push(fname);
			callstack.push("\r\n");
			currentFunction = currentFunction.caller;
		}
		return callstack.join('');
	}
	catch(e){return "unable to trace stack";}
}
		
function printError(e, fileName){
	var errorStr = "Error: " + e.name + " " + e.message;
	if(e.lineNumber)
		errorStr += " at line " + e.lineNumber;
	if (fileName)
		errorStr += " in " + fileName;
	errorStr += "\r\nCallstack: \r\n" + getStackTrace(e);
	if(window.validFireFlexsimEvent)
		fireFlexsimEvent("print", errorStr, 1);
	else print(errorStr);
}

function printObject(o){
	for(var prop in o)
		print(" " + prop + ":" + o[prop] + " ");
}

function getRGBColor(array, index, alpha, linearGradient, lightness) {
    if (index >= array.length) {
        if (lightness == undefined)
            return getIndexedColor(index, [40, 80], [50, 80], alpha, linearGradient);
        return getIndexedColor(index, [30, 70], [80, 90], alpha, linearGradient);
    }
   
    var r = array[index][0];
    var g = array[index][1];
    var b = array[index][2];

    if (lightness != undefined) {
        r = Math.round(Math.min(255, r + (lightness * (255 - r))));
        g = Math.round(Math.min(255, g + (lightness * (255 - g))));
        b = Math.round(Math.min(255, b + (lightness * (255 - b))));
    }

    if(!linearGradient)
        return ["rgba(", r, ", ", g, ",", b, ",", alpha || 1, ")"].join("");

	linearGradient.addColorStop(0, ["rgba(", Math.floor(r *0.85), ",", Math.floor(g *0.85), ",", Math.floor(b *0.85), ",", alpha || 1, ")"].join(""));
	linearGradient.addColorStop(0.4, ["rgba(", r, ",", g, ",", b, ",", alpha || 1, ")"].join(""));
	linearGradient.addColorStop(1, ["rgba(", Math.floor(r *0.65), ",", Math.floor(g *0.65), ",", Math.floor(b *0.65), ",", alpha || 1, ")"].join(""));
	return linearGradient;
}

var hues = [20,0,120,240,60,180,300,30,210,150,270,330,15,195,285,45,135,225,315,75,165,105,255,345,90];
function getIndexedColor(index, saturation, lightness, alpha, linearGradient){
	if(saturation && saturation.length)
	{
		var percent = ((index*863)%100)/100.0;
		var temp = saturation[0] + percent*(saturation[1]-saturation[0]);
		saturation = temp;
	}
	if(lightness && lightness.length)
	{
		var percent = ((index*1733)%100)/100.0;
		var temp = lightness[0] + percent*(lightness[1]-lightness[0]);
		lightness = temp;
	}
	var hue;
	if (index < hues.length)
		hue = hues[index];
	else hue = (index*8479)%360;
	if(!linearGradient)
		return ["hsla(", hue, ", ", Math.floor(saturation), "%,", Math.floor(lightness), "%,", alpha || 1, ")"].join("");
	else{
		linearGradient.addColorStop(0, ["hsla(", hue, ",", Math.max(0, Math.floor(saturation - 15)), "%,", Math.max(0, Math.floor(lightness - 7/(alpha || 1))), "%,", alpha || 1, ")"].join(""));
		linearGradient.addColorStop(0.4, ["hsla(", hue, ",", Math.floor(saturation), "%,", Math.floor(lightness), "%,", alpha || 1, ")"].join(""));
		linearGradient.addColorStop(1, ["hsla(", hue, ",", Math.max(0, Math.floor(saturation - 30)), "%,", Math.max(0, Math.floor(lightness - 15/(alpha || 1))), "%,", alpha || 1, ")"].join(""));
		return linearGradient;
	}
}

function calculateGridTickInterval(minDistBetweenTicks, graphSize, valRange) {
	// figure out the interval between ticks on the y-axis
    var tickInterval = 1.0;
    var precision = 0;
	if(graphSize > 0) {
		var scaleArray = [2,2.5,2];
		var scaleIndex = 0;
		while (graphSize / (valRange / tickInterval) < minDistBetweenTicks) {
			tickInterval *= scaleArray[scaleIndex++];
			if (scaleIndex >= scaleArray.length)
			    scaleIndex = 0;
		}

		while (graphSize / (valRange / tickInterval) > minDistBetweenTicks * 2.5) {
			tickInterval/=scaleArray[scaleIndex++];
			if (scaleIndex >= scaleArray.length)
			    scaleIndex = 0;
			else if (scaleIndex == 1)
			    precision++;
		}
	}
	return { 'tickInterval': tickInterval, 'precision': precision, 'tickWidth': graphSize / (valRange / tickInterval) };
}

// YGrid class calculates and draws an automatic grid along the y-axis
function YGrid(ctx, yMin, yMax, graphTop, graphHeight, minDistBetweenTicks, autoAdjustMax) {
	this.graphTop = graphTop;
	this.adjustedMax = yMax;
	var range = yMax - yMin;
	if(range <= 0 || graphHeight <= 3) {
		this.width = 1;
		this.draw = function(){};
		return this;
	}
    var tickAtts = calculateGridTickInterval(minDistBetweenTicks, graphHeight, range);
    var tickInterval = tickAtts.tickInterval;
	var precision = tickAtts.precision;

	var nrTicks = Math.ceil(range / tickInterval);
	if(autoAdjustMax) {
		this.adjustedMax = yMin + nrTicks * tickInterval;
		yMax = this.adjustedMax;
		range = yMax - yMin;
	}
	var firstTickVal = Math.ceil(yMin / tickInterval) * tickInterval;
	if(firstTickVal < yMin) firstTickVal += tickInterval;
	var lastTickVal = firstTickVal + nrTicks * tickInterval;
	var maxTickValWidth = Math.max(ctx.measureText(firstTickVal.toFixed(precision)).width, ctx.measureText(lastTickVal.toFixed(precision)).width);
	this.width = maxTickValWidth + 5;
	this.draw = function yGridDraw(x, sx) {
		try{
		var graphBottom = this.graphTop + graphHeight;
		for(var val = firstTickVal; val <= yMax; val += tickInterval) {
			var y = Math.floor(graphBottom - graphHeight * (val - yMin)/range) + 0.5;
			ctx.strokeRect(x, y, sx, 0.1);
			var valStr = val.toFixed(precision);
			var width = ctx.measureText(valStr).width
			if(y - 7 < graphBottom && y >= graphTop)
			    ctx.fillText(valStr, Math.max(2, x - width - 5), y + 5);
		}
		}catch(e){printError(e);}
	}
	return this;
}

// XGrid class calculates and draws an automatic grid along the x-axis
function XGrid(ctx, min, max, graphLeft, graphWidth, autoAdjustMax, fontSize, bottomCtx) {
    // make a public graphLeft member, so the owner can do repeated draws on different locations
    //bottomCtx allows us to draw the numbers on a separate canvas giving us scrolling abilites
    if (bottomCtx == undefined || bottomCtx == ctx) {
        bottomCtx = ctx;
        this.adjustY = false;
    } else {
        this.adjustY = true;
    }
    this.bottomCtx = bottomCtx;
	this.graphLeft = graphLeft;
	this.ctx = ctx;
	var range = max - min;
	this.height = (fontSize || 11) +2;
	this.adjustedMax = max;
	if(range <= 0 || graphWidth <= 3) {
		this.draw = function(){};
		return this;
	}
	var onePrecisionWidth = ctx.measureText("0").width;
	var middleVal = (max + min) / 1.57;
	var maxTickValWidth = Math.max(
			ctx.measureText(min.toFixed(0)).width,
			ctx.measureText(middleVal.toFixed(0)).width,
			ctx.measureText(max.toFixed(0)).width);
	var tickAtts = calculateGridTickInterval(maxTickValWidth + 2 * onePrecisionWidth + 15, graphWidth, range);
    var tickInterval = tickAtts.tickInterval;
    var precision = tickAtts.precision;
	if (tickAtts.tickWidth < maxTickValWidth + precision * onePrecisionWidth + 15) { 
		// if the resolved tick width is less than the space needed to draw 
		// the text based on the resolved precision, then I need to recalculate
		tickAtts = calculateGridTickInterval(maxTickValWidth + precision * onePrecisionWidth + 15, graphWidth, range);
		tickInterval = tickAtts.tickInterval;
	}

	if(autoAdjustMax) {
		var nrTicks = Math.ceil(range / tickInterval);
		this.adjustedMax = min + nrTicks * tickInterval;
		max = this.adjustedMax;
		range = max - min;
	}

	var nrTicks = Math.ceil(range / tickInterval);
	var firstTickVal = Math.ceil(min / tickInterval) * tickInterval;
	if(firstTickVal < min) firstTickVal += tickInterval;
	this.draw = function xGridDraw(y, sy, doText, leftTextFudge, rightTextFudge) {
		try{
		if(doText == undefined) doText = true;
		var graphRight = this.graphLeft + graphWidth;
		if(leftTextFudge == undefined) leftTextFudge = 0;
		if(rightTextFudge == undefined) rightTextFudge = 0;
		for(var val = firstTickVal; val <= max; val += tickInterval) {
			var x = Math.floor(this.graphLeft + graphWidth * (val - min)/range) + 0.5;
			this.ctx.strokeRect(x, y, 0.1, sy);
            //Draw the text
			var valStr = val.toFixed(precision);
			var width = this.bottomCtx.measureText(valStr).width;
			var halfWidth = 0.5*width;
			if(doText && x - halfWidth > this.graphLeft - leftTextFudge && x + halfWidth < graphRight + rightTextFudge)
			    this.bottomCtx.fillText(valStr, x - halfWidth, this.adjustY ? fontSize *1.3 : (y + (sy < 0 ? this.height : -3)));
		}
		}catch(e){printError(e);}
	};
	return this;
}

function DateBasedGrid(ctx, timeMin, timeMax, min, max, graphLeft, graphWidth, height, fontSize, bottomCtx) {
    this.bottomCtx = bottomCtx;
    this.graphLeft = graphLeft;
    this.ctx = ctx;
    var fullTimeRange = timeMax - timeMin;
    var timeRange = max - min;
    this.height = height;

    var graphRight = this.graphLeft + graphWidth;

    var pixelPerTime = graphWidth / timeRange;
    var timePerDay = fullTimeRange / 7; //Time is NOT in seconds, it's based upon the model units
    var pixelsPerDay = pixelPerTime * timePerDay;
    var timePerPixel = timePerDay / pixelsPerDay;
    
    var oneCharHeight = fontSize * 1.5;
    var numberOfTimes = Math.min(24, Math.floor(pixelsPerDay / oneCharHeight) - 1);
    var interval = Math.floor(numberOfTimes <= 1 ? 23 : 24 / numberOfTimes);
    if (interval % 2 != 0 && !(interval == 1 && numberOfTimes == 24)) {
        interval += 1;
        numberOfTimes = 24 / interval;
    }
    var times = ["00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
                 "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
    
    this.draw = function xGridDraw(y, sy) {
        try {
            //Draw the days of the week
            for (var i = 0; i < 7; i++) {
                var x = this.graphLeft - (min * pixelPerTime) + pixelsPerDay * (i + 0.5) + (timeMin * pixelPerTime);

                var dayStr;
                switch (i) {
                    case 0: dayStr = "Sun"; break;
                    case 1: dayStr = "Mon"; break;
                    case 2: dayStr = "Tue"; break;
                    case 3: dayStr = "Wed"; break;
                    case 4: dayStr = "Thu"; break;
                    case 5: dayStr = "Fri"; break;
                    case 6: dayStr = "Sat"; break;
                }

                var textWidth = bottomCtx.measureText(dayStr).width;

                if (x - textWidth * 0.5 >= this.graphLeft && x + textWidth * 0.5 <= graphRight)
                    this.bottomCtx.fillText(dayStr, x - textWidth * 0.5, this.height);

                //x is the beginning of the day
                x = Math.floor(this.graphLeft - (min * pixelPerTime) + pixelsPerDay * i + (timeMin * pixelPerTime)) + 0.5;

                //Draw separator line between days
                if (x > this.graphLeft) {
                    this.ctx.strokeRect(x, y, 1, sy);
                    this.bottomCtx.save();
                    this.bottomCtx.strokeStyle = "#aaaaaa";
                    this.bottomCtx.strokeRect(x, 0, 0.1, this.height);
                    this.bottomCtx.restore();
                }

                //For each day draw the hours
                var index = 1;
                while (index <= 24) {
                    var timeX = x + ((index - 1) / 24) * timePerDay / timePerPixel;
                    
                    if (timeX >= this.graphLeft) {
                        this.bottomCtx.strokeRect(Math.floor(timeX) + 0.5, 0, 0.2, 3);
                        timeX += fontSize * .5;
                        this.bottomCtx.save();
                        this.bottomCtx.font = fontSize * .75 + "pt Tahoma";
                        this.bottomCtx.translate(timeX, 0);
                        this.bottomCtx.rotate(Math.PI / 4);
                        this.bottomCtx.translate(-timeX, 0);
                        this.bottomCtx.fillText(times[index - 1], timeX, 8);
                        this.bottomCtx.restore();
                    }
                    index += interval;
                }
            }            
        } catch (e) { printError(e); }
    };
    return this;
}




var CHART_TYPE_HORIZONTAL_BAR = 1;
var CHART_TYPE_VERTICAL_BAR = 2;
var CHART_TYPE_PIE = 3;
var CHART_TYPE_LINE = 4;
var CHART_TYPE_DATA_TABLE = 5;
var CHART_TYPE_TIME_PLOT = 6;
var CHART_TYPE_TIME_SERIES_HISTOGRAM = 7;
var CHART_TYPE_FINANCIAL = 8;
var CHART_TYPE_GANTT = 9;

function initializeChart(div, properties, redraw, callback) {
	try {
	
	//All charts have a title and need a chart type
	if (properties.title == undefined)
		properties.title = div.getAttribute('data-title') || 'Chart';
	if (properties.chartType == undefined)
		properties.chartType = div.getAttribute('data-chart-type') || CHART_TYPE_DATA_TABLE;
	
	if (typeof(properties.chartType) == 'string'
			&& properties.chartType.charCodeAt(0) >= '0'.charCodeAt(0)
			&& properties.chartType.charCodeAt(0) <= '9'.charCodeAt(0))
		properties.chartType = parseInt(properties.chartType);

	switch (properties.chartType) {
		case "barchart":
		case CHART_TYPE_HORIZONTAL_BAR:
			initializeBarChart(div);
			break;
			
		case "linechart":
		case CHART_TYPE_LINE:
			initializeLineChart(div);
			break;
			
		case "datatable":
		case CHART_TYPE_DATA_TABLE:
			initializeDataTable(div);
			break;
			
		case "piechart":
		case CHART_TYPE_PIE:
			initializePieChart(div);
			break;
			
		case "timeplot":
		case CHART_TYPE_TIME_PLOT:
			initializeTimePlot(div);
			break;

		case "timeserieshistogram":
		case CHART_TYPE_TIME_SERIES_HISTOGRAM:
			initializeTimeSeriesHistogram(div);
			break;
			
	    case "financial":
	    case CHART_TYPE_FINANCIAL:
	        initializeFinancial(div);
	        break;
			
		case "gantt":
	    case CHART_TYPE_GANTT:
	        initializeGanttChart(div);
	        break;
	}
	div.setProperties(properties, redraw);
	
	fireFlexsimEvent("loaded");
	if(callback)
		callback();
		
	}catch(e) {
		printError(e);
	}
}

function findDocumentPos(obj){
	var curleft = curtop = 0;
	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft;
			curtop += obj.offsetTop;
		}
		while (obj = obj.offsetParent);
		return [curleft, curtop];
	}
	return [0,0];
};

function Bundle (header){
	try{
		this.nrEntries = 0;

		if(header.buffer != null){
			var fieldHeader = new DataView(header.buffer, 0);
			this.entryByteSize = fieldHeader.getInt32(4, 1);
			this.nrFields = fieldHeader.getInt32(8, 1);
			var startOffset = 5*4;

			var fieldData = new DataView(header.buffer, startOffset);
			this.fields = [];
			for(var i = 0; i < this.nrFields; i++){
				this.fields.push({
					offset:fieldData.getUint16(i*BUNDLE_FIELD_SIZE + 64 + 0*2, 1),
					byteSize:fieldData.getUint16(i*BUNDLE_FIELD_SIZE + 64 + 1*2, 1),
					type:fieldData.getUint16(i*BUNDLE_FIELD_SIZE + 64 + 2*2, 1),
					name:convertBufferToString(fieldData, i*BUNDLE_FIELD_SIZE)
				});
			}

			this.updateData = this.updateDataBinary;
			this.getValue = this.getValueBinary;
		}
		else {
			this.header = header;
			this.nrFields = header.fields != undefined ? header.fields.length : 0;
			this.fields = header.fields;
			this.updateData = this.updateDataJSO;
			this.getValue = this.getValueJSO;
		}

		this.saveToCSV = function saveToCSV(filePath) {
			var csv = [];
			var fromEntry = 0;
			var toEntry = this.nrEntries;
			var fromField = 0;
			var toField = this.nrFields;
			var curRow = [];
			for(var i = fromField; i < toField; i++)
				curRow.push(this.fields[i].name);
			csv.push(curRow.join(","));
			for(var j = fromEntry; j < toEntry; j++) {
				curRow = [];
				for(var i = fromField; i < toField; i++)
					curRow.push(this.getValue(j, i));
				csv.push(curRow.join(","));
			}
			var csvStr = csv.join("\r\n");
			if(window.validFireFlexsimEvent)
				fireFlexsimEvent("savecsv", csvStr, filePath);
			return csvStr;
		}

		return this;
	}catch(e){printError(e);}
}

Bundle.interpretHeader = function interpretHeader(header){
	if(header.getValue != null)
		return header;
	else if(header.header) {
		var bundle = new Bundle(header.header);
		if(header.data)
			bundle.updateData(header.data);
		return bundle;
	}
	else return new Bundle(header);
}

Bundle.interpretData = function interpretData(data, original){
	if(data.getValue != null)
		return data;
	else
	{
		if(!original) return 0;
		if(data.data) data = data.data;
		original.updateData(data);
		return original;
	}
}

Bundle.prototype.updateDataBinary = function updateDataBinary(data){
	this.nrEntries = Math.floor(data.byteLength / this.entryByteSize);
	this.data = new DataView(data.buffer);
}
Bundle.prototype.getValueBinary = function getValueBinary(entryNr, fieldNr){
	if(!this.data || entryNr >= this.nrEntries) return 0;
	var entryOffset = entryNr * this.entryByteSize;
	entryOffset += this.fields[fieldNr].offset;

	switch(this.fields[fieldNr].type)
	{
		case FIELD_TYPE_DOUBLE: return this.data.getFloat64(entryOffset, 1);
		case FIELD_TYPE_FLOAT: return this.data.getFloat32(entryOffset, 1);
		case FIELD_TYPE_INT: return this.data.getInt32(entryOffset, 1);
		case FIELD_TYPE_STR: return convertBufferToString(this.data, entryOffset);
	}
	return 0;
}
Bundle.prototype.getFieldName = function getFieldName(fieldNr){
	if(fieldNr >= this.nrFields) return 0;
	return this.fields[fieldNr].name;
}

Bundle.prototype.updateDataJSO = function updateDataJSO(data){
	this.data = data;
	this.nrEntries = data.length;
}
Bundle.prototype.getValueJSO = function getValueJSO(entryNr, fieldNr){
	if(!this.data || entryNr >= this.nrEntries || fieldNr >= this.nrFields) return 0;
	return this.data[entryNr][fieldNr];
}

Bundle.prototype.convertBinaryToJSO = function convertBinaryToJSO(){
	if(this.getValue == this.getValueJSO)
		return 0;
	var newData = [];
	for(var i = 0; i < this.nrEntries; i++){
		var newEntry = [];
		for(var j = 0; j < this.nrFields; j++){
			newEntry.push(this.getValue(i, j));
		}
		newData.push(newEntry);
	}
	this.data = newData;
	this.updateData = this.updateDataJSO;
	this.getValue = this.getValueJSO;
}

Bundle.prototype.appendData = function appendData(data){
	if(this.getValue != this.getValueJSO)
		this.convertBinaryToJSO();
	if(data.buffer){
		var dataView = new DataView(data.buffer);
		if(!this.entryByteSize)
			return 0;
		var entryOffset = entryNr * this.entryByteSize;
		entryOffset += this.fields[fieldNr].offset;
		var nrEntries =  Math.floor(dataView.byteLength / this.entryByteSize);
		for(var i = 0; i < nrEntries; i++){
			var newEntry = [];
			for(var j = 0; j < this.fields.length; j++){
				var entryOffset = (i * this.entryByteSize) + this.fields[j].offset;
				switch(this.fields[j].type)
				{
					case FIELD_TYPE_DOUBLE: newEntry.push(dataView.getFloat64(entryOffset, 1)); break;
					case FIELD_TYPE_FLOAT: newEntry.push(dataView.getFloat32(entryOffset, 1)); break;
					case FIELD_TYPE_INT: newEntry.push(dataView.getInt32(entryOffset, 1)); break;
					case FIELD_TYPE_STR: newEntry.push(convertBufferToString(dataView, entryOffset)); break;
				}
			}
			this.data.push(newEntry);
		}
	}
	else for(var i = 0; i < data.length; i++)
		this.data.push(data[i]);
	this.nrEntries = this.data.length;
}

function addScriptToHead(path, callBack){
	var headTag = document.getElementsByTagName("head")[0];
	var newScript = document.createElement("script");
	newScript.type = "text/javascript";
	newScript.src = path;
	newScript.onload = callBack;
	headTag.appendChild(newScript);
}

if(!window.fireFlexsimEvent)
	window.fireFlexsimEvent = function(){};
else window.validFireFlexsimEvent = true;

var dependencies = [];
function loadDependencies(element){
	function onScriptLoaded() {
		nrLoadsLeft--;
		if(nrLoadsLeft == 0) {
			fireFlexsimEvent("loaded");
			if (element == undefined) {
				for(var i = 0; i < charts.length; i++) {
					initializeChart(charts[i], {}, true);
				}
			} else {
				for (var i = 0; i < charts.length; i++)
					initializeDynamicHTML(charts[i], dynamicReplicationData);
			}
		}
	}

	//Find the div tags that have "dependencies" and add those dependencies to the head so we're linked to the appropriate files
	var divs = document.getElementsByTagName("div");
	var charts = [];
	var dependenciesToAdd = [];
	for (var i = 0; i < divs.length; i++) {
		var div = divs[i];
		var addDependencies = div.getAttribute('data-dependencies');
		if (addDependencies != undefined) {
			charts.push(div);
			var array = addDependencies.split(",");
			for (var j = 0; j < array.length; j++) {
				if (dependencies.indexOf(array[j]) == -1) {
					dependencies = dependencies.concat(array[j]);
					dependenciesToAdd = dependenciesToAdd.concat(array[j]);
				}
			}
		}
	}

	var nrLoadsLeft = dependenciesToAdd.length;
	for (var j = 0; j < dependenciesToAdd.length; j++) {
		addScriptToHead(dependenciesToAdd[j], onScriptLoaded);
	}
	
	if (nrLoadsLeft == 0) {
		fireFlexsimEvent("loaded");
		if (element != undefined) {
			for (var i = 0; i < charts.length; i++)
				initializeDynamicHTML(charts[i], dynamicReplicationData);
		}
	}
}

function onDocLoaded(){
	try{
	
	console = document.getElementById("console");

	var dynamicHTMLData = document.getElementById('dynamicHTMLData');
	if(dynamicHTMLData) {
		dynamicHTMLData.updateScriptData = function(newFunctionStatements) { //Called from the PFM window
			eval(newFunctionStatements);
		}
		dynamicHTMLData.replaceInnerHTML = function (html, scenarioName, repNr) { //Called from the PFM window
			this.innerHTML = html;
			if(this.children.length > 0 && dynamicReplicationData && initializeDynamicHTML)
			{
				try{
					var title = this.children[0].getAttribute('data-title');
					if(title && scenarioName)
						this.children[0].setAttribute('data-title', title + " " + scenarioName + " Replication " + repNr);
					loadDependencies(this.children[0]);
				}catch(e){printError(e);}
			}
		}
	}
	
	loadDependencies();
	
	}catch(e){
		printError(e);
	}
}

if(document.addEventListener)
	document.addEventListener('DOMContentLoaded', onDocLoaded, false);
else if(document.attachEvent)
    document.attachEvent('onDOMContentLoaded', onDocLoaded);