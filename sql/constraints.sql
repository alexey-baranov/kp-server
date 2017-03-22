select max(id) from "Zemla"

select * from "Zemla" where id = 15965660

delete from "Zemla" where id > 15965660

show all


-- Index: public.zemla_country_id

-- DROP INDEX public.zemla_country_id;

CREATE INDEX zemla_country_id
  ON public."Zemla"
  USING btree
  (country_id);

-- Index: public.zemla_level

-- DROP INDEX public.zemla_level;

CREATE INDEX zemla_level
  ON public."Zemla"
  USING btree
  (level);

-- Index: public.zemla_name

-- DROP INDEX public.zemla_name;

CREATE INDEX zemla_name
  ON public."Zemla"
  USING btree
  (name COLLATE pg_catalog."default" varchar_pattern_ops);

-- Index: public.zemla_parent_id

-- DROP INDEX public.zemla_parent_id;

CREATE INDEX zemla_parent_id
  ON public."Zemla"
  USING btree
  (parent_id);

-- Index: public.zemla_path

-- DROP INDEX public.zemla_path;

CREATE INDEX zemla_path
  ON public."Zemla"
  USING btree
  (path COLLATE pg_catalog."default" text_pattern_ops);

-- Index: public.zemla_verifier_id

-- DROP INDEX public.zemla_verifier_id;

CREATE INDEX zemla_verifier_id
  ON public."Zemla"
  USING btree
  (verifier_id);


  -- Foreign Key: public."Zemla_country_id_fkey"

-- ALTER TABLE public."Zemla" DROP CONSTRAINT "Zemla_country_id_fkey";

ALTER TABLE public."Zemla"
  ADD CONSTRAINT "Zemla_country_id_fkey" FOREIGN KEY (country_id)
      REFERENCES public."Zemla" (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE SET NULL;

      -- Foreign Key: public."Zemla_parent_id_fkey"

-- ALTER TABLE public."Zemla" DROP CONSTRAINT "Zemla_parent_id_fkey";

ALTER TABLE public."Zemla"
  ADD CONSTRAINT "Zemla_parent_id_fkey" FOREIGN KEY (parent_id)
      REFERENCES public."Zemla" (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE SET NULL;

      -- Constraint: public."Zemla_AOGUID_key"

-- ALTER TABLE public."Zemla" DROP CONSTRAINT "Zemla_AOGUID_key";

ALTER TABLE public."Zemla"
  ADD CONSTRAINT "Zemla_AOGUID_key" UNIQUE("AOGUID");