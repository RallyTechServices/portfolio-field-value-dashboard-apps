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

    publishedEventName: Rally.technicalservices.common.DashboardFilter.publishedEventName,

    launch: function() {
        this._getModel(this._getModelType()).then({
            scope: this,
            success: function(model) {
                this.model = model;
                this._addSelector(this.getSettings());
                this.subscribe(this, Rally.technicalservices.common.DashboardFilter.requestEventName, this._requestDashboardFilter, this);
            },
            failure: function(msg) {
                Ext.Msg.alert('',msg);
            }
        });
    },
    _getModel: function(model_type) {
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: model_type,
            success: function(model) {
                deferred.resolve(model);
            },
            failure: function(msg) {
                deferred.reject(msg);
            }
        });
        return deferred.promise;
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
    
    _getFieldType: function(){
        var cb = this.fieldValuePicker;
        var type = "unknown";
        
        if (cb && cb.model){
            var field = cb.model.getField(this._getFieldName());

            if (field) {
                this.logger.log(field);
                if ( field.attributeDefinition && field.attributeDefinition.AttributeType) {
                    type = field.attributeDefinition.AttributeType;
                }
            }
        }
        
        this.logger.log("Field is of type:", type);
        return type;
    },
    
    _getOperatorForFieldType: function(field_type) {
        var map = {
            'COLLECTION': 'contains'
        };
        
        return map[field_type] || '=';
        
    },
    
    getState: function(){
        return this.dashboardFilter || null;
    },
    applyState: function(state) {
        if (!Ext.isEmpty(state) && !Ext.Object.isEmpty(state)) {
            this.setDashboardFilter(state);
        }
    },
    _updateFilter: function(cb){
        if (cb){
            //if ( !Ext.isArray(cb.getValue())) {
                
                var df = Ext.create('Rally.technicalservices.common.DashboardFilter');
                    df.filterModelType = this._getModelType();
                    df.filterField = this._getFieldName();
                    df.filterFieldDisplayName = this._getFieldDisplayName();
                    df.filterValue = cb.getValue();
                    
                    df.filterOperator = this._getOperatorForFieldType(this._getFieldType());
            //}
            
            this.setDashboardFilter(df);
        }
    },
    setDashboardFilter: function(df){
        this.dashboardFilter = df;

        var filters = df.getFilter(df.filterModelType, []);
                
        if ( Ext.isEmpty(filters) ) {
            this.resultsStatus.update({message: ''});
            return;
        }
        
        Rally.technicalservices.WsapiToolbox.fetchWsapiCount(df.filterModelType, filters).then({
            scope: this,
            
            success: function(count){
                this.resultsStatus.update({message: count + ' items found'});
            },
            failure: function(msg){
                this.resultsStatus.update({message: 'Error: ' + msg});
            }
        });

        this.fireEvent('change', df);
//        this.publish(this.publishedEventName, df);
        if (this.stateful && this.stateId){
            this.saveState();
        }
    },
    _addSelector: function(settings){
        this.removeAll();

        this.logger.log('_addSelector', settings);
        var ct = this.add({
            xtype: 'container',
            layout: 'hbox',
            padding: 15
        });

        var picker_config = {
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
        };
        
        if (this._isAMultiSelectField(this._getFieldName()) ) {
            picker_config.multiSelect = true;
        }
        this.fieldValuePicker = ct.add(picker_config);
        
        this.fieldValuePicker.on('ready', this._updateLabel, this, {single: true});
        this.fieldValuePicker.on('change', this._updateFilter, this);

        this.goButton = ct.add({
            xtype: 'rallybutton',
            text: 'Go',
            itemId: 'pfv-go-button',
            cls: 'rly-small primary',
            margin: '15 10 0 5',
            listeners: {
                scope: this,
                click: function() {
                    this.logger.log('publishing ', this.publishedEventName, this._getDashboardFilter());
                    
                    this.publish(this.publishedEventName, this._getDashboardFilter() || null);
                }
            }
        });
        
        this.resultsStatus = ct.add({
            xtype: 'container',
            margin: 15,
            flex: 1,
            tpl: '<tpl>{message}</tpl>'
        });

    },
    
    _isAMultiSelectField: function(field_name) {
        var field = this.model.getField(field_name);
        
        if ( field && field.attributeDefinition && field.attributeDefinition.AttributeType == 'COLLECTION' ) {
            return true;
        }
        return false;
    },
    
    _updateLabel: function(cb){
        if (cb && cb.model){
            var field = cb.model.getField(this._getFieldName());

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
        this.logger.log("Filter requested");
        if ( this.down('#pfv-go-button') && ! this.down('#pfv-go-button').isDisabled() ) {
            this.publish(this.publishedEventName, this._getDashboardFilter() || null); 
        } else {
            this.logger.log("Filter requested, but go button is not available");
        }
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
