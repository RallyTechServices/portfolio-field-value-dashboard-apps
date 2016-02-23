(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define("pfv-cfd", {
        extend: "Rally.app.App",
        logger: new Rally.technicalservices.Logger(),
        cls: "portfolio-cfd-app",

        type: this.getSetting('selectorType'),
        chartComponentConfig: {
            xtype: "rallychart",

            chartColors: Ext.create("Rally.apps.charts.Colors").cumulativeFlowColors(),

            queryErrorMessage: "No data to display.<br /><br />Most likely, stories are either not yet available or started for this portfolio item.",
            aggregationErrorMessage: "No data to display.<br /><br />Check the data type setting for displaying data based on count versus plan estimate.",

            storeType: 'Rally.data.lookback.SnapshotStore',
            storeConfig: {
                find: {
                    "_TypeHierarchy": -51038,
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
            this.logger.log('addComponents',this.portfolioItemTypes);

            if (this.headerContainer){
                this.headerContainer.destroy();
            }
            if (this.displayContainer){
                this.displayContainer.destroy();
            }

            this.headerContainer = this.add({xtype:'container',itemId:'header-ct', layout: {type: 'hbox'}});
            this.displayContainer = this.add({xtype:'container',itemId:'body-ct', tpl: '<tpl>{message}</tpl>'});

            this.subscribe(this, Rally.technicalservices.common.DashboardFilter.publishedEventName, this.updateDashboardFilter, this);
            this.publish(Rally.technicalservices.common.DashboardFilter.requestEventName, this);

        },
        updateDashboardFilter: function(dashboardSettings){
            this.logger.log('updateDashboardFilter', dashboardSettings);

            this.displayContainer.removeAll();

            this.portfolioItem = dashboardSettings;


            if (!portfolioItemRecord || !this._savedPortfolioItemValid(portfolioItemRecord.getData())) {
                this._portfolioItemNotValid();
                return;
            }

            if (portfolioItemRecord) {
                Rally.data.ModelFactory.getModel({
                    type: 'UserStory',
                    success: function (model) {
                        this._onUserStoryModelRetrieved(model, portfolioItemRecord.getData());
                    },
                    scope: this
                });
            } else {
                this._setErrorTextMessage("A server error occurred, please refresh the page.");
            }
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

        _loadSavedPortfolioItem: function () {
            if (!this._validateSettingsChoices()) {
                return this.owner && this.owner.showSettings();
            }

            var portfolioItemRef = this.getSetting(this.PI_SETTING);
            var store = Ext.create("Rally.data.wsapi.Store", {
                model: Ext.identityFn("Portfolio Item"),
                filters: [
                    {
                        property: "ObjectID",
                        operator: "=",
                        value: Rally.util.Ref.getOidFromRef(portfolioItemRef)
                    }
                ],
                context: {
                    workspace: this.getContext().getWorkspaceRef(),
                    project: null
                },
                scope: this
            });

            store.on('load', this._onPortfolioItemRetrieved, this);
            store.load();
        },

        _validateSettingsChoices: function () {
            var piRef = this._getSettingPortfolioItem(),
                startDate = this._getSettingStartDate(),
                endDate = this._getSettingEndDate(),
                dataType = this.getSetting("calculationType"),
                invalid = function (value) {
                    return !value || value === "undefined";
                };

            if (invalid(piRef) || invalid(startDate) || invalid(endDate) || invalid(dataType)) {
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

        _savedPortfolioItemValid: function (savedPi) {
            return !!(savedPi && savedPi._type && savedPi.ObjectID && savedPi.Name);
        },

        _onPortfolioItemRetrieved: function (store) {
            var storeData = store.getAt(0),
                portfolioItemRecord = storeData.data;

            if (!this._savedPortfolioItemValid(portfolioItemRecord)) {
                this._portfolioItemNotValid();
                return;
            }

            if (portfolioItemRecord) {
                Rally.data.ModelFactory.getModel({
                    type: 'UserStory',
                    success: function (model) {
                        this._onUserStoryModelRetrieved(model, portfolioItemRecord);
                    },
                    scope: this
                });
            } else {
                this._setErrorTextMessage("A server error occurred, please refresh the page.");
            }
        },

        _onUserStoryModelRetrieved: function (model, portfolioItem) {
            var scheduleStateValues = model.getField('ScheduleState').getAllowedStringValues();
            this.chartComponentConfig.calculatorConfig.scheduleStates = scheduleStateValues;

            this._setDynamicConfigValues(portfolioItem);
            this._calculateDateRange(portfolioItem);
            this._updateQueryConfig(portfolioItem);

            if (this.down('rallychart')){
                this.down('rallychart').destroy();
            }
            this._setErrorTextMessage(null);

            this.add(this.chartComponentConfig);
            Rally.environment.getMessageBus().publish(Rally.Message.piChartAppReady);
        },

        _setDynamicConfigValues: function (portfolioItem) {
            this._updateChartConfigDateFormat();
            this.chartComponentConfig.chartConfig.title = this._buildChartTitle(portfolioItem);
            this.chartComponentConfig.chartConfig.subtitle = this._buildChartSubtitle(portfolioItem);

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

        _calculateDateRange: function (portfolioItem) {
            var calcConfig = this.chartComponentConfig.calculatorConfig;
            calcConfig.startDate = calcConfig.startDate || this._getChartStartDate(portfolioItem);
            calcConfig.endDate = calcConfig.endDate || this._getChartEndDate(portfolioItem);
            calcConfig.timeZone = calcConfig.timeZone || this._getTimeZone();

            this.chartComponentConfig.chartConfig.xAxis.tickInterval = this._configureChartTicks(calcConfig.startDate, calcConfig.endDate);
        },

        _updateQueryConfig: function (portfolioItem) {
            this.chartComponentConfig.storeConfig.find._ItemHierarchy = portfolioItem.ObjectID;
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

        _buildChartTitle: function (portfolioItem) {
            var widthPerCharacter = 10,
                totalCharacters = Math.floor(this.getWidth() / widthPerCharacter),
                title = "Portfolio Item Chart",
                align = "center";

            if (portfolioItem) {
                title = portfolioItem.FormattedID + ": " + portfolioItem.Name;
            }

            if (totalCharacters < title.length) {
                title = title.substring(0, totalCharacters) + "...";
                align = "left";
            }

            return {
                text: title,
                align: align,
                margin: 30
            };
        },

        _buildChartSubtitle: function (portfolioItem) {
            var widthPerCharacter = 6,
                totalCharacters = Math.floor(this.getWidth() / widthPerCharacter),
                plannedStartDate = "",
                plannedEndDate = "";

            var template = Ext.create("Ext.XTemplate",
                '<tpl if="plannedStartDate">' +
                '<span>Planned Start: {plannedStartDate}</span>' +
                '    <tpl if="plannedEndDate">' +
                '        <tpl if="tooBig">' +
                '            <br />' +
                '        <tpl else>' +
                '            &nbsp;&nbsp;&nbsp;' +
                '        </tpl>' +
                '    </tpl>' +
                '</tpl>' +
                '<tpl if="plannedEndDate">' +
                '    <span>Planned End: {plannedEndDate}</span>' +
                '</tpl>'
            );

            if (portfolioItem && portfolioItem.PlannedStartDate) {
                plannedStartDate = this._formatDate(portfolioItem.PlannedStartDate);
            }

            if (portfolioItem && portfolioItem.PlannedEndDate) {
                plannedEndDate = this._formatDate(portfolioItem.PlannedEndDate);
            }

            var formattedTitle = template.apply({
                plannedStartDate: plannedStartDate,
                plannedEndDate: plannedEndDate,
                tooBig: totalCharacters < plannedStartDate.length + plannedEndDate.length + 60
            });

            return {
                text: formattedTitle,
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

        _getChartStartDate: function (portfolioItem) {
            var startDateSetting = this._getSettingStartDate().split(","),
                settingValue = startDateSetting[0],
                startDate;

            if(startDateSetting[0] === "selecteddate") {
                startDate = this.dateStringToObject(startDateSetting[1]);
            } else {
                startDate = this._dateFromSettingValue(portfolioItem, settingValue);
            }

            this.logger.log('_getChartStartDate', startDate);
            return this.dateToString(startDate);
        },

        _getChartEndDate: function (portfolioItem) {
            var endDateSetting = this._getSettingEndDate().split(","),
                settingValue = endDateSetting[0],
                endDate;

            if (endDateSetting[0] === "selecteddate") {
                endDate = this.dateStringToObject(endDateSetting[1]);
            } else {
                endDate = this._dateFromSettingValue(portfolioItem, settingValue);
            }

            this.logger.log('_getChartEndDate', endDate);
            return this.dateToString(endDate);
        },

        _dateFromSettingValue: function (portfolioItem, settingValue) {
            var settingsMap = {
                "plannedstartdate": "PlannedStartDate",
                "plannedenddate": "PlannedEndDate",
                "actualstartdate": "ActualStartDate",
                "actualenddate": "ActualEndDate"
            };

            if (settingValue === "today") {
                return new Date();
            }

            if (settingsMap.hasOwnProperty(settingValue)) {
                return portfolioItem[settingsMap[settingValue]];
            }

            return new Date(settingValue);
        },

        _getTimeZone: function () {
            return this.getContext().getUser().UserProfile.TimeZone || this.getContext().getWorkspace().WorkspaceConfiguration.TimeZone;
        },

        _portfolioItemNotValid: function () {
            this._setErrorTextMessage('Cannot find the chosen portfolio item.  Please choose another.');
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