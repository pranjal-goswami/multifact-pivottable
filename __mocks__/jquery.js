'use strict';

// Minimal mock of jQuery's $.pivotUtilities and utility methods,
// shaped so that multifact-pivottable.js can execute in a Node/Jest environment.

function makeNumberFormat(opts) {
    opts = opts || {};
    var digitsAfterDecimal = opts.digitsAfterDecimal != null ? opts.digitsAfterDecimal : 2;
    var scaler = opts.scaler != null ? opts.scaler : 1;
    var prefix = opts.prefix || '';
    var suffix = opts.suffix || '';
    return function (x) {
        if (x == null || isNaN(Number(x))) return '';
        return prefix + (Number(x) * scaler).toFixed(digitsAfterDecimal) + suffix;
    };
}

function makeSumAggregator() {
    return function (fields) {
        return function (data, rowKey, colKey) {
            var sum = 0;
            return {
                numInputs: 0,
                push: function (record) {
                    var v = parseFloat(record[fields[0]]);
                    if (!isNaN(v)) sum += v;
                },
                value: function () { return sum; },
                format: makeNumberFormat()
            };
        };
    };
}

function makeCountAggregator() {
    return function (fields) {
        return function (data, rowKey, colKey) {
            var count = 0;
            return {
                numInputs: 0,
                push: function () { count++; },
                value: function () { return count; },
                format: makeNumberFormat({ digitsAfterDecimal: 0 })
            };
        };
    };
}

function $(sel) { return sel; }

$.map = function (obj, fn) {
    if (Array.isArray(obj)) {
        return obj.map(fn).filter(function (v) { return v !== undefined; });
    }
    var result = [];
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            var val = fn(obj[key], key);
            if (val !== undefined) result.push(val);
        }
    }
    return result;
};

$.extend = function (target) {
    for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i];
        if (src) {
            for (var k in src) {
                if (Object.prototype.hasOwnProperty.call(src, k)) {
                    target[k] = src[k];
                }
            }
        }
    }
    return target;
};

$.pivotUtilities = {
    aggregators: {
        Sum: makeSumAggregator(),
        Count: makeCountAggregator()
    },
    numberFormat: makeNumberFormat
};

$.fn = {};

module.exports = $;
