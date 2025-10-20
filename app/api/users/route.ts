import { promises as fs } from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { NextResponse } from 'next/server';

const usersFilePath = path.join(process.cwd(), 'config', 'users.json');

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const usersData = await fs.readFile(usersFilePath, 'utf-8');
    const users = JSON.parse(usersData);

    // a good practice to not expose sensitive data like passwords
    const sanitizedUsers = users.map((user: any) => {
      const { password, ...rest } = user;
      return rest;
    });

    return NextResponse.json(sanitizedUsers, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}