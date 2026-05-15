const { Kafka } = require('kafkajs');
const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'ratelimiter',
    password: 'password123',
    port: 5432,
});

async function initDB() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS usage_logs (
            id SERIAL PRIMARY KEY,
            api_key VARCHAR(255),
            allowed BOOLEAN,
            remaining INT,
            timestamp TIMESTAMP
        );
    `);
    console.log('✅ Analytics DB Table Ready');
}

const kafka = new Kafka({
    clientId: 'analytics-worker',
    brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'analytics-group' });

async function startConsumer() {
    await consumer.connect();
    console.log('✅ Analytics Consumer Connected to Kafka');
    
    await consumer.subscribe({ topic: 'api_usage_logs', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            const event = JSON.parse(message.value.toString());
            
            try {
                await pool.query(
                    'INSERT INTO usage_logs (api_key, allowed, remaining, timestamp) VALUES ($1, $2, $3, $4)',
                    [event.key, event.allowed, event.remaining, event.timestamp]
                );
                console.log(`📊 Logged usage for ${event.key}: Allowed=${event.allowed}`);
            } catch (err) {
                console.error('❌ Failed to save to DB:', err);
            }
        },
    });
}

async function main() {
    await initDB();
    await startConsumer();
}

main();