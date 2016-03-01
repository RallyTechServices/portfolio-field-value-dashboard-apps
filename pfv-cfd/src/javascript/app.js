(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define("pfv-cfd", {
        extend: "Rally.app.App",
        logger: new Rally.technicalservices.Logger(),
        cls: "portfolio-cfd-app",

        config: {
            defaultSettings: {
                //startDate: Rally.util.DateTime.add(new Date(), 'day', -30),
                //endDate: new Date(),
                calculationType: 'storycount'
            }
        },

        chartComponentConfig: {
            xtype: "rallychart",

            chartColors: Ext.create("Rally.apps.charts.Colors").cumulativeFlowColors(),

            queryErrorMessage: "No data to display.<br /><br />Most likely, stories are either not yet available or started for this portfolio item.",
            aggregationErrorMessage: "No data to display.<br /><br />Check the data type setting for displaying data based on count versus plan estimate.",

            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: {
                    "_TypeHierarchy": 'HierarchicalRequirement', //-51038,
                    "Children": null
                },
                removeUnauthorizedSnapshots: true,
                compress: true,
                fetch: ["ScheduleState", "PlanEstimate"],
                hydrate: ["ScheduleState"],
                sort: {
                    "_ValidFrom": 1
                }
            },

            calculatorType: "Rally.apps.charts.rpm.cfd.CumulativeFlowCalculator",

            chartConfig: {
                chart: {
                    defaultSeriesType: "area",
                    zoomType: "xy"
                },
                xAxis: {
                    categories: [],
                    tickmarkPlacement: "on",
                    // tickInterval: 5,
                    title: {
                        text: "Days",
                        margin: 10
                    }
                },
                yAxis: [
                    {
                        title: {
                            text: "Count"
                        }
                    }
                ],
                tooltip: {
                    formatter: function () {
                        return "" + this.x + "<br />" + this.series.name + ": " + this.y;
                    }
                },
                plotOptions: {
                    series: {
                        marker: {
                            enabled: false,
                            states: {
                                hover: {
                                    enabled: true
                                }
                            }
                        },
                        groupPadding: 0.01
                    },
                    area: {
                        stacking: 'normal',
                        marker: {
                            enabled: false
                        }
                    }
                }
            }
        },
        settingsScope: "workspace",

        mixins: [
            'Rally.apps.charts.DateMixin'
        ],

        scheduleStates: ["Defined", "In-Progress", "Completed", "Accepted"],

        PI_SETTING: "portfolioItemPicker",



        items: [
            {
                xtype: 'container',
                itemId: 'header',
                cls: 'header'
            }
        ],

        getSettingsFields: function () {
            return Rally.technicalservices.Settings.getSettings(this.getContext(),this.getSettings());
        },

        launch: function () {
            this.addEvents(
                'updateBeforeRender',
                'updateAfterRender'
            );


            //  this._addHelpComponent();
            this._setDefaultConfigValues();
            this._setupUpdateBeforeRender();

            this.addComponents();

            //this._loadSavedPortfolioItem();
            //Ext.create('Rally.apps.charts.IntegrationHeaders',this).applyTo(this.chartComponentConfig.storeConfig);
        },
        addComponents: function(){

            if (this.headerContainer){
                this.headerContainer.destroy();
            }
            if (this.displayContainer){
                this.displayContainer.destroy();
            }

            if (!this._validateSettingsChoices()) {
                return this.owner && this.owner.showSettings();
            }

            this.headerContainer = this.add({xtype:'container',itemId:'header-ct', layout: {type: 'hbox'}});
            this.displayContainer = this.add({xtype:'container',itemId:'body-ct', tpl: '<tpl>{message}</tpl>'});

            this.subscribe(this, Rally.technicalservices.common.DashboardFilter.publishedEventName, this.updateDashboardFilter, this);
            this.publish(Rally.technicalservices.common.DashboardFilter.requestEventName, this);

        },
        updateDashboardFilter: function(dashboardSettings){
            this.logger.log('updateDashboardFilter', dashboardSettings);

            this.displayContainer.removeAll();

            this.dashboardFilter = dashboardSettings;

            if (!dashboardSettings) {
                this._noDashboardFilters();
                return;
            }
            var filter = dashboardSettings.getFilter(dashboardSettings.filterModelType, []);

            Ext.create('Rally.data.wsapi.Store',{
                model: dashboardSettings.filterModelType,
                fetch: ['ObjectID','PlannedStartDate','PlannedEndDate','ActualStartDate','ActualEndDate'],
                filters: filter,
                limit: 'Infinity'
            }).load({
                scope: this,
                callback: function(records, operation){
                    this.logger.log('updateDashboardFilter', records, operation, filter);
                    if (operation.wasSuccessful()){
                        this._loadUserStories(records);
                    } else {
                        this._setErrorTextMessage("Error retrieving Portfolio Items: " + operation.error.errors.join(','));
                    }
                }
            });
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
        _setupUpdateBeforeRender: function () {
            this.chartComponentConfig.updateBeforeRender = this._setupDynamicHooksWithEvents(
                this.chartComponentConfig.updateBeforeRender,
                'updateBeforeRender'
            );

            this.chartComponentConfig.updateAfterRender = this._setupDynamicHooksWithEvents(
                this.chartComponentConfig.updateAfterRender,
                'updateAfterRender'
            );
        },

        _setupDynamicHooksWithEvents: function (func, event) {
            var self = this;

            return function () {
                self.fireEvent(event);
                if ('function' === typeof func) {
                    func.apply(this);
                }
            };
        },

        _setDefaultConfigValues: function () {
            var config = Ext.clone(this.chartComponentConfig);

            config.storeConfig.find = config.storeConfig.find || {};

            config.calculatorConfig = config.calculatorConfig || {};

            config.chartConfig = config.chartConfig || {};
            config.chartConfig.title = config.chartConfig.title || {};
            config.chartConfig.xAxis = config.chartConfig.xAxis || {};
            config.chartConfig.xAxis.type = config.chartConfig.xAxis.type || "datetime";
            config.chartConfig.yAxis = config.chartConfig.yAxis || [
                    {
                        title: {}
                    }
                ];

            this.chartComponentConfig = config;
        },

        _buildHelpComponent: function () {
            return Ext.create('Ext.Component', {
                renderTpl: Rally.util.Help.getIcon({
                    cls: Rally.util.Test.toBrowserTestCssClass(this.help.cls),
                    id: this.help.id
                })
            });
        },

        _validateSettingsChoices: function () {
            var startDate = this._getSettingStartDate(),
                endDate = this._getSettingEndDate(),
                dataType = this.getSetting("calculationType"),
                invalid = function (value) {
                    return !value || value === "undefined";
                };

            if (invalid(startDate) || invalid(endDate) || invalid(dataType)) {
                return false;
            }
            return true;
        },

        _getSettingStartDate: function() {
            this.logger.log('_getSettingStartDate',this.getSetting("startdate"),this.getSetting("startDate"))
            return this.getSetting("startdate") || this.getSetting("startDate");
        },

        _getSettingEndDate: function() {
            return this.getSetting("enddate") || this.getSetting("endDate");
        },

        _getSettingPortfolioItem: function() {
            var currentSetting = this.getSetting(this.PI_SETTING);
            if(currentSetting && currentSetting !== "undefined") {
                return currentSetting;
            }

            var previousSetting = this.getSetting("buttonchooser");
            if (previousSetting && previousSetting !== "undefined") {
                return Ext.JSON.decode(previousSetting).artifact._ref;
            }

            return "undefined";
        },

        _loadUserStories: function (records) {

            if (records && records.length > 0) {
                Rally.data.ModelFactory.getModel({
                    type: 'UserStory',
                    success: function (model) {
                        this._onUserStoryModelRetrieved(model, records);
                    },
                    scope: this
                });
            } else {
                this._setErrorTextMessage("A server error occurred, please refresh the page.");
            }
        },

        _onUserStoryModelRetrieved: function (model, portfolioItems) {
            var scheduleStateValues = model.getField('ScheduleState').getAllowedStringValues();
            this.chartComponentConfig.calculatorConfig.scheduleStates = scheduleStateValues;


            this._setDynamicConfigValues();
            this._calculateDateRange(portfolioItems);
            this._updateQueryConfig(portfolioItems);

            if (this.down('rallychart')){
                this.down('rallychart').destroy();
            }
            this._setErrorTextMessage(null);

            this.add(this.chartComponentConfig);
            Rally.environment.getMessageBus().publish(Rally.Message.piChartAppReady);
        },

        _setDynamicConfigValues: function () {
            this._updateChartConfigDateFormat();
            this.chartComponentConfig.chartConfig.title = this._buildChartTitle(this.dashboardFilter);
            this.chartComponentConfig.chartConfig.subtitle = this._buildChartSubtitle(this.dashboardFilter);

            this.chartComponentConfig.calculatorConfig.chartAggregationType = this._getAggregationType();
            this.chartComponentConfig.chartConfig.yAxis[0].title.text = this._getYAxisTitle();

            this.chartComponentConfig.chartConfig.yAxis[0].labels = {
                x: -5,
                y: 4
            };
        },

        _updateChartConfigDateFormat: function () {
            var self = this;

            this.chartComponentConfig.chartConfig.xAxis.labels = {
                x: 0,
                y: 20,
                formatter: function () {
                    return self._formatDate(self.dateStringToObject(this.value));
                }
            };
        },

        _formatDate: function (date) {
            var dateFormat = this._getUserConfiguredDateFormat() || this._getWorkspaceConfiguredDateFormat();

            return Rally.util.DateTime.format(date, dateFormat);
        },

        _getMinMaxDates: function(portfolioItems){
            var startFields = ['PlannedStartDate','ActualStartDate'],
                endFields = ['PlannedEndDate','ActualEndDate'],
                dates = {
                PlannedStartDate: null,
                ActualStartDate: null,
                PlannedEndDate: null,
                ActualEndDate: null,
            };

            Ext.Array.each(portfolioItems, function(p){
                Ext.Array.each(startFields, function(sf){
                    var s = p.get(sf);
                    if (s){
                        if (dates[sf] === null || s < dates[sf]){
                            dates[sf] = s;
                        }
                    }
                });
                Ext.Array.each(endFields, function(ef){
                    var e = p.get(ef);
                    if (e){
                        if (dates[ef] === null || e < dates[ef]){
                            dates[ef] = e;
                        }
                    }
                });
            });

            this.logger.log('_getMinMaxDates', dates);
            return dates;
        },

        _calculateDateRange: function (portfolioItems) {

            var portfolioDates = this._getMinMaxDates(portfolioItems);

            var calcConfig = this.chartComponentConfig.calculatorConfig;
            calcConfig.startDate = calcConfig.startDate || this._getChartStartDate(portfolioDates);
            calcConfig.endDate = calcConfig.endDate || this._getChartEndDate(portfolioDates);
            calcConfig.timeZone = calcConfig.timeZone || this._getTimeZone();

            this.chartComponentConfig.chartConfig.xAxis.tickInterval = this._configureChartTicks(calcConfig.startDate, calcConfig.endDate);
        },

        _updateQueryConfig: function (portfolioItems) {
            var portfolioItemOids = _.map(portfolioItems, function(p){ return p.get('ObjectID'); });
            this.chartComponentConfig.storeConfig.find._ItemHierarchy = {"$in": portfolioItemOids};
        },

        _configureChartTicks: function (startDate, endDate) {
            var pixelTickWidth = 125,
                appWidth = this.getWidth(),
                ticks = Math.floor(appWidth / pixelTickWidth);

            var startDateObj = this.dateStringToObject(startDate),
                endDateObj = this.dateStringToObject(endDate);

            var days = Math.floor((endDateObj.getTime() - startDateObj.getTime()) / 86400000);

            return Math.floor(days / ticks);
        },

        _getUserConfiguredDateFormat: function () {
            return this.getContext().getUser().UserProfile.DateFormat;
        },

        _getWorkspaceConfiguredDateFormat: function () {
            return this.getContext().getWorkspace().WorkspaceConfiguration.DateFormat;
        },

        _buildChartTitle: function (dashboardFilter) {
            var widthPerCharacter = 10,
                totalCharacters = Math.floor(this.getWidth() / widthPerCharacter),
                title = "Portfolio Item Chart",
                align = "center";

            if (dashboardFilter) {
                title = 'Portfolio Item ' + dashboardFilter.filterFieldDisplayName + " = " + dashboardFilter.filterValue;
            }

            if (totalCharacters < title.length) {
                title = title.substring(0, totalCharacters) + "...";
                align = "left";
            }

            return {
                text: null
                //text: title,
                //align: align,
                //margin: 30
            };
        },

        _buildChartSubtitle: function () {

            return {
                text: null,
                useHTML: true,
                align: "center"
            };
        },

        _getAggregationType: function () {
            return this.getSetting("calculationType");
        },

        _getYAxisTitle: function () {
            return this._getAggregationType() === "storypoints" ?
                "Points" :
                "Count";
        },

        _getChartStartDate: function (portfolioDates) {
            this.logger.log('_getChartStartDate', portfolioDates);
            var startDateSetting = this._getSettingStartDate().split(","),
                settingValue = startDateSetting[0],
                startDate;

            if(startDateSetting[0] === "selecteddate") {
                startDate = this.dateStringToObject(startDateSetting[1]);
            } else {
                startDate = this._dateFromSettingValue(portfolioDates, settingValue);
            }
            this.logger.log('_getChartStartDate', startDate);

            return this.dateToString(startDate);
        },

        _getChartEndDate: function (portfolioDates) {
            var endDateSetting = this._getSettingEndDate().split(","),
                settingValue = endDateSetting[0],
                endDate;

            if (endDateSetting[0] === "selecteddate") {
                endDate = this.dateStringToObject(endDateSetting[1]);
            } else {
                endDate = this._dateFromSettingValue(portfolioDates, settingValue);
            }

            if (!endDate){
                endDate = new Date();
            }

            this.logger.log('_getChartEndDate', endDate);
            return this.dateToString(endDate);
        },

        _dateFromSettingValue: function (dates, settingValue) {
            var settingsMap = {
                "plannedstartdate": "PlannedStartDate",
                "plannedenddate": "PlannedEndDate",
                "actualstartdate": "ActualStartDate",
                "actualenddate": "ActualEndDate"
            };

            if (settingValue === "today") {
                return new Date();
            }
            this.logger.log('_dateFromSettingValue', settingValue);

            if (settingsMap.hasOwnProperty(settingValue)) {
                this.logger.log('_dateFromSettingValue', dates[settingsMap[settingValue]]);
                return dates[settingsMap[settingValue]];
            }

            return new Date(settingValue);
        },
        _getTimeZone: function () {
            return this.getContext().getUser().UserProfile.TimeZone || this.getContext().getWorkspace().WorkspaceConfiguration.TimeZone;
        },

        _noDashboardFilters: function () {
            this._setErrorTextMessage('No Dashboard Filters specified.');
        },

        _setErrorTextMessage: function (message) {
            if (this.down('#errorMessage')){
                this.down('#errorMessage').destroy();
            }
            if (message){
                this.add({
                    xtype: 'displayfield',
                    itemId: 'errorMessage',
                    value: message
                });
            }
        }
    });
}());