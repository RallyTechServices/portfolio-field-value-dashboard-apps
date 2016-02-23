Ext.define('Rally.technicalservices.Settings', {
    singleton: true,
    requires: [
        'Rally.ui.combobox.FieldComboBox',
        'Rally.ui.combobox.ComboBox',
        'Rally.ui.CheckboxField'
    ],

    getFields: function (context, config, modelNames) {
        var labelWidth= 150;

        return [{
            name: 'groupHorizontallyByField',
            xtype: 'rowsettingsfield',
            fieldLabel: 'Swimlanes',
            margin: '10 0 10 0',
            mapsToMultiplePreferenceKeys: ['showRows', 'rowsField'],
            readyEvent: 'ready',
            labelWidth: labelWidth,
            whiteListFields: ['Parent'],
            modelNames: modelNames,
            isAllowedFieldFn: function (field) {
                var attr = field.attributeDefinition;
                return (attr.Custom && (attr.Constrained || attr.AttributeType.toLowerCase() !== 'string') ||
                    attr.Constrained || _.contains(['boolean'], attr.AttributeType.toLowerCase())) &&
                    !_.contains(['web_link', 'text', 'date'], attr.AttributeType.toLowerCase()) &&
                    !_.contains(['Archived', 'Portfolio Item Type', 'State'], attr.Name);
            }
        },{
            type: 'query',
            config: {
                plugins: [
                    {
                        ptype: 'rallyhelpfield',
                        helpId: 271
                    },
                    'rallyfieldvalidationui'
                ]
            }
        }];
    }
});