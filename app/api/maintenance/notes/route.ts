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
    if (!encryptionKey) {
      return NextResponse.json(
        { message: "No encryption key" },
        { status: 500 }
      );
    }

    const formData = await request.formData();

    const tags = formData.get("tags");
    const issues = formData.get("issues");
    const description = formData.get("description") as string;
    const image = formData.get("image") as File | null;
    const username = (formData.get("username") as string) || "Operator";
    const itemName = (formData.get("itemName") as string) || "Maintenance Note"; // Get from form data
    const itemNumber = (formData.get("itemNumber") as string) || "1"; // Get from form data

    // Validate required fields
    if (!tags || !issues) {
      return NextResponse.json(
        { message: "Tags and issues are required" },
        { status: 400 }
      );
    }

    // Parse the JSON arrays
    const tagsArray = JSON.parse(tags as string);
    const issuesArray = JSON.parse(issues as string);

    const date = new Date();
    const dateString = format(date, "yyyy-MM-dd");
    const dateTimeString = format(date, "yyyyMMdd_HHmmss");

    // Generate filename for note image if exists
    let filename = null;
    if (image && image.size > 0) {
      filename = `${PLANT_LOCATION}_note_${dateTimeString}.jpg`;

      // Store note images in the same structure as maintenance images
      const noteImageDir = path.join(
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

      await fs.mkdir(noteImageDir, { recursive: true });
      await fs.mkdir(previewDir, { recursive: true });

      // Save the note image
      const buffer = Buffer.from(await image.arrayBuffer());
      await fs.writeFile(path.join(noteImageDir, filename), buffer);

      // Create preview
      await sharp(buffer)
        .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
        .toFile(path.join(previewDir, filename));
    }

    // Create note log entry - USE THE ACTUAL ITEM NAME AND NUMBER
    const noteLog = {
      timestamp: date.toISOString(),
      itemName: itemName, // This will use the actual item name
      itemNumber: itemNumber, // This will use the actual item number
      username: username, // This will use the actual username
      filename: filename,
      tags: tagsArray,
      issues: issuesArray,
      description: description || "",
      uploadType: "note" as const,
    };

    // Encrypt and save to notes log file
    const encryptedLog = encrypt(JSON.stringify(noteLog), encryptionKey);

    // Ensure notes directory exists
    const notesDir = path.join(process.cwd(), "logs", "notes");
    await fs.mkdir(notesDir, { recursive: true });

    // Append to today's note log file
    const logFile = path.join(notesDir, `${dateString}.log`);
    await fs.appendFile(logFile, encryptedLog + "\n");

    return NextResponse.json({
      message: "Note saved successfully",
      log: noteLog,
    });
  } catch (error) {
    console.error("Error saving note:", error);
    return NextResponse.json(
      { message: "Failed to save note" },
      { status: 500 }
    );
  }
}
