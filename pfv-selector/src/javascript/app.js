Ext.define("pfv-selector", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    logger: new Rally.technicalservices.Logger(),

    config: {
        defaultSettings: {
            selectorType: 'portfolioitem/feature',
            selectorField: 'State'
        }
    },

    publishedEventName: 'dashboardFilterUpdated',

    launch: function() {
        this._addSelector(this.getSettings());
        this.subscribe(this, 'requestDashboardFilter', this._requestDashboardFilter, this);
    },
    _getModelType: function(){
        return this.getSetting('selectorType');
    },
    _getFieldName: function(){
        return this.getSetting('selectorField');
    },
    _getFieldDisplayName: function(){
        if (this.fieldValuePicker && this.fieldValuePicker.fieldLabel && this.fieldValuePicker.fieldLabel.length > 0){
            return this.fieldValuePicker.fieldLabel;
        }
        return null;
    },
    _getFieldValue: function(){
        return this.fieldValuePicker.getValue();
    },
    getState: function(){
        return this.dashboardFilter || null;
    },
    applyState: function(state) {
        if (!Ext.isEmpty(state) && !Ext.Object.isEmpty(state)) {
            console.log('applyState', state);
        }
        //    var ref = Ext.create('Rally.util.Ref',state.portfolioItemRef),
        //        type = ref.getType();
        //
        //    //don't apply the state if the type doesn't match.
        //    if (this.type && this.type.toLowerCase() !== type.toLowerCase()){
        //        this._updatePortfolioItem(null);
        //        return;
        //    }
        //
        //    Rally.data.ModelFactory.getModel({
        //        type: type,
        //        scope: this,
        //        success: function(model) {
        //            model.load(ref.getOid(),{
        //                scope: this,
        //                callback: function(result, operation){
        //                    if (result && operation.wasSuccessful()){
        //                        this._updatePortfolioItem(result);
        //                    } else {
        //                        this._updatePortfolioItem(null);
        //                        Rally.ui.notify.Notifier.showError({message: 'Could not load state for item [' + state + ']: ' + operation.error && operation.error.errors.join(',')});
        //                    }
        //
        //                }
        //            });
        //        },
        //        failure: function(){
        //            this._updatePortfolioItem(null);
        //            Rally.ui.notify.Notifier.showError({message: 'Could not load state for item [' + state + ']'});
        //        }
        //    });
        //} else {
        //    this._updatePortfolioItem(null);
        //}
    },
    _updateFilter: function(cb){
        if (cb){
           var df = Ext.create('Rally.technicalservices.common.DashboardFilter');
            df.filterModelType = this._getModelType();
            df.filterField = this._getFieldName();
            df.filterFieldDisplayName = this._getFieldDisplayName();
            df.filterValue = cb.getValue();
            this.dashboardFilter = df;
            this.fireEvent('change', df);
            this.publish(this.publishedEventName, df);
            if (this.stateful && this.stateId){
                this.saveState();
            }
        }
    }
    ,
    _addSelector: function(settings){
        this.removeAll();

        this.logger.log('_addSelector', settings);

        this.fieldValuePicker = this.add({
            xtype: 'rallyfieldvaluecombobox',
            model: this._getModelType(),
            field: this._getFieldName(),
            labelAlign: 'right',
            labelWidth: 100,
            fieldLabel: this._getFieldName(),
            stateId: this.getContext().getScopedStateId('pfv-app-selector'),
            margin: 15,
            width: 400,
            flex: 1
        });
        this.fieldValuePicker.on('ready', this._updateLabel, this, {single: true});
        this.fieldValuePicker.on('change', this._updateFilter, this);

    },
    _updateLabel: function(cb){
        if (cb && cb.model){
            var field = cb.model.getField(this._getFieldName());
            console.log('field', field);
            if (field) {
                cb.setFieldLabel(field.displayName);
            }
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
    _getDashboardFilter: function(){
        return this.dashboardFilter || null;
    },
    _requestDashboardFilter : function() {
        this.publish(this.publishedEventName, this._getDashboardFilter() || null);
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
        this._addSelector(settings);
    },
    getSettingsFields: function() {
        var filters = [{
            property: 'TypePath',
            operator: 'contains',
            value: 'PortfolioItem/'
        }];

        return [{
            name: 'selectorType',
            xtype: 'rallycombobox',
            allowBlank: false,
            autoSelect: false,
            shouldRespondToScopeChange: true,
            fieldLabel: 'Portfolio Item Type',
            context: this.getContext(),
            storeConfig: {
                model: Ext.identityFn('TypeDefinition'),
                sorters: [{ property: 'DisplayName' }],
                fetch: ['DisplayName', 'ElementName', 'TypePath', 'Parent', 'UserListable'],
                filters: filters,
                autoLoad: false,
                remoteSort: false,
                remoteFilter: true
            },
            displayField: 'DisplayName',
            valueField: 'TypePath',
            readyEvent: 'ready',
            bubbleEvents: ['change']
        },{
            name: 'selectorField',
            xtype: 'rallyfieldcombobox',
            allowBlank: false,
            fieldLabel: 'Field',
            context: this.getContext(),
            model: 'PortfolioItem/Feature',
            handlesEvents: {
                change: function(cb){
                    this.refreshWithNewModelType(cb.getRecord().get('TypePath'));
                }
            }
        }];
    }
});
