import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE = path.join(__dirname, '..', 'data', 'users.json');

// In-memory token store (Token -> { id, username, name })
// In a real app this might be Redis or JWTs. For this simple app, an in-memory map is fine.
const activeTokens = new Map();

function readUsers() {
    if (!fs.existsSync(USERS_FILE)) return {};
    try {
        const fileContent = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(fileContent);
    } catch (err) {
        console.error('Failed to read users.json', err);
        return {};
    }
}

/**
 * Verify username and password against users.json
 * @returns {object|null} user object if successful, null otherwise
 */
export function verifyUser(username, password) {
    const users = readUsers();
    const user = users[username];
    if (!user) return null;

    const inputHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== inputHash) return null;

    return {
        id: `u_${username}`, // simple ID generation
        username,
        name: user.name
    };
}

/**
 * Create a new session token for the user
 */
export function createToken(user) {
    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.set(token, user);
    return token;
}

/**
 * Verify a token and return the associated user
 */
export function verifyToken(token) {
    if (!token) return null;
    return activeTokens.get(token) || null;
}
