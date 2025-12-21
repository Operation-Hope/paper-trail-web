-- Extract database schema as JSON for SchemaVisualizer
-- Run this in your Supabase SQL Editor and save the output to src/data/schema.json

WITH columns_info AS (
  SELECT
    c.table_name,
    c.column_name,
    c.udt_name as data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position,
    COALESCE(pk.is_primary_key, false) as is_primary_key,
    COALESCE(fk.is_foreign_key, false) as is_foreign_key,
    fk.foreign_table_name,
    fk.foreign_column_name,
    COALESCE(uq.is_unique, false) as is_unique
  FROM information_schema.columns c
  LEFT JOIN (
    SELECT kcu.table_name, kcu.column_name, true as is_primary_key
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND tc.table_schema = 'public'
  ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
  LEFT JOIN (
    SELECT
      kcu.table_name,
      kcu.column_name,
      true as is_foreign_key,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
  LEFT JOIN (
    SELECT kcu.table_name, kcu.column_name, true as is_unique
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
  ) uq ON c.table_name = uq.table_name AND c.column_name = uq.column_name
  WHERE c.table_schema = 'public'
    -- Exclude backup tables and system tables
    AND c.table_name NOT LIKE '%_backup_%'
    AND c.table_name NOT IN ('schema_migrations', 'ar_internal_metadata', '_prisma_migrations')
  ORDER BY c.table_name, c.ordinal_position
),
tables_json AS (
  SELECT
    t.table_name,
    jsonb_build_object(
      'name', t.table_name,
      'columns', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'name', ci.column_name,
            'type', ci.data_type,
            'isPrimaryKey', ci.is_primary_key,
            'isForeignKey', ci.is_foreign_key,
            'isNullable', ci.is_nullable = 'YES',
            'isUnique', ci.is_unique
          ) ||
          CASE
            WHEN ci.is_foreign_key THEN
              jsonb_build_object('references', jsonb_build_object('table', ci.foreign_table_name, 'column', ci.foreign_column_name))
            ELSE '{}'::jsonb
          END
          ORDER BY ci.ordinal_position
        )
        FROM columns_info ci
        WHERE ci.table_name = t.table_name
      )
    ) as table_json
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE '%_backup_%'
    AND t.table_name NOT IN ('schema_migrations', 'ar_internal_metadata', '_prisma_migrations')
),
relationships_json AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'fromTable', kcu.table_name,
      'fromColumn', kcu.column_name,
      'toTable', ccu.table_name,
      'toColumn', ccu.column_name,
      'relationshipType', 'one-to-many'
    )
  ) as rels
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND kcu.table_name NOT LIKE '%_backup_%'
)
-- Copy the output below (without the column header) to src/data/schema.json
SELECT jsonb_pretty(
  jsonb_build_object(
    'tables', (SELECT jsonb_agg(table_json ORDER BY table_name) FROM tables_json),
    'relationships', (SELECT COALESCE(rels, '[]'::jsonb) FROM relationships_json),
    'generatedAt', now()
  )
);
