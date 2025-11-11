import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { format } from "date-fns";
import sharp from "sharp";
import crypto from "crypto";
import { PLANT_LOCATION } from "@/config/constants";
import { getEncryptionKey } from "@/lib/maintenance-crypto";

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
    if (!encryptionKey) {
      return NextResponse.json(
        { message: "Encryption key is not set up on the server." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const itemName = formData.get("itemName") as string;
    const itemNumber = formData.get("itemNumber") as string;
    const username = formData.get("username") as string;

    if (!file) {
      return NextResponse.json({ message: "No file found." }, { status: 400 });
    }

    const date = new Date();
    const dateString = format(date, "yyyy-MM-dd");
    const dateTimeString = format(date, "yyyyMMdd_HHmmss");

    const fullResDir = path.join(
      process.cwd(),
      "public",
      "maintenance_image",
      dateString
    );
    const previewDir = path.join(
      process.cwd(),
      "public",
      "maintenance_image_preview",
      dateString
    );
    const logDir = path.join(process.cwd(), "logs", "maintenance");

    await fs.mkdir(fullResDir, { recursive: true });
    await fs.mkdir(previewDir, { recursive: true });
    await fs.mkdir(logDir, { recursive: true });

    const filename = `${PLANT_LOCATION}_${itemName.replace(
      / /g,
      "_"
    )}_${itemNumber.replace(/ /g, "_")}_${dateTimeString}_${username.replace(
      / /g,
      "_"
    )}.jpg`;

    const fullResPath = path.join(fullResDir, filename);
    const previewPath = path.join(previewDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());

    // Save full-resolution image
    await fs.writeFile(fullResPath, buffer);

    // Create and save preview image
    await sharp(buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .toFile(previewPath);

    // Log the data
    const logFilePath = path.join(logDir, `${dateString}.log`);
    const logData = {
      timestamp: date.toISOString(),
      itemName,
      itemNumber,
      username,
      filename,
      uploadType: "maintenance" as const,
    };

    const encryptedLogData = encrypt(JSON.stringify(logData), encryptionKey);
    await fs.appendFile(logFilePath, encryptedLogData + "\n");

    return NextResponse.json({
      message: "File uploaded successfully.",
      filename,
      log: logData,
    });
  } catch (error) {
    console.error("File upload failed:", error);
    return NextResponse.json(
      { message: "File upload failed." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { message: "Method not allowed. Please use POST to upload files." },
    { status: 405 }
  );
}
