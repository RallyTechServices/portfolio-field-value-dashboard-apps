Ext.override(Rally.ui.grid.TreeGrid,{

    /* 
     * Override applyState so that the grid's state is merged with the provided configured
     * columns.  This allows changes to the required columns to be applied.
     */
    applyState: function(state) {
        
        if (state) {
            if (state.columns) {
                
                // state columns might be objects, and column configs be an array of strings
                var state_column_names =  Ext.Array.map(state.columns, function(column){
                    if ( Ext.isObject(column) ) {
                        return column.dataIndex;
                    }
                    return column;
                });
                
                // for columns passed in, use state-saved version if available
                
                var unused_cfgs = Ext.Array.filter(this.columnCfgs, function(column){
                    var ignore_column_names = ['FormattedID','Rank','DragAndDropRank','Name'];
                    
                    if ( Ext.isObject(column) ) {
                        if ( Ext.Array.contains(ignore_column_names, column.dataIndex)) {
                            return false;
                        }
                        
                        return ! Ext.Array.contains(state_column_names, column.dataIndex);
                    }
                    
                    if ( Ext.Array.contains(ignore_column_names, column)){
                        return false;
                    }
                    return ! Ext.Array.contains(state_column_names, column);
                });
                
                // put unused ones at the end
                this.columnCfgs = Ext.Array.merge(state.columns, unused_cfgs);
            }

            if (state.sorters && this.storeConfig ) {
                this.storeConfig.sorters = _.map(state.sorters, function(sorterState) {
                    return Ext.create('Ext.util.Sorter', {
                        property: sorterState.property,
                        direction: sorterState.direction
                    });
                });
            }
        }
    }
});

