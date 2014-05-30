SELECT
 fileid.RowId AS FileIdLink,
 fileid.Name AS FileName,
 qaname AS Task,
 COUNT(qaname) AS TaskCount
FROM
 outlierresult,
 qatasklist,
 stats
WHERE
 outlierresult.qaid = qatasklist.qaid AND outlierresult.sid = stats.sid
GROUP BY
 fileid.RowId,
 fileid.Name,
 qaname
PIVOT TaskCount BY Task
