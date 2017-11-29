var leftClicked        = 0;//for keeping track of which buttons are down
var rightClicked       = 0;
var doubleClicked      = 0;
var lastMoveX          = 0;//for keeping track of mouse motion
var lastMoveY          = 0;
var movedSinceReload   = 0;
var lastLeftClickTime  = 0;//for checking double clickserverinterface
var touchPan           = 1;//for touch events on smartphones
var touchRotate        = 0;
var touchZoom          = 0;
var running            = 0;
var optimize           = 0;
var updatingRunSpeed   = 0;
var mouseUpdateReturned= 1;
var lastMoveTime       = 0;
var communication      = {};

function scenarioBlur()
{
	var scenarioVarTable = document.getElementById("scenarioVarTable");
	var numScenarioVars = scenarioVarTable.getElementsByTagName("tr").length - 1;
	var tds = scenarioVarTable.getElementsByTagName("td");
	var oldNumScenarios = (tds.length)/(numScenarioVars + 1) - 1;
	var newNumScenarios = document.getElementById("numScenarios").value;
	
	var oldVarNames = new Array();
	var oldScenarioVars = new Array();
	for (var i = oldNumScenarios + 1; i < tds.length; i++) {
		if (i % (oldNumScenarios + 1) == 0)
			oldVarNames.push(tds[i].innerHTML);
		else
			oldScenarioVars.push(tds[i].getElementsByTagName("input")[0].value);
	}
	
	//header
	var newHtml = '<table id="scenarioVarTable"><tr><td></td>';
	
	for (var i = 1; i <= newNumScenarios; i++)
		newHtml += "<td>Scenario " + i + "</td>";
	newHtml += "</tr>";
	
	//input table
	var oldScenarioVarsIndex = 0;
	for (var i = 1; i <= numScenarioVars; i++) {
		newHtml += '<tr><td id="scenarioVarName_' + i + '">' + oldVarNames[i - 1] + '</td>';
		for (var j = 1; j <= newNumScenarios; j++) {
			newHtml += '<td><input type="text" class=\"expParameterInput\" name="scenarioVar_' + i + '_' + j + '" value="';
			if (j <= oldNumScenarios) {
				newHtml += oldScenarioVars[oldScenarioVarsIndex];
				oldScenarioVarsIndex++;
			}
			newHtml += '"/></td>';
		}
		if (oldNumScenarios > newNumScenarios)
			oldScenarioVarsIndex += (oldNumScenarios - newNumScenarios);
		newHtml += "</tr>";
	}
	
	newHtml += "</table>";
			
	document.getElementById("scenarioVarForm").innerHTML = newHtml;
}

function viewResultsPressed(type)
{
	if (type == "pfm") {
		window.open(baseQuery + "&getExperimentResults&time=" + (new Date()).getTime(), "_blank");
	} else if (type == "optSelected") {
		$.ajax(baseQuery + "&optimizerScenarios&time=" + (new Date()).getTime(), "_blank").done(function() {
			window.location.hash = 'experimenter';
			location.reload();
		});
	} else {
		window.open(baseQuery + "&getExperimentResults&" + type + "=1&time=" + (new Date()).getTime(), "_blank");
	}
}

function goBack()
{
	var href = window.location.href.split("webserver.dll")[0];
	window.location.href = href;
}

function navigateToSection(sectionName)
{
	var sections = document.getElementById('page-sections');
	var showSection = document.getElementById('section-' + sectionName);
	for (var i = 0; i < sections.childNodes.length; i++) {
		var childNode = sections.childNodes[i];
		if(childNode.nodeType == 1) {
			if(childNode  != showSection)
				childNode.style.display = 'none';
		}
	}
	for (var i = 0; i < sections.childNodes.length; i++) {
		var childNode = sections.childNodes[i];
		if(childNode.nodeType == 1) {
			if(childNode == showSection) {
				childNode.style.display = 'block';
				var experimentStatus = document.getElementById('experimentStatus');
				experimentStatus["draw"].apply(experimentStatus);
				var optimizerStatus = $('#optimizerStatus');
				//var height = $(window).height() - optimizerStatus.children(0).children(0).offset().top;
				//optimizerStatus.height((height / $(window).height()) * 100 + '%');
				//optimizerStatus.parent().height('50vh');
				optimizerStatus.get(0)["arrange"].apply(optimizerStatus);
				optimizerStatus.get(0)["draw"].apply(optimizerStatus);
			}
		}
	}

	var links = document.getElementById('navigation-links');
	var showLink = document.getElementById('navigate-to-' + sectionName);
	for (var i = 0; i < links.childNodes.length; i++) {
		var childNode = links.childNodes[i];
		if(childNode.nodeType == 1) {
			if(childNode  == showLink)
				childNode.setAttribute('class', 'focused-section');
			else childNode.setAttribute('class', 'blurred-section');
		}
	}
}

