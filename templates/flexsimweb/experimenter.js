
function initializeExperimentStatus(divTag){
	try{
	var mainDiv = divTag;
	var className = mainDiv.getAttribute('class');
	if(className && className.indexOf('fullscreen', 0) >= 0){
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
	fireFlexsimEvent("loaded"); // this is to prevent a chicken/egg situation in the Flexsim widget
	
	mainDiv.draw = function draw(){
	try{
		var stateName;
		var graphDiv = canvas.parentNode;
		canvasHeader.width = mainDiv.offsetWidth;
		headerCtx.clearRect(0,0, canvasHeader.width, canvasHeader.height);
		// draw canvas title
		if(!canvas.mainTitle && mainDiv.getAttribute("name"))
			canvas.mainTitle = mainDiv.getAttribute("name");
		if(canvas.mainTitle){
			headerCtx.font = "bold 11pt Tahoma";
			var titleWidth = headerCtx.measureText(canvas.mainTitle ).width;
			headerCtx.fillText(canvas.mainTitle, (canvasHeader.width - titleWidth) / 2, 18);
		}
		if(!canvas.bundle)
			return 0;

		var numScenarios = canvas.bundle.nrEntries;
		var numReplications = canvas.bundle.nrFields-1;
		var maxNameWidth = 0;

		for(var i = 1; i <= numScenarios; i++)
		{
			stateName = canvas.bundle.getValue(i-1,0);
			var width = ctx.measureText(stateName).width;
			if(width > maxNameWidth) maxNameWidth = width;
		}

		var marginSize = 20;
		var leftMargin = maxNameWidth + 1.5*marginSize;
		var barsy = 15;
		var yinterval = 25;

		var className = mainDiv.getAttribute('class');
		if(className && className.indexOf('fullscreen', 0) >= 0){
			if(graphDiv.offsetHeight != mainDiv.offsetHeight - canvasHeader.height - 2)
				graphDiv.style.height = (mainDiv.offsetHeight - canvasHeader.height - 2) + 'px';
			
		}
		
		if (graphDiv.offsetWidth == 0)
			canvas.width = "100%";
		else
			canvas.width = graphDiv.offsetWidth - marginSize;
		canvas.height = numScenarios*yinterval;
		ctx.clearRect(0,0, canvas.width, canvas.height);

		var viewportsx = canvas.width - leftMargin - 2;
		
		if(viewportsx <= 1) return 0;
	
		var repSizeX = viewportsx / numReplications;
		var stride = 1;
		if(repSizeX < 5)
			stride = Math.ceil(5 / repSizeX);

		for(var s = 1; s <= numScenarios; s++)
		{
			var cury = yinterval*(s-1);
			var greenFillStyle = getIndexedColor(2, [60,90], [20,60], 1, ctx.createLinearGradient(0, cury, 0, cury+barsy));
			var redFillStyle = getIndexedColor(1, [60,90], [50,60], 1, ctx.createLinearGradient(0, cury, 0, cury+barsy));
			// draw scenario names
			ctx.fillStyle = "#000000";
			stateName = canvas.bundle.getValue(s-1,0);
			ctx.fillText(stateName, marginSize, cury + barsy*0.75);
			ctx.fillStyle = greenFillStyle;
			var onGreen = true;
			for(var r = 0; r < numReplications; r+=stride)
			{
				var curx = pixelRound(leftMargin + viewportsx*(r+stride)/numReplications);
				var prevx = pixelRound(leftMargin + viewportsx*r/numReplications);
				var sizex =  curx-prevx;

				var percentinto = canvas.bundle.getValue(s-1, r + 1);
				if(stride == 1) {
					if(percentinto > 1) percentinto = 1;
					if(percentinto < 0) percentinto = 0;
					var fringex = percentinto*sizex;
					// draw green box
					if(percentinto > 0)
					{
						if(!onGreen) {
							ctx.fillStyle = greenFillStyle;
							onGreen = true;
						}
						ctx.fillRect(prevx+0.5,cury,fringex,barsy);
					}
					// draw red box
					if(percentinto < 1)
					{
						if(onGreen) {
							ctx.fillStyle = redFillStyle;
							onGreen = false;
						}
						ctx.fillRect(prevx+0.5+fringex,cury,sizex-fringex,barsy);
					}
					// draw black outline
					ctx.strokeRect(prevx+1,cury,sizex,barsy);
				}
				else { // fast draw
					if((percentinto >= 1) != onGreen) {
						onGreen = !onGreen;
						ctx.fillStyle = onGreen ? greenFillStyle : redFillStyle;
					}
					ctx.fillRect(prevx,cury,sizex,barsy);
				}
			}
		}


		return 0;

	}catch(e){print('exception caught in mainDiv.draw() '); printError(e);}
	};

	mainDiv.initializeData = function(bundleHeader){
		try{
			canvas.bundle = Bundle.interpretHeader(bundleHeader);
			this.draw();
		}catch(e){print('exception caught in canvas.initializeData() '); printError(e);}
	};

	mainDiv.updateData = function(bundleData){
		try{
			canvas.bundle = Bundle.interpretData(bundleData, canvas.bundle);
			this.draw();
		}catch(e){print('exception caught in canvas.updateData() '); printError(e);}
	};
	
	mainDiv.setProperties = function(title, redraw){
		try{
			canvas.mainTitle = title;
			if(redraw)
				this.draw();
		}catch(e){print('exception caught in canvas.setProperties() '); printError(e);}
	};
	
	
	mainDiv.draw();
	window.addEventListener("resize", function(){mainDiv.draw();}, false);

	}catch(e){
		print('exception caught in initializeBarChart() '); printError(e);
	}
}

function onDocLoadedExp() {
	var expStatus = document.getElementById('experimentStatus');
	if(expStatus)
		initializeExperimentStatus(expStatus);
}

if(document.addEventListener)
	document.addEventListener('DOMContentLoaded', onDocLoadedExp, false);
else if(document.attachEvent)
	document.attachEvent('onDOMContentLoaded',onDocLoadedExp);