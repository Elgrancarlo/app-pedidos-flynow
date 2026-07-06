-- 023: trigger raw -> event_stream (fix permanente da perda de eventos)
--
-- Contexto: o nó "Supabase: Event Stream1" do n8n falha o POST silenciosamente
-- (continueOnFail=true engole o erro; ~42% de perda em 03/jul). O payt_webhooks_raw
-- é gravado confiável por dois caminhos (n8n "Salvar RAW1" = payload FLAT;
-- edge function webhook-payt = payload NESTED). Este trigger deriva o
-- payt_event_stream do raw e passa a ser o ÚNICO escritor do stream
-- (desativar o nó Event Stream1 no n8n).
--
-- event_key replica byte a byte o formato do n8n v2:
--   {cart_id|stream_tx}:{status}:{ISO .MS Z}:{type|webhook}:{transaction_id|}
-- Timestamps do payload são naive (hora local Payt) e tratados VERBATIM como
-- UTC, igual ao n8n — não converter timezone, senão as keys divergem e duplica.
-- O payload é copiado inteiro: o app extrai voce_recebe dele (comissão producer);
-- o trigger NÃO calcula receita.

-- Parse de timestamp do payload: naive => UTC verbatim; com offset => respeita.
CREATE OR REPLACE FUNCTION public.payt_parse_ts_utc(v text)
RETURNS timestamptz
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF v IS NULL OR TRIM(v) = '' THEN RETURN NULL; END IF;
  RETURN (v::timestamp) AT TIME ZONE 'UTC';
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END $$;

-- Núcleo compartilhado entre o trigger e o backfill: deriva e insere uma linha
-- do event_stream a partir de um payload Payt (flat OU nested).
-- Retorna true se inseriu, false se pulou (sem tx/cart) ou conflitou.
CREATE OR REPLACE FUNCTION public.payt_es_insert_from_payload(p jsonb, p_received timestamptz)
RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_tx        text := NULLIF(TRIM(p->>'transaction_id'), '');
  v_cart      text := NULLIF(TRIM(p->>'cart_id'), '');
  v_status    text := LOWER(COALESCE(NULLIF(TRIM(p->>'status'), ''), 'unknown'));
  v_type      text := NULLIF(TRIM(p->>'type'), '');
  v_stream_tx text;
  v_paid      timestamptz;
  v_upd       timestamptz;
  v_event_at  timestamptz;
  v_key       text;
  v_group     text;
  v_total     numeric(12,2);
  v_qty       integer := 0;
  v_prod_name text;
  v_inserted  boolean;
  i           integer;
