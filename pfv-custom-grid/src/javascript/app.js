Ext.define("pfv-custom-grid", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),
    defaults: { margin: 10 },

    config: {
        defaultSettings: {
            showScopeSelector: true,
            selectorType: null,
            type: 'hierarchicalrequirement',
            columnNames: ['FormattedID','Name'],
            showControls: true
        }
    },

    disallowedAddNewTypes: ['user', 'userprofile', 'useriterationcapacity', 'testcaseresult', 'task', 'scmrepository', 'project', 'changeset', 'change', 'builddefinition', 'build', 'program'],
    orderedAllowedPageSizes: [10, 25, 50, 100, 200],

    launch: function() {
        Rally.technicalservices.WsapiToolbox.fetchPortfolioItemTypes().then({
            success: function(portfolioItemTypes){
                this.portfolioItemTypes = portfolioItemTypes;
                this.addComponents();
            },
            failure: function(msg){
                this.logger.log('failed to load Portfolio Item Types', msg);
                Rally.ui.notify.Notifier.showError({message: msg});
            },
            scope: this
        });
    },
    getHeader: function(){
        this.logger.log('getHeader');
        return this.headerContainer;
    },
    getBody: function(){
        return this.displayContainer;
    },
    getGridboard: function(){
        return this.gridboard;
    },
    getModelNames: function(){
        return this.getSetting('type');
    },

    addComponents: function(){
        this.logger.log('addComponents',this.portfolioItemTypes);

        this.removeAll();

        this.headerContainer = this.add({xtype:'container',itemId:'header-ct', layout: {type: 'hbox'}});
        this.displayContainer = this.add({xtype:'container',itemId:'body-ct', tpl: '<tpl>{message}</tpl>'});

        this.subscribe(this, Rally.technicalservices.common.DashboardFilter.publishedEventName, this.updateDashboardFilter, this);
        this.publish(Rally.technicalservices.common.DashboardFilter.requestEventName, this);
    },
    updateDashboardFilter: function(dashboardSettings){
        this.logger.log('updateDashboardFilter', dashboardSettings);

        this.getBody().removeAll();
        this.dashboardFilter = dashboardSettings;
        this.loadGridBoard();

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
    onSettingsUpdate: function (settings){
        this.logger.log('onSettingsUpdate',settings);
        Ext.apply(this, settings);
        this.addComponents();
    },
    getSettingsFields: function() {
        return Rally.technicalservices.pfvCustomGridSettings.getFields(this.getContext());
    },
    getDashboardFilter: function(){
        this.logger.log('getDashboardFilter', this.dashboardFilter)

        if (!this.dashboardFilter){
            return [];
        }

        var filter = this.dashboardFilter.getFilter(this.getSetting('type').toLowerCase(),this.portfolioItemTypes);
        if (filter === null){
            Rally.ui.notify.Notifier.showError({message: "The selected type for the grid results is an ancestor to the selected portfolio item."});
            return [{property: 'ObjectID', value: 0}];
        }
        this.logger.log('getDashboardFilter', filter.toString());
        return filter;
    },
    loadGridBoard: function(){
        this.logger.log('loadGridBoard', this.getModelNames())
        this.enableAddNew = this._shouldEnableAddNew();
        this.enableRanking = this._shouldEnableRanking();

        Rally.data.ModelFactory.getModels({
            context: this.getContext(),
            types: this.getModelNames(),
            requester: this
        }).then({
            success: function (models) {
                this.models = _.transform(models, function (result, value) {
                    result.push(value);
                }, []);

                this.modelNames = _.keys(models);

                Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
                    autoLoad: false,
                    childPageSizeEnabled: true,
                    context: this.getContext().getDataContext(),
                    enableHierarchy: true,
                    fetch: this.columns,
                    models: _.clone(this.models),
                    pageSize: 25,
                    remoteSort: true,
                    filters: this.getPermanentFilters(),
                    root: {expanded: true}
                }).then({
                    success: this.addGridBoard,
                    scope: this
                });
            },
            scope: this
        });

    },
    getPermanentFilters: function () {
        var filters = this._getQueryFilter().concat(this.getDashboardFilter());
        this.logger.log('getPermanentFilters', filters);
        return filters;
    },
    _getQueryFilter: function () {
        var query = new Ext.Template(this.getSetting('query')).apply({
            projectName: this.getContext().getProject().Name,
            projectOid: this.getContext().getProject().ObjectID,
            user: this.getContext().getUser()._ref
        });
        var filter = [];
        if (query) {
            try {
                filter =  [ Rally.data.wsapi.Filter.fromQueryString(query) ];
            } catch(e) {
                Rally.ui.notify.Notifier.showError({ message: e.message });
                return filter;
            }
        }

        var invalidQueryFilters = this._findInvalidSubFilters(filter, this.models);
        if (invalidQueryFilters.length) {
            filter = [];
            var msg = _.map(invalidQueryFilters, function (filter) {
                return 'Could not find the attribute "'+ filter.property.split('.')[0] +'" on type "'+ this.models[0].displayName +'" in the query segment "'+ filter.toString() + '"'
            }, this);

            Rally.ui.notify.Notifier.showError({message: "Query is invalid:  " + msg });
        }
        return filter;
    },
    _propertyBelongsToSomeType: function(property, models){
        return _.some(models, function(model) {
            var field = model.getField(property) || model.getField(Ext.String.capitalize(property || ''));
            return field && !field.virtual;
        });
    },
    _findInvalidSubFilters: function(filters, models){
        return _(filters).map(this._getSubFilters, this).flatten().filter(function (subFilter) {
            return !this._propertyBelongsToSomeType(subFilter.property.split('.')[0], models);
        }, this).map(function (filter) {
            return Ext.create('Rally.data.wsapi.Filter', filter);
        }, this).value();
    },
    _getSubFilters: function(filter){
        var subFilters = [];
        var filterTraversal = function(filter) {
            if (_.isString(filter.property) && !_.contains(subFilters, filter.property) && filter.property !== 'TypeDefOid') {
                subFilters.push(filter);
            } else {
                if (_.isObject(filter.property)) {
                    filterTraversal(filter.property);
                }
                if (_.isObject(filter.value)) {
                    filterTraversal(filter.value);
                }
            }
        };

        filterTraversal(filter);

        return subFilters;
    },
    addGridBoard: function (store) {
        if (this.getGridboard()) {
            this.getGridboard().destroy();
        }

        var modelNames =  _.clone(this.modelNames),
            context = this.getContext(),
            alwaysSelectedFields = this._getAlwaysSelectedFields();

        var gridboard = Ext.create('Rally.ui.gridboard.GridBoard', {
            itemId: 'gridboard',
            toggleState: 'grid',
            modelNames: modelNames,
            context: this.getContext(),
            //** addNewPluginConfig: this.getAddNewConfig(),
            plugins:  [{
                ptype: 'rallygridboardaddnew',
                margin: '0 0 0 10'
             },{
                ptype: 'rallygridboardfieldpicker',
                headerPosition: 'left',
                modelNames: modelNames,
                gridAlwaysSelectedValues: ['FormattedID','Name'],  //alwaysSelectedFields,
                margin: '3 0 0 10'
            },{
                ptype: 'rallygridboardcustomfiltercontrol',
                filterControlConfig: {
                    modelNames: modelNames,
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('pfv-grid-filter')
                },
                showOwnerFilter: true,
                ownerFilterControlConfig: {
                    stateful: true,
                    stateId: this.getContext().getScopedStateId('pfv-owner-filter')
                }
            },{
                ptype: 'rallygridboardactionsmenu',
                menuItems: [
                    {
                        text: 'Export...',
                        handler: function() {
                            window.location = Rally.ui.gridboard.Export.buildCsvExportUrl(
                                this.down('rallygridboard').getGridOrBoard());
                        },
                        scope: this
                    }
                ],
                buttonConfig: {
                    iconCls: 'icon-export'
                }
            }

            ],
            storeConfig: {
                filters: this.getPermanentFilters()
            },
            gridConfig: {
                stateful: true,
                stateId: this.getContext().getScopedStateId('pfv-grid-grid-2'),
                state: ['columnschanged','viewready','reconfigure'],
                store: store,
                columnCfgs: this._getColumns(),
                height: this.getHeight()
            }
        });

        this.gridboard = this.add(gridboard);

        if (!this.getSetting('showControls')) {
            gridboard.getHeader().hide();
        }
    },
    _shouldEnableAddNew: function() {
        return !_.contains(this.disallowedAddNewTypes, this.getSetting('type').toLowerCase());
    },
    
    _shouldEnableRanking: function(){
        return this.getSetting('type').toLowerCase() !== 'task';
    },
    
    _getAlwaysSelectedFields: function() {
        var columns = this.getSetting('columnNames');

        if ( Ext.isEmpty(columns) ) {
            return [];
        }
        
        if ( Ext.isString(columns) ) {
            columns = columns.split(',');
        }
        
        columns = Ext.Array.filter( columns, function(column){
            return ( column != 'FormattedID' );
        });
        
        return Ext.Array.unique( columns );
    },

    _getColumns: function() {
        return this._getAlwaysSelectedFields();
    }        
});
