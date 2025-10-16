import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { decryptUsers, encryptUsers } from '@/lib/user-crypto';
import bcrypt from 'bcryptjs';

const USERS_PATH = path.join(process.cwd(), 'config', 'users.json.enc');

export async function GET() {
  try {
    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData);
    // remove passwords before sending
    for (const user in users) {
        delete users[user].password;
    }
    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to read users file:', error);
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  try {
    const { email, password, role } = await request.json();
    const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
    const users = await decryptUsers(encryptedData) || {};

    if (users[email]) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    users[email] = { password: hashedPassword, role };

    const encryptedUsers = await encryptUsers(users);
    if (encryptedUsers) {
      await fs.writeFile(USERS_PATH, encryptedUsers);
      return NextResponse.json({ message: 'User created' });
    } else {
        return NextResponse.json({ message: 'Failed to encrypt users' }, { status: 500 });
    }
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ message: 'Failed to create user' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
    try {
      const { email, password, role } = await request.json();
      const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
      const users = await decryptUsers(encryptedData) || {};

      if (!users[email]) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
      }

      if (password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        users[email].password = hashedPassword;
      }

      if (role) {
        users[email].role = role;
      }

      const encryptedUsers = await encryptUsers(users);
      if (encryptedUsers) {
        await fs.writeFile(USERS_PATH, encryptedUsers);
        return NextResponse.json({ message: 'User updated' });
      } else {
          return NextResponse.json({ message: 'Failed to encrypt users' }, { status: 500 });
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      return NextResponse.json({ message: 'Failed to update user' }, { status: 500 });
    }
  }

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        if (!email) {
            return NextResponse.json({ message: 'Email is required' }, { status: 400 });
        }

        const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
        const users = await decryptUsers(encryptedData) || {};

        if (!users[email]) {
            return NextResponse.json({ message: 'User not found' }, { status: 404 });
        }

        delete users[email];

        const encryptedUsers = await encryptUsers(users);
        if (encryptedUsers) {
            await fs.writeFile(USERS_PATH, encryptedUsers);
            return NextResponse.json({ message: 'User deleted' });
        } else {
            return NextResponse.json({ message: 'Failed to encrypt users' }, { status: 500 });
        }
    } catch (error) {
        console.error('Failed to delete user:', error);
        return NextResponse.json({ message: 'Failed to delete user' }, { status: 500 });
    }
}