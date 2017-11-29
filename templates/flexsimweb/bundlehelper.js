function BundleHelper() {
	"use strict"

	var bh = this;

	this.infoColumns = [];
	this.keyColumns = [];
	this.histogramColumns = [];

	this.bundle = null;
	this.analyzedEntries = 0;

	this.bucketWidth = 1;
	this.bucketOffset = 0;

	this.fixedBuckets = false;
	this.bucketCount = 10;

	this.dataSets = {};
	this.dataSetArray = [];

	this.histogramMin = null;
	this.histogramMax = null;

	function Info() {
		this.min = null;
		this.max = null;
		this.range = null;
		this.count = 0;

		var info = this;
		this.addValue = function addValue(value) {
			if (info.count == 0) {
				info.min = value;
				info.max = value;
				info.range = 0;
			} else {
				if (value < info.min)
					info.min = value;

				if (value > info.max)
					info.max = value;
			}
			
			info.count++;
		};
	};

	function Histogram() {
		var h = this;
		this.buckets = [];
		this.count = 0;
		this.bucketMax = 0;
		this.values = [];

		function Bucket(count, startValue, index) {
			this.count = typeof(count) === "number" ? count : 0;
			this.startValue = typeof(startValue) === "number" ? startValue : 0;
			this.index = typeof(index) === "number" ? index : 0;

			var b = this;
			this.getPercent = function getPercent() {
				return b.count / h.count;
			}
		};

		this.addValue = function addValue(value) {
			// If there are N buckets, just push the values into an array
			// For now, skip the optimization
			if (bh.fixedBuckets || true) {
				h.values.push(value);
				if (bh.histogramMin == null) {
					bh.histogramMin = value;
					bh.histogramMax = value;
				} else {
					if (bh.histogramMin > value)
						bh.histogramMin = value;
					if (bh.histogramMax < value)
						bh.histogramMax = value;
				}
				h.count++;
				return;
			}

			// calculate the index
			var zeroIndexStartVal = bh.bucketOffset;
			var distanceToVal = value - zeroIndexStartVal;
			var index = 0;
			if (distanceToVal < 0)
				index = Math.floor(distanceToVal / bh.bucketWidth);
			else
				index = Math.trunc(distanceToVal / bh.bucketWidth);

			// If the list is empty...
			if (h.buckets.length == 0) {
				var newBucket = new Bucket(
					0,
					index * bh.bucketWidth + bh.bucketOffset,
					index
				);
				h.buckets.push(newBucket);
				bh.histogramMin = Math.min(newBucket.startValue, bh.histogramMin);
				bh.histogramMax = Math.max(newBucket.startValue + bh.bucketWidth, bh.histogramMax);
				return;
			}

			// If I need to unshift
        	while (h.buckets[0].index > index) {
				var startBucket = h.buckets[0];
				h.buckets.unshift(new Bucket(
					0,
					startBucket.startValue - bh.bucketWidth,
					startBucket.index - 1
				));
				bh.histogramMin = Math.min(newBucket.startValue, bh.histogramMin);
			}

			// If I need to push
			while (h.buckets[h.buckets.length - 1].index < index) {
				var lastBucket = h.buckets[h.buckets.length - 1];
				var newBucket = new Bucket(
					0,
					lastBucket.startValue + bh.bucketWidth,
					lastBucket.index + 1
				);
				h.buckets.push(newBucket);
				bh.histogramMax = Math.max(newBucket.startValue + bh.bucketWidth, bh.histogramMax);
			}

			// So now, just look up the bucket that already exists
			var smallestValue =  h.buckets[0].startValue;
			var distToSmallestValue = value - smallestValue;
			var arrayIndex = Math.trunc(distToSmallestValue / bh.bucketWidth);
			var bucket = h.buckets[arrayIndex];
			bucket.count++;
			h.count++;
			if (bucket.count > h.bucketMax)
				h.bucketMax = bucket.count;
		};

		this.getBuckets = function getBuckets() {
			if (bh.fixedBuckets || true) {
				h.buckets = [];
				h.bucketMax = 0;

				var perBucketWidth = (bh.histogramMax - bh.histogramMin) / bh.bucketCount;
				if (!bh.fixedBuckets)
					perBucketWidth = bh.bucketWidth;

				var bucketCount = bh.bucketCount;
				if (!bh.fixedBuckets)
					bucketCount = Math.ceil((+bh.histogramMax - +bh.histogramMin) / perBucketWidth);
				
				for (var i = 0; i < bucketCount; i++) {
					h.buckets.push(new Bucket(
						0,
						+bh.histogramMin + i * perBucketWidth,
						i
					));
				}

				for (var i = 0; i < h.values.length; i++) {
					var value = h.values[i];
					var distance = value - bh.histogramMin;
					var bucketIndex = Math.trunc(distance / perBucketWidth);

					// rounding issues sometimes max the division yield an index too high,
					// especially on the last value
					bucketIndex = Math.min(bucketIndex, h.buckets.length - 1);
					var curBucket = h.buckets[bucketIndex];
					curBucket.count++;
					h.bucketMax = Math.max(curBucket.count, h.bucketMax);			
				}
			}

			return h.buckets;
		};
	};

	function DataSet() {
		var ds = this;
		this.key = null;
		this.keyInfo = {};
		this.rows = [];

		this.info = {};
		this.histograms = {};

		this.addRow = function addRow(rowNumber) {
			ds.rows.push(rowNumber);

			bh.infoColumns.forEach(function (column) {
				var value = bh.bundle.getValue(rowNumber, column);
				var info = ds.info[column];
				info.addValue(value);
			});	

			bh.histogramColumns.forEach(function (column) {
				var value = bh.bundle.getValue(rowNumber, column);
				var histogram = ds.histograms[column];
				histogram.addValue(value);
			});
		};

		// Initialize the data set, based on the bundle helper
		bh.infoColumns.forEach(function (column) {
			ds.info[column] = new Info();
		});

		bh.histogramColumns.forEach(function (column) {
			ds.histograms[column] = new Histogram();
		});
	};
	
	this.reset = function reset(bundle) {
		bh.bundle = Bundle.interpretHeader(bundle);
		bh.analyzedEntries = 0;
		bh.dataSets = {};
		bh.dataSetArray = [];
		
		bh.setInfoColumns(bh.infoColumns);
		bh.setKeyColumns(bh.keyColumns);
		bh.setHistogramColumns(bh.histogramColumns);
	}

	function setColumnArrayFromArray(columnArray, array) {
		if (bh.bundle === null)
			return;

		if (!Array.isArray(array))
			return;

		array.forEach(function(column) {
			if (typeof(column) !== "number")
				return;

			if (column < 0 || column >= bh.bundle.nrFields)
				return;

			columnArray.push(column);
		});
	}

	this.setInfoColumns = function setInfoColumns(infoColumns) {
		bh.infoColumns = [];
		setColumnArrayFromArray(bh.infoColumns, infoColumns);
	};

	this.setKeyColumns = function setKeyColumns(keyColumns) {
		bh.keyColumns = [];
		if (keyColumns === BundleHelper.KEY_BY_ROW)
			bh.keyColumns = BundleHelper.KEY_BY_ROW;
		else
			setColumnArrayFromArray(bh.keyColumns, keyColumns);
	};

	this.setHistogramColumns = function setHistogramColumns(histogramColumns) {
		bh.histogramColumns = [];
		setColumnArrayFromArray(bh.histogramColumns, histogramColumns);
	};

	this.update = function update(bundle) {
		bh.bundle = Bundle.interpretData(bundle, bh.bundle);

		var curEntries = bh.bundle.nrEntries;
		var curFields = bh.bundle.nrFields;

		if (bh.analyzedEntries > curEntries) {
			bh.reset(bundle);
			bh.update(bundle);
			return;
		}

		while (bh.analyzedEntries < curEntries) {
			// Figure out the key of this row
			var entryNum = bh.analyzedEntries++;
			var keyData = [];
			if (bh.keyColumns == BundleHelper.KEY_BY_ROW) {
				keyData.push(entryNum);
			} else {
				for (var i = 0; i < bh.keyColumns.length; i++) {
					var column = bh.keyColumns[i];
					keyData.push(bh.bundle.getValue(entryNum, column));
				}
			}

			var textKey = keyData.join("");
			var dataSet = bh.dataSets[textKey];
			if (dataSet === undefined) {
				dataSet = new DataSet();
				dataSet.key = textKey;
				bh.dataSets[textKey] = dataSet;
				bh.dataSetArray.push(dataSet);

				if (bh.keyColumns != BundleHelper.KEY_BY_ROW) {
					for (var i = 0; i < bh.keyColumns.length; i++) {
						var column = bh.keyColumns[i];
						var columnName = bh.bundle.getFieldName(column);
						var data = keyData[i];
						dataSet.keyInfo[columnName] = data;
					}
				} else {
					dataSet.keyInfo["Row"] = entryNum;
				}
			}

			dataSet.addRow(entryNum);
		}
	};

	this.getRange = function getRange(column) {
		var range = {min: 0, max: 0};
		if (bh.infoColumns.indexOf(column) == -1)
			return range;

		var count = 0;
		bh.dataSetArray.forEach(function (dataSet) {
			var info = dataSet.info[column];
			if (count == 0) {
				range.min = info.min;
				range.max = info.max;
			} else {
				if (info.min < range.min)
					range.min = info.min;
				if (info.max > range.max)
					range.max = info.max;
			}
			count++;
		});

		return range;
	};

	this.getHistogramRange = function getHistogramRange(column) {
		var range = {min: 0, max: 0, bucketCount: 0};
		if (bh.histogramColumns.indexOf(column) == -1)
			return range;

		range.min = +bh.histogramMin;
		range.max = +bh.histogramMax;

		if (bh.fixedBuckets)
			range.bucketCount = bh.bucketCount;
		else
			range.bucketCount = Math.ceil((range.max - range.min) / bh.bucketWidth);

		return range;
	};

	this.getHistogramMax = function getHistogramMax(column) {
		var max = 0;
		if (bh.histogramColumns.indexOf(column) == -1)
			return max;

		bh.dataSetArray.forEach(function (dataSet) {
			var histogram = dataSet.histograms[column];
			histogram.getBuckets();
			if (histogram.bucketMax > max)
				max = histogram.bucketMax;
		});

		return max;
	};

	this.getHistogramMaxRatio = function getHistogramMaxRatio(column) {
		var max = 0;
		if (bh.histogramColumns.indexOf(column) == -1)
			return max;

		bh.dataSetArray.forEach(function (dataSet) {
			var histogram = dataSet.histograms[column];
			histogram.getBuckets();
			var ratio = histogram.bucketMax / histogram.count;
			if (ratio > max)
				max = ratio;
		});

		return max;
	};
};

BundleHelper.prototype.KEY_BY_ROW = {};