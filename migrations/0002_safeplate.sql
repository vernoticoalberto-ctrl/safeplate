create table if not exists suppliers (
  id text primary key,
  nome text not null,
  paese text not null,
  regione text not null,
  tipo text not null,
  certificazioni text not null default '[]',
  contatto text,
  lat double precision,
  lng double precision,
  immagine text
);

create table if not exists products (
  id text primary key,
  nome text not null,
  marca text,
  fornitore_id text not null,
  categoria text not null,
  allergeni text not null default '[]',
  tracce text not null default '[]',
  zucchero_g numeric,
  sodio_mg numeric,
  rischio_listeria boolean not null default false,
  rischio_toxo boolean not null default false,
  lotto text,
  origine_paese text,
  origine_regione text,
  origine_luogo text,
  stato_certificazione text not null default 'pending',
  scheda_tecnica text,
  immagine text
);

create table if not exists chain_events (
  id text primary key,
  prodotto_id text not null,
  seq integer not null,
  tipo text not null,
  attore text not null,
  luogo text not null,
  lat double precision,
  lng double precision,
  occurred_at timestamptz not null,
  lotto text,
  note text,
  prev_hash text not null,
  hash text not null
);

create table if not exists restaurants (
  id text primary key,
  nome text not null,
  tipo text not null,
  citta text not null,
  paese text not null,
  indirizzo text,
  certificato boolean not null default false,
  hash_certificazione text,
  immagine text,
  vettori text not null default '{}'
);

create table if not exists dishes (
  id text primary key,
  restaurant_id text not null,
  nome text not null,
  descrizione text not null,
  portata text not null,
  product_ids text not null default '[]',
  allergeni_dichiarati text not null default '[]',
  tracce text not null default '[]',
  zucchero_g numeric,
  sodio_mg numeric,
  rischio_listeria boolean not null default false,
  rischio_toxo boolean not null default false,
  stato_certificazione text not null default 'pending',
  immagine text,
  prezzo_cent integer,
  vettori text not null default '{}'
);

create table if not exists demo_passports (
  id text primary key,
  etichetta text not null,
  allergeni text not null default '[]',
  gravidanza boolean not null default false,
  diabete boolean not null default false,
  ipertensione boolean not null default false,
  limite_zucchero_g numeric,
  limite_sodio_mg numeric,
  note text
);

create table if not exists passports (
  user_id text primary key,
  public_id text not null unique,
  allergeni text not null default '[]',
  gravidanza boolean not null default false,
  diabete boolean not null default false,
  ipertensione boolean not null default false,
  limite_zucchero_g numeric,
  limite_sodio_mg numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists passports_public_id_idx on passports (public_id);

create table if not exists product_reports (
  id serial primary key,
  user_id text not null,
  product_name text not null,
  brand text,
  notes text,
  ai_analysis text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists certifications (
  id serial primary key,
  user_id text not null,
  restaurant_name text not null,
  city text,
  declaration text not null,
  protocols text not null default '[]',
  signature_name text not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists seed_meta (
  id text primary key,
  applied_at timestamptz not null default now()
);
