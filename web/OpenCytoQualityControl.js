// vim: sw=4:ts=4:nu:nospell:fdc=4
/*
 *  Copyright 2012 Fred Hutchinson Cancer Research Center
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

Ext.namespace('LABKEY.ext');

LABKEY.ext.OpenCytoQualityControl = Ext.extend( Ext.Panel, {

    constructor : function(config) {

        /////////////////////////////////////
        //            Variables            //
        /////////////////////////////////////
        var
            maskGlobal      = undefined,
            reportSessionId = undefined,
            flagPreprocess  = undefined,
            maskDelete      = undefined
        ;


        /////////////////////////////////////
        //             Strings             //
        /////////////////////////////////////
        var strngErrorContactWithLink = '. Please, contact support, if you have questions.'


        //////////////////////////////////////////////////////////////////
        //             Queries and associated functionality             //
        //////////////////////////////////////////////////////////////////



        /////////////////////////////////////
        //      Session instanciation      //
        /////////////////////////////////////
        LABKEY.Report.getSessions({
            success: function( responseObj ){
                var i, array = responseObj.reportSessions, length = array.length;
                for ( i = 0; i < length; i ++ ){
                    if ( array[i].clientContext == 'OpenCytoQualityControl' ){
                        reportSessionId = array[i].reportSessionId;
                        i = length;
                    }
                }
                if ( i == length ){
                    LABKEY.Report.createSession({
                        clientContext : 'OpenCytoQualityControl',
                        failure: LABKEY.ext.OpenCyto.onFailure,
                        success: function(data){
                            reportSessionId = data.reportSessionId;
                        }
                    });
                }
            }
        });

        /////////////////////////////////////
        //              Stores             //
        /////////////////////////////////////

        var strGatingSet = new LABKEY.ext.Store({
            autoLoad: true,
            listeners: {

            },
            queryName: 'GatingSet',
            schemaName: 'opencyto_preprocessing'
        });

        var strReports = new LABKEY.ext.Store({
            autoLoad: true,
            listeners: {
                commitcomplete: function(){
//                    pnlTableAnalyses.publish('analysesReload');
                },
                commitexception: function(e){
                    this.rejectChanges();

                    if ( e.indexOf( 'duplicate key value violates unique constraint "uq_reports"' ) >= 0 ){
                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'There is already a report with the same name, <br/>delete it first, or use a different name.<br/>'
                        })
                    } else if ( e.indexOf( 'null value in column "name" violates non-null constraint' ) >= 0 ){
                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'Blank report name is not allowed.<br/>'
                        })
                    }

                    return false;
                },
                load: function(){
                    pnlTableReports.autoExpandColumn = 'Description';

                    pnlTableReports.reconfigure(
                            strReports,
                            new Ext.grid.CustomColumnModel({
                                columns: [
                                    LABKEY.ext.OpenCyto.factoryRowNumberer( strReports ),
                                    smCheckBoxReports,
                                    {
                                        dataIndex: 'name',
                                        editor: new Ext.form.TextField(),
                                        header: 'Name',
                                        hideable: false,
                                        renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                            metaData.attr = 'ext:qtip="' + value + '"';
                                            return value;
                                        },
                                        tooltip: 'Name',
                                        width: 160
                                    },
                                    {
                                        dataIndex: 'created',
                                        header: 'Creation Time',
                                        renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                            value = Ext.util.Format.date( value, 'Y-m-d H:i:s' );
                                            metaData.attr = 'ext:qtip="' + value + '"';
                                            return value;
                                        },
                                        tooltip: 'Creation Time',
                                        width: 160
                                    },
                                    {
                                        dataIndex: 'description',
                                        editor: new Ext.form.TextField(),
                                        header: 'Description',
                                        id: 'Description',
                                        renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                            if ( Ext.util.Format.undef(value) != '' && value != null ){
                                                metaData.attr = 'ext:qtip="' + value + '"';
                                            }
                                            return value;
                                        },
                                        tooltip: 'Description'
                                    }
                                ],
                                defaults: {
                                    filterable: true,
                                    resizable: true,
                                    sortable: true
                                },
                                disallowMoveBefore: 1
                            })
                    );

                    smCheckBoxReports.clearSelections();
                },
                loadexception: LABKEY.ext.OpenCyto.onFailure
            },
            queryName: 'reports',
            schemaName: 'opencyto_quality_control'
        });

        var strOutliers = new LABKEY.ext.Store({
            autoLoad: true,
            listeners: {
                load: function(){

                    LABKEY.Query.getQueryDetails({
                        failure: LABKEY.ext.OpenCyto.onFailure,
                        queryName: 'Summary',
                        schemaName: 'opencyto_quality_control',
                        success: function(queryInfo){
                            var newColumns =
                                [
                                    LABKEY.ext.OpenCyto.factoryRowNumberer( strOutliers ),
                                    {
                                        dataIndex: 'FileName',
                                        header: 'File Name',
                                        renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                                            return '<a href=\'' +
                                                LABKEY.ActionURL.buildURL(
                                                    'flow-well',
                                                    'showWell',
                                                    LABKEY.ActionURL.getContainer(),
                                                    {
                                                        wellId: record.get('FileIdLink')
                                                    }
                                                ) +
                                                '\' target=\'_blank\'>' + value + '</a>';
                                        },
                                        tooltip: 'File Name'
                                    }
                                ],
                                i = 3,
                                len = queryInfo.columns.length,
                                string;

                            for ( i ; i < len; i ++ ) {
                                string = queryInfo.columns[i].caption;

                                newColumns.push({
                                    dataIndex: string + '::TaskCount',
                                    header: string,
                                    tooltip: string
                                });
                            }

                            pnlOutliers.reconfigure(
                                strOutliers,
                                new Ext.grid.ColumnModel({
                                    columns: newColumns,
                                    defaults: {
                                        resizable: true,
                                        sortable: true
                                    }
                                })
                            );
                        }
                    });

                }
            },
            queryName: 'Summary',
            schemaName: 'opencyto_quality_control'
        });

        function factoryRenderer( combo ){
            return function( value, metaData ){
                var str = combo.getStore();
                var rec = str.getAt( str.findExact( combo.valueField, value ) );
                value = rec ? rec.get( combo.displayField ) : value;
                metaData.attr = 'ext:qtip="' + value + '"';
                return value;
            }
        };

        var strQaTasks = new LABKEY.ext.Store({
            listeners: {
                load: function(){
                    var newColumns = [
                        LABKEY.ext.OpenCyto.factoryRowNumberer( strQaTasks ),
                        {
                            dataIndex: 'qaname',
                            editor: new Ext.form.TextField(),
                            header: 'Task Name',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Task Name',
                            width: 95
                        },
                        {
                            dataIndex: 'description',
                            editor: new Ext.form.TextField(),
                            header: 'Description',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Description',
                            width: 105
                        },
                        {
                            dataIndex: 'qalevel',
                            editor: new Ext.form.TextField(),
                            header: 'Level',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Level',
                            width: 70
                        },
                        {
                            dataIndex: 'pop',
                            editor: cbPopulation,
                            header: 'Population Name',
                            renderer: factoryRenderer( cbPopulation ),
                            tooltip: 'Population Name',
                            width: 130
                        },
                        {
                            dataIndex: 'formula',
                            editor: new Ext.form.TextField(),
                            header: 'Formula',
                            id: 'Formula',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Formula',
                            width: 200
                        },
                        {
                            dataIndex: 'type',
                            editor: cbMatchType,
                            header: 'Match Type',
                            renderer: factoryRenderer( cbMatchType ),
                            tooltip: 'Match Type',
                            width: 150
                        },
                        {
                            dataIndex: 'subset',
                            editor: new Ext.form.TextField(),
                            header: 'Subset',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Subset'
                        },
                        {
                            dataIndex: 'plottype',
                            editor: cbPlotType,
                            header: 'Plot Type',
                            renderer: factoryRenderer( cbPlotType ),
                            tooltip: 'Plot Type',
                            width: 90
                        },
                        {
                            dataIndex: 'outlierfunc',
                            editor: new Ext.form.TextField(),
                            header: 'Outlier Detection Function',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Outlier Detection Function',
                            width: 200
                        },
                        {
                            dataIndex: 'outlierfunc_args',
                            editor: new Ext.form.TextField(),
                            header: 'Outlier Detection Function Arguments',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Outlier Detection Function Arguments',
                            width: 270
                        },
                        {
                            dataIndex: 'goutlierfunc',
                            editor: new Ext.form.TextField(),
                            header: 'Group Outlier Detection Function',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Outlier Detection Function',
                            width: 240
                        },
                        {
                            dataIndex: 'goutlierfunc_args',
                            editor: new Ext.form.TextField(),
                            header: 'Group Outlier Detection Function Arguments',
                            renderer: function( value, metaData, record, rowIndex, colIndex, store ){
                                metaData.attr = 'ext:qtip="' + value + '"';
                                return value;
                            },
                            tooltip: 'Outlier Detection Function Arguments',
                            width: 315
                        }
                    ];

                    /*pnlQATasksToAddTable.reconfigure(
                        strQaTasks,
                        new Ext.grid.ColumnModel({
                            columns: newColumns,
                            defaults: {
                                resizable: true,
                                sortable: true
                            }
                        })
                    );*/

                    pnlQATasksTable.reconfigure(
                        strQaTasks,
                        new Ext.grid.ColumnModel({
                            columns: newColumns,
                            defaults: {
                                resizable: true,
                                sortable: true
                            }
                        })
                    );
                }
            },
            queryName: 'qatasklist',
            schemaName: 'opencyto_quality_control'
        });


        /////////////////////////////////////
        //     ComboBoxes / TextFields     //
        /////////////////////////////////////
        var cbPopulation = new Ext.ux.form.ExtendedComboBox({
            addClearItem: false,
            allowBlank: false,
            displayField: 'Path',
            lazyInit: false,
            lazyRender: false,
            store: new LABKEY.ext.Store({
                autoLoad: true,
                queryName: 'Population',
                schemaName: 'opencyto_preprocessing'
            }),
            valueField: 'Path'
        });

        var cbPlotType = new Ext.ux.form.ExtendedComboBox({
            addClearItem: false,
            allowBlank: false,
            displayField: 'Display',
            store: new Ext.data.ArrayStore({
                data: [ ['X-Y Plot', 'xyplot'], ['Box Plot', 'bwplot'] ],
                fields: ['Display', 'Value']
            }),
            valueField: 'Value'
        });

        var cbMatchType = new Ext.ux.form.ExtendedComboBox({
            addClearItem: false,
            allowBlank: false,
            displayField: 'Display',
            store: new Ext.data.ArrayStore({
                data: [ ['Exact terminal name', 'popName'], ['Exact full path', 'fullPath'], ['Partial path', 'subPath'], ['Regular expression', 'regExpr'] ],
                fields: ['Display', 'Value']
            }),
            valueField: 'Value'
        });

        var cbAnalysis = new Ext.ux.form.ExtendedComboBox({
            displayField: 'Name',
            listeners: {
                change: function(){
                    if ( this.getValue() != '' ){
                        btnNext.setDisabled(false);
                    } else {
                        btnNext.setDisabled(true);
                    }
                },
                cleared: function(){
                    btnNext.setDisabled(true);
                },
                select: function(){
                    btnNext.setDisabled(false);
                }
            },
            qtipField: 'Description',
            resizable: true,
            store: strGatingSet,
            valueField: 'Id'
        });


        var tfReportName = new Ext.form.TextField({
            emptyText: 'Type...',
            enableKeyEvents: true,
            listeners: {
                keyup: function(){
                    if ( Ext.util.Format.trim( tfReportName.getValue() ) == '' ){
                        btnNext.setDisabled(true);
                    } else {
                        btnNext.setDisabled(false);
                    }
                }
            }
        });

        var tfReportDescription = new Ext.form.TextField({
            emptyText: 'Type...'
        });


        /////////////////////////////////////
        //             Buttons             //
        /////////////////////////////////////
        var btnBack = new Ext.Button({
            disabled: true,
            text: '< Back'
        });

        var btnNext = new Ext.Button({
            disabled: true,
            text: 'Next >'
        });

        var btnDelete = new Ext.Button({
            disabled: true,
            handler: function(){

                var sels = smCheckBoxReports.getSelections(), rowids = [];
                Ext.each( sels, function( s ){ rowids.push( { 'rowid': s.id } ); } );

                btnDelete.setDisabled(true);

                maskDelete.show();

                LABKEY.Query.deleteRows({
                    columns: ['RootPath'],
                    failure: function(errorInfo, options, responseObj){
                        maskDelete.hide();

                        LABKEY.ext.OpenCyto.onFailure(errorInfo, options, responseObj);
                    },
                    queryName: 'reports',
                    rows: rowids,
                    schemaName: 'opencyto_quality_control',
                    success: function(data){
                        maskDelete.hide();

                        strQaTasks.reload();
                        strReports.reload();
                        strOutliers.reload();
                    }
                });
            },
            text: 'Delete',
            tooltip: 'Delete an analysis'
        });


        /////////////////////////////////////
        //      Back-end Configuration     //
        /////////////////////////////////////
        var cnfPreprocess = {
            failure: function( errorInfo, options, responseObj ){
                flagPreprocess = false;

                maskGlobal.hide();
                btnNext.setDisabled(false);
                btnBack.setDisabled(false);
                tfReportName.setDisabled(false);
                tfReportDescription.setDisabled(false);

                LABKEY.ext.OpenCyto.onFailure( errorInfo, options, responseObj );
            },
            reportId: 'module:OpenCytoQualityControl/Preprocess.R',
            success: function( result ){
                flagPreprocess = false;

                maskGlobal.hide();
                btnNext.setDisabled(false);
                btnBack.setDisabled(false);
                tfReportName.setDisabled(false);
                tfReportDescription.setDisabled(false);

                var errors = result.errors;

                if (errors && errors.length > 0) {

                    if ( errors[0].indexOf('The report session is invalid') < 0 ){


                        LABKEY.ext.OpenCyto.onFailure({
                            exception: errors[0]
                        });
                    } else {
                        LABKEY.Report.createSession({
                            clientContext : 'OpenCytoQualityControl',
                            failure: LABKEY.ext.OpenCyto.onFailure,
                            success: function(data){
                                reportSessionId = data.reportSessionId;

                                preprocess();
                            }
                        });
                    }
                } else {
                    pnlTabs.setActiveTab( 1 );

                    strQaTasks.reload();
                    strReports.reload();
                    strOutliers.reload();
                }
            }
        };

        /////////////////////////////////////
        //           TextArea              //
        /////////////////////////////////////
        var taQATasks = new Ext.form.TextArea({
            emptyText: 'Enter qaTasks definitions here',
            enableKeyEvents: true,
            grow: true,
            growMin: 100,
            growMax: 200,
            listeners: {
                keyup: function(){
                    if ( Ext.util.Format.trim( this.getValue() ) == '' ){
                        btnNext.setDisabled( true );
                    } else {
                        btnNext.setDisabled( false );
                    }
                }
            }
        });

        /////////////////////////////////////
        //  Panels, Containers, Components //
        /////////////////////////////////////

        var pnlSettings = new Ext.Panel({
            autoHeight: true,
            border: false,
            defaults: {
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px; padding-top: 4px;'
            },
            forceLayout: true,
            iconCls: 'iconConfigure',
            items: [
                {
                    border: false,
                    items: [ cbAnalysis ]
                }
            ],
            monitorResize: true,
            plugins: [ new Ext.ux.MsgBus() ]
        });

        pnlSettings.subscribe(
            'analysesReload' ,
            {
                fn:function(){
                    strGatingSet.reload();

                    strQaTasks.reload();
                    strReports.reload();
                    strOutliers.reload();
                }
            }
        );

        var pnlQATasksToAddTable = new Ext.grid.EditorGridPanel({ // LABKEY.ext.EditorGridPanel({
            autoScroll: true,
            bodyStyle: { paddingTop: '1px' },
            columnLines: true,
            columns: [],
            height: 200,
            loadMask: { msg: 'Loading data...', msgCls: 'mask-loading' },
            listeners: {
                cellclick: function(grid, rowIndex, columnIndex, e) {
                    // Get the Record for the row
                    var record = grid.getStore().getAt(rowIndex);
                    // Get field name for the column
                    var fieldName = grid.getColumnModel().getDataIndex(columnIndex);
                    var data = record.get(fieldName);
                },
                render: function(){ LABKEY.ext.OpenCyto.initTableQuickTips( this ); }
            },
            plugins: [ new Ext.ux.grid.AutoSizeColumns() ],
            store: strQaTasks,
            stripeRows: true,
            style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;',
            tbar: new Ext.Toolbar({
                cls: 'white-background',
                items: [
                    new Ext.Button({
                        handler: function(){
//                            strQaTasks.columns = 'gsname,created,gsdescription';
                            strQaTasks.exportData('excel');
                        },
                        text: 'Export',
                        tooltip: 'Click to export the table to Excel'
                    })
                ]
            }),
            viewConfig: {
                columnsText: 'Show/hide columns',
                deferEmptyText: false,
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });

        var pnlQATasks = new Ext.Panel({
            bodyStyle: { paddingTop: '4px' },
            defaults: {
                columnWidth: 1,
                hideMode: 'offsets'
            },
            items: [
                pnlQATasksToAddTable,
                {
                    border: false,
//                    collapsed: true,
                    collapsible: true,
                    items: taQATasks,
                    layout: 'fit',
                    style: 'padding-bottom: 3px; padding-right: 4px; padding-left: 4px;',
                    tbar: new Ext.Toolbar({
                        items: [ { text: 'Parse' } ]
                    }),
                    title: 'Parse from a text file'
                }
            ],
            layout: {
                type: 'column'
            },
            title: 'Define QA tasks'
        });


        var cnfSetDisabledViaClass = {
            setDisabledViaClass: function(bool){
                if ( bool ){
                    this.addClass('x-item-disabled');
                } else {
                    this.removeClass('x-item-disabled');
                }
            }
        };

        var cnfPanel = {
            autoHeight: true,
            border: false,
            headerCssClass: 'simple-panel-header',
            headerStyle: 'padding-top: 0px;',
            layout: 'fit',
            style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
        };

        var pnlReportName = new Ext.Panel( Ext.apply({
            items: Ext.apply({
                items: tfReportName,
                title: 'Enter report name: *'
            }, cnfPanel)
        }, cnfSetDisabledViaClass ) );

        var pnlReportDescription = new Ext.Panel( Ext.apply({
            items: Ext.apply({
                items: tfReportDescription,
                title: 'Enter report description:'
            }, cnfPanel)
        }, cnfSetDisabledViaClass ) );


        var pnlReportOptions = new Ext.Panel({
            defaults: {
                border: false,
                flex: 1,
                height: 60,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    pack: 'end'
                }
            },
            items: [
                pnlReportName,
                pnlReportDescription
            ],
            layout: {
                type: 'hbox',
                align: 'stretchmax'
            },
            listeners: {
                activate: function(){
                    this.doLayout();
                },
                afterrender: function(){
                    maskGlobal = new Ext.LoadMask( this.getEl(), {msgCls: 'mask-loading'} );
                }
            },
            title: 'Report options'
        });

        var pnlDefine = new Ext.Panel({
            activeItem: 0,
            bodyStyle: { paddingTop: '1px' },
            defaults: {
                autoHeight: true,
                forceLayout: true,
                hideMode: 'offsets'
            },
            items: [
                {
                    items: pnlSettings,
                    layout: 'fit',
                    title: 'Pick an analysis'
                },
                pnlQATasks,
                pnlReportOptions
            ],
            layout: 'card',
            style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;',
            tbar: new Ext.Toolbar({
                cls: 'white-background',
                items: [ btnBack, btnNext ]
            }),
            tabTip: 'Define',
            title: 'Define'
        });

        btnNext.on( 'click', navHandler.createDelegate( pnlDefine, [1] ) );
        btnBack.on( 'click', navHandler.createDelegate( pnlDefine, [-1] ) );


        var pnlOutliers = new Ext.grid.GridPanel({
            autoScroll: true,
            collapsed: true,
            collapsible: true,
            columnLines: true,
            columns: [],
            height: 200,
            listeners: {
                render: function(){ LABKEY.ext.OpenCyto.initTableQuickTips( this ); }
            },
            loadMask: { msg: 'Loading data...', msgCls: 'mask-loading' },
            plugins: [ new Ext.ux.grid.AutoSizeColumns() ],
            store: strOutliers,
            stripeRows: true,
            title: 'Outliers',
            viewConfig:
            {
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });

        var smCheckBoxReports = new Ext.grid.CheckboxSelectionModel({
            filterable: false,
            header: '',
            listeners: {
                selectionchange: function(){
                    if ( smCheckBoxReports.getCount() > 0 ){
                        btnDelete.setDisabled(false);
                    } else {
                        btnDelete.setDisabled(true);
                    }

                    var sels = this.getSelections();

                    if ( sels.length > 0 ){
                        strQaTasks.setUserFilters([
                            LABKEY.Filter.create(
                                    'reportid',
                                    sels[0].id
                            )
                        ]);
                        strQaTasks.load();
                    }
                }
            },
            moveEditorOnEnter: false,
            singleSelect: true,
            sortable: true,
            width: 23
        });

        var pnlTableReports = new Ext.grid.EditorGridPanel({
            autoScroll: true,
            collapsible: true,
            columnLines: true,
            columns: [],
            forceLayout: true,
            height: 200,
            loadMask: { msg: 'Loading generated reports, please, wait...', msgCls: 'mask-loading' },
            listeners: {
                afteredit: function(e){
                    if ( e.field == 'name' && e.value == '' ){
                        strReports.rejectChanges();

                        LABKEY.ext.OpenCyto.onFailure({
                            exception: 'Blank report name is not allowed.<br/>'
                        })
                    } else {
                        strReports.commitChanges();
                    }
                },
                reconfigure: function(){
                    smCheckBoxReports.clearSelections();
                },
                render: function(){
                    LABKEY.ext.OpenCyto.initTableQuickTips( this );
                }
            },
            loadMask: { msg: 'Loading data...', msgCls: 'mask-loading' },
            plugins: [
                new Ext.ux.grid.AutoSizeColumns(),
                new Ext.ux.grid.GridFilters({
                    encode: false,
                    local: true,
                    filters: [
                        {
                            dataIndex: 'name',
                            type: 'string'
                        },
                        {
                            dataIndex: 'description',
                            type: 'string'
                        },
                        {
                            dataIndex: 'created',
                            dateFormat: 'Y-m-d H:i:s',
                            type: 'date'
                        }
                    ]
                })
            ],
            selModel: smCheckBoxReports,
            store: strReports,
            stripeRows: true,
            tbar: new Ext.Toolbar({
                cls: 'white-background',
                items: btnDelete
            }),
            title: 'Reports',
            viewConfig:
            {
                deferEmptyText: false,
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });

        var pnlQATasksTable = new Ext.grid.GridPanel({
            autoScroll: true,
            bodyStyle: { paddingTop: '1px' },
            collapsible: true,
            columnLines: true,
            columns: [],
            height: 200,
            loadMask: { msg: 'Loading data...', msgCls: 'mask-loading' },
            listeners: {
                cellclick: function(grid, rowIndex, columnIndex, e) {
                    // Get the Record for the row
                    var record = grid.getStore().getAt(rowIndex);
                    // Get field name for the column
                    var fieldName = grid.getColumnModel().getDataIndex(columnIndex);
                    var data = record.get(fieldName);
                },
                render: function(){ LABKEY.ext.OpenCyto.initTableQuickTips( this ); }
            },
            plugins: [ new Ext.ux.grid.AutoSizeColumns() ],
            store: strQaTasks,
            stripeRows: true,
            style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;',
            tbar: new Ext.Toolbar({
                cls: 'white-background',
                items: [
                    new Ext.Button({
                        handler: function(){
//                            strQaTasks.columns = 'gsname,created,gsdescription';
                            strQaTasks.exportData('excel');
                        },
                        text: 'Export',
                        tooltip: 'Click to export the table to Excel'
                    })
                ]
            }),
            title: 'QA Tasks',
            viewConfig: {
                columnsText: 'Show/hide columns',
                deferEmptyText: false,
                emptyText: 'No rows to display',
                splitHandleWidth: 10
            }
        });

        var pnlReports = new Ext.Panel({
            autoHeight: true,
            border: false,
            defaults: {
                style: 'padding-bottom: 4px; padding-right: 4px; padding-left: 4px;'
            },
            hideMode: 'offsets',
            items: [
                pnlTableReports,
                pnlOutliers,
                pnlQATasksTable
            ],
            listeners: {
                afterrender: function(){
                    maskDelete = new Ext.LoadMask(
                        this.getEl(),
                        {
                            msg: 'Deleting the selected reports and its associated data...',
                            msgCls: 'mask-loading'
                        }
                    );
                }
            }
        });


        var pnlTabs = new Ext.TabPanel({
            activeTab: 0,
            autoHeight: true,
            defaults: {
                autoHeight: true,
                hideMode: 'offsets'
            },
            deferredRender: false,
            items: [
                pnlDefine,
                {
                    items: pnlReports,
                    tabTip: 'Manage',
                    title: 'Manage'
                }
            ],
            layoutOnTabChange: true,
            minTabWidth: 100,
            resizeTabs: true
        });


        /////////////////////////////////////
        //             Functions           //
        /////////////////////////////////////
        function navHandler(direction){

            var
                oldIndex = this.items.indexOf( this.getLayout().activeItem ),
                newIndex = oldIndex + direction;

            this.getLayout().setActiveItem( newIndex );

            if ( newIndex == 0 ){
                btnBack.setDisabled(true);
                btnNext.setDisabled(false);
            }

            if ( newIndex == 1 ){
                btnNext.setText('Next >');
                btnBack.setDisabled(false);
                if ( oldIndex == 0 && Ext.util.Format.trim( taQATasks.getValue() ) == '' ){
                    btnNext.setDisabled(true);
                } else {
                    btnNext.setDisabled(false);
                }
            }

            if ( newIndex == 2 ){
                btnNext.setText('Process >');
                if ( flagPreprocess ){
                    btnNext.setDisabled(true);
                } else {
                    if ( Ext.util.Format.trim( tfReportName.getValue() ) == '' ){
                        btnNext.setDisabled(true);
                        tfReportName.focus();
                    } else {
                        btnNext.setDisabled(false);
                    }
                }
            }

            if ( newIndex == 3 ){
                if ( Ext.util.Format.trim( taQATasks.getValue() ) != '' ){
                    cnfPreprocess.inputParams = {
                        qaTasks:            taQATasks.getValue(),
                        gsPath:             cbAnalysis.getSelectedField( 'Path' ),
                        gsId:               cbAnalysis.getValue(),
                        reportName:         tfReportName.getValue(),
                        reportDescription:  tfReportDescription.getValue()
                    };

                    preprocess();
                } else {
                    Ext.Msg.alert('Error', 'You did not specify any QA tasks');

                    return;
                }
            }
        };

        function preprocess() {
            flagPreprocess = true;

            btnNext.setDisabled(true);
            btnBack.setDisabled(true);
            tfReportName.setDisabled(true);
            tfReportDescription.setDisabled(true);

            maskGlobal.msg = 'Quality control preprocessing is being performed, please, wait...';
            maskGlobal.show();

            cnfPreprocess.reportSessionId = reportSessionId;
            LABKEY.Report.execute( cnfPreprocess );
        };

        // jQuery-related initializations


        this.border         = false;
        this.boxMinWidth    = 370;
        this.cls            = 'opencyto';
        this.frame          = false;
        this.items          = [ pnlTabs ];
        this.layout         = 'fit';
        this.renderTo       = config.webPartDivId;
        this.webPartDivId   = config.webPartDivId;
        this.width          = document.getElementById(config.webPartDivId).offsetWidth;

        this.pnlSummary = pnlOutliers;

        LABKEY.ext.OpenCytoQualityControl.superclass.constructor.apply(this, arguments);

    }, // end constructor

    resize: function(){
        this.pnlSummary.getView().refresh();
    }
}); // end OpenCytoQualityControl Panel class
