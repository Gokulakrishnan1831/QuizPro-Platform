const { Pool } = require('@neondatabase/serverless');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function seedAdmin() {
    console.log('Seeding default admin account...');

    // Read .env manually
    const envContent = fs.readFileSync('.env', 'utf-8');
    const dbUrl = envContent.match(/DATABASE_URL="([^"]+)"/)?.[1];

    if (!dbUrl) {
        console.error('DATABASE_URL not found in .env');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: dbUrl });

    const email = 'admin@quizpro.com';
    const password = 'admin123';
    const name = 'Super Admin';

    try {
        // Check if admin already exists
        const existing = await pool.query('SELECT id FROM "Admin" WHERE email = $1', [email]);

        if (existing.rows.length > 0) {
            console.log(`Admin ${email} already exists.`);
            process.exit(0);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert admin
        await pool.query(
            'INSERT INTO "Admin" (id, email, "passwordHash", name, "createdAt", "updatedAt") VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())',
            [email, passwordHash, name]
        );

        console.log(`✅ Successfully created default admin:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);
    } catch (error) {
        console.error('Error seeding admin:', error);
    } finally {
        await pool.end();
    }
}

seedAdmin();
