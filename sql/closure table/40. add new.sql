/**
add new kopnik
*/
CREATE OR REPLACE FUNCTION add(name text, parent_id bigint)
  RETURNS "kopnik" AS
$BODY$
        DECLARE
		new kopnik;
        BEGIN
		INSERT INTO kopnik (name, parent_id) VALUES (name, parent_id) returning * into new;

		INSERT INTO kopnik_tree (ancestor_id, descendant_id)
		SELECT ancestor_id, new.id
		FROM kopnik_tree
		WHERE descendant_id = parent_id
		UNION ALL
		SELECT new.id, new.id;
           
		return new;
        END;
        $BODY$
  LANGUAGE plpgsql VOLATILE;
ALTER FUNCTION add(text, bigint)
  OWNER TO postgres;

select * 
from add('7 (new)', 2)
 








