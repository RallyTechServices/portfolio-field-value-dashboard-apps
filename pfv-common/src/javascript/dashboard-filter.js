Ext.define('Rally.technicalservices.common.DashboardFilter',{

    filterModelType: undefined,
    filterField: undefined,
    filterValue: undefined,
    filterOperator: '=',

    getFilter: function(resultsRecordType, portfolioItemTypes){

        portfolioItemTypes = portfolioItemTypes || [];
        resultsRecordType = resultsRecordType || this.filterModelType;

        var modelType = this.filterModelType.toLowerCase(),
            pi_types = portfolioItemTypes.length > 0 ? _.map(portfolioItemTypes, function(pi){return pi.typePath.toLowerCase()}) : [],
            idx = _.indexOf(pi_types, modelType),
            type_idx = _.indexOf(pi_types, resultsRecordType.toLowerCase());
        //console.log('idx', idx,type_idx);
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
            
            if ( Ext.isArray(this.filterValue) ) {
                var filters = Ext.Array.map(this.filterValue, function(value){
                    return {
                        property: properties.join('.'),
                        operator: this.filterOperator,
                        value: value
                    }
                },this);
                
                return Rally.data.wsapi.Filter.or(filters);
            }
            return Ext.create('Rally.data.wsapi.Filter', {
                property: properties.join('.'),
                operator: this.filterOperator,
                value: this.filterValue
            });
        } else if (type_idx === idx){
            if ( Ext.isArray(this.filterValue) ) {
                var filters = Ext.Array.map(this.filterValue, function(value){
                    return {
                        property: this._getFilterFieldProperty(),
                        operator: this.filterOperator,
                        value: value
                    }
                },this);
                
                return Rally.data.wsapi.Filter.or(filters);
            }
            
            return Ext.create('Rally.data.wsapi.Filter', {
                property: this._getFilterFieldProperty(),
                operator: this.filterOperator,
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
