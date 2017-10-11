/**
move tree
*/
CREATE OR REPLACE FUNCTION move(what_id bigint, to_id bigint) 
RETURNS int AS
$BODY$
        DECLARE
		new kopnik;
        BEGIN
		update kopnik set parent_id=to_id where kopnik.id= what_id;

		DELETE FROM kopnik_tree
		WHERE descendant_id IN (SELECT descendant_id FROM kopnik_tree WHERE ancestor_id = what_id)
		AND ancestor_id NOT IN (SELECT descendant_id FROM kopnik_tree WHERE ancestor_id = what_id);

		INSERT INTO kopnik_tree (ancestor_id, descendant_id)
		SELECT supertree.ancestor_id, subtree.descendant_id
		FROM
			kopnik_tree AS supertree,
			kopnik_tree AS subtree
		WHERE
			subtree.ancestor_id = what_id
			AND supertree.descendant_id = to_id;
		return 0;
        END;

        $BODY$
  LANGUAGE plpgsql VOLATILE;
ALTER FUNCTION move(bigint, bigint)
  OWNER TO postgres;


 select move(2,null)