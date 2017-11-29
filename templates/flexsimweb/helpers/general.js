var


	//========== EXECUTE ARBITRARY JAVASCRIPT ==========//
	//executeJS() calls eval() on any string sent to it to execute as javascript - allows arbitrary JS that wasn't planned for
	executeJS = function(code) { $.globalEval(code); },


	//========== GENERATE RANDOM STRING ==========//
	randomString	= function(string_length, chars) {
		//check the input params. Set defaults if necessary
		if (arguments.length<1 || jQuery.type(string_length)!=="number" || !string_length) string_length = 32;
		if (arguments.length<2 || jQuery.type(chars)!=="string" || !chars.length) chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ01234567890_-";
		//set up our output variable and start to fill it
		var result = "";
		for(var i=0; i<string_length; i++){
			var randomPos = Math.floor( Math.random() * chars.length );
			result += chars.substr(randomPos, 1);
		}
		return result;
	},
	
	
	//========== SEND AJAX CALL ==========//
	//executeAjax() sends an AJAX request. There must be an ajaxOptions object passed in that
	// at least includes a 'url' property, plus any other user specified properties that they
	// wish to use with jQuery's $.ajax().
	//An optional id parameter can be passed in and is used on success to set an id on a
	// generated div element. If no id is set, a random id is generated. The id is returned.
	executeAjax = function(ajaxOptions, id) {
		//if there were no ajaxOptions, then there is no url, so there can be no ajax
		if (arguments.length<1) return false;
		//handle various forms for the input parameters
		switch (jQuery.type(ajaxOptions)) {
			case "object":		break;
			case "string":		ajaxOptions = $.parseJSON(ajaxOptions);break;
			default:			return false;//ajaxOptions = {};	//no url means we have to bail anyway
		}
		//at this point, if ajaxOptions is not an object, or does not have the required parameters, we can bail
		if (jQuery.type(ajaxOptions)!=="object" || !ajaxOptions.hasOwnProperty('url') || ajaxOptions.url.length<8)
			return false;
		//if a new div is added to the DOM, it will have the returned id. The div is only added on
		// success, but it is returned every time. And since we're asynchronous, it can be returned
		// before its even created ;). In the default success handler we add a "dynamicContent" class
		// also, for kicks. Have fun!
		if (arguments.length<2 || jQuery.type(id)!=="string" || !id.length) id = randomString(16);
		
		$.ajax($.extend({//url:path,data:postdata,
			crossDomain: true,//http://stackoverflow.com/questions/298745/how-do-i-send-a-cross-domain-post-request-via-javascript
			type: "POST",
			success: function(data, status, obj) {
				if (data.length) {
					var div = document.createElement("div");
					div.setAttribute("id", id);
					div.setAttribute("class", "dynamicContent");
					document.body.appendChild(div);
					$(div).html(data);
				}
			}
			//,error: function(obj, err, exception) {alert('error');}//err=("null, "timeout", "error", "abort", and "parsererror"), exception=(textual portion of the HTTP status, such as "Not Found" or "Internal Server Error.")
			//,complete: function(obj, status) {alert('complete');}//status=("success", "notmodified", "error", "timeout", "abort", or "parsererror")
		}, ajaxOptions));
		
		return id;
	},


	//========== VERTICALLY CENTER AN ELEMENT DYNAMICALLY ==========//
	//vertically center an element inside its parent
	verticalCenterElement_intervalID = 0,
	verticalCenterElement = function(elm) {
		var parent = elm.parent(),
			parentH = parent.height(),
			elmH = elm.height(),
			elmTop = 0.5*(parentH-elmH);
		elm.css({top:elmTop});

		//if there was a duration time (ms) passed in, we need to keep centering until that time has passed
		if (arguments.length > 1 && arguments[1]) {
			var framesPerSecond = 15,
				timeBetweenFrames = 1000 / framesPerSecond,
				duration = arguments[1];

			//if duration == -1, this is our interval kill switch
			if (duration == -1)
				return clearInterval(verticalCenterElement_intervalID);

			//if our duration is quite short, just update after the duration
			else if (duration < timeBetweenFrames)
				return setTimeout(function(){verticalCenterElement(elm);}, duration);
			
			//else set up an interval to animate the centering and send the timeout that will kill the interval
			verticalCenterElement_intervalID = setInterval(function(){verticalCenterElement(elm);}, timeBetweenFrames);
			setTimeout(function(){verticalCenterElement(elm, -1);}, duration);
		}
	},


	//========== ALTER ALL ANCHOR LINKS TO CALL FLEXSIM EVENTS ==========//
	//attach the click handler to all the anchors
	flexsimLinkClick = function(i, el) {
		jQuery(el).on("click", function(e){
			//using try/catch error handling allows us to weed out hrefs that aren't json, or invalid json
			try {
				//if we can get a json object from the href, use that to call fireFlexsimEvent
				json = $.parseJSON(el.getAttribute("href"));
				//if the href had valid json, prevent the link from really being a link
				e.preventDefault();
				//are there any parameters that need to be passed to FlexSim?
				if (json.hasOwnProperty("params") && json.params.length) {
					//return various versions of fireFlexsimEvent, each passing a different number of params?
					switch (json.params.length) {
						case 1:		return fireFlexsimEvent(json.func, json.params[0]);
						case 2:		return fireFlexsimEvent(json.func, json.params[0], json.params[1]);
						case 3:		return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2]);
						case 4:		return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3]);
						case 5:		return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4]);
						case 6:		return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5]);
						case 7:		return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6]);
						case 8:		return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7]);
						case 9:		return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8]);
						case 10:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9]);
						case 11:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10]);
						case 12:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11]);
						case 13:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12]);
						case 14:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12], json.params[13]);
						case 15:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12], json.params[13], json.params[14]);
						case 16:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12], json.params[13], json.params[14], json.params[15]);
						case 17:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12], json.params[13], json.params[14], json.params[15], json.params[16]);
						case 18:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12], json.params[13], json.params[14], json.params[15], json.params[16], json.params[17]);
						case 19:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12], json.params[13], json.params[14], json.params[15], json.params[16], json.params[17], json.params[18]);
						case 20:	return fireFlexsimEvent(json.func, json.params[0], json.params[1], json.params[2], json.params[3], json.params[4], json.params[5], json.params[6], json.params[7], json.params[8], json.params[9],
										json.params[10], json.params[11], json.params[12], json.params[13], json.params[14], json.params[15], json.params[16], json.params[17], json.params[18], json.params[19]);
					}
				}
				return fireFlexsimEvent(json.func);
			}
			catch (e2) { /*alert("couldn't parse json. might be a valid href path:\n\n"+el.getAttribute("href"));*/ }
		});
	},
	

	//========== ITERATE THROUGH BANNER PROMPTS ==========//
	//bannerInner just finished. What's next?
	activeBanner = -1,
	nextBannerPrompt = function() {
		//first case = there was no previous banner. Find the first banner:
		if (activeBanner<0) {
			for (var i=0; i<bannerPrompts.length; i++) {
				if (bannerPrompts[i].active===1) {
					$('#banner-container').fadeIn();
					activeBanner = i;
					$('#'+bannerPrompts[i].name+'-inner').css({display:'block'});
					verticalCenterElement($('#banner'));
					return 1;
				}
			}
			//if we get here, then none of the banners are active
			return 0;
		}

		//Else there was a previous bannerInner that we're going to close up shop for.
		// Search the bannerPrompts array for name:bannerInner. Then find the next active
		// banner and rotate to that new one. If there is none, then we'll fade out the
		// banner container.
		for (var i=activeBanner+1; i<bannerPrompts.length; i++) {
			//is this our next banner prompt?
			if (bannerPrompts[i].active===1) {
				//hide the old active
				$('#'+bannerPrompts[activeBanner].name+'-inner').slideUp();
				//set the new active and show it
				activeBanner = i;
				$('#'+bannerPrompts[i].name+'-inner').slideDown();
				verticalCenterElement($('#banner'), 400);
				//now bust out of here
				return 1;
			}
		}
		//if we get this far then there was no next banner content. kill the banner
		$('#'+bannerPrompts[activeBanner].name+'-inner').slideUp();
		$('#banner-spinner').slideDown();
		verticalCenterElement($('#banner'), 400);
		$('#banner-container').fadeOut();
		activeBanner = -1;
		return 0;
	},
	

	//========== GENERATE THE GRID BACKGROUND ==========//
	//add some flare to the main div
	animateBackgroundBlocks = function(animateOptions, svgCSS) {
		var variables = {
				container			: $('#main'),
				squareSize			: 20,
				marginSize			: 3,
				squaresHighPercent	: 0.35,
				squaresWidePercent	: 1.00,
				maxOpacity			: 0.18,
				cascade				: "vertical",
				color				: "#FFFFFF"
			},
			defaultCSS = {
				position	: "absolute",
				top			: 0,
				left		: 0,
				width		: "100%",
				height		: "100%",
				"z-index"	: 0
			},
			svgns = "http://www.w3.org/2000/svg",
			gradientBlocks_bg,squaresWide,squaresHigh,opacityStep,
			x,y,rect,animationOut,opacityFactor,exponentialDuration;

		//add/overwrite the passed in options to the default variables
		$.extend(variables, animateOptions);
		$.extend(defaultCSS, svgCSS);

		//add the svg element to the beginning of the container object
		variables.container.prepend('<svg id="gradientBlocks_bg" xmlns="'+svgns+'"></svg>');
		gradientBlocks_bg = $('#gradientBlocks_bg').css(defaultCSS).get(0);
		
		//calculate some dynamic variables
		squaresWide	= Math.ceil(variables.squaresWidePercent * variables.container.width() / variables.squareSize);
		squaresHigh	= Math.ceil(variables.squaresHighPercent * variables.container.height() / variables.squareSize);
		opacityStep = variables.maxOpacity / squaresHigh;

		//loop through each column
		for (x=0; x<squaresWide; x++) {
			//loop through each row
			for (y=0; y<squaresHigh; y++) {
				opacityFactor = opacityStep*(squaresHigh-y);
				rect = document.createElementNS(svgns, 'rect');
				rect.setAttributeNS(null, 'x', variables.marginSize+((variables.marginSize+variables.squareSize)*x));
				rect.setAttributeNS(null, 'y', variables.marginSize+((variables.marginSize+variables.squareSize)*y));
				rect.setAttributeNS(null, 'height', variables.squareSize);
				rect.setAttributeNS(null, 'width', variables.squareSize);
				rect.setAttributeNS(null, 'opacity', 0);//try starting at 1, 0, or Math.random()*opacityFactor
				rect.setAttributeNS(null, 'fill', variables.color);
				
				//set the fadeIn variables
				exponentialDuration = parseInt(Math.max(50, 1000*(Math.min(1.2, Math.log(1-Math.random())/(-3)))));//between 50 and 1200ms fadeout, exponentially distributed, sort of...
				//create the fadeOut animation
				animationOut = document.createElementNS(svgns, 'animate');
				animationOut.setAttributeNS(null, 'attributeType', 'CSS');
				animationOut.setAttributeNS(null, 'attributeName', 'opacity');
				animationOut.setAttributeNS(null, 'from', 1);
				animationOut.setAttributeNS(null, 'to', Math.random()*opacityFactor);
				animationOut.setAttributeNS(null, 'dur', exponentialDuration+'ms');
				if (variables.cascade=="horizontal")
					animationOut.setAttributeNS(null, 'begin', (20/squaresWide)*x*x*(0.4+0.6*Math.random())+'ms');//(0.4*((x+1)*y)+(y+1))+'ms');
				else
					animationOut.setAttributeNS(null, 'begin', (100/squaresHigh)*y*y*(0.4+0.6*Math.random())+'ms');//(0.4*((x+1)*y)+(y+1))+'ms');
				animationOut.setAttributeNS(null, 'fill', 'freeze');
				// link the animation to the target
				rect.appendChild(animationOut);

				//link this new rectangle to the svg element
				gradientBlocks_bg.appendChild(rect);
			}
		}
	},
	

	//========== PROCESS REGISTRATION DATA AND SEND TO FLEXSIM (FLEXSCRIPT) ==========//
	registration = function(responseVal) {
		//when we actually have a registration banner and all the working, behind the
		// scenes functionality, this function will be overwritten dynamically. Then
		// eventually that dynamic content will be hard coded directly into this
		// function definition in future releases of FlexSim.
		nextBannerPrompt();
	};