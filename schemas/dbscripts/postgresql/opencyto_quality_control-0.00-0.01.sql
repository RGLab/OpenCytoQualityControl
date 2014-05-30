DROP SCHEMA IF EXISTS opencyto_quality_control CASCADE;
CREATE SCHEMA opencyto_quality_control;

CREATE TABLE opencyto_quality_control.reports
(
    Container   ENTITYID      NOT NULL,
    RowId       SERIAL        NOT NULL,
    name        VARCHAR(255)  NOT NULL,
    description TEXT,
    created     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    gsId        INT           NOT NULL,

    CONSTRAINT PK_reports PRIMARY KEY (RowId),
    CONSTRAINT UQ_reports UNIQUE (Container, name)
    , CONSTRAINT FK_reports_gsTbl FOREIGN KEY (gsId)
        REFERENCES opencyto_preprocessing.gsTbl (gsId)
        ON DELETE CASCADE
);

CREATE TABLE opencyto_quality_control.qaTaskList
(
    Container         ENTITYID  NOT NULL,
    RowId             SERIAL    NOT NULL,
    qaId              INT       NOT NULL,
    qaName            TEXT      NOT NULL,
    description       TEXT      NOT NULL,
    qaLevel           TEXT      NOT NULL,
    pop               TEXT      NOT NULL,
    formula           TEXT      NOT NULL,
    type              TEXT      NOT NULL,
    subset            TEXT,
    plotType          TEXT      NOT NULL,
    outlierFunc       TEXT,
    outlierFunc_args  TEXT,
    goutlierFunc      TEXT,
    goutlierFunc_args TEXT,
    reportId          INT       NOT NULL,

    CONSTRAINT UQ_qaTaskList UNIQUE (qaId, Container),
    CONSTRAINT PK_qaTaskList PRIMARY KEY (RowId)
    , CONSTRAINT FK_qaTaskList_reports FOREIGN KEY (reportId)
        REFERENCES opencyto_quality_control.reports (RowId)
        ON DELETE CASCADE
);

CREATE TABLE opencyto_quality_control.stats
(
    Container   ENTITYID  NOT NULL,
    sId         INT       NOT NULL,
    fileId      INT       NOT NULL,
    gsId        INT       NOT NULL,
    population  TEXT      NOT NULL,
    stats       TEXT      NOT NULL,
    node        TEXT      NOT NULL,
    channel     TEXT      NOT NULL,
    value       NUMERIC   NOT NULL,

      CONSTRAINT PK_stats PRIMARY KEY (sId, Container)
    , CONSTRAINT FK_stats_gsTbl FOREIGN KEY (gsId)
        REFERENCES opencyto_preprocessing.gsTbl (gsId)
        ON DELETE CASCADE
);

CREATE TABLE opencyto_quality_control.outlierResult
(
    Container ENTITYID  NOT NULL,
    sId       INT       NOT NULL,
    qaId      INT       NOT NULL,

      CONSTRAINT PK_outlierResult PRIMARY KEY (sId, qaId, Container)
    , CONSTRAINT FK_outlierResult_stats FOREIGN KEY (sId, Container)
        REFERENCES opencyto_quality_control.stats (sId, Container)
        ON DELETE CASCADE
    , CONSTRAINT FK_outlierResult_qaTaskList FOREIGN KEY (qaId, Container)
        REFERENCES opencyto_quality_control.qaTaskList (qaId, Container)
        ON DELETE CASCADE
);

CREATE TABLE opencyto_quality_control.groupOutlierResult
(
    Container ENTITYID  NOT NULL,
    sId       INT       NOT NULL,
    qaId      INT       NOT NULL,

      CONSTRAINT PK_groupOutlierResult PRIMARY KEY (sId, qaId, Container)
    , CONSTRAINT FK_groupOutlierResult_stats FOREIGN KEY (sId, Container)
        REFERENCES opencyto_quality_control.stats (sId, Container)
        ON DELETE CASCADE
    , CONSTRAINT FK_groupOutlierResult_qaTaskList FOREIGN KEY (qaId, Container)
        REFERENCES opencyto_quality_control.qaTaskList (qaId, Container)
        ON DELETE CASCADE
);

-- CREATE INDEX IX_qaTaskList ON opencyto_quality_control.qaTaskList (pop);

