const pool = require('./config/supabaseDb');

async function testConnection() {
    let client;

    try {
        client = await pool.connect();

        console.log('Connected to Supabase successfully!');

        const result = await client.query(`
            SELECT
                current_database() AS database,
                current_user AS username,
                version() AS postgres_version;
        `);

        console.table(result.rows);

        // Test whether your migrated schema exists
        const schemaResult = await client.query(`
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name IN (
                'user3',
                'new_jobBooking',
                'inventory',
                'payables'
            )
            ORDER BY schema_name;
        `);

        console.log('Schemas found:');
        console.table(schemaResult.rows);

    } catch (err) {
        console.error('Supabase connection failed:');
        console.error(err.message);

    } finally {
        if (client) {
            client.release();
        }

        await pool.end();
    }
}

testConnection();