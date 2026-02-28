import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// Check arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node add-user.js <username> <password> [displayName]');
    console.error('Example: node add-user.js admin 123456 "Super Admin"');
    process.exit(1);
}

const [username, password, ...rest] = args;
const displayName = rest.length > 0 ? rest.join(' ') : username;

// Hash the password
const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

// Read existing users
let users = {};
if (fs.existsSync(USERS_FILE)) {
    try {
        const fileContent = fs.readFileSync(USERS_FILE, 'utf-8');
        users = JSON.parse(fileContent);
    } catch (err) {
        console.error('Failed to read data/users.json. Make sure it contains valid JSON.', err);
        process.exit(1);
    }
}

// Add or update the user
users[username] = {
    passwordHash,
    name: displayName,
    createdAt: new Date().toISOString()
};

// Save back
try {
    // Ensure data directory exists
    const dataDir = path.dirname(USERS_FILE);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    console.log(`✅ User '${username}' has been successfully added/updated in data/users.json`);
    console.log(`   Display Name: ${displayName}`);
} catch (err) {
    console.error('Failed to write to data/users.json', err);
    process.exit(1);
}
