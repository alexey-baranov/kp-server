/*
select closhure parent_id=1
*/
SELECT ancestor_id, descendant_id
FROM 
  kopnik_tree
WHERE 
  true or 
  ancestor_id= 1
order by
  ancestor_id,
  descendant_id
