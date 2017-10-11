/*
select subtree with parent_id=2
*/
SELECT kopnik."id","parent_id" 
FROM 
  "kopnik"
  JOIN "kopnik_tree" ON "kopnik"."id" = "kopnik_tree"."descendant_id"
WHERE 
  "kopnik_tree"."ancestor_id" = 2