function updateExperimentProgress()
{
	var experimentStatus = $('#experimentStatus');
	if(experimentStatus.length > 0)
	{
		//request all stats
		$.ajax(baseQuery + "&updateExperimentStatus&time=" + (new Date()).getTime()).done(function(data) {
			//when the request comes back, process the webscriptcommands (which are in json format)
			if (data) {
				for(var i = 0; i < data.length; i++) {
					var divwithid = document.getElementById(data[i].id);
					divwithid[data[i].name].apply(divwithid, data[i].parameters);
				}
				
				var finished = 1;
				if (data.length > 0 && data[data.length - 1].parameters.length == 1) {
					var scenarios = data[data.length - 1].parameters[0];
					if (scenarios && scenarios[0]) {
						for (var scenarioNum = 0; scenarioNum < scenarios.length; scenarioNum++) {
							for (var replication = 1; replication < scenarios[scenarioNum].length; replication++) { //First index is scenario name
								if (scenarios[scenarioNum][replication] < 1.0) {
									finished = 0;
									break;
								}
							}
						}
					}
				}
				if(finished) {
					$('.expResult').prop('disabled', false);
					$('.expParameterInput').prop('disabled', false);
					$('#runExperiment').prop('disabled', false);
				} else
					setTimeout("updateExperimentProgress()", 10);
			}
			else
				setTimeout("updateExperimentProgress()", 10);
		}).fail(function() { setTimeout("updateExperimentProgress()", 10); });
	}
}

function runExperimentPressed()
{
	var scenarioVarTable = document.getElementById("scenarioVarTable");
	var numScenarioVars = scenarioVarTable.getElementsByTagName("tr").length - 1;
	var numScenarios = (scenarioVarTable.getElementsByTagName("td").length) / (numScenarioVars + 1) - 1;
	var numReplications = document.getElementById("numReplications").value;
	var warmupTime = document.getElementById("warmupTime").value;
	var runTime = document.getElementById("runTime").value;
	var saveDashboard = document.getElementById("expSaveDashboard").value == "on";
	var restoreState = document.getElementById("expRestoreState").value == "on";
	var newAction = baseQuery +
				  "&numScenarios=" +  numScenarios +
				  "&numreplications=" + numReplications +
				  "&warmuptime=" + warmupTime +
				  "&runtotime=" + runTime +
				  "&savedashboard=" + saveDashboard +
				  "&restorestate=" + restoreState +
				  "&time=" + (new Date()).getTime();
	var body = "";
	var inputNum = 0;
	var inputs = scenarioVarTable.getElementsByTagName("input");
	for (var scenarioVar = 1; scenarioVar <= numScenarioVars; scenarioVar++) {
		for (var scenario = 1; scenario <= numScenarios; scenario++) {
			if (body != "")
				body = body + "&";
			body = body + "scenariovar_" + scenarioVar + "_" + scenario + "=" + encodeURIComponent(inputs[inputNum].value);
			inputNum++;
		}
	}
	$('.expResult').prop('disabled', true);
	$('.expParameterInput').prop('disabled', true);
	$('#runExperiment').prop('disabled', true);
	$.post(newAction, body);
	updateExperimentProgress();
}

function changeGraphSettings()
{
	var settings = baseQuery + 
		"&graphSettings" +
		"&bestSolutions=" + $('#optBestSolutions').prop('checked') +
		"&showLegend=" + $('#optLegend').prop('checked') +
		"&yAxis=" + $('#yAxis').val() +
		"&xAxis=" + $('#xAxis').val() +
		"&colorIndex=" + $('#optColor').val() +
		"&size=" + $('#optSize').val() +
		"&time=" + (new Date()).getTime();
	$.ajax(settings).done(function() {
		updateOptimizerProgress();
	});
}

