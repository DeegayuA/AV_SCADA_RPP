import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const tagsFilePath = path.join(process.cwd(), 'config', 'tags.json');

export async function GET() {
  try {
    const fileContent = await fs.readFile(tagsFilePath, 'utf-8');
    const tags = JSON.parse(fileContent);
    return NextResponse.json(tags);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json([]);
    }
    console.error('Failed to read tags file:', error);
    return NextResponse.json({ message: 'Failed to read tags file.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { tag } = await request.json();
    if (!tag) {
      return NextResponse.json({ message: 'Tag is required.' }, { status: 400 });
    }

    let tags: string[] = [];
    try {
      const fileContent = await fs.readFile(tagsFilePath, 'utf-8');
      tags = JSON.parse(fileContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }

    if (!tags.includes(tag)) {
      tags.push(tag);
      await fs.writeFile(tagsFilePath, JSON.stringify(tags, null, 2));
    }

    return NextResponse.json({ message: 'Tag added successfully.', tag });
  } catch (error) {
    console.error('Failed to add tag:', error);
    return NextResponse.json({ message: 'Failed to add tag.' }, { status: 500 });
  }
}