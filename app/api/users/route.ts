import { NextRequest, NextResponse } from 'next/server';
import { decryptUsers, encryptUsers } from '@/lib/user-crypto';
import { promises as fs } from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getSession } from 'next-auth/react';
import { getToken } from 'next-auth/jwt';

const USERS_PATH = path.join(process.cwd(), 'config', 'users.json.enc');
const SALT_ROUNDS = 10;

async function getUsers() {
    try {
        const encryptedData = await fs.readFile(USERS_PATH, 'utf-8');
        return await decryptUsers(encryptedData);
    } catch (error) {
        // If the file doesn't exist, return an empty object
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return {};
        }
        throw error;
    }
}

async function saveUsers(users: any) {
    const encryptedUsers = await encryptUsers(users);
    if (encryptedUsers) {
        await fs.writeFile(USERS_PATH, encryptedUsers);
    }
}

export async function GET(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const users = await getUsers();
    // remove passwords before sending
    for (const email in users) {
        delete users[email].password;
    }
    return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email, password, role } = await req.json();

    if (!email || !password || !role) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const users = await getUsers();

    if (users[email]) {
        return NextResponse.json({ message: 'User already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    users[email] = { password: hashedPassword, role };

    await saveUsers(users);

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
}

export async function PUT(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email, role } = await req.json();

    if (!email || !role) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const users = await getUsers();

    if (!users[email]) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    users[email].role = role;

    await saveUsers(users);

    return NextResponse.json({ message: 'User updated successfully' });
}

export async function DELETE(req: NextRequest) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || (token.role !== 'admin' && token.role !== 'superadmin')) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await req.json();

    if (!email) {
        return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const users = await getUsers();

    if (!users[email]) {
        return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    delete users[email];

    await saveUsers(users);

    return NextResponse.json({ message: 'User deleted successfully' });
}