function optimizePressed() 
{
	optimize = 1;
	var optVariableTable = document.getElementById("optVariableTable");
	var maxSolutions = document.getElementById("maxSolutions").value;
	var maxTime = document.getElementById("maxTime").value;
	if (document.getElementById("minReps")) {
		var minReplications = document.getElementById("minReps").value;
		var maxReplications = document.getElementById("maxReps").value;
	}
	var warmupTime = document.getElementById("warmupTime").value;
	var runTime = document.getElementById("runTime").value;
	var saveDashboard = document.getElementById("optSaveDashboard").value == "on";
	var restoreState = document.getElementById("optRestoreState").value == "on";
	
	// One less row - header doesn't count
	var numOptVars = optVariableTable.getElementsByTagName("tr").length - 1;
	
	var newAction = baseQuery + 
		"&maxSolutions=" + maxSolutions +
		"&maxTime=" + maxTime +
		"&minReplications=" + (minReplications ? minReplications : 1) +
		"&maxReplications=" + (maxReplications ? maxReplications : 1) +
		"&warmuptime=" + warmupTime +
		"&runtotime=" + runTime +
		"&savedashboard=" + saveDashboard +
		"&restorestate=" + restoreState +
		"&time=" + (new Date()).getTime();
	
	var body = "";
	var inputNum = 0;
	var inputs = optVariableTable.getElementsByTagName("input");
	
	for (var i = 0; i < inputs.length; i += 5) {
		if (body != "")
			body += "&";
		
		body += "lower_bound_" + (i + 1) + "=" + encodeURIComponent(inputs[i + 1].value);
		body += "&upper_bound_" + (i + 1) + "=" + encodeURIComponent(inputs[i + 2].value);
		body += "&step_" + (i + 1) + "=" + encodeURIComponent(inputs[i + 3].value);
		body += "&group_" + (i + 1) + "=" + encodeURIComponent(inputs[i + 4].value);
	}
	
	$('#optimize').prop('disabled', true);
	$('.optResult').prop('disabled', true);
	$('.optParameterInput').prop('disabled', true);
	$.post(newAction, body);
	updateOptimizerProgress();
}

function updateOptimizerProgress()
{
	$.ajax(baseQuery + "&updateOptimizerStatus&time=" + (new Date()).getTime()).done(function(data) {
		//when the request comes back, process the webscriptcommands (which are in json format)
		if (data) {
			for (var i = 0; i < data.length; i++) {
				var divwithid = document.getElementById(data[i].id);
				divwithid[data[i].name].apply(divwithid, data[i].parameters);
			}
			
			for (var i = 0; i < data.length; i++) {
				if (data[i].name == "setFinished") {
					var optFinished = data[i].parameters[0];
					if(optFinished) {
						optimize = 0;
						$('#optimize').prop('disabled', false);
						$('.optResult').prop('disabled', false);
						$('.optParameterInput').prop('disabled', false);
					} else {
						setTimeout("updateOptimizerProgress()", 10);
					}
					break;
				}
			}
		}
		else
			setTimeout("updateOptimizerProgress()", 10);
	}).fail(function() { setTimeout("updateOptimizerProgress()", 10); });
}

function mouseX(event, object)
{
	//collect the offset of containing objects (div's, tables, etc.)
	var offsetX = 0;
	while (object) {
		offsetX += object.offsetLeft;
		object = object.offsetParent;
	}
	try {
		if(event.touches) {
			//use the touch with the lowest pageY (for pinch zooming)
			if(event.touches.length > 0 && event.touches[1] && event.touches[1].pageY < event.touches[0].pageY)
				return event.touches[1].pageX - offsetX;
			else
				return event.touches[0].pageX - offsetX;
		} else if(event.pageX)
			return event.pageX - offsetX;
		else
			return event.clientX +(document.documentElement.scrollLeft ? document.documentElement.scrollLeft : document.body.scrollLeft) - offsetX;
	} catch(error) {
		return lastMoveX;
	}
}

function mouseY(event, object)
{
	//collect the offset of containing objects (div's, tables, etc.)
	var offsetY = 0;
	while (object) {
		offsetY += object.offsetTop;
		object = object.offsetParent;
	}
	try {
		if(event.touches) {
			//use the touch with the lowest pageY (for pinch zooming)
			if (event.touches.length > 0 && event.touches[1] && event.touches[1].pageY < event.touches[0].pageY)
				return event.touches[1].pageY - offsetY;
			else
				return event.touches[0].pageY - offsetY;
		} else if (event.pageY)
			return event.pageY - offsetY;
		else
			return event.clientY + (document.documentElement.scrollTop ? document.documentElement.scrollTop : document.body.scrollTop) - offsetY;
	} catch(error) {
		return lastMoveY;
	}
}

function changeScreenshotSrc(index)
{
	var newSrc = baseQuery + "&screenshot=" + index + "&old";
	if(movedSinceReload)
		newSrc += "&movex=" + lastMoveX + "&movey=" + lastMoveY;

	//(chrome updates without the timestamp and leaks memory with it)
	if (!(/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)))
	{
		newSrc += "&time=" + (new Date()).getTime();
	}
	var screenshot = $('#screenshot_' + index).children()[0];
	
	//change src if it's not collapsed, savedsrc otherwise
	if (!screenshot.savedsrc || screenshot.savedsrc == "")
		screenshot.src = newSrc;
	else
		screenshot.savedsrc = newSrc;

	movedSinceReload = 0;
}

function doubleClick(event, index)
{
	var thisX = mouseX(event,document.getElementById("screenshot_"+index));
	var thisY = mouseY(event,document.getElementById("screenshot_"+index));
	var width = document.getElementById("screenshot_" + index).offsetWidth;
	var height = document.getElementById("screenshot_" + index).offsetHeight;

	// Avoid mousedown when resizing views
	if(thisX > 4 && thisY > 4 && width - thisX > 4 && height - thisY > 4) {
		communication.doubleClick(index, thisX, thisY);
		leftClicked = 0;
		rightClicked = 0;
		doubleClicked = 1;
	}
}

