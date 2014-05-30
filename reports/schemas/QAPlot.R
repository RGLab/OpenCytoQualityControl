suppressMessages( library( QUALIFIER ) );
suppressMessages( library( parallel ) );

gsPath          <- labkey.url.params$gsPath;
gsId            <- labkey.url.params$gsId;

print( 'UNARCHIVING' );
ptm <- proc.time();

if ( ! exists("G") ){
    G <- suppressMessages( unarchive( gsPath ) );
}

print( proc.time() - ptm );


.db <- new.env();
initDB(.db);


print( 'LOADING STATS' );
ptm <- proc.time();


existingStats <- labkey.executeSql(
                  sql           = paste( 'SELECT max(sid) AS check FROM stats WHERE gsid = ', gsId )
                , baseUrl       = labkey.url.base
                , folderPath    = labkey.url.path
                , schemaName    = 'opencyto_quality_control'
            );

if ( nrow( existingStats ) == 0 ){

    suppressMessages( qaPreprocess(
          db        = .db
        , gs        = G
        , gsid      = gsId
        , isMFI=F   # if not interested
        , isSpike=F # in spike and MFI
    ) );

    print( proc.time() - ptm );


    print( 'WRITING STATS TO DB' );
    ptm <- proc.time();

    suppressMessages( writeStats(
            db          = .db
          , baseUrl     = labkey.url.base
          , folderPath  = labkey.url.path
    ) );
} else {
    loadStats(
        .db
        , baseUrl       = labkey.url.base
        , folderPath    = labkey.url.path
    );

    .db$gs[[gsId]] <- G;
}

print( proc.time() - ptm );

loadDB(
    .db
    , baseUrl       = labkey.url.base
    , folderPath    = labkey.url.path
);


plot( qaTask.list[[5]], gsid = gsId );

txt <- 'completed';

write(txt, file='${txtout:textOutput}');
