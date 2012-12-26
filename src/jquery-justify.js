/*
 * jquery-justify
 * https://github.com/hhelwich/jquery-justify
 *
 * Copyright (c) 2012 Hendrik Helwich
 * Licensed under the MIT license.
 */

(function ($) {
    'use strict';

    /**
     * Returns an array of the indices of the items which are the first in each row if the rows are breaking at
     * the given maximum width. The length of the array is the number of rows which are needed.
     *
     * @param itemInfo
     * @param maxWidth
     * @param marginX
     * @return {Array}
     */
    function getRowFirstItems(itemInfo, maxWidth, marginX) {
        if (itemInfo.length === 0) {
            return [];
        }
        var rowFirstItems = [ 0 ],
            i,
            rowWidth = 0,
            itemStored = true, // current item index is already stored in the array rowFirstItems
            itemWidth;
        for (i = 0; i < itemInfo.length; i += 1) { // iterate all items
            itemWidth = itemInfo[i].width;
            rowWidth += itemWidth;
            if (rowWidth > maxWidth && itemInfo[i].breakBefore !== false) { // current item breaks max row width => break row
                if (itemStored) {
                    rowWidth = 0;
                } else {
                    rowFirstItems.push(i);
                    rowWidth = itemWidth + marginX;
                }
            } else {
                rowWidth += marginX;
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
     * @param itemInfo
     * @param maxWidth
     * @param marginX
     * @param accuracy
     * @return {Array}
     */
    function getRowFirstItemsOptimized(itemInfo, maxWidth, marginX, accuracy) {
        var dif = maxWidth,
            firstBest = getRowFirstItems(itemInfo, maxWidth, marginX),
            firstBestWidth = maxWidth,
            firstCurrent = firstBest,
            i;
        for (i = 0; i < accuracy; i += 1) {
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
            firstCurrent = getRowFirstItems(itemInfo, maxWidth, marginX);
        }
        return firstBest;
    }

    /**
     *
     * @param itemInfo
     * @param maxWidth
     * @param settings
     * @return {Array}
     */
    function createLineUp(itemInfo, maxWidth, settings) {
        var firstRows,
            row,
            col,
            idx,
            nextRowFirstIdx,
            rowWidth = 0,
            maxHeight = 0,
            rowMarginX,
            height,
            rowLength,
            lineup = [],
            top,
            left;

        maxWidth -= settings.marginLeft + settings.marginRight;

        firstRows = getRowFirstItemsOptimized(itemInfo, maxWidth, settings.marginX, settings.accuracy);
        rowLength = firstRows.length;

        lineup.length = itemInfo.length; // expand array with undefined elements to known length (performance)

        height = settings.marginTop;

        for (row = 0, idx = 0; row < rowLength; row += 1) { // iterate rows
            nextRowFirstIdx = firstRows[row + 1];
            if (nextRowFirstIdx === undefined) {
                nextRowFirstIdx = itemInfo.length;
            }
            for (col = 0; idx < nextRowFirstIdx; idx += 1, col += 1) { // iterate row elements
                // maxHeight: maximum height of all items in current row (type int)
                maxHeight = Math.max(itemInfo[idx].height, maxHeight);
                // rowWith: summed width of all items in current row (type int)
                rowWidth += itemInfo[idx].width;
            }
            // calculate marginX value for current row to stretch the row to the container width (type float)
            rowMarginX = ((maxWidth - rowWidth) / (col - 1));

            left = settings.marginLeft;
            // calculate the position for each item
            for (idx = firstRows[row]; idx < nextRowFirstIdx; idx += 1) { // re-iterate row elements
                top = height + ~~((maxHeight - itemInfo[idx].height) / 2);
                lineup[idx] = {
                    'top': top + 'px',
                    'left': ~~left + 'px'
                };
                left += itemInfo[idx].width + rowMarginX;
            }

            height += maxHeight + settings.marginY;
            rowWidth = 0;
            maxHeight = 0;
        }
        lineup.height = height - settings.marginY + settings.marginBottom;
        return lineup;
    }


    $.fn.justify = function (options) {

        // Create some defaults, extending them with any options that were provided
        var that = this.first(), // only apply on first element of selection
            settings = $.extend({ // overwrite default settings with given options
                itemSelector: '*',
                marginX: 20,
                marginY: 20,
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
                onChangeHeight: function (height) {
                    that.height(height);
                },
                accuracy: 10
            }, options),
            rowMaxWidth,  // store current width for that var in pixels here
            items = that.find(settings.itemSelector), // select elements which should be justified
            item,
            itemLength = items.length, // number of elements to be justified
            posStr = 'position',
            itemInfo = [],
            i,
            inBlock = false,
            dataBlock;

        if (that.css(posStr) === 'static') {
            // given parent div is not relevant to absolute positioning of child elements if it has the css position
            // value 'static' (default), => set postioning of parent div to 'relative'
            that.css(posStr, 'relative');
        }
        // all items should be positioned absolutely (relative to parent div)
        items.css(posStr, 'absolute');

        // assume item width/height is fixed => store to increase performance
        itemInfo.length = itemLength; // expand array to needed size (hopefully faster)
        for (i = 0; i < itemLength; i += 1) { // store info for all items (to increase performance)
            item = $(items[i]);
            itemInfo[i] = {
                item: item,
                width: item.width(),
                height: item.height(),
                breakBefore: !inBlock
            };
            dataBlock = item.attr('data-block');
            if (dataBlock !== undefined) {
                if (dataBlock === 'start') {
                    inBlock = true;
                } else if (dataBlock === 'end') {
                    inBlock = false;
                }
            }
        }
        item = undefined; // free for GC

        function justify() {
            var x = that.width(),
                lineup,
                idx;

            if (x === rowMaxWidth) { // width has not changed => nothing needs to be done
                return false;
            } else {
                rowMaxWidth = x;
            }

            lineup = createLineUp(itemInfo, rowMaxWidth, settings);

            settings.onChangeHeight(lineup.height);

            for (idx = 0; idx < itemLength; idx += 1) {
                itemInfo[idx].item.css(lineup[idx]);
            }

            return true;
        }

        $(window).resize(justify);

        while (justify()) {} // do twice if scroll bar appeared

        return this;
    };

})(jQuery);