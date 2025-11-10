import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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

/**
 * Combined upload route
 * Handles both maintenance item image uploads and note dialog uploads.
 * formData must include:
 *  - file
 *  - itemName
 *  - itemNumber
 *  - username
 *  - uploadType ("maintenance" | "note")
 */
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
    const itemName = (formData.get("itemName") as string) || "UnknownItem";
    const itemNumber = (formData.get("itemNumber") as string) || "0";
    const username = (formData.get("username") as string) || "unknown";
    const uploadType = (formData.get("uploadType") as string) || "maintenance"; // default

    if (!file) {
      return NextResponse.json(
        { message: "No file provided." },
        { status: 400 }
      );
    }

    // Setup folder paths depending on upload type
    const date = new Date();
    const dateString = format(date, "yyyy-MM-dd");
    const dateTimeString = format(date, "yyyyMMdd_HHmmss");

    // ✅ Type-based directory selection
    const baseDirName =
      uploadType === "note" ? "maintenance_note_image" : "maintenance_image";
    const previewBaseDirName =
      uploadType === "note"
        ? "maintenance_note_image_preview"
        : "maintenance_image_preview";
    const logDirName =
      uploadType === "note" ? "logs/notes" : "logs/maintenance";

    const fullResDir = path.join(
      process.cwd(),
      "public",
      baseDirName,
      dateString
    );
    const previewDir = path.join(
      process.cwd(),
      "public",
      previewBaseDirName,
      dateString
    );
    const logDir = path.join(process.cwd(), logDirName);

    await fs.mkdir(fullResDir, { recursive: true });
    await fs.mkdir(previewDir, { recursive: true });
    await fs.mkdir(logDir, { recursive: true });

    // Construct filename
    const filename = `${PLANT_LOCATION}_${uploadType}_${itemName.replace(
      / /g,
      "_"
    )}_${itemNumber.replace(/ /g, "_")}_${dateTimeString}_${username.replace(
      / /g,
      "_"
    )}.jpg`;

    const fullResPath = path.join(fullResDir, filename);
    const previewPath = path.join(previewDir, filename);

    // Save file and preview
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullResPath, buffer);

    await sharp(buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .toFile(previewPath);

    // Write log entry
    const logFilePath = path.join(logDir, `${dateString}.json.log`);
    const logData = {
      timestamp: date.toISOString(),
      itemName,
      itemNumber,
      username,
      filename,
      uploadType,
    };

    const encryptedLogData = encrypt(JSON.stringify(logData), encryptionKey);
    await fs.appendFile(logFilePath, encryptedLogData + "\n");

    return NextResponse.json({
      message: "File uploaded successfully.",
      filename,
      uploadType,
    });
  } catch (error) {
    console.error("File upload failed:", error);
    return NextResponse.json(
      { message: "File upload failed." },
      { status: 500 }
    );
  }
}

/**
 * Unified image retrieval route for both maintenance and note images.
 * Example URL: /api/maintenance/image/[...slug]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await context.params;
  if (!slug || !Array.isArray(slug) || slug.length === 0) {
    return new NextResponse("Invalid image path", { status: 400 });
  }

  try {
    // Try both maintenance and note preview folders
    const imagePathMain = path.join(
      process.cwd(),
      "public",
      "maintenance_image_preview",
      ...slug
    );
    const imagePathNote = path.join(
      process.cwd(),
      "public",
      "maintenance_note_image_preview",
      ...slug
    );

    let resolvedImagePath = "";
    if (await exists(imagePathMain)) {
      resolvedImagePath = imagePathMain;
    } else if (await exists(imagePathNote)) {
      resolvedImagePath = imagePathNote;
    } else {
      return new NextResponse("Image not found", { status: 404 });
    }

    const publicDirMain = path.resolve(
      process.cwd(),
      "public",
      "maintenance_image_preview"
    );
    const publicDirNote = path.resolve(
      process.cwd(),
      "public",
      "maintenance_note_image_preview"
    );

    const safe = [publicDirMain, publicDirNote].some((dir) =>
      path.resolve(resolvedImagePath).startsWith(dir)
    );
    if (!safe) return new NextResponse("Forbidden", { status: 403 });

    const imageBuffer = await fs.readFile(resolvedImagePath);

    return new Response(new Uint8Array(imageBuffer), {
      status: 200,
      headers: { "Content-Type": "image/jpeg" },
    });
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      return new NextResponse("Image not found", { status: 404 });
    }
    console.error("Failed to serve image:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Helper to check if file exists
async function exists(path: string) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
