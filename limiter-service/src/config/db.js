const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.POSTGRES_USER || 'admin',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'ratelimiter',
    password: process.env.POSTGRES_PASSWORD || 'password123',
    port: 5432,
});

async function initializeDB() {
    const client = await pool.connect();
    try {
        console.log('Initializing Database Schema...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS tiers (
                name VARCHAR(50) PRIMARY KEY,
                request_limit INT NOT NULL,
                window_ms INT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS api_keys (
                key VARCHAR(255) PRIMARY KEY,
                tier_name VARCHAR(50) REFERENCES tiers(name)
            );
        `);

        await client.query(`
            INSERT INTO tiers (name, request_limit, window_ms) 
            VALUES ('FREE', 2, 60000), ('PRO', 5, 60000) 
            ON CONFLICT (name) DO NOTHING;

            INSERT INTO api_keys (key, tier_name) 
            VALUES ('user_42', 'PRO'), ('user_99', 'FREE')
            ON CONFLICT (key) DO NOTHING;
        `);
        console.log('Database Schema Initialized & Seeded');
    } catch (err) {
        console.error('DB Initialization Error:', err);
    } finally {
        client.release();
    }
}

module.exports = { pool, initializeDB };