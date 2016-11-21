CREATE TABLE "Kopnik"
(
  id bigserial NOT NULL,
  email character varying(255),
  password character varying(255),
  name character varying(255),
  surname character varying(255),
  patronymic character varying(255),
  "voiskoSize" integer NOT NULL DEFAULT 0,
  birth integer NOT NULL,
  path text,
  note text,
  created_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone NOT NULL,
  deleted_at timestamp with time zone,
  dom_id bigint,
  starshina_id bigint,
  CONSTRAINT "Kopnik_pkey" PRIMARY KEY (id),
  CONSTRAINT "Kopnik_dom_id_fkey" FOREIGN KEY (dom_id)
      REFERENCES "Zemla" (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT "Kopnik_starshina_id_fkey" FOREIGN KEY (starshina_id)
      REFERENCES "Kopnik" (id) MATCH SIMPLE
      ON UPDATE CASCADE ON DELETE SET NULL
)