function leftMouseDown(event, index)
{
	var time = new Date().getTime();
	if (rightClicked || time - lastLeftClickTime < 500) {
		doubleClick(event, index);
		lastLeftClickTime = 0;
	} else {
		var thisX = mouseX(event, document.getElementById("screenshot_" + index));
		var thisY = mouseY(event, document.getElementById("screenshot_" + index));
		var width = document.getElementById("screenshot_" + index).offsetWidth;
		var height = document.getElementById("screenshot_" + index).offsetHeight;

		// Avoid mousedown when resizing views
		if(thisX > 4 && thisY > 4 && width - thisX > 4 && height - thisY > 4) {
			communication.leftMouseDown(index, thisX, thisY);
			leftClicked = 1;
			lastLeftClickTime = time;
		}
	}
}

function rightMouseDown(event, index)
{
	if(leftClicked)
		doubleClick(event, index);
	else {
		var thisX = mouseX(event, document.getElementById("screenshot_" + index));
		var thisY = mouseY(event, document.getElementById("screenshot_" + index));
		var width = document.getElementById("screenshot_" + index).offsetWidth;
		var height = document.getElementById("screenshot_" + index).offsetHeight;

		// Avoid mousedown when resizing views
		if(thisX > 4 && thisY > 4 && width - thisX > 4 && height - thisY > 4) {
			communication.rightMouseDown(index, thisX, thisY);
			rightClicked = 1;
		}
	}
}

function mouseDown(event, index)
{
	if (event.button == 2)
		rightMouseDown(event, index);
	else
		leftMouseDown(event, index);
}

function mouseUp(event, index)
{
	var thisX = mouseX(event, document.getElementById("screenshot_" + index));
	var thisY = mouseY(event, document.getElementById("screenshot_" + index));
	communication.mouseUp(index, thisX, thisY);
	leftClicked   = 0;
	rightClicked  = 0;
	doubleClicked = 0;
}

function mouseMove(event, index)
{
	var newMoveX = mouseX(event, document.getElementById("screenshot_" + index));
	var newMoveY = mouseY(event, document.getElementById("screenshot_" + index));
	movedSinceReload = 1;
	if(newMoveX != lastMoveX || newMoveY != lastMoveY) {
		lastMoveX = newMoveX;
		lastMoveY = newMoveY;

		var time = new Date().getTime();
		if((mouseUpdateReturned || time - lastMoveTime > 200) && (leftClicked || rightClicked || doubleClicked)) {
			lastMoveTime = time;
			mouseUpdateReturned = false;
			communication.mouseMove(index, lastMoveX, lastMoveY);
		}
	}
}

function onWheel(event, index)
{
	communication.mouseWheel(index, event.deltaX, event.deltaY, event.deltaZ, lastMoveX, lastMoveY);
}

function resetPressed(event)
{
	communication.reset();
}

function runPressed(event)
{
	communication.run();
}

function stopPressed(event)
{
	communication.stop();
}

function stepPressed(event)
{
	communication.step();
}

function compilePressed(event)
{
	communication.compile();
}

function updateStatGraphs()
{
	//request all stats
	var time = (new Date()).getTime();
	$.ajax(baseQuery + "&updateDashboardStats" + "&time=" + time).done(function(data) {
		//when the request comes back, process the webscriptcommands (which are in json format)
		if (data) {
			$('.fullscreen').width('100%').height('100%'); //Force the widgets to fill their views
			
			for(var i = 0; i < data.length; i++)
			{
				var divwithid = document.getElementById(data[i].id);
				divwithid[data[i].name].apply(divwithid, data[i].parameters);
			}
		
			$('.fullscreen').each(function(index, element) {
				if (typeof element.onResize != "undefined")
					element.onResize();
			});
		}
		
		//when all webscriptcommands have been processed, send another request
		setTimeout("updateStatGraphs();",10);
	}).fail(function() { setTimeout("updateStatGraphs();",10); });
}

function updateModelInputs()
{
	//request all stats
	$.ajax(baseQuery + "&updateDashboardInputs" + "&time=" + (new Date()).getTime()).done(function(data) {
		//when the request comes back, process the data (which is in json format)
		if (data) {
			data = $.parseJSON(data);
			for(var i = 0; i < data.length; i++)
			{
				var input = $('#' + data[i].id);
				var type = data[i].type;
				var value = data[i].value;
				if (type == "value") {
					input.val(value);
				} else if (type == "checked") {
					input.prop('checked', value == 1);
				} else if (type == "table") {
					
				}
			}
		}
		
		//when all data has been processed, send another request
		setTimeout("updateModelInputs();",10);
	}).fail(function() { setTimeout("updateModelInputs();",10); });
}

