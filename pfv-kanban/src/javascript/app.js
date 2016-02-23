(function () {
    var Ext = window.Ext4 || window.Ext;

    /**
     * PI Kanban Board App
     * Displays a cardboard and a type selector. Board shows States for the selected Type.
     */
    Ext.define('pfv-kanban', {
        extend: 'Rally.app.App',
        logger: new Rally.technicalservices.Logger(),
        appName: 'Portfolio Kanban',
        autoScroll: false,
        cls: 'portfolio-kanban',
        statePrefix: 'portfolio-kanban',
        toggleState: 'board',
        settingsScope: 'project',

        config: {
            defaultSettings: {
                fields: 'Discussion,PercentDoneByStoryCount,UserStories,Milestones',
                showScopeSelector: true,

            },
            selectorConfig: {
                renderInGridHeader: false
            }
        },

        mixins: [
            "Rally.clientmetrics.ClientMetricsRecordable"
        ],

        clientMetrics: [
            {
                method: '_showHelp',
                description: 'portfolio-kanban-show-help'
            }
        ],

        plugins: ['rallygridboardappresizer'],

        actionMenuItems: [],

        enableGridBoardToggle: false,
        enableAddNew: true,
        gridConfig: {},
        gridStoreConfig: {},
        addNewConfig: {},
        enableImport: true,
        enableCsvExport: true,
        enablePrint: true,
        enableRanking: true,
        isWorkspaceScoped: false,
        modelNames: [],
        modelsContext: null,
        printHeaderLabel: '',
        allowExpansionStateToBeSaved: true,
        initEvents: function() {
            this.callParent(arguments);
            this.addEvents(
                /**
                 * @event
                 * Fires after a gridboard has been added to the app.
                 * @param {Rally.ui.gridboard.GridBoard} gridboard
                 */
                'gridboardadded'
            );
        },
        launch: function () {
            this.addCls('portfolio-items-grid-board-app');
            if (Rally.environment.getContext().getSubscription().isModuleEnabled('Rally Portfolio Manager')) {
                this._loadGridBoardPreference();
                Rally.technicalservices.WsapiToolbox.fetchPortfolioItemTypes().then({
                    success: function(types){
                        this.portfolioItemTypes = types;
                        this._setupSelector();
                    },
                    scope: this
                });
            } else {
                this.add({
                    xtype: 'container',
                    html: '<div class="rpm-turned-off" style="padding: 50px; text-align: center;">You do not have RPM enabled for your subscription</div>'
                });
                this.publishComponentReady();
            }
        },
        _loadGridBoardPreference: function(){
            var gridboardPrefs = this.getSetting(this.getStateId('gridboard'));
            if (gridboardPrefs) {
                gridboardPrefs = Ext.JSON.decode(gridboardPrefs);
                this.toggleState = gridboardPrefs.toggleState || this.toggleState;
            }
        },
        _setupSelector: function(){
            this.logger.log('_setupSelector');
            if (this.gridboard){
                this.gridboard.destroy();
            }

            this.removeAll();

            this._addWaitingForSelectionContainer();
            this.subscribe(this, Rally.technicalservices.common.DashboardFilter.publishedEventName, this.updateDashboardFilter, this);
            this.publish(Rally.technicalservices.common.DashboardFilter.requestEventName, this);
        },
        _addWaitingForSelectionContainer: function(){

            var me = this;
            if (this.gridboard){
                this.gridboard.destroy();
            }

            this.gridboard = this.add({
                xtype: 'container',
                padding: 50,
                html: '<div class="message">No Dashboard Filter Selected. <a href="#">Try Again</a></div>',
                listeners: {
                    scope: this,
                    render: function(component) {
                        var link = component.getEl().down('a');
                        link.on('click', function(e) {
                            me.publish(Rally.technicalservices.common.DashboardFilter.requestEventName, this);
                        });
                    }
                }
            });
        },
        _getChildTypePath: function(parentType){
            var portfolioItemTypes = this.getPortfolioItemTypePathNames();
            this.logger.log('_getChildTypePath', parentType, portfolioItemTypes);
            var idx = _.indexOf(portfolioItemTypes, parentType.toLowerCase());
            if (idx > 0){
                return portfolioItemTypes[idx-1];
            }
            return null;
        },
        updateDashboardFilter: function(dashboardSettings){
            this.modelNames = [];
            this.currentChildType = null;

            if (!dashboardSettings){
                this._addWaitingForSelectionContainer();
                return;
            }

            var childTypePath = this._getChildTypePath(dashboardSettings.filterModelType);
            if (!childTypePath){
                this._addBlankGridboardMessage('Please select a ' + this.getPortfolioItemTypePathNames()[1] + ' or higher type of Portfolio Item to display its Portfolio Item children on this Kanban Board.');
                return;
            }

            this.logger.log('updateDashboardFilter', dashboardSettings, childTypePath);
            this.modelNames = [childTypePath];
            this.dashboardFilter = dashboardSettings;

            Rally.technicalservices.WsapiToolbox.fetchTypeDefinition(childTypePath).then({
                success: function(typeDefRecord){

                    this.currentChildType = typeDefRecord;
                    if(!this.rendered) {
                        this.on('afterrender', this.loadGridBoard, this, {single: true});
                    } else {
                        this.loadGridBoard();
                    }
                },
                failure: function(message){
                    Rally.ui.notify.Notifier.showError({message: message});
                },
                scope: this
            });


        },
        loadGridBoard: function () {

            if (this.gridboard) {
                this.gridboard.destroy();
            }
            this.logger.log('loadGridBoard', this.modelNames, this.currentChildType, this.gridboard);

            return Rally.data.ModelFactory.getModels({
                context: this.modelsContext || this.getContext(),
                types: this.modelNames,
                requester: this
            }).then({
                success: function (models) {
                    this.models = _.transform(models, function (result, value) {
                        result.push(value);
                    }, []);

                    this.modelNames = _.keys(models);

                    if(this.toggleState === 'board') {
                        return this.getCardBoardColumns().then({
                            success: function (columns) {
                                this.addGridBoard({
                                    columns: columns
                                });

                                if (!columns || columns.length === 0) {
                                    this.showNoColumns();
                                    this.publishComponentReady();
                                }
                            },
                            scope: this
                        });
                    } else {
                        this.addGridBoard();
                        this.publishComponentReady();
                    }
                },
                scope: this
            });
        },
        showNoColumns: function () {
            this.add({
                xtype: 'container',
                cls: 'no-type-text',
                html: '<p>This Type has no states defined.</p>'
            });
        },
        getCardBoardColumns: function () {
            return this._getStates().then({
                success: function (states) {
                    return this._buildColumns(states);
                },
                scope: this
            });
        },
        _buildColumns: function (states) {
            if (!states.length) {
                return undefined;
            }

            var columns = [
                {
                    columnHeaderConfig: {
                        headerTpl: 'No Entry'
                    },
                    value: null,
                    plugins: ['rallycardboardcollapsiblecolumns'].concat(this.getCardBoardColumnPlugins(null))
                }
            ];

            return columns.concat(_.map(states, function (state) {
                return {
                    value: state.get('_ref'),
                    wipLimit: state.get('WIPLimit'),
                    enableWipLimit: true,
                    columnHeaderConfig: {
                        record: state,
                        fieldToDisplay: 'Name',
                        editable: false
                    },
                    plugins: ['rallycardboardcollapsiblecolumns'].concat(this.getCardBoardColumnPlugins(state))
                };
            }, this));
        },
        _getStates: function () {
            var deferred = new Deft.Deferred();
            Ext.create('Rally.data.wsapi.Store', {
                model: Ext.identityFn('State'),
                context: this.getContext().getDataContext(),
                autoLoad: true,
                fetch: ['Name', 'WIPLimit', 'Description'],
                filters: [
                    {
                        property: 'TypeDef',
                        value: this.currentChildType.get('_ref')
                    },
                    {
                        property: 'Enabled',
                        value: true
                    }
                ],
                sorters: [
                    {
                        property: 'OrderIndex',
                        direction: 'ASC'
                    }
                ],
                listeners: {
                    load: function (store, records) {
                        deferred.resolve(records);
                    }
                }
            });
            return deferred.promise;
        },
        getPortfolioItemTypePathNames: function(){
            return _.map(this.portfolioItemTypes, function(t){ return t.typePath.toLowerCase(); });
        },
        getSettingsFields: function (context, config) {
            return Rally.technicalservices.Settings.getFields(this.getContext(), this.getSettings(), this.getPortfolioItemTypePathNames());
        },
        _addBlankGridboardMessage: function(message){
            if (this.gridboard){
                this.gridboard.destroy();
            }

            this.gridboard = this.add({
                xtype: 'container',
                padding: 50,
                html: Ext.String.format('<div class="message">{0}</div>',message),
            });
        },
        update: function(){
            alert('hhhh');
        },
        _createFilterItem: function(typeName, config) {
            return Ext.apply({
                xtype: typeName,
                margin: '-15 0 5 0',
                showPills: true,
                showClear: true
            }, config);
        },

        addGridBoard: function(options){

            this.gridboard = Ext.create('Rally.ui.gridboard.GridBoard', this.getGridBoardConfig(options));
            this.gridboard.on('filtertypeschange', this.onFilterTypesChange, this);

            this.add(this.gridboard);

            this.fireEvent('gridboardadded', this.gridboard);

            this.gridboard.getHeader().getRight().add([
                this._buildFilterInfo()
            ]);
        },
        getGridBoardPlugins: function () {

            return []
                .concat(this.enableAddNew ? [
                    {
                        ptype: 'rallygridboardaddnew',
                        context: this.getContext(),
                        addNewControlConfig: this.getAddNewConfig()
                    }
                ] : [])
                .concat([
                    _.merge({
                        ptype: 'rallygridboardcustomfiltercontrol',
                        containerConfig: {
                            width: 42
                        },
                        filterChildren: false,
                        filterControlConfig: _.merge({
                            margin: '3 9 3 0',
                            modelNames: this.modelNames,
                            stateful: true,
                            stateId: this.getScopedStateId('custom-filter-button')
                        }, this.getFilterControlConfig()),
                        ownerFilterControlConfig: {
                            stateful: true,
                            stateId: this.getScopedStateId('owner-filter')
                        },
                        showOwnerFilter: Rally.data.ModelTypes.areArtifacts(this.modelNames)
                    }, this.getGridBoardCustomFilterControlConfig()),
                    _.merge({
                        ptype: 'rallygridboardfieldpicker',
                        headerPosition: 'left'
                    }, this.getFieldPickerConfig())
                ])
                .concat([{
                    ptype: 'rallyboardpolicydisplayable',
                    pluginId: 'boardPolicyDisplayable',
                    prefKey: 'piKanbanPolicyChecked',
                    checkboxConfig: {
                        boxLabel: 'Show Policies',
                        margin: '2 5 5 5'
                    }
                }]);
        },

        getFilterControlConfig: function () {
            var config = {
                blackListFields: ['PortfolioItemType'],
                whiteListFields: ['Milestones']
            };

            return _.merge(config, {
                blackListFields: _.union(config.blackListFields, ['State'])
            });
        },
        getFieldPickerConfig: function () {
            var config = {
                gridFieldBlackList: Rally.ui.grid.FieldColumnFactory.getBlackListedFieldsForTypes(this.modelNames),
                boardFieldBlackList: [
                    'AcceptedLeafStoryCount',
                    'AcceptedLeafStoryPlanEstimateTotal',
                    'Blocker',
                    'DirectChildrenCount',
                    'LastUpdateDate',
                    'LeafStoryCount',
                    'LeafStoryPlanEstimateTotal',
                    'PortfolioItem',
                    'UnEstimatedLeafStoryCount'
                ],
                context: this.getContext()
            };

            return _.merge(config, {
                boardFieldBlackList: ['Predecessors', 'Successors'],
                margin: '3 9 14 0'
            });
        },
        getCardConfig: function () {
            return {
                xtype: 'rallyportfoliokanbancard'
            };
        },
        getCardBoardConfig: function (options) {
            options = options || {};
            var currentTypePath = this.currentChildType.get('TypePath');
            var filters = [];

            if (this.getSetting('query')) {
                try {
                    filters.push(Rally.data.QueryFilter.fromQueryString(this.getSetting('query')));
                } catch (e) {
                    Rally.ui.notify.Notifier.showError({ message: e.message });
                }
            }

            var config = {
                attribute: 'State',
                cardConfig: _.merge({
                    editable: true,
                    showColorIcon: true
                }, this.getCardConfig()),
                columnConfig: {
                    xtype: 'rallycardboardcolumn',
                    enableWipLimit: true,
                    fields: (this.getSetting('fields') || '').split(',')
                },
                columns: options.columns,
                ddGroup: currentTypePath,
                listeners: {
                    load: this.publishComponentReady,
                    cardupdated: this._publishContentUpdatedNoDashboardLayout,
                    scope: this
                },
                plugins: [{ ptype: 'rallyfixedheadercardboard' }],
                storeConfig: {
                    filters: filters,
                    context: this.getContext().getDataContext()
                },
                loadDescription: 'Portfolio Kanban'
            };

            if (this.getSetting('showRows') && this.getSetting('rowsField')) {
                Ext.apply(config, {
                    rowConfig: {
                        field: this.getSetting('rowsField'),
                        sortDirection: 'ASC'
                    }
                });
            }

            return config;
        },

        getCardBoardColumnPlugins: function (state) {
            var policyPlugin = this.gridboard && this.gridboard.getPlugin('boardPolicyDisplayable');

            return {
                ptype: 'rallycolumnpolicy',
                policyCmpConfig: {
                    xtype: 'rallyportfoliokanbanpolicy',
                    hidden: !policyPlugin,
                    title: 'Exit Policy',
                    stateRecord: state
                }
            };
        },

        publishComponentReady: function () {
            this.fireEvent('contentupdated', this);
            this.recordComponentReady();

            if (Rally.BrowserTest) {
                Rally.BrowserTest.publishComponentReady(this);
            }
            Rally.environment.getMessageBus().publish(Rally.Message.piKanbanBoardReady);
        },

        _buildFilterInfo: function () {
            this.filterInfo = this.isFullPageApp ? null : Ext.create('Rally.ui.tooltip.FilterInfo', {
                projectName: this.getSetting('project') && this.getContext().get('project').Name || 'Following Global Project Setting',
                scopeUp: this.getSetting('projectScopeUp'),
                scopeDown: this.getSetting('projectScopeDown'),
                query: this.getSetting('query')
            });

            return this.filterInfo;
        },

        _publishContentUpdatedNoDashboardLayout: function () {
            this.fireEvent('contentupdated', { dashboardLayout: false });
        },

        getGridBoardConfig: function (options) {

            var filters = this.dashboardFilter && this.dashboardFilter.getFilter(this.currentChildType.get('TypePath'), this.portfolioItemTypes) || [];
            this.logger.log('getGridboardConfig', filters.toString(),this.currentChildType.get('TypePath'))
            return {
                itemId: 'gridboard',
                stateId: this.getStateId('gridboard'),
                toggleState: this.toggleState,
                modelNames: _.clone(this.modelNames),
                context: this._getGridBoardContext(),
                addNewPluginConfig: this.getAddNewConfig(),
                plugins: this.getGridBoardPlugins(options),
                cardBoardConfig: this.getCardBoardConfig(options),
                chartConfig: this.getChartConfig(),
                height: this.getHeight(),
                storeConfig: {
                    filters: filters
                }
            };
        },

        getStateId: function (suffix) {
            return this.statePrefix + (suffix ? '-' + suffix : '');
        },

        getScopedStateId: function (suffix) {
            return this.getContext().getScopedStateId(this.getStateId(suffix));
        },
        getChartConfig: function () {
            return {};
        },

        onFilterTypesChange: function() {},

        _shouldEnableRanking: function() {
            return this.enableRanking && Rally.data.ModelTypes.areArtifacts(this.modelNames) && this.getContext().getWorkspace().WorkspaceConfiguration.DragDropRankingEnabled;
        },
        getPermanentFilters: function() {
            return [];
        },

        getColumnCfgs: function() {
            return _.isEmpty(this.columnNames) ? Rally.ui.grid.FieldColumnFactory.getDefaultFieldsForTypes(this.modelNames) : this.columnNames;
        },

        getGridPlugins: function () {
            return [{
                ptype: 'rallytreegridexpandedrowpersistence',
                allowExpansionStateToBeSaved: this.allowExpansionStateToBeSaved
            }];
        },

        _getGridBoardContext: function () {
            return this.isWorkspaceScoped ? this.getContext().clone({ project: null }) : this.getContext();
        },

        getAddNewConfig: function () {
            return _.merge({
                context: this.getContext(),
                margin: '0 30 0 0',
                stateful: true,
                stateId: this.getScopedStateId('add-new')
            }, this.addNewConfig);
        },
        getGridBoardCustomFilterControlConfig: function () {
            return {};
        },
        getHeight: function () {
            var height = this.callParent(arguments);
            return Ext.isIE8 ? Math.max(height, 600) : height;
        },

        setHeight: function(height) {
            this.callParent(arguments);
            if(this.gridboard) {
                this.gridboard.setHeight(height);
            }
        },

        xmlExportEnabled: function(){
            return false;
        }
    });
})();