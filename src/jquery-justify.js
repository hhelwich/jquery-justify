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
        var that = this.first(), // only apply on first element of selection
            settings = $.extend({ // overwrite default settings with given options
                itemSelector: '',
                marginX: 20,
                marginY: 20,
                onChangeHeight: function (height) {
                    that.height(height);
                },
                accuracy: 10
            }, options),
            rowMaxWidth,  // store current width for that var in pixels here
            items = that.children(settings.itemSelector), // select elements which should be justified
            itemLength = items.length, // number of elements to be justified
            posStr = 'position',
            itemWiths = [],
            i;

        if (that.css(posStr) === 'static') {
            // given parent div is not relevant to absolute positioning of child elements if it has the css position
            // value 'static' (default), => set postioning of parent div to 'relative'
            that.css(posStr, 'relative');
        }
        // all items should be positioned absolutely (relative to parent div)
        items.css(posStr, 'absolute');

        // assume item width is fixed => store to increase performance
        itemWiths.length = itemLength; // expand array to needed size (hopefully faster)
        for (i = 0; i < itemLength; i += 1) { // store width of all items (to increase performance)
            itemWiths[i] = $(items[i]).width();
        }

        function justify() {
            var x = that.width();

            if (x === rowMaxWidth) { // width has not changed => nothing needs to be done
                return false;
            } else {
                rowMaxWidth = x;
            }

            /**
             * Returns an array of the indices of the items which are the first in each row if the rows are breaking at
             * the given maximum width. The length of the array is the number of rows which are needed.
             *
             * @param maxWidth
             * @return {Array}
             */
            function getRowFirstItems(maxWidth) {
                if (itemLength === 0) {
                    return [];
                }
                var rowFirstItems = [ 0 ],
                    i,
                    rowWidth = 0,
                    itemStored = true, // current item index is already stored in the array rowFirstItems
                    itemWidth;
                for (i = 0; i < itemLength; i += 1) { // iterate all items
                    itemWidth = itemWiths[i];
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

            /**
             * Returns an array of the same semantic and length as getRowFirstItems() but the items are sectioned in
             * an optimized way.
             * The optimization tries to arrange the items in a more even way (uses binary search to come to a result
             * fast)
             *
             * @param maxWidth
             * @return {Array}
             */
            function getRowFirstItemsOptimized(maxWidth) {
                var dif = maxWidth,
                    firstBest = getRowFirstItems(maxWidth),
                    firstBestWidth = maxWidth,
                    firstCurrent = firstBest,
                    i;
                for (i = 0; i < settings.accuracy; i += 1) {
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

            settings.onChangeHeight(lineup.height);

            var idx;
            for (idx = 0; idx < itemLength; idx += 1) {
                $(items[idx]).css(lineup[idx]);
            }

            return true;
        }

        $(window).resize(justify);

        while (justify()) {} // do twice if scroll bar appeared

        return this;

    };
})(jQuery);