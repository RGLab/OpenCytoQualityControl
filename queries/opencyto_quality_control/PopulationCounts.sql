SELECT
 population			AS Population,
 COUNT(population)	AS PopCount,
 gsid				AS gsId
FROM
 stats 
GROUP BY
 Population,
 gsId