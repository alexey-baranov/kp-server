DROP TABLE if exists kopnik cascade;

CREATE TABLE kopnik
(
  id bigserial NOT NULL,
  name text,
  is_deleted boolean NOT NULL DEFAULT false,
  parent_id bigint,
  CONSTRAINT kopnik_pkey1 PRIMARY KEY (id)
)
WITH (
  OIDS=FALSE
);
ALTER TABLE kopnik
  OWNER TO postgres;

--root pseudo node need for closure tree works
insert into kopnik(id, name, parent_id) 
values (0, 'root', null);

insert into kopnik(name, parent_id) 
values
  ('alexey_baranov', null),
  ('2',1),
  ('3',2),
  ('4',1),
  ('5',2),
  ('6',3);

DROP TABLE if exists kopnik_tree;

CREATE TABLE kopnik_tree
(
  id bigserial NOT NULL,
  ancestor_id bigint,
  descendant_id bigint,
  CONSTRAINT kopnik_tree_pkey PRIMARY KEY (id),
  CONSTRAINT kopnik_tree_ancestor_id_fkey FOREIGN KEY (ancestor_id)
      REFERENCES kopnik (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE CASCADE,
  CONSTRAINT kopnik_tree_descendant_id_fkey FOREIGN KEY (descendant_id)
      REFERENCES kopnik (id) MATCH SIMPLE
      ON UPDATE NO ACTION ON DELETE CASCADE
)
WITH (
  OIDS=FALSE
);
ALTER TABLE kopnik_tree
  OWNER TO postgres;
CREATE INDEX kopnik_tree_ancestor_id_index
  ON kopnik_tree
  USING btree
  (ancestor_id);
CREATE INDEX kopnik_tree_descendant_id_index
  ON kopnik_tree
  USING btree
  (descendant_id);

INSERT INTO kopnik_tree (ancestor_id, descendant_id) VALUES
  (1, 1),
  (2, 2),
  (1, 2),
  (3, 3),
  (1, 3),
  (2, 3),
  (4, 4),
  (1, 4),
  (5, 5),
  (1, 5),
  (2, 5),
  (6, 6),
  (1, 6),
  (2, 6),
  (3, 6);