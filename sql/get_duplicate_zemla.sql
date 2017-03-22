select "AOGUID" from (
  SELECT "AOGUID", lag("AOGUID") over (ORDER BY "AOGUID") = "AOGUID" test_eq 
  FROM 
    "Zemla" 
) eq
where test_eq


SELECT "AOGUID" 
FROM "Zemla"
GROUP BY "AOGUID"
HAVING COUNT(*) > 1
ORDER BY "AOGUID"

