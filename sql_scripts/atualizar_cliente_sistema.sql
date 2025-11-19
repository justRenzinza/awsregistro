-- script pra atualizar o cliente_sistema.sql

ALTER TABLE public.cliente_sistema
	ADD COLUMN IF NOT EXISTS quantidade_banco_dados INTEGER;

ALTER TABLE public.cliente_sistema
	ADD COLUMN IF NOT EXISTS quantidade_cnpj INTEGER;

ALTER TABLE public.cliente_sistema
	ADD COLUMN IF NOT EXISTS ip_mblock VARCHAR(255);

ALTER TABLE public.cliente_sistema
	ADD COLUMN IF NOT EXISTS porta_mblock VARCHAR(255);

ALTER TABLE public.cliente_sistema
	ADD COLUMN IF NOT EXISTS data_atualizacao TIMESTAMP(0) WITHOUT TIME ZONE;

ALTER TABLE public.cliente_sistema
	ADD COLUMN IF NOT EXISTS passo_atualizacao INTEGER;
