import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { promises as fs } from 'fs';
import path from 'path';

const JWT_SECRET_PATH = path.join(process.cwd(), 'config', 'jwt-secret.enc');

async function getJwtSecret(): Promise<string> {
  const secret = await fs.readFile(JWT_SECRET_PATH, 'utf-8');
  return secret.trim();
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = await getJwtSecret();

    const decoded = jwt.verify(token, jwtSecret);
    return NextResponse.json({ user: decoded });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Failed to get session' }, { status: 500 });
  }
}