Ext.override(Rally.ui.filter.CustomFilterRow, {
    _getItems: function() {
        var items = [
            {
                xtype: 'rallycombobox',
                itemId: 'fieldCombobox',
                disabled: true,
                autoLoad: false,
                defaultSelectionPosition: null,
                store: Ext.create('Ext.data.Store', {
                    fields: ['attributeDefinition', 'displayName', 'modelNames', 'name']
                }),
                displayField: 'displayName',
                emptyText: 'Choose Field...',
                valueField: 'name',
                matchFieldWidth: true,
                listeners: {
                    select: this._onFieldSelect,
                    afterrender: this._onFieldAfterRender,
                    expand: this._onFieldExpand,
                    scope: this
                },
                width: this.boxWidths.field,
                filterProperties: ['displayName'],
                listConfig: {
                    itemTpl: new Ext.XTemplate('' +
                        '{displayName}',
                        '<tpl if="this.hasModelNames(values)">',
                            '<div class="duplicate-field-model-name">- {modelNames}</div>',
                        '</tpl>',
                        {
                            hasModelNames: function (data) {
                                return data.modelNames.length > 0;
                            }
                        })
                }
            },
            {
                xtype: 'rallycombobox',
                itemId: 'operatorCombobox',
                disabled: true,
                autoLoad: false,
                editable: false,
                forceSelection: true,
                store: Ext.create('Ext.data.Store', {
                    fields: ['name', 'displayName'],
                    listeners: {
                        datachanged: this._onOperatorDataChanged,
                        scope: this
                    }
                }),
                displayField: 'displayName',
                valueField: 'name',
                matchFieldWidth: true,
                listeners: {
                    setvalue: this._onOperatorSetValue,
                    scope: this
                },
                width: this.boxWidths.operator
            }
        ];

        if (!this._hasInitialData()) {
            items.push({
                xtype: 'rallytextfield',
                itemId: 'valueField',
                disabled: true,
                height: 22,
                width: this.boxWidths.value
            });
        }
        return items;
    }

});

Ext.override(Rally.ui.filter.CustomFilterPanel,{
    _getItems: function() {
        return [
            {
                xtype: 'container',
                cls: 'custom-filter-header',
                layout: 'column',
                defaults: {
                    xtype: 'component',
                    cls: 'filter-panel-label'
                },
                items: [
                    {
                        height: 1,
                        width: 30
                    },
                    // CHANGED these values to make headers line up
                    {
                        html: 'Field',
                        width: this.boxWidths.field + 5 || 135
                    },
                    {
                        html: 'Operator',
                        width: this.boxWidths.operator + 5|| 140
                    },
                    {
                        html: 'Value',
                        width: this.boxWidths.value + 5 || 155
                    }
                ]
            },
            {
                xtype: 'container',
                itemId: 'customFilterRows'
            }
        ];
    }
});