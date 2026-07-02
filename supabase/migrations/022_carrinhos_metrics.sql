CREATE OR REPLACE FUNCTION checkout_summary_counts(p_since timestamptz)
RETURNS JSON LANGUAGE sql STABLE AS $$
  WITH j AS (
    SELECT *, COALESCE(cart_id, transaction_id) AS ent
    FROM payt_event_stream WHERE event_at >= p_since
  ),
  agg AS (
    SELECT ent,
      (array_agg(event_status ORDER BY event_at DESC))[1] AS latest_status,
      (array_agg(event_group  ORDER BY event_at DESC))[1] AS latest_group,
      max(event_at) AS latest_at,
      bool_or(event_status = 'paid' OR event_group = 'sale') AS pagou,
      max(event_at) FILTER (WHERE event_status = 'paid') AS pago_em,
      min(event_at) FILTER (WHERE event_group = 'checkout') AS primeiro_waiting,
      bool_or(event_group IN ('loss','abandonment')) AS teve_perda,
      bool_or(event_status <> 'paid' AND event_group <> 'sale') AS teve_nao_pago
    FROM j GROUP BY ent
  )
  SELECT json_build_object(
    'openCount',      count(*) FILTER (WHERE latest_group = 'checkout' AND latest_at >= now() - interval '2 days'),
    'lostCount',      count(*) FILTER (WHERE (latest_group = 'checkout' AND latest_at < now() - interval '2 days')
                                          OR latest_status IN ('canceled','cancelled','expired','refused','failed')),
    'abandonedCount', count(*) FILTER (WHERE latest_status = 'lost_cart'),
    'recoveredCount', count(*) FILTER (WHERE pagou AND teve_nao_pago
                                          AND (teve_perda OR (primeiro_waiting IS NOT NULL
                                               AND EXTRACT(EPOCH FROM (pago_em - primeiro_waiting)) >= 3600))),
    'totalEvents',    (SELECT count(*) FROM j)
  )
  FROM agg;
$$;
CREATE OR REPLACE FUNCTION checkout_monitor_summary(p_since timestamptz, p_limit int DEFAULT 100, p_offset int DEFAULT 0)
RETURNS JSON LANGUAGE plpgsql STABLE AS $$
DECLARE result JSON;
BEGIN
  WITH j AS (
    SELECT *, COALESCE(cart_id, transaction_id) AS ent
    FROM payt_event_stream WHERE event_at >= p_since
  ),
  agg AS (
    SELECT ent,
      (array_agg(event_status ORDER BY event_at DESC))[1] AS latest_status,
      (array_agg(event_group  ORDER BY event_at DESC))[1] AS latest_group,
      max(event_at) AS latest_at,
      bool_or(event_status = 'paid' OR event_group = 'sale') AS pagou,
      max(event_at) FILTER (WHERE event_status = 'paid') AS pago_em,
      min(event_at) FILTER (WHERE event_group = 'checkout') AS primeiro_waiting,
      bool_or(event_group IN ('loss','abandonment')) AS teve_perda,
      bool_or(event_status <> 'paid' AND event_group <> 'sale') AS teve_nao_pago
    FROM j GROUP BY ent
  ),
  summary AS (
    SELECT
      count(*) FILTER (WHERE latest_group='checkout' AND latest_at >= now() - interval '2 days') AS open_count,
      count(*) FILTER (WHERE (latest_group='checkout' AND latest_at < now() - interval '2 days')
                           OR latest_status IN ('canceled','cancelled','expired','refused','failed')) AS lost_count,
      count(*) FILTER (WHERE latest_status='lost_cart') AS abandoned_count,
      count(*) FILTER (WHERE pagou AND teve_nao_pago
                           AND (teve_perda OR (primeiro_waiting IS NOT NULL
                                AND EXTRACT(EPOCH FROM (pago_em - primeiro_waiting)) >= 3600))) AS recovered_count
    FROM agg
  ),
  latest_per_entity AS (
    SELECT DISTINCT ON (ent)
      ent AS entity_key, transaction_id, cart_id, customer_name, customer_email, customer_phone,
      product_name, product_group, payment_method, total_price, event_status, event_group, event_at
    FROM j ORDER BY ent, event_at DESC
  ),
  timelines AS (
    SELECT ent AS entity_key, array_agg(event_status ORDER BY event_at ASC) AS timeline, count(*) AS raw_count
    FROM j GROUP BY ent
  ),
  filtered_rows AS (
    SELECT l.*, t.timeline, t.raw_count
    FROM latest_per_entity l JOIN timelines t ON t.entity_key = l.entity_key
    WHERE l.event_status <> 'paid' AND l.event_group IN ('checkout','loss','abandonment')
    ORDER BY l.event_at DESC
  ),
  paginated AS (SELECT * FROM filtered_rows LIMIT p_limit OFFSET p_offset)
  SELECT json_build_object(
    'windowHours', EXTRACT(EPOCH FROM (now() - p_since))/3600,
    'totalEvents', (SELECT count(*) FROM j),
    'totalRows', (SELECT count(*) FROM filtered_rows),
    'summary', json_build_object(
      'openCount', (SELECT open_count FROM summary),
      'lostCount', (SELECT lost_count FROM summary),
      'abandonedCount', (SELECT abandoned_count FROM summary),
      'recoveredCount', (SELECT recovered_count FROM summary),
      'totalEvents', (SELECT count(*) FROM j)
    ),
    'rows', COALESCE((
      SELECT json_agg(json_build_object(
        'key', entity_key,
        'transactionId', CASE WHEN transaction_id LIKE 'cart:%' THEN NULL ELSE transaction_id END,
        'cartId', cart_id, 'customerName', customer_name, 'customerEmail', customer_email,
        'customerPhone', customer_phone, 'productName', product_name, 'productGroup', product_group,
        'paymentMethod', payment_method, 'totalPrice', total_price, 'status', event_status,
        'eventGroup', event_group, 'eventAt', event_at, 'timeline', timeline, 'rawCount', raw_count
      ) ORDER BY event_at DESC) FROM paginated), '[]'::json)
  ) INTO result;
  RETURN result;
END;
$$;