function updateRunTime()
{
	if (running) {
		var query = baseQuery + "&getRunTime";
		//(chrome updates without the timestamp and leaks memory with it)
		if (!(/Chrome[\/\s](\d+\.\d+)/.test(navigator.userAgent)))
			query += "&time=" + (new Date()).getTime();
		$.ajax(query).done(function(data) {
			var time = data.getElementsByTagName("time")[0].textContent;
			$('#runtime').val(time);
			setTimeout("updateRunTime();", 10);
		});
	}
}

function touchstart(event, index)
{
	if (touchPan)
		leftMouseDown(event, index);
	else if (touchRotate)
		rightMouseDown(event, index);
	else if (touchZoom)
		doubleClick(event, index);
	return false;
}

function touchMove(event, index)
{
	mouseMove(event, index);
	return false;
}

function touchEnd(event, index)
{
	mouseUp(event, index);
	return false;
}

function touchCancel(event, index)
{
	mouseUp(event, index);
	return false
}

function panPressed()
{
	touchPan = 1;
	touchRotate = 0;
	touchZoom = 0;
}

function rotatePressed()
{
	touchRotate = 1;
	touchPan = 0;
	touchZoom = 0;
}

function zoomPressed()
{
	touchZoom = 1;
	touchRotate = 0;
	touchPan = 0;
}

function resetView(index, type)
{
	communication.resetView(index, type);
}

function runSpeedPressed()
{
	var newRunSpeed = $('#runspeedinput').val();
	if (newRunSpeed == "Max")
		newRunSpeed = 2147483647;

	$('#speedslider').val(Math.log(newRunSpeed) * 10);
	communication.setRunSpeed(newRunSpeed);
}

function changeRunSpeed(newValue)
{
	var value = Math.exp(newValue / 10.0);
	if (value > 160000000)
		$('#runspeedinput').val('Max');
	else
		$('#runspeedinput').val(value.toFixed(2));
}

function changeStopTimeCheckBox(event)
{
	if (event.args.checked) {
		$('#window').jqxWindow('resizable', true);
	} else {
		$('#window').jqxWindow('resizable', false);
	}
}

function resizeViews()
{
	clearTimeout(window.resizeViewTimeout);
	window.resizeViewTimeout = setTimeout(function() {
		var height = $(window).height() - $('#dockingLayout').offset().top;
		$("#dockingLayout").jqxDockingLayout({ height: height });

		$('.screenshot').each(function(index, element) {
			var screenshot = $(element);
			var screenshotRank = screenshot.attr("id").split("_")[1];
			var width = screenshot.parent().width();
			var height = screenshot.parent().height();
			if(communication.resize)
				communication.resize(screenshotRank, width, height);
		});
	}, 100);
}

function embedRefreshButton(tableID)
{
	//In order to ensure the refresh button moves with the table's horizontal scroll bar, move it into the column headers div
	var columnTable = $('#columntable' + tableID);
	var refreshButton = $('#refresh' + tableID);
	if (refreshButton.parent() != columnTable) {
		refreshButton.detach().prependTo(columnTable);
		refreshButton.css('top', '-1px');
		refreshButton.css('left', '-1px');
	}
}

