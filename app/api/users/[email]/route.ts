import { NextResponse } from 'next/server';
import { decryptUsers, encryptUsers } from '@/lib/user-crypto';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const USERS_PATH = path.join(process.cwd(), 'config', 'users.json.enc');

export async function GET(request: Request, { params }: { params: { email: string } }) {
  try {
    const email = decodeURIComponent(params.email);
    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData);
    if (users && users[email]) {
      // In a real app, you'd want to remove the password before sending.
      const { password, ...user } = users[email];
      return NextResponse.json(user);
    }
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to read user store' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { email: string } }) {
  try {
    const email = decodeURIComponent(params.email);
    const { role } = await request.json();
    if (!role) {
      return NextResponse.json({ message: 'Missing role field' }, { status: 400 });
    }

    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData);

    if (!users || !users[email]) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    users[email].role = role;

    const encryptedUsers = await encryptUsers(users);
    if (encryptedUsers) {
      await fs.writeFile(USERS_PATH, encryptedUsers);
      return NextResponse.json({ message: 'User updated successfully' });
    }
    return NextResponse.json({ message: 'Failed to encrypt user data' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { email: string } }) {
  try {
    const email = decodeURIComponent(params.email);
    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData);

    if (!users || !users[email]) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    delete users[email];

    const encryptedUsers = await encryptUsers(users);
    if (encryptedUsers) {
      await fs.writeFile(USERS_PATH, encryptedUsers);
      return NextResponse.json({ message: 'User deleted successfully' });
    }
    return NextResponse.json({ message: 'Failed to encrypt user data' }, { status: 500 });
  } catch (error) {
    return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
  }
}