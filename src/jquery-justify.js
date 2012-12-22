/*
 * jquery-justify
 * https://github.com/hhelwich/jquery-justify
 *
 * Copyright (c) 2012 Hendrik Helwich
 * Licensed under the MIT license.
 */

(function ($) {
    'use strict';

    $.fn.justify = function (options) {

        // Create some defaults, extending them with any options that were provided
        var settings = $.extend({
                itemSelector: '',
                marginX: 20,
                marginY: 20
            }, options),
            that = this,
            rowMaxWidth = that.width();

        this.css({
            'position': 'relative'
        });


        function llll() {

            var rowMaxWidth = that.width(),
                items = that.children(settings.itemSelector),
                itemLength = items.length;

            // returns an array of the indices of the items which are the first in each row if the rows are breaking at
            // the given maximum width. The length of the array is the number of rows which are needed.
            function getRowFirstItems(maxWidth) {
                if (itemLength === 0) {
                    return [];
                }
                var rowFirstItems = [ 0 ],
                    i,
                    rowWidth = 0,
                    itemStored = true, // current item index is already stored in the array rowFirstItems
                    itemWidth;
                for (i = 0; i < itemLength; i += 1) {
                    itemWidth = $(items[i]).width();
                    // alert(i+":"+itemWidth);
                    rowWidth += itemWidth;
                    if (rowWidth > maxWidth) { // current item breaks max row width => break row
                        if (itemStored) {
                            rowWidth = 0;
                        } else {
                            rowFirstItems.push(i);
                            rowWidth = itemWidth + settings.marginX;
                        }
                    } else {
                        rowWidth += settings.marginX;
                    }
                    itemStored = false;
                }
                return rowFirstItems;
            }

            // binary search for row breaks for the rowMaxWidth and with the same number of rows as
            // getRowFirstItems but with a more even sectioning of the items
            function getRowFirstItemsOptimized(maxWidth) {
                var DEPTH = 8,
                    dif = maxWidth,
                    firstBest = getRowFirstItems(maxWidth),
                    firstBestWidth = maxWidth,
                    firstCurrent = firstBest,
                    i;
                for (i = 0; i < DEPTH; i += 1) {
                    dif /= 2;
                    if (firstCurrent.length > firstBest.length) { // needed more rows => increase width
                        maxWidth += dif;
                    } else {
                        if (firstBestWidth > maxWidth) {
                            firstBest = firstCurrent;
                            firstBestWidth = maxWidth;
                        }
                        maxWidth -= dif;
                    }
                    firstCurrent = getRowFirstItems(maxWidth);
                }
                return firstBest;
            }

            function createLineUp(items, maxWidth) {
                var firstRows = getRowFirstItemsOptimized(maxWidth),
                    row,
                    col = 0,
                    idx = 0,
                    nextRowFirstIdx,
                    rowWidth = 0,
                    maxHeight = 0,
                    rowMarginX,
                    height = 0,
                    rowLength = firstRows.length,
                    lineup = new Array(itemLength),
                    top,
                    left;

                for (row = 0; row < rowLength; row += 1) { // iterate rows
                    nextRowFirstIdx = firstRows[row + 1];
                    if (nextRowFirstIdx === undefined) {
                        nextRowFirstIdx = itemLength;
                    }
                    for (; idx < nextRowFirstIdx; idx += 1, col += 1) { // iterate row elements
                        maxHeight = Math.max($(items[idx]).height(), maxHeight);
                        rowWidth += $(items[idx]).width();
                    }
                    rowMarginX = ((rowMaxWidth - rowWidth) / (col - 1));

                    left = 0;
                    for (idx = firstRows[row]; idx < nextRowFirstIdx; idx += 1, col += 1) { // re-iterate row elements
                        top = height + Math.floor((maxHeight - $(items[idx]).height()) / 2);
                        lineup[idx] = {
                            'top': top + 'px',
                            'left': Math.floor(left) + 'px'
                        };
                        left += $(items[idx]).width() + rowMarginX;
                    }

                    height += maxHeight + settings.marginY;
                    rowWidth = 0;
                    col = 0;
                    maxHeight = 0;
                }
                lineup.height = height - settings.marginY;
                idx = 0;
                return lineup;

            }

            var lineup = createLineUp(items, rowMaxWidth);

            that.height(lineup.height);

            var idx;
            for (idx = 0; idx < itemLength; idx += 1) {
                $(items[idx]).css(lineup[idx]);
            }

        }

        $(window).resize(llll);

        llll();

        if (rowMaxWidth !== that.width()) { // scrollbar appeared
            llll();
        }

        return this;

    };
})(jQuery);