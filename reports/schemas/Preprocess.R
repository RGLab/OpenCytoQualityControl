# vim: sw=4:ts=4:nu:nospell:fdc=4
#
#  Copyright 2013 Fred Hutchinson Cancer Research Center
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

#sink( file = paste0( '~/QC_output_', basename( labkey.url.params$gsPath ), '.txt' ), type = 'output' );
#sink( file = paste0( '~/QC_message_', basename( labkey.url.params$gsPath ), '.txt' ), type = 'message' );

gsPath              <- labkey.url.params$gsPath;
gsId                <- as.numeric( labkey.url.params$gsId );
qaTasksString       <- labkey.url.params$qaTask;
reportName          <- labkey.url.params$reportName;
reportDescription   <- labkey.url.params$reportDescription;

suppressMessages( library( QUALIFIER ) );
suppressMessages( library( Rlabkey ) );

#initDB(QUALIFIER:::.db);

tryCatch({

    print( 'READING QA TASKS' );

    tempFile <- tempfile();
    write( qaTasksString, tempFile );
    qaTask.list <- read.qaTask(
        checkListFile = tempFile
    );


    print( 'UNARCHIVING' );
    ptm <- proc.time();

    suppressMessages( G <- load_gslist( gsPath ) );
    nodes <- getNodes( G[[1]] );

    print( proc.time() - ptm );


    print( 'PREPROCESSING' );
    ptm <- proc.time();

    i <- 1;
    pops <- QUALIFIER:::.matchNode( qaTask.list[[i]]@pop, nodes, qaTask.list[[i]]@type );
    for ( i in 2:length( qaTask.list ) ){
        pops <- QUALIFIER:::.matchNode( qaTask.list[[i]]@pop, nodes, qaTask.list[[i]]@type ) | pops;
    }
    pops <- which( pops );
    if ( length(pops) == 0 ){
        stop('The populations referenced in the QA tasks are not found in the specified analysis.' );
    }

    popFilter <- paste( nodes[ pops ], collapse = ';' );

    existingStats <- labkey.selectRows(
        queryName   = 'PopulationCounts', # gsId
        baseUrl     = labkey.url.base,
        folderPath  = labkey.url.path,
        schemaName  = 'opencyto_quality_control',
        colFilter   = makeFilter( c('Population', 'IN', popFilter ), c('gsId', 'EQUALS', gsId) )
    );

    if ( nrow( existingStats ) != length( pops ) ){

        suppressMessages( QUALIFIER:::qaPreprocess_labkey(
            gs      = G,
            gsid    = gsId,
            pops    = pops
        ));

        print( proc.time() - ptm );


        print( 'WRITING STATS TO DB' );
        ptm <- proc.time();

        suppressMessages( QUALIFIER:::writeStats(
            baseUrl     = labkey.url.base,
            folderPath  = labkey.url.path
        ));
    } else {
        QUALIFIER:::loadStats(
            baseUrl     = labkey.url.base,
            folderPath  = labkey.url.path
        );
        db <- QUALIFIER:::.db;
        db$gs[[gsId]] <- G;
    }

    print( proc.time() - ptm );


    toInsert <- data.frame(
        name        = reportName,
        description = reportDescription,
        gsid        = gsId
    );

    insertedRow <- labkey.insertRows(
        toInsert      = toInsert,
        queryName     = 'reports',
        schemaName    = 'opencyto_quality_control',
        folderPath    = labkey.url.path,
        baseUrl       = labkey.url.base
    );

    reportId    <- insertedRow$rows[[1]]$rowid;
    container   <- insertedRow$rows[[1]]$container;


    print( 'PROCESSING QA TASKS' );
    ptm <- proc.time();

    suppressMessages(
        for ( i in 1:length(qaTask.list) ){
            qaCheck(
                obj = qaTask.list[[i]],
                gsid = gsId
            );
        }
    );

    print( 'WRITING QA TASKS' );

    suppressMessages( QUALIFIER:::writeTask(
        reportId    = reportId,
        baseUrl     = labkey.url.base,
        folderPath  = labkey.url.path
    ));



    db <- QUALIFIER:::.db;

    if ( nrow(db$outlierResult) > 0 ){
        insertedRow <- labkey.insertRows(
              baseUrl       = labkey.url.base
            , folderPath    = labkey.url.path
            , schemaName    = 'opencyto_quality_control'
            , queryName     = 'outlierResult'
            , toInsert      = db$outlierResult
        );
    }

    if ( nrow(db$GroupOutlierResult) > 0 ){
        insertedRow <- labkey.insertRows(
              baseUrl       = labkey.url.base
            , folderPath    = labkey.url.path
            , schemaName    = 'opencyto_quality_control'
            , queryName     = 'GroupOutlierResult'
            , toInsert      = db$GroupOutlierResult
        );
    }

    print( proc.time() - ptm );

    txt <- 'completed';

    write(txt, file='${txtout:textOutput}');

}, error = function(e){

       if ( exists( 'reportId' ) & exists( 'container' ) ){
           if ( length( reportId ) > 0 & length( container ) ){
               if ( ! is.na( reportId ) & ! is.na( container ) ){

                   deletedRows <- labkey.deleteRows(
                       toDelete        = data.frame(
                                             rowid   = reportId,
                                             container  = container
                                         ),
                       queryName     = 'reports',
                       baseUrl       = labkey.url.base,
                       folderPath    = labkey.url.path,
                       schemaName    = 'opencyto_quality_control'
                   );

               }
           }
       }

       if ( grepl( 'duplicate key value violates unique constraint "uq_reports"', print( e ), fixed = T ) ){
           stop( 'There is already a report with the same name, delete it first, or use a different name.' );
       } else {
           stop(e);
       }
});
