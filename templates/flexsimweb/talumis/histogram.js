function initializeTimeSeriesHistogram(mainDiv) {
  try {
    var className = mainDiv.getAttribute('class');
    mainDiv.fullScreen = className && className.indexOf('fullscreen') >= 0;
    mainDiv.innerHTML = "<canvas width='10px' height='30px'>Not supported by this browser</canvas>";

    var canvas = mainDiv.getElementsByTagName("canvas")[0];
    var ctx = canvas.getContext('2d');

    var data = [];
    var normalize = false;

    var plotArea = false;
    var bars = [];

    var pickAtts = {};
	var xAxisTitle = { text: "", displayedText: "", width: 0, draw: true, invalidate: function() { this.width = 0; } };
	var yAxisTitle = { text: "", displayedText: "", width: 0, draw: true, invalidate: function() { this.width = 0; } };

    canvas.draw = function drawHistogram() {
      try {	  
        canvas.width = mainDiv.offsetWidth - 2;
        canvas.height = mainDiv.offsetHeight - 2;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 1;
		
        plotArea = {
          x: 18 /* + yGrid.width */ ,
          y: 18,
          width: canvas.width - 18,
          height: canvas.height - 18
        };

        // draw canvas title
        if (canvas.mainTitle) {
          ctx.font = "bold " + (canvas.fontSize * 1.1) + "pt Tahoma";
		  ctx.textHeight = ctx.measureText('M').width;
          var titleWidth = ctx.measureText(canvas.mainTitle).width;
          ctx.fillText(canvas.mainTitle, (canvas.width - titleWidth) / 2, 18);

          // Title height is approximately 1em
          plotArea.y += ctx.textHeight;
        }

        if (data.length == 0) {
          return 0;
        }

        var minY = 0,
          maxY = undefined,
          total = 0;
        for(var i = 0; i < data.length; i++) {
          total += data[i].value;
          if(data[i].value < minY || minY == undefined) {
            minY = data[i].value;
          }
          if(data[i].value > maxY || maxY == undefined) {
            maxY = data[i].value;
          }
        }

        if(minY < 0) {
          print("Histogram does not support negative values.");
          return 0;
        }
        if(total == 0) {
          return 0;
        }

        if(normalize) {
          minY /= total;
          maxY /= total;
        }

        plotArea.width -= plotArea.x;
        plotArea.height -= plotArea.y;
		
        ctx.font = canvas.fontSize + "pt Tahoma";
        ctx.strokeStyle = "#aaaaaa";
		
		// Reserve some space for the axis titles
		var oldFont = ctx.font;
		ctx.font = "bold " + ctx.fontSize * .9 + "pt Tahoma";			
		var axisTitleHeight = ctx.measureText('M').width * 1.1;
		if(xAxisTitle.text)
		{
			if(xAxisTitle.draw = plotArea.height > 50 + axisTitleHeight)
			{
				plotArea.height -= axisTitleHeight;
			}
		}
		if(yAxisTitle.text)
		{		
			if(yAxisTitle.draw = plotArea.width > 50 + axisTitleHeight)			
			{
				plotArea.x += axisTitleHeight;
				plotArea.width -= axisTitleHeight;
			}
		}		
		ctx.font = oldFont;
		
		if(plotArea.width < 10 || plotArea.height < 10)
			return;
		
        var yGrid = new YGrid(ctx, minY, maxY, plotArea.y, plotArea.height, 20, true);
        plotArea.width -= yGrid.width;
        plotArea.x += yGrid.width;

        var xGrid = new DiscreteXGrid(ctx, data.length, data.map(function(bin) {
          return bin.label;
        }), plotArea.x, plotArea.width, 20);
        plotArea.height -= xGrid.height;
        xGrid.draw(plotArea.y, plotArea.height);

        yGrid = new YGrid(ctx, minY, maxY, plotArea.y, plotArea.height, 20, true);
		maxY = yGrid.adjustedMax;		
        yGrid.draw(plotArea.x, plotArea.width);

		if(plotArea.width < 10 || plotArea.height < 10)
			return;
			
		if(yAxisTitle.text && yAxisTitle.draw)
		{
			var oldFont = ctx.font;
			ctx.font = "bold " + ctx.fontSize * .9 + "pt Tahoma";			
			ctx.textHeight = ctx.measureText('M').width;
			
			if(!yAxisTitle.width) {
				yAxisTitle.displayedText = yAxisTitle.text;
				yAxisTitle.width = ctx.measureText(yAxisTitle.displayedText).width;				
				if(yAxisTitle.width > plotArea.height) {
					var charactersToShow = Math.floor(yAxisTitle.displayedText.length * plotArea.height / yAxisTitle.width);
					if(charactersToShow > 3) {
						yAxisTitle.displayedText = yAxisTitle.displayedText.substr(0, charactersToShow) + "...";
						yAxisTitle.width = ctx.measureText(yAxisTitle.displayedText).width;				 
					} else {
						yAxisTitle.displayedText = "";
						yAxisTitle.width = 0;
					}
				}
				
				yAxisTitle.position = [ -( plotArea.y + 0.5 * (plotArea.height - axisTitleHeight + yAxisTitle.width) ), ctx.textHeight + 9 ];				
			}
					
			ctx.rotate(3*Math.PI/2);
			ctx.fillText(yAxisTitle.displayedText, yAxisTitle.position[0], yAxisTitle.position[1] );
							
			ctx.rotate(-3*Math.PI/2);
			ctx.font = oldFont;
		}

		if(xAxisTitle.text && xAxisTitle.draw)
		{		
			var oldFont = ctx.font;
			ctx.font = "bold " + ctx.fontSize * .9 + "pt Tahoma";			
			ctx.textHeight = ctx.measureText('M').width;
			
			if(!xAxisTitle.width)
			{
				xAxisTitle.displayedText = xAxisTitle.text;
				xAxisTitle.width = ctx.measureText(xAxisTitle.displayedText).width;				
				if(xAxisTitle.width > plotArea.width) {
					var charactersToShow = Math.floor(xAxisTitle.displayedText.length * plotArea.width / xAxisTitle.width);
					if(charactersToShow > 3) {
						xAxisTitle.displayedText = xAxisTitle.displayedText.substr(0, charactersToShow) + "...";
						xAxisTitle.width = ctx.measureText(xAxisTitle.displayedText).width;				 
					} else {
						xAxisTitle.displayedText = "";
						xAxisTitle.width = 0;
					}
				}
				
				xAxisTitle.position = [ plotArea.x + 0.5 * (plotArea.width - xAxisTitle.width), canvas.height - ctx.textHeight ];				
			}

			ctx.fillText(xAxisTitle.displayedText, xAxisTitle.position[0], xAxisTitle.position[1] );		
			ctx.font = oldFont;
		}			
				
        var itemWidth = pixelRound(plotArea.width / data.length);
        var barWidth = pixelRound(itemWidth / 4);
        var barMargin = pixelRound((itemWidth - barWidth) / 2);

        ctx.fillStyle = "#99aadd"; // dataSeries.length <= 1 ?  "#99aadd" : getIndexedColor(i+1, [40,80], [50,80]);;
        for(var i = 0; i < data.length; i++) {
          var value = data[i].value;
          if(normalize) {
            value /= total;
          }

          var x = plotArea.x + i * itemWidth + barMargin;
          var valueRange = (value - minY) / (maxY - minY);

          // Calculate the coordinates, even when bar is not plotted, for onHover
          bars[i] = {
            index: i,
            label: data[i].label,
            value: value,
            x: pixelRound(x),
            y: pixelRound(plotArea.y + plotArea.height * (1 - valueRange)),
            width: barWidth,
            height: pixelRound(plotArea.height * valueRange)
          };

          if(valueRange == 0) {
            continue;
          }
          ctx.strokeRect(bars[i].x, bars[i].y, bars[i].width, bars[i].height);
          ctx.fillRect(bars[i].x, bars[i].y, bars[i].width, bars[i].height);
        }

        return 0;

      } catch (e) {
        printError(e, "histogram.js");
      }
    };

    var popupBar = false;
    var popup = document.getElementById('flexsimpopup');
    canvas.onMouseMove = function onMouseMove(e) {
      if(plotArea === false || plotArea.width == 0 || plotArea.height == 0 || data.length == 0) {
        return;
      }

      var grace = 10; // How far off can we be?
      setMouseOffsets(e);
      if(e.offsetY > plotArea.y && e.offsetY < plotArea.y + plotArea.height &&
        e.offsetX > plotArea.x && e.offsetX < plotArea.x + plotArea.width) {

        pickAtts.offsetX = e.offsetX;
        pickAtts.offsetY = e.offsetY;
        pickAtts.picked = null;
        pickMode = 1;
        canvas.draw();
        pickMode = 0;

        // Which bucket we are in...
        var bucketIndex = Math.floor((e.offsetX - plotArea.x) / plotArea.width * data.length);
        var isHoveringBar = (e.offsetX > bars[bucketIndex].x - grace && e.offsetX < bars[bucketIndex].x + bars[bucketIndex].width + grace) &&
          (e.offsetY > bars[bucketIndex].y - grace && e.offsetY < bars[bucketIndex].y + bars[bucketIndex].height + grace);

        popupBar = isHoveringBar ? bars[bucketIndex] : false;
      }

      if(popupBar !== false) {
        popup.style.display = "block";
        popup.innerHTML = popupBar.label + '<br/>Value: ' + popupBar.value.toFixed(canvas.precision);

        var pos = findDocumentPos(canvas);
        var scrollPos = windowScrollPos();
        popup.style.left = Math.floor(pos[0] - scrollPos.left + popupBar.x) + "px";
        popup.style.top = Math.max(plotArea.y, Math.floor(pos[1] - scrollPos.top + popupBar.y - popup.offsetHeight)) + "px";
      } else {
        popup.style.display = 'none';
      }
    }
    canvas.addEventListener('mousemove', canvas.onMouseMove, false);

    canvas.addEventListener('mouseout', function onMouseOut(e) {
      if(popupBar && e.relatedTarget != popup) {
        popupBar = false;
        popup.style.display = 'none';
      }
    }, false);

    // This prevents the cursor from changing to an i-beam in Chrome when clicking
    canvas.onselectstart = function() {
      return false;
    };

    mainDiv.draw = function(newData, newNormalize) {
      data = newData;
      normalize = newNormalize;

      if(popupBar) {
        var e = {
          offsetX: pickAtts.offsetX,
          offsetY: pickAtts.offsetY,
          target: canvas
        };
        canvas.onMouseMove(e);
      } else canvas.draw();
    }

    mainDiv.setProperties = function setProperties(properties, redraw) {
      try {
        if(properties.chartType != CHART_TYPE_TIME_SERIES_HISTOGRAM && properties.chartType != "timeserieshistogram")
          return initializeChart(this, properties, redraw);

        //If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
		if (properties.xAxisTitle == undefined)
			properties.xAxisTitle = mainDiv.getAttribute('data-x-axis-title') || "";
		if (properties.yAxisTitle == undefined)
			properties.yAxisTitle = mainDiv.getAttribute('data-y-axis-title') || "";
        if(properties.showLegend == undefined)
          properties.showLegend = mainDiv.getAttribute('data-show-legend') == 'true';
        if(properties.fontSize == undefined)
          properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 10;
        if(properties.precision == undefined)
          properties.precision = parseFloat(mainDiv.getAttribute('data-precision')) || 1;

        canvas.mainTitle = properties.title;
        canvas.showLegend = properties.showLegend;
        canvas.fontSize = properties.fontSize;
        canvas.precision = properties.precision;
		xAxisTitle.text = properties.xAxisTitle;
		yAxisTitle.text = properties.yAxisTitle;
		
        if(redraw)
          canvas.draw();
      } catch (e) {
        printError(e, "histogram.js");
      }
    };

    //Called from dragresize.js
    mainDiv.onResize = function onResize() {
	  xAxisTitle.invalidate();
	  yAxisTitle.invalidate();
      canvas.draw();
    }

    canvas.draw();
    window.addEventListener("resize", mainDiv.onResize, false);

  } catch (e) {
    printError(e, "histogram.js");
  }
}

