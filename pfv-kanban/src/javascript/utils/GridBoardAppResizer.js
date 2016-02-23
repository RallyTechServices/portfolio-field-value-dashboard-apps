(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define('Rally.app.plugin.GridBoardAppResizer', {
        alias: 'plugin.rallygridboardappresizer',
        extend: 'Ext.AbstractPlugin',

        init: function (cmp) {
            this.cmp = cmp;

            cmp.on('contentupdated', function () {
                if (!this.cmp.isDestroyed) {
                    this._sizeGridBoardsToPage();

                    if (!this._listenerAdded) {
                        this._listenerAdded = true;
                        Ext.EventManager.onWindowResize(this._sizeGridBoardsToPage, this);
                    }
                }
            }, this);

            cmp.on('destroy', function () {
                if (this._listenerAdded) {
                    Ext.EventManager.removeResizeListener(this._sizeGridBoardsToPage, this);
                }
            }, this);
        },

        _getFooterHeight: _.memoize(function () {
            var footerContainerEl = Ext.get(Ext.query('.footer-container')[0]);
            return (footerContainerEl && footerContainerEl.getHeight()) || 0;
        }),

        _getTotalParentBottomPadding: _.memoize(function () {
            var el = this.cmp.getEl();
            var totalBottomPadding = 0;

            while(el && el.id !== 'content') {
                totalBottomPadding += el.getPadding('b') + el.getBorderWidth('b');
                el = el.parent();
            }

            return totalBottomPadding;
        }),

        _sizeGridBoardsToPage: function () {
            var gridboards = this.cmp.query('rallygridboard');

            if (gridboards.length) {
                var appTop = this.cmp.getEl().getTop();
                var availableHeight = this.cmp.getHeight();
                var minHeight = availableHeight;
                var windowHeight = Rally.util.Window.getHeight();

                if (this.cmp.isFullPageApp) {
                    availableHeight = windowHeight - appTop - this._getFooterHeight() - this._getTotalParentBottomPadding() - 3;
                    minHeight = (600 - (windowHeight - availableHeight)) / gridboards.length;
                }

                _.each(gridboards, function (gridboard) {
                    if (gridboard.rendered) {
                        var container = gridboard.up();
                        var prevEl = container.getEl().prev();
                        var containerHeaderHeight = gridboard.getEl().getTop() - (prevEl ? prevEl.getBottom() : appTop);
                        gridboard.setHeight(Math.max(minHeight, (availableHeight / gridboards.length) - containerHeaderHeight));
                    }
                });
            }
        }
    });
})();