import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
import sharp from "sharp";
import crypto from "crypto";
import { getEncryptionKey } from "@/lib/maintenance-crypto";
import { PLANT_LOCATION } from "@/config/constants";

const IV_LENGTH = 16;

function encrypt(text: string, key: Buffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export async function POST(request: Request) {
  try {
    const encryptionKey = await getEncryptionKey();
    if (!encryptionKey)
      return NextResponse.json(
        { message: "No encryption key" },
        { status: 500 }
      );

    const formData = await request.formData();
    const tag = formData.get("tag") as string;
    const issues = JSON.parse(formData.get("issues") as string);
    const description = (formData.get("description") as string) || "";
    const image = formData.get("image") as File | null;

    const date = new Date();
    const dateString = format(date, "yyyy-MM-dd");
    const dateTimeString = format(date, "yyyyMMdd_HHmmss");

    const noteDir = path.join(
      process.cwd(),
      "public",
      "maintenance_note_image",
      dateString
    );
    const previewDir = path.join(
      process.cwd(),
      "public",
      "maintenance_note_image_preview",
      dateString
    );
    const logDir = path.join(process.cwd(), "logs", "notes");

    await fs.mkdir(noteDir, { recursive: true });
    await fs.mkdir(previewDir, { recursive: true });
    await fs.mkdir(logDir, { recursive: true });

    let filename = "";
    if (image) {
      filename = `${PLANT_LOCATION}_note_${tag.replace(
        / /g,
        "_"
      )}_${dateTimeString}.jpg`;
      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(path.join(noteDir, filename), buffer);
      await sharp(buffer)
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .toFile(path.join(previewDir, filename));
    }

    const logFilePath = path.join(logDir, `${dateString}.json.log`);
    const logData = {
      timestamp: date.toISOString(),
      tag,
      issues,
      description,
      filename,
    };

    const encryptedLog = encrypt(JSON.stringify(logData), encryptionKey);
    await fs.appendFile(logFilePath, encryptedLog + "\n");

    return NextResponse.json({ message: "Note saved successfully", filename });
  } catch (error) {
    console.error("Note upload failed:", error);
    return NextResponse.json(
      { message: "Failed to save note" },
      { status: 500 }
    );
  }
}
