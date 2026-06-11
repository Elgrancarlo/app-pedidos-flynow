-- Migration 021: optimized checkout RPCs.
-- Moves expensive cart grouping/summary work from the frontend server to SQL.

CREATE INDEX IF NOT EXISTS idx_payt_event_stream_cart_tx_event_at
  ON payt_event_stream(COALESCE(cart_id, transaction_id), event_at DESC);

CREATE INDEX IF NOT EXISTS idx_payt_event_stream_event_group_event_at
  ON payt_event_stream(event_group, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_payt_webhooks_raw_received_at
  ON payt_webhooks_raw(received_at DESC);

CREATE INDEX IF NOT EXISTS idx_pedidos_data_pagamento
  ON pedidos(data_pagamento DESC);

CREATE OR REPLACE FUNCTION checkout_summary_counts(p_since timestamptz)
RETURNS JSON
LANGUAGE sql STABLE
AS $$
  WITH latest_per_entity AS (
    SELECT DISTINCT ON (COALESCE(cart_id, transaction_id))
      COALESCE(cart_id, transaction_id) AS entity_key,
      event_status,
      event_group
    FROM payt_event_stream
    WHERE event_at >= p_since
    ORDER BY COALESCE(cart_id, transaction_id), event_at DESC
  ),
  non_paid AS (
    SELECT entity_key, event_group
    FROM latest_per_entity
    WHERE event_status != 'paid'
      AND event_group IN ('checkout', 'loss', 'abandonment')
  ),
  recovered AS (
    SELECT COUNT(DISTINCT l.entity_key) AS cnt
    FROM latest_per_entity l
    WHERE l.event_status = 'paid'
      AND EXISTS (
        SELECT 1
        FROM payt_event_stream es
        WHERE COALESCE(es.cart_id, es.transaction_id) = l.entity_key
          AND es.event_at >= p_since
          AND es.event_status != 'paid'
      )
  ),
  total AS (
    SELECT COUNT(*) AS cnt
    FROM payt_event_stream
    WHERE event_at >= p_since
  )
  SELECT json_build_object(
    'openCount', COALESCE((SELECT COUNT(*) FROM non_paid WHERE event_group = 'checkout'), 0),
    'lostCount', COALESCE((SELECT COUNT(*) FROM non_paid WHERE event_group = 'loss'), 0),
    'abandonedCount', COALESCE((SELECT COUNT(*) FROM non_paid WHERE event_group = 'abandonment'), 0),
    'recoveredCount', COALESCE((SELECT cnt FROM recovered), 0),
    'totalEvents', COALESCE((SELECT cnt FROM total), 0)
  );
$$;

CREATE OR REPLACE FUNCTION checkout_monitor_summary(
  p_since timestamptz,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  WITH all_events AS (
    SELECT
      COALESCE(cart_id, transaction_id) AS entity_key,
      transaction_id,
      cart_id,
      customer_name,
      customer_email,
      customer_phone,
      product_name,
      product_group,
      payment_method,
      total_price,
      event_status,
      event_group,
      event_at
    FROM payt_event_stream
    WHERE event_at >= p_since
  ),
  latest_per_entity AS (
    SELECT DISTINCT ON (entity_key)
      entity_key,
      transaction_id,
      cart_id,
      customer_name,
      customer_email,
      customer_phone,
      product_name,
      product_group,
      payment_method,
      total_price,
      event_status,
      event_group,
      event_at
    FROM all_events
    ORDER BY entity_key, event_at DESC
  ),
  timelines AS (
    SELECT
      entity_key,
      array_agg(event_status ORDER BY event_at ASC) AS timeline,
      COUNT(*) AS raw_count
    FROM all_events
    GROUP BY entity_key
  ),
  filtered_rows AS (
    SELECT
      l.*,
      t.timeline,
      t.raw_count
    FROM latest_per_entity l
    JOIN timelines t ON t.entity_key = l.entity_key
    WHERE l.event_status != 'paid'
      AND l.event_group IN ('checkout', 'loss', 'abandonment')
    ORDER BY l.event_at DESC
  ),
  summary_counts AS (
    SELECT
      COUNT(*) FILTER (WHERE event_group = 'checkout') AS open_count,
      COUNT(*) FILTER (WHERE event_group = 'loss') AS lost_count,
      COUNT(*) FILTER (WHERE event_group = 'abandonment') AS abandoned_count
    FROM filtered_rows
  ),
  recovered AS (
    SELECT COUNT(*) AS cnt
    FROM latest_per_entity l
    JOIN timelines t ON t.entity_key = l.entity_key
    WHERE l.event_status = 'paid'
      AND EXISTS (
        SELECT 1 FROM unnest(t.timeline) AS s WHERE s != 'paid'
      )
  ),
  total_events AS (
    SELECT COALESCE(SUM(raw_count), 0) AS cnt
    FROM timelines
  ),
  paginated AS (
    SELECT * FROM filtered_rows
    LIMIT p_limit OFFSET p_offset
  )
  SELECT json_build_object(
    'windowHours', EXTRACT(EPOCH FROM (NOW() - p_since)) / 3600,
    'totalEvents', (SELECT cnt FROM total_events),
    'totalRows', (SELECT COUNT(*) FROM filtered_rows),
    'summary', json_build_object(
      'openCount', (SELECT open_count FROM summary_counts),
      'lostCount', (SELECT lost_count FROM summary_counts),
      'abandonedCount', (SELECT abandoned_count FROM summary_counts),
      'recoveredCount', (SELECT cnt FROM recovered),
      'totalEvents', (SELECT cnt FROM total_events)
    ),
    'rows', COALESCE((
      SELECT json_agg(json_build_object(
        'key', entity_key,
        'transactionId', CASE WHEN transaction_id LIKE 'cart:%' THEN NULL ELSE transaction_id END,
        'cartId', cart_id,
        'customerName', customer_name,
        'customerEmail', customer_email,
        'customerPhone', customer_phone,
        'productName', product_name,
        'productGroup', product_group,
        'paymentMethod', payment_method,
        'totalPrice', total_price,
        'status', event_status,
        'eventGroup', event_group,
        'eventAt', event_at,
        'timeline', timeline,
        'rawCount', raw_count
      ) ORDER BY event_at DESC)
      FROM paginated
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$;
