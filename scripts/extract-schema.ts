#!/usr/bin/env npx tsx
/**
 * Extract database schema from PostgreSQL/Supabase
 * Outputs JSON compatible with SchemaVisualizer component
 *
 * Usage:
 *   npx tsx scripts/extract-schema.ts
 *
 * Requires DATABASE_URL environment variable or uses Supabase connection from .env
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Schema types matching SchemaVisualizer
interface SchemaColumn {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isNullable?: boolean;
  isUnique?: boolean;
  isIdentity?: boolean;
  defaultValue?: string | null;
  description?: string;
  references?: {
    table: string;
    column: string;
  };
}

interface SchemaTable {
  name: string;
  schema?: string;
  description?: string;
  columns: SchemaColumn[];
}

interface SchemaRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationshipType?: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface DatabaseSchema {
  tables: SchemaTable[];
  relationships: SchemaRelationship[];
  generatedAt?: string;
}

// Tables to exclude (system tables, backups, etc.)
const EXCLUDED_TABLES = [
  'schema_migrations',
  'ar_internal_metadata',
  '_prisma_migrations',
];

// Pattern for backup tables to exclude
const BACKUP_TABLE_PATTERN = /_backup_\d+$/;

async function extractSchema(): Promise<DatabaseSchema> {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('Extracting schema from Supabase...');

  // Query to get all tables and columns
  const { data: columnsData, error: columnsError } = await supabase.rpc('get_schema_info');

  if (columnsError) {
    // Fallback: try direct query if RPC doesn't exist
    console.log('RPC not available, using direct information_schema query...');
    return extractSchemaDirectly(supabase);
  }

  return processSchemaData(columnsData);
}

async function extractSchemaDirectly(supabase: ReturnType<typeof createClient>): Promise<DatabaseSchema> {
  // Get columns
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns' as never)
    .select('*')
    .eq('table_schema', 'public');

  if (colError) {
    throw new Error(`Failed to query columns: ${colError.message}`);
  }

  // Since direct information_schema access may not work, let's create a manual approach
  console.log('Direct query may not work with Supabase client. Generating placeholder...');
  return generatePlaceholderSchema();
}

function generatePlaceholderSchema(): DatabaseSchema {
  // This generates a placeholder - you'll need to run the SQL directly
  console.log(`
To generate the actual schema, run this SQL in your Supabase SQL Editor:

-- Save this output as src/data/schema.json

WITH columns_info AS (
  SELECT
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.ordinal_position,
    CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
    CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
    fk.foreign_table_name,
    fk.foreign_column_name,
    CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END as is_unique
  FROM information_schema.columns c
  LEFT JOIN (
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
  ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
  LEFT JOIN (
    SELECT
      kcu.table_name,
      kcu.column_name,
      ccu.table_name as foreign_table_name,
      ccu.column_name as foreign_column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
  LEFT JOIN (
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
  ) uq ON c.table_name = uq.table_name AND c.column_name = uq.column_name
  WHERE c.table_schema = 'public'
  ORDER BY c.table_name, c.ordinal_position
)
SELECT json_build_object(
  'tables', (
    SELECT json_agg(
      json_build_object(
        'name', t.table_name,
        'columns', (
          SELECT json_agg(
            json_build_object(
              'name', ci.column_name,
              'type', ci.data_type,
              'isPrimaryKey', ci.is_primary_key,
              'isForeignKey', ci.is_foreign_key,
              'isNullable', ci.is_nullable = 'YES',
              'isUnique', ci.is_unique,
              'references', CASE
                WHEN ci.is_foreign_key THEN json_build_object('table', ci.foreign_table_name, 'column', ci.foreign_column_name)
                ELSE NULL
              END
            ) ORDER BY ci.ordinal_position
          )
          FROM columns_info ci
          WHERE ci.table_name = t.table_name
        )
      )
    )
    FROM information_schema.tables t
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  ),
  'relationships', (
    SELECT json_agg(
      json_build_object(
        'fromTable', kcu.table_name,
        'fromColumn', kcu.column_name,
        'toTable', ccu.table_name,
        'toColumn', ccu.column_name,
        'relationshipType', 'one-to-many'
      )
    )
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
  ),
  'generatedAt', now()
) as schema;

  `);

  return {
    tables: [],
    relationships: [],
    generatedAt: new Date().toISOString(),
  };
}

function processSchemaData(data: unknown): DatabaseSchema {
  // Process the raw data from the database
  // This will vary based on the query results
  return data as DatabaseSchema;
}

// Alternative: Read from a SQL export file
function readSchemaFromFile(filePath: string): DatabaseSchema {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function main() {
  try {
    // Check if we have a pre-generated schema file
    const schemaFilePath = path.join(process.cwd(), 'src/data/schema.json');

    if (fs.existsSync(schemaFilePath)) {
      console.log('Found existing schema.json, using that...');
      const schema = readSchemaFromFile(schemaFilePath);
      console.log(`Loaded schema with ${schema.tables.length} tables`);
      return;
    }

    const schema = await extractSchema();

    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'src/data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Filter out backup and excluded tables
    schema.tables = schema.tables.filter(
      (t) => !EXCLUDED_TABLES.includes(t.name) && !BACKUP_TABLE_PATTERN.test(t.name)
    );

    // Write the schema
    const outputPath = path.join(outputDir, 'schema.json');
    fs.writeFileSync(outputPath, JSON.stringify(schema, null, 2));

    console.log(`Schema extracted to ${outputPath}`);
    console.log(`Found ${schema.tables.length} tables and ${schema.relationships.length} relationships`);
  } catch (error) {
    console.error('Error extracting schema:', error);
    process.exit(1);
  }
}

main();
