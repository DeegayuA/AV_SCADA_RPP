import { NextResponse } from 'next/server';
import { decryptUsers, encryptUsers } from '@/lib/user-crypto';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const USERS_PATH = path.join(process.cwd(), 'config', 'users.json.enc');

export async function GET() {
  try {
    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData);
    if (users) {
      // In a real app, you'd want to remove passwords before sending.
      return NextResponse.json(users);
    }
    return NextResponse.json({ message: 'No users found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read user store' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();
    if (!email || !password || !role) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData) || {};

    if (users[email]) {
      return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    users[email] = { password: hashedPassword, role };

    const encryptedUsers = await encryptUsers(users);
    if (encryptedUsers) {
      await fs.writeFile(USERS_PATH, encryptedUsers);
      return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
    }
    return NextResponse.json({ message: 'Failed to encrypt user data' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
  }
}