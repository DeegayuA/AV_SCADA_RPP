import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const USERS_PATH = path.join(process.cwd(), 'config', 'users.json.enc');
const KEY_PATH = path.join(process.cwd(), 'config', 'users-key.enc');
const IV_LENGTH = 16;

const initialUsers = {
  'admin@av.lk': {
    password: 'AVR&D490',
    role: 'admin',
  },
  'operator@av.lk': {
    password: 'operator123',
    role: 'operator',
  },
  'viewer@av.lk': {
    password: 'viewer123',
    role: 'viewer',
  },
};

async function getKey() {
  try {
    const keyHex = await fs.readFile(KEY_PATH, 'utf-8');
    return Buffer.from(keyHex.trim(), 'hex');
  } catch (error) {
    console.error('Error reading encryption key, generating a new one...');
    const newKey = crypto.randomBytes(32);
    await fs.writeFile(KEY_PATH, newKey.toString('hex'));
    console.log('New encryption key generated and saved to', KEY_PATH);
    return newKey;
  }
}

async function encryptUsers(users, key) {
  const text = JSON.stringify(users);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function createInitialUsers() {
  const key = await getKey();
  const usersWithHashedPasswords = {};
  for (const [email, user] of Object.entries(initialUsers)) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    usersWithHashedPasswords[email] = {
      password: hashedPassword,
      role: user.role,
    };
  }

  const encryptedUsers = await encryptUsers(usersWithHashedPasswords, key);
  await fs.writeFile(USERS_PATH, encryptedUsers);
  console.log('Initial users created and encrypted successfully.');
}

createInitialUsers();