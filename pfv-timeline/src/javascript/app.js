Ext.define("TSTimelineByPFV", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },
    
    integrationHeaders : {
        name : "TSTimelineByPFV"
    },
                        
    launch: function() {
        Rally.technicalservices.WsapiToolbox.fetchPortfolioItemTypes().then({
            success: function(portfolioItemTypes){
                this.portfolioItemTypes = portfolioItemTypes;
                // waiting for subscribe
                this.subscribe(this, Rally.technicalservices.common.DashboardFilter.publishedEventName, this.updateDashboardFilter, this);
                this.publish(Rally.technicalservices.common.DashboardFilter.requestEventName, this);
            },
            failure: function(msg){
                this.logger.log('failed to load Portfolio Item Types', msg);
                Rally.ui.notify.Notifier.showError({message: msg});
            },
            scope: this
        });
    },
    
    _updateData: function() {
        var me = this;
        
        this._loadItems().then({
            success: function(data) {
                me.setLoading(false);
                
                me._addTimeline(data);
            },
            failure: function(msg) {
                Ext.Msg.alert("Problem loading data", msg);
            }
        });
    },
    
    _loadItems: function() {
        this.setLoading('Gathering items...');
        
        var filters = this._getFilters();
        var beginning_iso = Rally.util.DateTime.toIsoString( Rally.util.DateTime.add(new Date(),'month', -3) );
        
        filters = filters.and(Ext.create('Rally.data.wsapi.Filter',{
            property:'PlannedEndDate', 
            operator: '>', 
            value: beginning_iso
        }));
        
        this.logger.log('model:', this.model);
        this.logger.log('filters:', filters);
        
        var config = {
            model: this.model,
            fetch: ['FormattedID','Name','PlannedEndDate', 'PlannedStartDate',
                'ActualStartDate', 'ActualEndDate'],
            sorters: [{property:'PlannedEndDate',direction:'ASC'}],
            filters: filters
        };
        
        this.logger.log('config:', config);
        
        return this._loadWsapiRecords(config);
    },
    
    updateDashboardFilter: function(dashboardSettings){
        this.logger.log('updateDashboardFilter', dashboardSettings);

        this.model = dashboardSettings.filterModelType;
        
        this.removeAll();
        this.filter = Ext.create('Rally.data.wsapi.Filter',{
            property:dashboardSettings.filterField, 
            value: dashboardSettings.filterValue
        });

        this._updateData();
    },
    
    _getFilters: function() {
        return this.filter;
    },
    
    _addTimeline: function(records) {
        this.add({
            xtype: 'tsalternativetimeline',
            height: this.getHeight() - 20 ,
            width: this.getWidth() - 20,
            records: records
        });

        this.setLoading(false);
    },
      
    _loadWsapiRecords: function(config){
        var deferred = Ext.create('Deft.Deferred');
        var me = this;
        var default_config = {
            model: 'Defect',
            fetch: ['ObjectID']
        };
        this.logger.log("Starting load:",config.model);
        Ext.create('Rally.data.wsapi.Store', Ext.Object.merge(default_config,config)).load({
            callback : function(records, operation, successful) {
                if (successful){
                    deferred.resolve(records);
                } else {
                    me.logger.log("Failed: ", operation);
                    deferred.reject('Problem loading: ' + operation.error.errors.join('. '));
                }
            }
        });
        return deferred.promise;
    },
    
    getOptions: function() {
        return [
            {
                text: 'About...',
                handler: this._launchInfo,
                scope: this
            }
        ];
    },
    
    _launchInfo: function() {
        if ( this.about_dialog ) { this.about_dialog.destroy(); }
        this.about_dialog = Ext.create('Rally.technicalservices.InfoLink',{});
    },
    
    isExternal: function(){
        return typeof(this.getAppId()) == 'undefined';
    },
    
    //onSettingsUpdate:  Override
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        // Ext.apply(this, settings);
        this.launch();
    }
});
