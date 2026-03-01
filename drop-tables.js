const { Client } = require('@neondatabase/serverless');
const ws = require('ws');
const { neonConfig } = require('@neondatabase/serverless');
neonConfig.webSocketConstructor = ws;
async function drop() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query('DROP TYPE IF EXISTS "Skill", "QuestionType", "SubscriptionTier", "Persona" CASCADE;');
    await client.end();
    console.log('Enums dropped.');
}
drop().catch(console.error);
