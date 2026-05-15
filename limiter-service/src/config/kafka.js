const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'rate-limiter-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();
const admin = kafka.admin(); 

async function connectProducer() {
    try {
        await admin.connect();
        await admin.createTopics({
            topics: [{ topic: 'api_usage_logs', numPartitions: 1 }],
            waitForLeaders: true,
        });
        await admin.disconnect();
        console.log('Kafka Topic "api_usage_logs" verified');

        // 2. Connect the producer
        await producer.connect();
        console.log('Connected to Kafka Producer');
    } catch (err) {
        console.error('Kafka Connection Error:', err);
    }
}

function logUsageEvent(key, allowed, remaining) {
    const event = {
        key: key,
        allowed: allowed,
        remaining: remaining,
        timestamp: new Date().toISOString()
    };

    producer.send({
        topic: 'api_usage_logs',
        messages: [{ value: JSON.stringify(event) }],
    }).catch(err => console.error('Failed to send event to Kafka:', err));
}

module.exports = { connectProducer, logUsageEvent };