function DiscreteXGrid(ctx, count, items, graphLeft, graphWidth, fontSize, bottomCtx) {
  // make a public graphLeft member, so the owner can do repeated draws on different locations
  //bottomCtx allows us to draw the numbers on a separate canvas giving us scrolling abilites
  if(bottomCtx == undefined || bottomCtx == ctx) {
    bottomCtx = ctx;
    this.adjustY = false;
  } else {
    this.adjustY = true;
  }
  this.bottomCtx = bottomCtx;
  this.graphLeft = graphLeft;
  this.ctx = ctx;
  var range = count - 1;
  this.height = (fontSize || 11) + 2;
  if(range <= 0 || graphWidth <= 3) {
    this.draw = function() {};
    return this;
  }
  var onePrecisionWidth = ctx.measureText("0").width;

  var maxTickValWidth = 0;
  for(var i = 0; i < items.length; i++) {
    var width = ctx.measureText(items[i]).width;
    if(width > maxTickValWidth) {
      maxTickValWidth = width;
    }
  }
  this.maxTickValWidth = maxTickValWidth;

  var tickAtts = calculateGridTickInterval(maxTickValWidth + 2 * onePrecisionWidth + 15, graphWidth, range);
  var tickInterval = tickAtts.tickInterval;
  var precision = tickAtts.precision;
  if(tickAtts.tickWidth < maxTickValWidth + precision * onePrecisionWidth + 15) {
    // if the resolved tick width is less than the space needed to draw 
    // the text based on the resolved precision, then I need to recalculate
    tickAtts = calculateGridTickInterval(maxTickValWidth + precision * onePrecisionWidth + 15, graphWidth, range);
    tickInterval = tickAtts.tickInterval;
  }

  this.draw = function xGridDraw(y, axisHeight) {
    try {
      var graphRight = this.graphLeft + graphWidth;

      // Draw the axis
      this.ctx.strokeRect(this.graphLeft, y, 0.1, axisHeight);

      // Check if we can fit all the labels
      var step = Math.ceil(items.length * maxTickValWidth / graphWidth);
      for(var i = 0; i < count; i++) {
        var x = Math.floor(this.graphLeft + graphWidth * (i + 0.5) / count);
        this.ctx.strokeRect(x, y + axisHeight, 0.1, 8);

        var valStr = items[i];
        var width = this.bottomCtx.measureText(valStr).width;
        var halfWidth = 0.5 * width;
        if(i % step == 0) { // was: (x - halfWidth > this.graphLeft && x + halfWidth < graphRight )
          this.bottomCtx.fillText(valStr, x - halfWidth, y + axisHeight + this.height);
        }
      }
    } catch (e) {
      printError(e);
    }
  };
  return this;
}