BEGIN
  v_stream_tx := COALESCE(v_tx, 'cart:' || v_cart);
  IF v_stream_tx IS NULL THEN RETURN false; END IF;

  v_paid := payt_parse_ts_utc(COALESCE(p->>'transaction.paid_at', p->'transaction'->>'paid_at'));
  v_upd  := payt_parse_ts_utc(p->>'updated_at');
  IF v_status = 'paid' THEN
    v_event_at := COALESCE(v_paid, v_upd);
  ELSE
    v_event_at := COALESCE(v_upd, v_paid);
  END IF;
  v_event_at := COALESCE(v_event_at, p_received, NOW());

  v_key := COALESCE(v_cart, v_stream_tx)
    || ':' || v_status
    || ':' || to_char(v_event_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    || ':' || COALESCE(v_type, 'webhook')
    || ':' || COALESCE(v_tx, '');

  v_group := CASE
    WHEN v_status = 'paid' THEN 'sale'
    WHEN v_status IN ('refunded','refund_requested','refund_request','chargeback','charged_back') THEN 'post_sale'
    WHEN v_status IN ('waiting_payment','awaiting_payment','pending','processing','in_analysis') THEN 'checkout'
    WHEN v_status IN ('canceled','cancelled','expired','refused','failed','lost_cart') THEN 'loss'
    WHEN v_status LIKE '%abandon%' THEN 'abandonment'
    ELSE 'other'
  END;

  BEGIN
    v_total := COALESCE(p->>'transaction.total_price', p->'transaction'->>'total_price')::numeric / 100.0;
  EXCEPTION WHEN OTHERS THEN
    v_total := NULL;
  END;

  -- Quantidade de itens físicos (nested: product.items[]; flat: product.items.N.*)
  BEGIN
    IF jsonb_typeof(p->'product'->'items') = 'array' THEN
      SELECT COALESCE(SUM((it->>'quantity')::numeric), 0)::int INTO v_qty
      FROM jsonb_array_elements(p->'product'->'items') it
      WHERE it->>'type' = 'physical';
    ELSE
      i := 0;
      WHILE i <= 50 AND ((p ? ('product.items.' || i || '.type')) OR (p ? ('product.items.' || i || '.name'))) LOOP
        IF p->>('product.items.' || i || '.type') = 'physical' THEN
          v_qty := v_qty + COALESCE((p->>('product.items.' || i || '.quantity'))::numeric, 0)::int;
        END IF;
        i := i + 1;
      END LOOP;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_qty := 0;
  END;

  v_prod_name := NULLIF(TRIM(COALESCE(p->>'product.name', p->'product'->>'name')), '');

  INSERT INTO public.payt_event_stream (
    event_key, transaction_id, cart_id, event_status, event_name, event_group,
    tangible, customer_name, customer_email, customer_phone, customer_doc,
    product_name, product_group, product_quantity, payment_method,
    total_price, paid_at, payload, event_at
  ) VALUES (
    v_key, v_stream_tx, v_cart, v_status, v_type, v_group,
    CASE LOWER(p->>'tangible') WHEN 'true' THEN true WHEN 'false' THEN false END,
    NULLIF(TRIM(COALESCE(p->>'customer.name',  p->'customer'->>'name')), ''),
    NULLIF(TRIM(COALESCE(p->>'customer.email', p->'customer'->>'email')), ''),
    NULLIF(TRIM(COALESCE(p->>'customer.phone', p->'customer'->>'phone')), ''),
    NULLIF(TRIM(COALESCE(p->>'customer.doc',   p->'customer'->>'doc')), ''),
    v_prod_name,
    v_prod_name, -- product_group = product_name (comportamento herdado)
    NULLIF(v_qty, 0),
    NULLIF(TRIM(COALESCE(p->>'transaction.payment_method', p->'transaction'->>'payment_method')), ''),
    v_total, v_paid, p, v_event_at
  )
  ON CONFLICT (event_key) DO NOTHING
  RETURNING true INTO v_inserted;

  RETURN COALESCE(v_inserted, false);
END $$;

-- BEFORE INSERT: preenche as colunas estruturadas do raw quando vierem NULL
-- (o "Salvar RAW1" do n8n grava só o payload; sem isto os diagnósticos e o
-- backfill não enxergam essas linhas).
CREATE OR REPLACE FUNCTION public.payt_raw_enrich()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.transaction_id  := COALESCE(NEW.transaction_id,  NULLIF(TRIM(NEW.payload->>'transaction_id'), ''));
  NEW.cart_id         := COALESCE(NEW.cart_id,         NULLIF(TRIM(NEW.payload->>'cart_id'), ''));
  NEW.event_status    := COALESCE(NEW.event_status,    LOWER(NULLIF(TRIM(NEW.payload->>'status'), '')));
  NEW.event_name      := COALESCE(NEW.event_name,
                           NULLIF(TRIM(NEW.payload->>'event'), ''),
                           NULLIF(TRIM(NEW.payload->>'event_name'), ''),
                           NULLIF(TRIM(NEW.payload->>'type'), ''));
  NEW.integration_key := COALESCE(NEW.integration_key, NULLIF(TRIM(NEW.payload->>'integration_key'), ''));
  NEW.tangible        := COALESCE(NEW.tangible,
                           CASE LOWER(NEW.payload->>'tangible') WHEN 'true' THEN true WHEN 'false' THEN false END);
  NEW.customer_email  := COALESCE(NEW.customer_email,
                           NULLIF(TRIM(COALESCE(NEW.payload->>'customer.email', NEW.payload->'customer'->>'email')), ''));
  NEW.product_name    := COALESCE(NEW.product_name,
                           NULLIF(TRIM(COALESCE(NEW.payload->>'product.name', NEW.payload->'product'->>'name')), ''));
  RETURN NEW;
END $$;

-- AFTER INSERT: deriva o event_stream. Blindado: um erro aqui NUNCA pode
-- derrubar o insert do raw (o raw é a fonte de verdade).
CREATE OR REPLACE FUNCTION public.payt_raw_to_event_stream()
RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM public.payt_es_insert_from_payload(NEW.payload, NEW.received_at);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'payt_raw_to_event_stream: falha para raw id % (%): %', NEW.id, NEW.transaction_id, SQLERRM;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_payt_raw_enrich ON public.payt_webhooks_raw;
CREATE TRIGGER trg_payt_raw_enrich
  BEFORE INSERT ON public.payt_webhooks_raw
  FOR EACH ROW EXECUTE FUNCTION public.payt_raw_enrich();

DROP TRIGGER IF EXISTS trg_payt_raw_to_event_stream ON public.payt_webhooks_raw;
CREATE TRIGGER trg_payt_raw_to_event_stream
  AFTER INSERT ON public.payt_webhooks_raw
  FOR EACH ROW EXECUTE FUNCTION public.payt_raw_to_event_stream();

-- Função do trigger antigo (dropado em 02/jul por duplicar keys em formato
-- divergente do n8n). Remover para não ser religada por engano.
DROP FUNCTION IF EXISTS public.trg_payt_raw_after_insert();