function initialize()
{
	//Something is overwriting the console
	console = consoleSave;

	function findLastNal(array, endIndex) {
		for(var i = array.length; i > endIndex; i--) {
			if(array[i-3] != 0)
				i -= 2;
			else if(array[i-2] != 0)
				i -= 1;
			else if(array[i-1] != 0)
				continue;
			else if(array[i] == 1)
				return i-3;
		}
		return -1;
	}

	function mergeTypedArrays(a, b) {
		var c = new a.constructor(a.length + b.length);
		c.set(a);
		c.set(b, a.length);
		return c;
	}
	
	// Setup the WebSocket connection and start the player
	if(window.player === undefined)
		window.player = [];
	if(window.socket === undefined) {
		window.socket = io('/' + instanceName + ':' + instanceNum, {
			path: '/webserver/socket.io', reconnection: true, 'reconnectionAttempts': 1, reconnectionDelay: 500
		});
		// Not using websockets
		socket.on('reconnect_failed', function () {
			console.log('websocket_failed');
			communication.doubleClick = function(i, x, y) {
				$.ajax(baseQuery + "&screenshot=" + i + "&doublex=" + x + "&doubley=" + y + "&time=" + (new Date()).getTime());
			};
			communication.leftMouseDown = function(i, x, y) {
				$.ajax(baseQuery + "&screenshot=" + i + "&leftx=" + x + "&lefty=" + y + "&time=" + (new Date()).getTime());
			};
			communication.rightMouseDown = function(i, x, y) {
				$.ajax(baseQuery + "&screenshot=" + i + "&rightx=" + x + "&righty=" + y + "&time=" + (new Date()).getTime());
			};
			communication.mouseUp = function(i, x, y) {
				$.ajax(baseQuery + "&screenshot=" + i + "&mouseupx=" + x + "&mouseupy=" + y + "&time=" + (new Date()).getTime());
			};
			communication.mouseMove = function(i, x, y) {};
			communication.mouseWheel = function(i, sx, sy, sz, x, y) {
				$.ajax(baseQuery + "&screenshot=" + i + "&scrollx=" + sx + "&scrolly=" + sy + "&scrollz=" + sz + "&mousex=" + x + "&mousey=" + y + "&time=" + (new Date()).getTime());
			};
			communication.reset = function() {
				$.ajax(baseQuery + "&reset" + "&time=" + (new Date()).getTime()).done(function() {
					running = 1;
					updateRunTime();
					running = 0;
				});
			};
			communication.run = function() {
				$.ajax(baseQuery + "&run" + "&time=" + (new Date()).getTime()).done(function() {
					running = 1;
					updateRunTime();
				});
			};
			communication.stop = function() {
				$.ajax(baseQuery + "&stop" + "&time=" + (new Date()).getTime()).done(function() {
					updateRunTime();
					running = 0;
				});
			};
			communication.step = function() {
				$.ajax(baseQuery + "&step" + "&time=" + (new Date()).getTime()).done(function() {
					var prevRunning = running;
					running = 1;
					updateRunTime();
					running = prevRunning;
				});
			};
			communication.compile = function() {
				$.ajax(baseQuery + "&compileModel" + "&time=" + (new Date()).getTime()).done(function() {
					alert("Compile Complete");
				});
			};
			communication.resetView = function(i, t) {
				$.ajax(baseQuery + "&resetView=" + i + "&type=" + t + "&time=" + (new Date()).getTime()).done(function() {
					changeScreenshotSrc(i);
				});
			};
			communication.setRunSpeed = function(rs) {
				$.ajax(baseQuery + "&setRunSpeed=" + rs);
			};
			communication.resize = function(i, w, h) {
				$.ajax(baseQuery + "&screenshot=" + i + "&resizex=" + w + "&resizey=" + h + "&time=" + (new Date()).getTime());
			};

			//Start run time update loop
			$.ajax(baseQuery + "&getRunState" + "&time=" + (new Date()).getTime()).done(function(data) {
				running = parseInt(data.getElementsByTagName("runstate")[0].textContent);
				updateRunTime();
			});

			for (var i = 0; i < viewIndices.length; i++) {
				var div = $('#screenshot_' + viewIndices[i]);
				div.empty();
				div.prepend('<img src="" onload="setTimeout(\'changeScreenshotSrc('+ viewIndices[i] + ')\');" />');
				changeScreenshotSrc(viewIndices[i]);
			}

			resizeViews();
		});
		// Using websockets
		socket.on('connect', function () {
			console.log("websocket_connected");
			for (var i = 0; i < viewIndices.length; i++) {
				if(!window.player[viewIndices[i]]){
					var div = $('#screenshot_' + viewIndices[i]);
					window.player[viewIndices[i]] = new Player({
						size: { width: div.parent().width(), height: div.parent().height() },
						useWorker: true,
						workerFile: 'flexsimweb/server/Decoder.js',
						reuseMemory: true
					});
					div.empty();
					div.append(window.player[viewIndices[i]].canvas);
				}
				(function () {
					var screenShotIndex = viewIndices[i];
					var buffer = new Uint8Array();
					socket.on('stream' + screenShotIndex, function(evt) {
						var data = new Uint8Array(evt);
						var endIndex = 3;
						if(buffer.length > 7)
							endIndex = buffer.length - 5;
						buffer = mergeTypedArrays(buffer, data);
						var pos = findLastNal(buffer, endIndex);
						if(pos != -1) {
							data = buffer.subarray(0, pos);
							buffer = buffer.subarray(pos);
							player[screenShotIndex].decode(data);
						}
					});
				})();
			}

			// View Resized
			socket.on('resize', function(data) {
				// console.log('resize', data);
				var div = $('#screenshot_'+data.screenshot);
				if(player[data.screenshot]._config.size.width != data.resizex ||
					player[data.screenshot]._config.size.height != data.resizey) {
					window.player[data.screenshot].worker.terminate();
					window.player[data.screenshot] = null;
					window.player[data.screenshot] = new Player({
						size: { width: data.resizex, height: data.resizey },
						useWorker: true,
						workerFile: 'flexsimweb/server/Decoder.js',
						reuseMemory: true
					});
					div.empty();
					div.append(window.player[data.screenshot].canvas);
				}
			});
			// Model reset
			socket.on('reset', function(data) {
				running = 0;
			});
			// Model running
			socket.on('run', function(data) {
				running = 1;
			});
			// Model stopped
			socket.on('stop', function(data) {
				running = 0;
			});
			// Model exectution stepped
			socket.on('step', function(data) {});
			// Model compiled
			socket.on('compile', function(data) {
				alert("Compile Complete");
			});
			// Current run state
			socket.on('getRunState', function(data) {
				try {
					data = $.parseXML(data);
				}
				catch(err){
					data = null;
				}
				if(data && data.getElementsByTagName) {
					var runstate = data.getElementsByTagName("runstate")[0].innerHTML;
					running = runstate;
				}
			});
			// Current run time
			socket.on('getRunTime', function(data) {
				try {
					data = $.parseXML(data);
				}
				catch(err){
					data = null;
				}
				if(data && data.getElementsByTagName) {
					var time = data.getElementsByTagName("time")[0].innerHTML;
					$('#runtime').val(time);
				}
			});
			// Run speed changed
			socket.on('setRunSpeed', function(data) {
				var runSpeedUpdate = Math.log(data.setRunSpeed) * 10;
				$('#speedslider').val(runSpeedUpdate);
				changeRunSpeed(runSpeedUpdate);
			});

			// View reset
			socket.on('resetView', function(data) {});
			// Double clicked
			socket.on('doubleClick', function(data) {});
			// Left mouse down
			socket.on('leftMouseDown', function(data) {});
			// Right mouse down
			socket.on('rightMouseDown', function(data) {});
			// Mouse up
			socket.on('mouseUp', function(data) {});
			// Mouse moved
			socket.on('mouseMove', function(data) {
				mouseUpdateReturned = true;
			});
			// Mouse wheel
			socket.on('mouseWheel', function(data) {});

			communication.doubleClick = function(i, x, y) {
				socket.emit('doubleClick', {"screenshot" : i, "doublex" : x, "doubley" : y});
			};
			communication.leftMouseDown = function(i, x, y) {
				socket.emit('leftMouseDown', {"screenshot" : i, "leftx" : x, "lefty" : y});
			};
			communication.rightMouseDown = function(i, x, y) {
				socket.emit('rightMouseDown', {"screenshot" : i, "rightx" : x, "righty" : y});
			};
			communication.mouseUp = function(i, x, y) {
				socket.emit('mouseUp', {"screenshot" : i, "mouseupx" : x, "mouseupy" : y});
			};
			communication.mouseMove = function(i, x, y) {
				socket.emit('mouseMove', {"screenshot" : i, "movex" : x, "movey" : y});
			};
			communication.mouseWheel = function(i, sx, sy, sz, x, y) {
				socket.emit('mouseWheel', {"screenshot" : i, "scrollx" : sx, "scrolly" : sy, "scrollz" : sz, "mousex" : x, "mousey" : y});
			};
			communication.reset = function() {
				socket.emit('reset', {});
			};
			communication.run = function() {
				socket.emit('run', {});
			};
			communication.stop = function() {
				socket.emit('stop', {});
			};
			communication.step = function() {
				socket.emit('step', {});
			};
			communication.compile = function() {
				socket.emit('compile', {});
			};
			communication.resetView = function(i, t) {
				socket.emit('resetView', {"resetView" : i, "type" : t});
			};
			communication.setRunSpeed = function(rs) {
				socket.emit('setRunSpeed', { "setRunSpeed" : rs });
			};
			communication.resize = function(i, w, h) {
				socket.emit('resize', {"screenshot" : i, "resizex" : w, "resizey" : h});
			};

			resizeViews();
		});
	}
	
	var screenshotButtonHtml = "";
	var ua = navigator.userAgent.toLowerCase();
	if (ua.search("android") > -1 || ua.search("iphone") > -1 || ua.search("ipad") > -1 || ua.search("ipod") > -1) {
		//add buttons for smartphones
		screenshotButtonHtml += "<button type=\"button\" onclick=\"panPressed   ()\">Pan   </button>";
		screenshotButtonHtml += "<button type=\"button\" onclick=\"rotatePressed()\">Rotate</button>";
		screenshotButtonHtml += "<button type=\"button\" onclick=\"zoomPressed  ()\">Zoom  </button>";
	}
	
	var smartphonedivs;
	if(document.getElementsByClassName)
	{
		smartphonedivs=document.getElementsByClassName("screenshotbuttons");
		for(var i=0;i<smartphonedivs.length;i++)
		{
			smartphonedivs[i].innerHTML=screenshotButtonHtml;
		}
	} else {
		smartphonedivs=document.getElementsByTagName("div");
		for(var i=0;i<smartphonedivs.length;i++)
		{
			if(smartphonedivs[i].className=="screenshotbuttons")
			{
				smartphonedivs[i].innerHTML=screenshotButtonHtml;
			}
		}
	}
	
	//Pres escape to exit full screen mode
	$(document).keyup(function(e) {
		 if (e.keyCode == 27) { // escape key maps to keycode `27`
			var screenshot = $('.fullscreen3DView');
			if (screenshot) {
				screenshot.attr("class", "screenshot");
				var screenshotRank = screenshot.attr("id").split("_")[1];
				var width = screenshot.width();
				var height = screenshot.height();
				communication.resize(screenshotRank, width, height);
			}
		}
	});
	
	$(window).resize(function() {
		var height = $(window).height() - $('#dockingLayout').offset().top;
		$("#dockingLayout").jqxDockingLayout({ height: height });
		clearTimeout(window.resizeWindowTimout);
		window.resizeWindowTimout = setTimeout(function(){ resizeViews(); }, 100);
	});
	
	//3D Menu code
	$('#3DMenu').on('itemclick', function (event) {
		var clickedItem = event.args;
		var option = clickedItem.childNodes[0].dataset.option;
		var screenshotRank = parseInt($('#3DMenu').data("screenshot"));
		if (option == "resetView") {
			resetView(screenshotRank, "");
		} else if (option == "resetRotation") {
			resetView(screenshotRank, "rotation");
		} else if (option == "fullScreen") {
			var screenshot = $('#screenshot_' + screenshotRank);
			screenshot.attr("class", "fullscreen3DView");
			var width = screenshot.width();
			var height = screenshot.height();
			communication.resize(screenshotRank, width, height);
		} else {
			//Model View
			resetView(screenshotRank, option);
		}
	});
	
	//Set the srce
	var dashboardImages = $('.dashboardImage');
	$.each(dashboardImages, function(index, element) {
		element.src = baseQuery + "&getViewImage=" + element.dataset.path + "&time=" + (new Date()).getTime();
	});
	
	//Add onChange functions to each of the model input widgets
	var checks = $('.dashboardModelInput input:checkbox,.dashboardModelInput input:radio');
	var values = $('.dashboardModelInput input:text,.dashboardModelInput select,.dashboardModelInput input[type="range"]');
	var buttons = $('.dashboardModelInput input:button, .dashboardModelInput input:image');
	var images = $('input:image');
	
	checks.change(function(input) {
		$.ajax(baseQuery + "&setDashboardInput&inputId=" + input.target.id + "&value=" + input.target.checked + "&time=" + (new Date()).getTime());
	});
	values.change(function(input) {
		$.ajax(baseQuery + "&setDashboardInput&inputId=" + input.target.id + "&value=" + input.target.value + "&time=" + (new Date()).getTime());
	});
	buttons.click(function(input) {
		var value;
		if (input.target.dataset.value != undefined)
			value = input.target.dataset.value;
		else
			value = input.target.value;
		$.ajax(baseQuery + "&setDashboardInput&inputId=" + input.target.id + "&value=" + value + "&time=" + (new Date()).getTime());
	});
	
	//Add an on click to all the table refresh buttons
	$('.tableRefresh').on('click', function(button) {
		var tableID = $(button.target).data('tableid');
		var left = $(button.target).data('left');
		var top = $(button.target).data('top');
		//So the refresh button doesn't get destroyed, move it back into the table div
		var refreshButton = $('#refresh' + tableID);
		refreshButton.detach().prependTo($('#' + tableID));
		refreshButton.css('top', top);
		refreshButton.css('left', left);
		$('#' + tableID).jqxDataTable('updateBoundData');
	});
	
	//Disable these buttons until the update progress enables them (if there is data to read)
	$('.expResult').prop('disabled', true);
	$('.optResult').prop('disabled', true);
	
	//Start stat graph update loop
	if ($('.serverchart').length > 0) {
		$('.serverchart').attr('class', 'fullscreen'); //fill the dragresize widgets
		updateStatGraphs();
	}
	//Start model input update loop
	if ($('.dashboardModelInput').length > 0)
		updateModelInputs();
	
	if ($('#section-experimenter').length > 0)
		updateExperimentProgress();
	
	if ($('#section-optimizer').length > 0) {
		updateOptimizerProgress();
		
		var optimizerCanvas = $("#optimizerStatus");
		optimizerCanvas.on("addSolution", function(data) {
			var currentSolution = data.originalEvent.detail;
			$.ajax(baseQuery + "&addSolution=" + currentSolution + "&time=" + (new Date()).getTime());
		});
		optimizerCanvas.on("removeSolution", function(data) {
			var currentSolution = data.originalEvent.detail;
			$.ajax(baseQuery + "&removeSolution=" + currentSolution + "&time=" + (new Date()).getTime());
		});
	}
	
	//If the user exported selected scenarios in the optimizer
	if (window.location.hash == "#experimenter")
		navigateToSection("experimenter");
}
