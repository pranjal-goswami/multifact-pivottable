'use strict';

/**
 * Tests for multifact-pivottable.js
 *
 * These tests focus on the custom aggregator formatter feature, which allows
 * users to provide a custom `formatter` function directly on aggMap entries
 * or derivedAggregations entries.
 */

// The moduleNameMapper in package.json redirects 'jquery' to __mocks__/jquery.js.
// Requiring the library causes it to call pivotModule(require('jquery')), attaching
// multifactAggregatorGenerator to the mock $.pivotUtilities.
// Parts of the library outside the callWithJQuery callback also reference the global $,
// so we set it on the global object before loading.
var $ = require('../__mocks__/jquery');
global.$ = $;
require('../multifact-pivottable.js');

// ---------------------------------------------------------------------------
// Helper: build an aggregator cell object from aggMap + derivedAggregations
// ---------------------------------------------------------------------------

function buildAggregatorCell(aggMap, derivedAggregations, records) {
    var generator = $.pivotUtilities.multifactAggregatorGenerator(aggMap, derivedAggregations || []);
    // generator(facts)(data, rowKey, colKey) returns the cell aggregator
    var cellAgg = generator([])(null, [], []);
    if (records) {
        records.forEach(function (r) { cellAgg.push(r); });
    }
    return cellAgg;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('multifactAggregatorGenerator - custom formatter', function () {

    // -----------------------------------------------------------------------
    // 1. Default behaviour (no custom formatter) – backward compatibility
    // -----------------------------------------------------------------------
    describe('default behaviour (no custom formatter)', function () {
        it('uses the base aggregator format function for primary aggregations', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Total Amount',
                    varName: 'a'
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, [], [
                { amount: 100 },
                { amount: 200 }
            ]);

            // Default numberFormat with 2 decimal places
            expect(cellAgg.format(300, 'Total Amount')).toBe('300.00');
        });

        it('falls back to default numberFormat when aggKey is unknown', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Total Amount',
                    varName: 'a'
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, []);

            // Unknown aggKey → falls back to default numberFormat
            expect(cellAgg.format(42, 'unknown-key')).toBe('42.00');
        });

        it('uses formatterOptions for derived aggregations without a custom formatter', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Total Amount',
                    varName: 'a'
                }
            };
            var derivedAggregations = [
                {
                    name: 'Scaled Amount',
                    expression: 'variables.a * 0.01',
                    formatterOptions: { suffix: '%', digitsAfterDecimal: 1 }
                }
            ];

            var cellAgg = buildAggregatorCell(aggMap, derivedAggregations, [
                { amount: 100 }
            ]);

            expect(cellAgg.format(50, 'Scaled Amount')).toBe('50.0%');
        });
    });

    // -----------------------------------------------------------------------
    // 2. Custom formatter on aggMap entries
    // -----------------------------------------------------------------------
    describe('custom formatter on aggMap entries', function () {
        it('uses a custom formatter function when provided on an aggMap entry', function () {
            var customFormatter = function (x) {
                if (x === 0) return '-';
                if (x < 0) return '(' + Math.abs(x) + ')';
                return String(x);
            };

            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Total Amount',
                    varName: 'a',
                    formatter: customFormatter
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, [], [
                { amount: 100 },
                { amount: 200 }
            ]);

            expect(cellAgg.format(300, 'Total Amount')).toBe('300');
        });

        it('custom formatter displays 0 as "-"', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Zero Amount',
                    varName: 'a',
                    formatter: function (x) { return x === 0 ? '-' : String(x); }
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, []);

            expect(cellAgg.format(0, 'Zero Amount')).toBe('-');
        });

        it('custom formatter displays negative numbers in parentheses', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Neg Amount',
                    varName: 'a',
                    formatter: function (x) {
                        return x < 0 ? '(' + Math.abs(x) + ')' : String(x);
                    }
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, []);

            expect(cellAgg.format(-1000, 'Neg Amount')).toBe('(1000)');
        });

        it('does not affect other aggregations without a custom formatter', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Custom Agg',
                    varName: 'a',
                    formatter: function (x) { return 'CUSTOM:' + x; }
                },
                agg2: {
                    aggType: 'Count',
                    arguments: ['amount'],
                    name: 'Count Agg',
                    varName: 'b'
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, []);

            expect(cellAgg.format(5, 'Custom Agg')).toBe('CUSTOM:5');
            // Count agg uses its own default format (0 decimal places)
            expect(cellAgg.format(3, 'Count Agg')).toBe('3');
        });

        it('a non-function formatter value is ignored (falls back to default)', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Bad Formatter',
                    varName: 'a',
                    formatter: 'not-a-function'  // invalid – should be ignored
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, []);

            // Falls back to the base aggregator's format (default numberFormat)
            expect(cellAgg.format(42, 'Bad Formatter')).toBe('42.00');
        });
    });

    // -----------------------------------------------------------------------
    // 3. Custom formatter on derivedAggregations entries
    // -----------------------------------------------------------------------
    describe('custom formatter on derivedAggregations entries', function () {
        it('uses a custom formatter function on a derived aggregation', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['a_val'],
                    name: 'Sum A',
                    varName: 'a'
                },
                agg2: {
                    aggType: 'Sum',
                    arguments: ['b_val'],
                    name: 'Sum B',
                    varName: 'b'
                }
            };
            var derivedAggregations = [
                {
                    name: 'Ratio A/B',
                    expression: 'variables.b > 0 ? variables.a / variables.b : 0',
                    formatter: function (x) { return (x * 100).toFixed(1) + '%'; }
                }
            ];

            var cellAgg = buildAggregatorCell(aggMap, derivedAggregations);

            expect(cellAgg.format(0.5, 'Ratio A/B')).toBe('50.0%');
        });

        it('custom formatter on derived aggregation is preferred over formatterOptions', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['val'],
                    name: 'Sum Val',
                    varName: 'a'
                }
            };
            var derivedAggregations = [
                {
                    name: 'Double Val',
                    expression: 'variables.a * 2',
                    // Both provided – custom formatter should win
                    formatter: function (x) { return 'CUSTOM:' + x; },
                    formatterOptions: { suffix: 'SHOULD_NOT_APPEAR' }
                }
            ];

            var cellAgg = buildAggregatorCell(aggMap, derivedAggregations);

            expect(cellAgg.format(10, 'Double Val')).toBe('CUSTOM:10');
            expect(cellAgg.format(10, 'Double Val')).not.toContain('SHOULD_NOT_APPEAR');
        });

        it('custom formatter for 0 as dash on derived aggregation', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['val'],
                    name: 'Sum Val',
                    varName: 'a'
                }
            };
            var derivedAggregations = [
                {
                    name: 'Derived',
                    expression: 'variables.a',
                    formatter: function (x) { return x === 0 ? '-' : String(x); }
                }
            ];

            var cellAgg = buildAggregatorCell(aggMap, derivedAggregations);

            expect(cellAgg.format(0, 'Derived')).toBe('-');
            expect(cellAgg.format(5, 'Derived')).toBe('5');
        });
    });

    // -----------------------------------------------------------------------
    // 4. multivalue() still works correctly with custom formatters
    // -----------------------------------------------------------------------
    describe('multivalue() integration', function () {
        it('returns correct computed values alongside custom formatter', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['amount'],
                    name: 'Total',
                    varName: 'a',
                    formatter: function (x) { return '$' + x; }
                }
            };

            var cellAgg = buildAggregatorCell(aggMap, [], [
                { amount: 100 },
                { amount: 50 }
            ]);

            var result = cellAgg.multivalue();
            expect(result['Total']).toBe(150);
            expect(cellAgg.format(result['Total'], 'Total')).toBe('$150');
        });

        it('derived aggregations compute correctly with custom formatter', function () {
            var aggMap = {
                agg1: {
                    aggType: 'Sum',
                    arguments: ['a_val'],
                    name: 'Sum A',
                    varName: 'a'
                },
                agg2: {
                    aggType: 'Sum',
                    arguments: ['b_val'],
                    name: 'Sum B',
                    varName: 'b'
                }
            };
            var derivedAggregations = [
                {
                    name: 'Total',
                    expression: 'variables.a + variables.b',
                    formatter: function (x) { return 'Total: ' + x; }
                }
            ];

            var cellAgg = buildAggregatorCell(aggMap, derivedAggregations, [
                { a_val: 10, b_val: 5 },
                { a_val: 20, b_val: 15 }
            ]);

            var result = cellAgg.multivalue();
            expect(result['Sum A']).toBe(30);
            expect(result['Sum B']).toBe(20);
            expect(result['Total']).toBe(50);
            expect(cellAgg.format(result['Total'], 'Total')).toBe('Total: 50');
        });
    });
});
