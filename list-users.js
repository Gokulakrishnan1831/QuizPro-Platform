const { Pool } = require('@neondatabase/serverless');
const fs = require('fs');

// Read .env manually
const envContent = fs.readFileSync('.env', 'utf-8');
const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];

const pool = new Pool({ connectionString: dbUrl });

pool.query('SELECT id, email, name, role FROM "User" ORDER BY "createdAt" DESC LIMIT 10')
    .then(r => {
        console.log(JSON.stringify(r.rows, null, 2));
        pool.end();
    })
    .catch(e => {
        console.error(e.message);
        pool.end();
    });
