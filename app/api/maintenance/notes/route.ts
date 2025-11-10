import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const tag = formData.get("tag") as string;
    const issues = JSON.parse(formData.get("issues") as string);
    const description = formData.get("description") as string;
    const image = formData.get("image") as File | null;

    const date = new Date();
    const dateStr = format(date, "yyyy-MM-dd");
    const logDir = path.join(process.cwd(), "logs", "maintenance_notes");
    await fs.mkdir(logDir, { recursive: true });

    let imagePath = null;
    if (image) {
      const imgDir = path.join(
        process.cwd(),
        "public",
        "maintenance_notes_images",
        dateStr
      );
      await fs.mkdir(imgDir, { recursive: true });
      const fileName = `${date.getTime()}_${image.name.replace(/\s+/g, "_")}`;
      const filePath = path.join(imgDir, fileName);
      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(filePath, buffer);
      imagePath = `/maintenance_notes_images/${dateStr}/${fileName}`;
    }

    const noteData = {
      timestamp: date.toISOString(),
      tag,
      issues,
      description,
      imagePath,
    };

    const logPath = path.join(logDir, `${dateStr}.json`);
    let existingNotes: any[] = [];
    try {
      const existingData = await fs.readFile(logPath, "utf-8");
      existingNotes = JSON.parse(existingData);
    } catch {
      existingNotes = [];
    }
    existingNotes.push(noteData);
    await fs.writeFile(logPath, JSON.stringify(existingNotes, null, 2));

    return NextResponse.json({ success: true, note: noteData });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { success: false, message: "Failed to save note." },
      { status: 500 }
    );
  }
}
