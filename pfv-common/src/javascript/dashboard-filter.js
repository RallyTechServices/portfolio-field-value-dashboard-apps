Ext.define('Rally.technicalservices.common.DashboardFilter',{


    filterModelType: undefined,
    filterField: undefined,
    filterValue: undefined,

    getFilter: function(resultsRecordType, portfolioItemTypes){
        //First verify that the selected portfolio item type is an ancestor to the selected grid type.
        var modelType = this.filterModelType.toLowerCase(),
            pi_types = _.map(portfolioItemTypes, function(pi){return pi.typePath.toLowerCase()}),
            idx = _.indexOf(pi_types, modelType),
            type_idx = _.indexOf(pi_types, resultsRecordType.toLowerCase());

        if (type_idx < idx) {
            var properties = [];
            for (var i = type_idx; i < idx; i++) {
                if (i < 0) {
                    properties.push("PortfolioItem");
                } else {
                    properties.push('Parent');
                }
            }
            properties.push(this._getFilterFieldProperty())
            return Ext.create('Rally.data.wsapi.Filter', {
                property: properties.join('.'),
                value: this.filterValue
            });
        } else if (type_idx === idx){
            return Ext.create('Rally.data.wsapi.Filter', {
                property: this._getFilterFieldProperty(),
                value:this.filterValue
            });
        } else {
            return null;
        }
    },
    _getFilterFieldProperty: function(){
        //if (Rally.technicalservices.common.DashboardFilter.referenceFieldAttributes[this.filterField]){
        //    return this.filterField + '.' + Rally.technicalservices.common.DashboardFilter.referenceFieldAttributes[this.filterField];
        //}
        return this.filterField;
    },
    statics: {
        publishedEventName: 'dashboardFilterUpdated',
        requestEventName: 'requestDashboardFilter'
    }
});
