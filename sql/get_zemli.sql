--DROP FUNCTION get_zemli(bigint)
CREATE OR REPLACE FUNCTION get_zemli(IN zemla_id bigint) RETURNS SETOF "Zemla" AS
$BODY$
DECLARE
	current_zemla_id bigint;
	current_zemla "Zemla";
BEGIN
	current_zemla_id:= zemla_id;

	while (current_zemla_id is not null) loop
		select * from "Zemla" where id= current_zemla_id into current_zemla;
		return next current_zemla;
		current_zemla_id:= current_zemla.parent_id;
	end loop;
	
	return;
END;
$BODY$
LANGUAGE plpgsql VOLATILE NOT LEAKPROOF;

--select * from get_zemli(100016)