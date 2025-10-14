import { NextResponse } from 'next/server';
import { decryptUsers } from '@/lib/user-crypto';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const USERS_PATH = path.join(process.cwd(), 'config', 'users.json.enc');
const JWT_SECRET_PATH = path.join(process.cwd(), 'config', 'jwt-secret.enc');

async function getJwtSecret(): Promise<string> {
  const secret = await fs.readFile(JWT_SECRET_PATH, 'utf-8');
  return secret.trim();
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: 'Missing email or password' }, { status: 400 });
    }

    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData);

    if (!users || !users[email]) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[email];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const jwtSecret = await getJwtSecret();
    const token = jwt.sign({ email: email, role: user.role }, jwtSecret, { expiresIn: '1h' });

    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ message: 'Login failed' }, { status: 500 });
  }
}