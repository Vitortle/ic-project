function initializeFinancial(divTag) {
	try{
	var mainDiv = divTag;
	divTag.innerHTML = "<div class='title'></div><table><tbody></tbody></table>";
	var titleDiv = divTag.getElementsByTagName("div")[0];
	var body = divTag.getElementsByTagName("tbody")[0];
	var table = divTag.getElementsByTagName("table")[0];
	mainDiv.lastSavedNrEntries = 0;

	mainDiv.initializeData = function initializeData(bundleHeader) {
		try{
			mainDiv.bundle = Bundle.interpretHeader(bundleHeader);
			var className = mainDiv.getAttribute('class');
			if (className && className.indexOf('fullscreen', 0) >= 0) {
				if (mainDiv.style['overflow-x'])
					delete mainDiv.style['overflow-x'];
			}
			mainDiv.style['overflow'] = 'auto';
			body.innerHTML = "";
			mainDiv.lastSavedNrEntries = 0;
		}catch(e) {print('exception caught in financial mainDiv.initializeData() '); printError(e, "financial.js");}
	}

	function formatCurrency(x, textCell, bold) {
		//This function would be greatly condensed if we could get x.toLocaleString() to work with webkit
		var commaSeparator = ",";
		var decimalSeparator = ".";
		
		var negative = x < 0;
		if (negative) {
			x *= -1;
			textCell.setAttribute('style', 'color:rgb(150, 40, 40); font-weight:bold;');
		} else {
			if (bold)
				textCell.setAttribute('style', 'color:black; font-weight:bold;');
			else
				textCell.setAttribute('style', 'color:black; font-weight:normal;');
		}
		
		x = x.toFixed(mainDiv.precision).toString();

		var values = x.split(".");
		
		if (mainDiv.swapDecimal) {
			commaSeparator = ".";
			decimalSeparator = ",";
		}
		
		var value = mainDiv.currency + values[0].replace(/\B(?=(\d{3})+(?!\d))/g, commaSeparator);
		if (mainDiv.precision > 0)
			value += decimalSeparator + values[1];
		if (negative)
			value = "(" + value + ")";
		
		return value;
	}
	
	mainDiv.expanderOnClick = function expanderOnClick() {
		var expandRows = [];
		var tableRow = this.parentNode.parentNode;
		var nrFields = mainDiv.bundle.nrFields;
		var nrEntries = mainDiv.bundle.nrEntries;
		this.expanded = !this.expanded;

		//The Total expander will cycle through all objects and expand just their name (or their details if previuosly expanded)
		if (this.entryNr == 0) { 
			var showChildren = false;
			for (var i = 0; i < nrEntries; i++) {
				for (var j = 1; j < nrFields -1; j++) {
					tableRow = tableRow.nextSibling;
					if (!this.expanded && i > 1) //If we're contracting, hide everyone
						expandRows.push(tableRow);
					else if (showChildren)
						expandRows.push(tableRow);
				}
				if (i < nrEntries -1) {
					showChildren = false;
					tableRow = tableRow.nextSibling;
					expandRows.push(tableRow);
					if (tableRow.children[1].firstChild.expanded == true) 
						showChildren = true;
				}
			}
		} else { //Individual object
			for (var j = 2; j < nrFields; j++) {
				tableRow = tableRow.nextSibling;
				expandRows.push(tableRow);
			}
		}
		for (var i = 0; i < expandRows.length; i++)
		    expandRows[i].style.display = this.expanded ? 'table-row' : 'none';

		this.src = this.expanded ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAYAAABCm8wlAAAAAXNSR0IArs4c6QAAAAZiS0dEAI8AnwC4+QBYTwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sJDRQ2N2HZwzYAAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAERJREFUGNNj7J+/gwEfYGIgAHAqKEz0+I9TAUyyMNEDUwFMEqsV6JIoCrBJwhXgkmRgYGBgZGBg+I/Hl4wMhAKKkZACAIolFHR+2Z6zAAAAAElFTkSuQmCC' : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAYAAABCm8wlAAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sJDRQ5HEr9JrkAAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAF1JREFUGNN9zqEVwCAMRdEHEsMIzMRkHaEbBNt1GAGDBdP2cELaL/OuCNwTkSEi6LnjvABIsY/nVlt4gV91zhlgpNhtYKENaGSCFX2CUgq1Bef/ovnDGjeg4wZ0BJg6cCfGEtRbygAAAABJRU5ErkJggg%3D%3D';
	}
	
	mainDiv.updateData = function updateData(bundleData) {
		try{
			mainDiv.bundle = Bundle.interpretData(bundleData, mainDiv.bundle);
			var nrFields = mainDiv.bundle.nrFields;
			var nrEntries = mainDiv.bundle.nrEntries;
			
			//Set up table and name column
			if (mainDiv.lastSavedNrEntries != nrEntries || mainDiv.justSetProperties) { //Only update the table if we need to
				mainDiv.justSetProperties = false;
				body.innerHTML = "";
				mainDiv.dataElements = [];
				mainDiv.dataRows = [];
				for (var i = 0; i < nrEntries; i++) {
					var totalRow = i == 0;
					var row = document.createElement("tr");
					var dataElement = [];
					mainDiv.dataRows.push(row);
					mainDiv.dataElements.push(dataElement);
					body.appendChild(row);
					
					if (!totalRow) { //Hide the row and insert an extra column
						row.style.display = 'none';
						var cell = document.createElement("td");
						row.appendChild(cell);
					}
					
					//Expander
					var imgCol = document.createElement("td");
					if (!totalRow)
						imgCol.setAttribute('style', 'padding-left:0px;padding-right:3px');
					else
						imgCol.setAttribute('style', 'padding-left:3px;padding-right:3px');
					var img = document.createElement('img');
					img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAALCAYAAABCm8wlAAAAAXNSR0IArs4c6QAAAAZiS0dEAAAAAAAA+UO7fwAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9sJDRQ5HEr9JrkAAAAdaVRYdENvbW1lbnQAAAAAAENyZWF0ZWQgd2l0aCBHSU1QZC5lBwAAAF1JREFUGNN9zqEVwCAMRdEHEsMIzMRkHaEbBNt1GAGDBdP2cELaL/OuCNwTkSEi6LnjvABIsY/nVlt4gV91zhlgpNhtYKENaGSCFX2CUgq1Bef/ovnDGjeg4wZ0BJg6cCfGEtRbygAAAABJRU5ErkJggg%3D%3D';
					img.expanded = false;
					img.addEventListener("click", mainDiv.expanderOnClick, false);
					img.entryNr = i;
					imgCol.appendChild(img);
					row.appendChild(imgCol);
					
					//Name
					var col = document.createElement("td");
					col.innerHTML = mainDiv.bundle.getValue(i, 0); //Name Column
					if (!totalRow)
						col.setAttribute('style', 'padding-left:5px; font-weight:bold;');
					else {
						col.colSpan = 2;
						col.setAttribute('style', 'font-weight:bold;');
					}
					row.appendChild(col);
					
					//Spacer
					var cell = document.createElement("td");
					row.appendChild(cell);
					
					//Value
					cell = document.createElement("td");
					row.appendChild(cell);
					dataElement.push(cell);
					
					for (var j = 2; j < nrFields; j++) {
						row = document.createElement("tr");
						if (!totalRow) row.style.display = 'none';
						body.appendChild(row);
						//Empty
						cell = document.createElement("td");
						row.appendChild(cell);
						//Empty
						cell = document.createElement("td");
						row.appendChild(cell);
						//Name
						cell = document.createElement("td");
						if (!totalRow)
							cell.setAttribute('style', 'padding-left:35px;');
						else
							cell.setAttribute('style', 'padding-left:20px;');
						cell.innerHTML = mainDiv.bundle.getFieldName(j);
						row.appendChild(cell);
						//Spacer
						cell = document.createElement("td");
						row.appendChild(cell);
						//Value
						cell = document.createElement("td");
						row.appendChild(cell);
						dataElement.push(cell);
					}

					
				}
				mainDiv.lastSavedNrEntries = nrEntries;
			}
			
			//Update data
			for (var i = 0; i < mainDiv.dataRows.length; i++) {
				var cells = mainDiv.dataElements[i];
				for (var j = 0; j < cells.length; j++) {
					var val = mainDiv.bundle.getValue(i, j + 1);
					if (cells[j]) {
						if (cells[j].savedValue != val) {
							cells[j].innerHTML = formatCurrency(val, mainDiv.dataElements[i][j], j == 0);
							cells[j].savedValue = val;
						}
					}
				}
			}
		}catch(e) {print('exception caught in financial mainDiv.updateData() '); printError(e, "financial.js");}
	}

	mainDiv.setProperties = function setProperties(properties, redraw) {
		try{
			if(properties.chartType != CHART_TYPE_FINANCIAL && properties.chartType != "financial")
				return 0;
			
			//If this is for a saved report/web viewer, we'll need to load the properties from the html (Offline)
			if (properties.currency == undefined)
				properties.currency = mainDiv.getAttribute('data-currency') || "$";
			if (properties.precision == undefined)
				properties.precision = mainDiv.getAttribute('data-precision') || 2;
			if (properties.fontSize == undefined)
			    properties.fontSize = parseFloat(mainDiv.getAttribute('data-font-size')) || 12;
				
			titleDiv.innerHTML = properties.title;
			mainDiv.precision = properties.precision;
			mainDiv.swapDecimal = 0;
			switch (properties.currency) {
				case "dollar":
					mainDiv.currency = "$";
					break;
				case "euro":
					mainDiv.currency = "&#x80;";
					mainDiv.swapDecimal = 1;
					break;
				case "franc":
					mainDiv.currency = "&#x20A3;";
					break;
				case "lira":
					mainDiv.currency = "&#x20A4;";
					break;
				case "pound":
					mainDiv.currency = "&#xA3;";
					break;
				case "yen":
				case "yuan":
					mainDiv.currency = "&#165;";
					break;
				default:
					mainDiv.currency = properties.currency;
					break;
			}
			titleDiv.setAttribute('style', 'font-size:' + properties.fontSize + 'pt;');
			table.setAttribute('style', 'font-size:' + properties.fontSize + 'pt;');
			mainDiv.justSetProperties = true;
			
		}catch(e) {print('exception caught in financial mainDiv.setProperties() '); printError(e, "financial.js");}
	}
	}catch(e) {
		print('exception caught in initializeFinancial() '); printError(e, "financial.js");
	}
}