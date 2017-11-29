
function initializeDataTable(divTag){
	try{
	var mainDiv = divTag;
	divTag.innerHTML = "<div class='title'></div><table><thead><tr style='display:table-row'></tr></thead><tbody></tbody></table>";
	var titleDiv = divTag.getElementsByTagName("div")[0];
	var head = divTag.getElementsByTagName("tr")[0];
	var body = divTag.getElementsByTagName("tbody")[0];
	var table = divTag.getElementsByTagName("table")[0];
	mainDiv.lastSavedNrEntries = 0;
	var popup = document.getElementById("flexsimpopup");
	if(!mainDiv.id)
		mainDiv.id = "dataTable1";

	mainDiv.initializeData = function initializeData(bundleHeader){
		try{
			mainDiv.bundle = Bundle.interpretHeader(bundleHeader);
			var className = mainDiv.getAttribute('class');
			if(className && className.indexOf('fullscreen', 0) >= 0){
				if(mainDiv.style['overflow-x'])
					delete mainDiv.style['overflow-x'];
				mainDiv.style['overflow'] = 'auto';
			}
			head.innerHTML = "";
			body.innerHTML = "";
			mainDiv.lastSavedNrEntries = 0;
			mainDiv.headerCells = [];
			// expander column
			var col = document.createElement("td");
			col.setAttribute('style', 'padding-left:0px;padding-right:0px');
			head.appendChild(col);
			// name column
			col = document.createElement("th");
			head.appendChild(col);
			mainDiv.totalsCol = null;
			if (mainDiv.doUtilization != UTILIZATION_SHOW_ALL && !mainDiv.stateStrings && mainDiv.bundle.nrFields > 3) {
			    var col = document.createElement("th");
				col.innerHTML = "Total";
				head.appendChild(col);
			}
			for(var i = 2; i < mainDiv.bundle.nrFields; i++){
				var col = document.createElement("th");
				col.innerHTML = mainDiv.bundle.getFieldName(i);
				head.appendChild(col);
				mainDiv.headerCells.push(col);
			}
		}catch(e){print('exception caught in datatable mainDiv.initializeData() '); printError(e, "datatable.js");}
	}
	
	mainDiv.expanderOnClick = function expanderOnClick(){
		var expandRows = [];
		var tableRow = this.parentNode.parentNode.nextSibling;
		var groupName = mainDiv.bundle.getValue(this.entryNr, 1);
		for(var i = this.entryNr; mainDiv.bundle.getValue(i, 1) == groupName; i++){
			expandRows.push(tableRow);
			tableRow = tableRow.nextSibling;
		}
		this.expanded = !this.expanded;
		for(var i = 0; i < expandRows.length; i++)
		    expandRows[i].style.display = this.expanded ? 'table-row' : 'none';
		if (groupName.indexOf("#nototal") >= 0)
		    expandRows[0].style.display = 'none';
		this.src = this.expanded ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAYAAABCm8wlAAAAAXNSR0IArs4c6QAAAAZiS0dEAI8AnwC4+QBYTwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sJDRQ2N2HZwzYAAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAERJREFUGNNj7J+/gwEfYGIgAHAqKEz0+I9TAUyyMNEDUwFMEqsV6JIoCrBJwhXgkmRgYGBgZGBg+I/Hl4wMhAKKkZACAIolFHR+2Z6zAAAAAElFTkSuQmCC' : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAYAAABCm8wlAAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sJDRQ5HEr9JrkAAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAF1JREFUGNN9zqEVwCAMRdEHEsMIzMRkHaEbBNt1GAGDBdP2cELaL/OuCNwTkSEi6LnjvABIsY/nVlt4gV91zhlgpNhtYKENaGSCFX2CUgq1Bef/ovnDGjeg4wZ0BJg6cCfGEtRbygAAAABJRU5ErkJggg%3D%3D';
	}

	mainDiv.updateData = function updateData(bundleData){
		try{
			mainDiv.bundle = Bundle.interpretData(bundleData, mainDiv.bundle);
			var nrFields = mainDiv.bundle.nrFields;
			if(mainDiv.lastSavedNrEntries != mainDiv.bundle.nrEntries || mainDiv.justSetProperties){
				mainDiv.justSetProperties = false;
				body.innerHTML = "";
				var curGroup = "";
				var inGroup = 0;
				var groupHeadRow = null;
				mainDiv.dataElements = [];
				mainDiv.dataRows = [];
				mainDiv.sumCells = mainDiv.doUtilization != UTILIZATION_SHOW_ALL && !mainDiv.stateStrings ? [] : null;
				for(var i = 1; i < mainDiv.bundle.nrEntries; i++){
					var row = document.createElement("tr");
					var dataElement = [];
					mainDiv.dataRows.push(row);
					mainDiv.dataElements.push(dataElement);
					body.appendChild(row);
					var imgCol = document.createElement("td");
					imgCol.setAttribute('style', 'padding-left:3px;padding-right:3px');
					row.appendChild(imgCol);
					var groupFullName = mainDiv.bundle.getValue(i, 1);
					var groupName = groupFullName.replace("#sum", "");
					groupName = groupName.replace("#nototal", "");
					var firstInGroup = false;
					var displayName = false;
					if(groupFullName != curGroup){
						var isGroup = groupFullName == mainDiv.bundle.getValue(i + 1, 1);
						if(groupName.length > 0 && isGroup)
						{
							firstInGroup = true;
							var img = document.createElement('img');
							img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAYAAABCm8wlAAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sJDRQ5HEr9JrkAAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAF1JREFUGNN9zqEVwCAMRdEHEsMIzMRkHaEbBNt1GAGDBdP2cELaL/OuCNwTkSEi6LnjvABIsY/nVlt4gV91zhlgpNhtYKENaGSCFX2CUgq1Bef/ovnDGjeg4wZ0BJg6cCfGEtRbygAAAABJRU5ErkJggg%3D%3D';
							img.addEventListener("click", mainDiv.expanderOnClick, false);
							img.entryNr = i;
							img.expanded = false;
							imgCol.appendChild(img);
							if (groupHeadRow)
								groupHeadRow.nrCombinedRows = i - inGroup;
							groupHeadRow = row;
							groupHeadRow.groupAsSum = groupFullName.indexOf("#sum") >= 0;
							groupHeadRow.groupNoTotal = groupFullName.indexOf("#nototal") >= 0;
						    inGroup = i;
						}
						else
						{
						    if (groupHeadRow) 
						        groupHeadRow.nrCombinedRows = i - inGroup;
							inGroup = 0;
							groupHeadRow = null;
						}
						if (isGroup)
							curGroup = groupFullName;
						else {
							displayName = groupName.length > 0;
							curGroup = "";
						}
					}
					if(i == mainDiv.bundle.nrEntries-1 && groupName.length > 0 && !displayName) // if the last entry is part of a group
					    groupHeadRow.nrCombinedRows = i - inGroup + 1; // finish up the group logic
					
					var col = document.createElement("th");
					col.innerHTML = firstInGroup || displayName ? groupName : mainDiv.bundle.getValue(i, 0);
					var subRow = '';
					if(inGroup > 0 && !firstInGroup) {
						row.setAttribute('style', 'display:none');
						subRow = ' subrow';
					}
					col.setAttribute('class', 'rowhead' + subRow);
					row.appendChild(col);
					if(mainDiv.sumCells){
						var cell = document.createElement("td");
						row.appendChild(cell);
						if(subRow.length > 0)
							cell.setAttribute('class', subRow);
						mainDiv.sumCells.push(cell);
					}
					for(var j = 2; j < mainDiv.bundle.nrFields; j++){
						var utilizeType = mainDiv.bundle.getValue(0, j);
						if(utilizeType != 2 
							&& (mainDiv.doUtilization != UTILIZATION_HIDE 
								|| utilizeType == 1))
						{
							var cell = document.createElement("td");
							var className = mainDiv.id + '_col' + (j - 1) + subRow;
							if(mainDiv.doUtilization == UTILIZATION_TRANSLUCENT && utilizeType == 0)
								className += ' gray';
							if (i == 1) {
                                if (mainDiv.headerCells[j-2])
							        mainDiv.headerCells[j - 2].setAttribute('class', className);
							}
							cell.setAttribute('class', className);
							row.appendChild(cell);
							dataElement.push(cell);
						}
						else 
						{
							dataElement.push(null);
							if(mainDiv.headerCells[j - 2]){
								mainDiv.headerCells[j - 2].parentNode.removeChild(mainDiv.headerCells[j - 2]);
								mainDiv.headerCells[j - 2] = null;
							}
						}
					}
					if(firstInGroup)
						i--;
				}
				if(mainDiv.doUtilization == UTILIZATION_TRANSLUCENT){
				    for(var i = 2; i < mainDiv.bundle.nrFields; i++)
				    {
				        if (mainDiv.bundle.getValue(0, i) == 0) {
				            if (mainDiv.headerCells[i-2]) {
				                var headRow = mainDiv.headerCells[i - 2].parentNode;
				                headRow.removeChild(mainDiv.headerCells[i - 2]);
				                headRow.appendChild(mainDiv.headerCells[i - 2]);
				                for(var j = 0; j < mainDiv.dataRows.length; j++){
				                    var headRow = mainDiv.dataRows[j];
				                    headRow.removeChild(mainDiv.dataElements[j][i - 2]);
				                    headRow.appendChild(mainDiv.dataElements[j][i - 2]);
				                }
				            }
						}
					}
				}
				mainDiv.lastSavedNrEntries = mainDiv.bundle.nrEntries;
			}
			
			var columnSums = new Array();
			for(var i = 2; i < nrFields; i++)
				columnSums[i-2] = 0;
			var doSubRow = false;
			var percentSuffix = mainDiv.byPercent ? '%' : '';
			for(var i = 0, entryNr = 1; i < mainDiv.dataRows.length; i++, entryNr++){
				var cells = mainDiv.dataElements[i];
				var row = mainDiv.dataRows[i];
				var sum = 0;
				var utilizedSum = 0;
				// If this is a state table...
				if (mainDiv.stateStrings) {
					if(!row.nrCombinedRows || doSubRow) {
						cells[0].newValue = mainDiv.bundle.getValue(entryNr, 2);
						cells[1].newValue = mainDiv.bundle.getValue(entryNr, 3);
					} else {
						val = mainDiv.bundle.getValue(entryNr, 2);
						var multiple = 0;
						for(var k = 0; k < row.nrCombinedRows; k++) {
							if (mainDiv.bundle.getValue(entryNr + k, 2) != val) {
								multiple = 1;
								break;
							}
						}
						cells[0].newValue = multiple ? 1000 : val;
						cells[1].newValue = multiple ? "multiple" : mainDiv.bundle.getValue(entryNr, 3);
					}
					columnSums[0] = 0;
					columnSums[1] = 1;
				} else {
				    for (var j = 0; j < cells.length; j++) {
				        var val;
						var bundleValue = mainDiv.bundle.getValue(entryNr, j + 2);
						if (typeof bundleValue == "string") {
							cells[j].isString = true;
							val = bundleValue;
						} else if (!row.nrCombinedRows || doSubRow || row.groupNoTotal) {
				            val = bundleValue * mainDiv.dataScale;
				        } else {
				            val = 0;
				            for (var k = 0; k < row.nrCombinedRows; k++)
				                val += mainDiv.bundle.getValue(entryNr + k, j + 2) * mainDiv.dataScale;
				            if (!row.groupAsSum)
				                val /= row.nrCombinedRows;
				        }
				        columnSums[j] += val;
				        var utilizeType = mainDiv.bundle.getValue(0, j + 2);
				        if (utilizeType != 2) {
				            sum += val;
				            if (mainDiv.bundle.getValue(0, j + 2) == 1)
				                utilizedSum += val;
				        }
				        if (cells[j])
				            cells[j].newValue = val;
				    }
				}

				for(var j = 0; j < cells.length; j++){
					if(cells[j]) {
						if (mainDiv.stateStrings) { //Color the text based on the state value
							cells[j].innerHTML = cells[j].newValue;
							if (mainDiv.colors.length > 0) {
								cells[j].setAttribute('style', 'color:' + getRGBColor(mainDiv.colors, cells[0].newValue -1, 1) + '; font-weight:bold;');
							}
						} else if (cells[j].isString) {
							cells[j].innerHTML = cells[j].newValue;
						} else {
							var displayValue = cells[j].newValue * (mainDiv.byPercent  && sum > 0 ? 100 / sum : 1);
							if(cells[j].savedValue != displayValue) {
								cells[j].innerHTML = displayValue.toFixed(mainDiv.precision) + percentSuffix;
								cells[j].savedValue = displayValue;
							}
						}
					}
				}
				if(mainDiv.sumCells) {
					var sumVal = utilizedSum;
					var displayVal = utilizedSum * (mainDiv.byPercent && sum > 0 ? 100 / sum : 1)
					if(mainDiv.sumCells[i].savedValue != displayVal){
						mainDiv.sumCells[i].savedValue = displayVal;
						mainDiv.sumCells[i].innerHTML = displayVal.toFixed(mainDiv.precision) + percentSuffix;
					}
				}
				if(row.nrCombinedRows > 0 && !doSubRow){
					entryNr--;
					doSubRow = true;
				}
				else doSubRow = false;
			}
            
			var styleSheet = document.styleSheets[0];
			for(var i = 2; i < nrFields; i++) {
				var changeStyle = !mainDiv.columnSums || ((columnSums[i-2] == 0) != (mainDiv.columnSums[i-2] == 0));
				if(changeStyle){
					var key = "." + mainDiv.id + "_col" + (i - 1);
					var toStyle = columnSums[i-2] == 0 ? "display:none" : "display:table-cell";
					if(styleSheet.addRule)
						styleSheet.addRule(key, toStyle);
					else styleSheet.insertRule(key + "{" + toStyle + "}", 0);
				}
			}

			mainDiv.columnSums = columnSums;
		}catch(e){print('exception caught in datatable mainDiv.updateData() '); printError(e, "datatable.js");}
	}

	mainDiv.setProperties = function setProperties(properties, redraw){
		try{
			if(properties.chartType != CHART_TYPE_DATA_TABLE && properties.chartType != "datatable")
				return initializeChart(this, properties, redraw);
			
			//If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
			if (properties.byPercent == undefined)
				properties.byPercent = mainDiv.getAttribute('data-by-percent') == 'true';
			if (properties.doUtilization == undefined)
				properties.doUtilization = mainDiv.getAttribute('data-do-utilization') == 'true';
			if (properties.showLegend == undefined)
				properties.showLegend = mainDiv.getAttribute('data-show-legend') == 'true';
			if (properties.fontSize == undefined)
				properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 12;
			if (properties.colors == undefined)
			    properties.colors = eval(mainDiv.getAttribute('data-colors')) || [];
			if (properties.stateStrings == undefined)
				properties.stateStrings = mainDiv.getAttribute('data-state-strings') == 'true';
			if (properties.precision == undefined)
				properties.precision = parseFloat(mainDiv.getAttribute('data-precision')) || 1;
			if (properties.dataScale == undefined)
				properties.dataScale = parseFloat(mainDiv.getAttribute('data-data-scale')) || 1;
				
			titleDiv.innerHTML = properties.title;
			mainDiv.byPercent = properties.byPercent;
			mainDiv.doUtilization = properties.doUtilization;
			mainDiv.showLegend = properties.showLegend;
			titleDiv.setAttribute('style', 'font-size:' + (properties.fontSize *1.1) + 'pt;');
			table.setAttribute('style', 'font-size:' + properties.fontSize + 'pt;');
			head.style.display = mainDiv.showLegend ? "table-row" : "none";
			mainDiv.colors = properties.colors;
			mainDiv.stateStrings = properties.stateStrings;
			mainDiv.precision = properties.precision;
			mainDiv.dataScale = properties.dataScale;
			mainDiv.justSetProperties = true;
			
		}catch(e){print('exception caught in datatable mainDiv.setProperties() '); printError(e, "datatable.js");}
	}
	}catch(e){
		print('exception caught in initializeDataTable() '); printError(e, "datatable.js");
	}
}