(function () {
    var Ext = window.Ext4 || window.Ext;

    Ext.define("Rally.technicalservices.Settings", {
        singleton: true,

        getSettings: function(context, config){
            var current_calculation_type = (config && config.calculationType) || 'storycount',
                labelWidth= 150,
                startDate = config.startdate || ["plannedstartdate",""],
                endDate = config.enddate || ["today",""];

            if (startDate && !(startDate instanceof Array)){
                startDate = startDate.split(",");
            }
            if (endDate && !(endDate instanceof Array)){
                endDate = endDate.split(",");
            }
            console.log('startdate,enddate',startDate, endDate);
            return [
                {
                    xtype: "fieldcontainer",
                    layout: {type: 'hbox'},
                    items: [{
                        xtype: "container",
                        minWidth: 250,
                        items: [
                            {
                                xtype: "label",
                                text: "Start Date",
                                cls: "settingsLabel"
                            },
                            {
                                xtype: "radiogroup",
                                name: "startdate",
                                itemId: "startdategroup",
                                columns: 1,
                                vertical: true,
                                items: [
                                    {
                                        name: "startdate",
                                        itemId: "actualstartdate",
                                        boxLabel: "Actual Start Date",
                                        baseLabel: "Actual Start Date",
                                        inputValue: "actualstartdate",
                                        checked: startDate[0] === "actualstartdate"
                                    },
                                    {
                                        name: "startdate",
                                        itemId: "plannedstartdate",
                                        boxLabel: "Planned Start Date",
                                        baseLabel: "Planned Start Date",
                                        inputValue: "plannedstartdate",
                                        checked: startDate[0] === "plannedstartdate"
                                    },
                                    {
                                        xtype: "container",
                                        layout: {
                                            type: "hbox"
                                        },
                                        items: [
                                            {
                                                xtype: "radiofield",
                                                name: "startdate",
                                                itemId: "startdatemanual",
                                                boxLabel: " ",
                                                inputValue: "selecteddate",
                                                checked: startDate[0] === "selecteddate"
                                            },
                                            {
                                                xtype: "rallydatefield",
                                                name: "startdate",
                                                itemId: "startdatefield",
                                                inputValue: "selecteddate",
                                                value: startDate[1] || ''
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                xtype: "container",
                                minWidth: 250,
                                items: [
                                    {
                                        xtype: "label",
                                        text: "End Date",
                                        cls: "settingsLabel"
                                    },
                                    {
                                        xtype: "radiogroup",
                                        name: "enddate",
                                        itemId: "enddategroup",
                                        columns: 1,
                                        vertical: true,
                                        items: [
                                            {
                                                name: "enddate",
                                                itemId: 'today',
                                                boxLabel: "Today",
                                                inputValue: "today",
                                                checked: endDate[0] === "today"
                                            },
                                            {
                                                name: "enddate",
                                                itemId: "actualenddate",
                                                boxLabel: "Actual End Date",
                                                baseLabel: "Actual End Date",
                                                inputValue: "actualenddate",
                                                checked: endDate[0] === "actualenddate"
                                            },
                                            {
                                                name: "enddate",
                                                itemId: "plannedenddate",
                                                boxLabel: "Planned End Date",
                                                baseLabel: "Planned End Date",
                                                inputValue: "plannedenddate",
                                                checked: endDate[0] === "plannedenddate"
                                            },
                                            {
                                                xtype: "container",
                                                layout: {
                                                    type: "hbox"
                                                },
                                                items: [
                                                    {
                                                        xtype: "radiofield",
                                                        name: "enddate",
                                                        itemId: "enddatemanual",
                                                        boxLabel: " ",
                                                        inputValue: "selecteddate",
                                                        checked: endDate[0] === "selecteddate"
                                                    },
                                                    {
                                                        xtype: "rallydatefield",
                                                        name: "enddate",
                                                        itemId: "enddatefield",
                                                        inputValue: "selecteddate",
                                                        value: endDate[1] || ""
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }]
                },{
                    xtype: 'radiogroup',
                    fieldLabel: 'Data Type',
                    columns: 1,
                    vertical: true,
                    labelWidth: labelWidth,
                    labelAlign: 'top',
                    labelCls: 'settingsLabel',
                    margin: '10 0 10 0',
                    items: [{
                        boxLabel: "Story Count",
                        name: 'calculationType',
                        inputValue: "storycount",
                        checked: "storycount" === current_calculation_type
                    }, {
                        boxLabel: "Story Plan Estimate",
                        name: 'calculationType',
                        inputValue: "storypoints",
                        checked: "storypoints" === current_calculation_type,
                        cls: "paddedSettingCmp"
                    }]
                }];
        }
    });
}());