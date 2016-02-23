Ext.define('Rally.technicalservices.WsapiToolbox', {
    singleton: true,
    fetchWsapiCount: function(model, query_filters){
        var deferred = Ext.create('Deft.Deferred');

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: model,
            fetch: ['ObjectID'],
            filters: query_filters,
            limit: 1,
            pageSize: 1
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(operation.resultSet.totalRecords);
                } else {
                    deferred.reject(Ext.String.format("Error getting {0} count for {1}: {2}", model, query_filters.toString(), operation.error.errors.join(',')));
                }
            }
        });
        return deferred;
    },
    fetchModelTypePathByTypeDefinition: function(typeDef){
        var deferred = Ext.create('Deft.Deferred');
        var typeDefId = 0;
        if (typeDef){
            typeDefId = typeDef.replace('/typedefinition/','');
        }

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: 'TypeDefinition',
            fetch: ['TypePath','Name'],
            filters: [{
                property: 'ObjectID',
                value: typeDefId
            }]
        }).load({
            callback: function(records, operation, success){
                if (success && records && records.length > 0){
                    deferred.resolve(records[0].get('TypePath'));
                } else {
                    deferred.resolve(null); //(Ext.String.format("Error getting TypeDefinition for {1}: {0}", operation.error.errors.join(','), typeDef));
                }
            }
        });
        return deferred;
    },
    fetchWsapiRecords: function(model, query_filters, fetch_fields, context){
        var deferred = Ext.create('Deft.Deferred');

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: model,
            fetch: fetch_fields,
            filters: query_filters,
            context: context,
            limit: Infinity
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(records);
                } else {
                    deferred.reject(Ext.String.format("Error getting {0} for {1}: {2}", model, query_filters.toString(), operation.error.errors.join(',')));
                }
            }
        });
        return deferred;
    },
    fetchReleases: function(timebox){

        var deferred = Ext.create('Deft.Deferred'),
            rec = timebox.getRecord(),
            me = this;

        if (rec === null) {
            deferred.resolve([]);
        }

        Ext.create('Rally.data.wsapi.Store',{
            model: 'Release',
            fetch: ['ObjectID'],
            filters: [{
                property: 'Name',
                value: rec.get('Name')
            },{
                property: 'ReleaseStartDate',
                value: rec.get('ReleaseStartDate')
            },{
                property: 'ReleaseDate',
                value: rec.get('ReleaseDate')
            }],
            limit: Infinity
        }).load({
            callback: function(records, operation, success){
                if (success){
                    deferred.resolve(records);
                }   else {
                    deferred.reject("Error loading Releases: " + operation.error.errors.join(','));
                }
            }
        });
        return deferred;
    },

    fetchAllowedValues: function(model,field_name) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: model,
            success: function(model) {
                model.getField(field_name).getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        var values = Ext.Array.map(records, function(record) {
                            return record.get('StringValue');
                        });
                        deferred.resolve(values);
                    }
                });
            },
            failure: function(msg) { deferred.reject('Error loading field values: ' + msg); }
        });
        return deferred;
    },
    fetchPortfolioItemTypes: function(){
        var deferred = Ext.create('Deft.Deferred');

        var store = Ext.create('Rally.data.wsapi.Store', {
            model: 'TypeDefinition',
            fetch: ['TypePath', 'Ordinal','Name'],
            filters: [{
                property: 'TypePath',
                operator: 'contains',
                value: 'PortfolioItem/'
            }],
            sorters: [{
                property: 'Ordinal',
                direction: 'ASC'
            }]
        });
        store.load({
            callback: function(records, operation, success){
                if (success){
                    var portfolioItemTypes = new Array(records.length);
                    _.each(records, function(d){
                        //Use ordinal to make sure the lowest level portfolio item type is the first in the array.
                        var idx = Number(d.get('Ordinal'));
                        portfolioItemTypes[idx] = { typePath: d.get('TypePath'), name: d.get('Name') };
                        //portfolioItemTypes.reverse();
                    });
                    deferred.resolve(portfolioItemTypes);
                } else {
                    var error_msg = '';
                    if (operation && operation.error && operation.error.errors){
                        error_msg = operation.error.errors.join(',');
                    }
                    deferred.reject('Error loading Portfolio Item Types:  ' + error_msg);
                }
            }
        });
        return deferred.promise;
    },
    fetchDoneStates: function(){
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: 'HierarchicalRequirement',
            success: function(model) {
                var field = model.getField('ScheduleState');
                field.getAllowedValueStore().load({
                    callback: function(records, operation, success) {
                        if (success){
                            var values = [];
                            for (var i=records.length - 1; i > 0; i--){
                                values.push(records[i].get('StringValue'));
                                if (records[i].get('StringValue') == "Accepted"){
                                    i = 0;
                                }
                            }
                            deferred.resolve(values);
                        } else {
                            deferred.reject('Error loading ScheduleState values for User Story:  ' + operation.error.errors.join(','));
                        }
                    },
                    scope: this
                });
            },
            failure: function() {
                var error = "Could not load schedule states";
                deferred.reject(error);
            }
        });
        return deferred.promise;
    },
    fetchTypeDefinition: function(typePath){
        var deferred = Ext.create('Deft.Deferred');

        var store = Ext.create('Rally.data.wsapi.Store',{
            model: 'TypeDefinition',
            fetch: ['TypePath','Name'],
            filters: [{
                property: 'TypePath',
                value: typePath
            }]
        }).load({
            callback: function(records, operation, success){
                if (success && records && records.length > 0){
                    deferred.resolve(records[0]);
                } else {
                    var message = "No records returned when loading Type Definition for " + typePath;
                    if (!success){
                        message = "Error loading Type Definition for " + typePath + ':  ' + operation.error.errors.join(',');
                    }
                    deferred.reject(message); //(Ext.String.format("Error getting TypeDefinition for {1}: {0}", operation.error.errors.join(','), typeDef));
                }
            }
        });
        return deferred;
    }
});
