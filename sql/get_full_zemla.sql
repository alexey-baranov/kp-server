--DROP FUNCTION get_full_zemla(bigint)
CREATE OR REPLACE FUNCTION get_full_zemla(IN zemla_id bigint, IN start_level int) RETURNS text AS
$BODY$
	select 
	string_agg(name, ', ') as result
	from (
		select * 
		from
		get_zemli(100015) 
		where 
		level>=start_level
		order by 
		level
	) zemli
$BODY$
LANGUAGE sql VOLATILE NOT LEAKPROOF;

--select get_full_zemla(100016,1)