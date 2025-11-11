import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const { path: pathArray } = params;

    if (pathArray.length < 2) {
      return new NextResponse("Invalid path", { status: 400 });
    }

    const date = pathArray[0];
    const filename = pathArray.slice(1).join("/");

    // Security check: validate filename and date
    if (filename.includes("..") || !filename || !date) {
      return new NextResponse("Invalid filename or date", { status: 400 });
    }

    // Try multiple possible file locations for note images
    const possiblePaths = [
      // Path used by maintenance upload: public/maintenance_note_image/YYYY-MM-DD/filename
      path.join(
        process.cwd(),
        "public",
        "maintenance_note_image",
        date,
        filename
      ),
      // Alternative path: uploads/notes/YYYY-MM-DD/filename
      path.join(process.cwd(), "uploads", "notes", date, filename),
      // Fallback to maintenance images if notes are stored there
      path.join(process.cwd(), "public", "maintenance_image", date, filename),
    ];

    let fileBuffer: Buffer | null = null;
    let foundPath = "";

    for (const filePath of possiblePaths) {
      try {
        await fs.access(filePath);
        fileBuffer = await fs.readFile(filePath);
        foundPath = filePath;
        console.log("Found note image at:", foundPath);
        break;
      } catch (error) {
        // Continue to next possible path
        continue;
      }
    }

    if (!fileBuffer) {
      console.error(
        "Note image not found in any location. Tried:",
        possiblePaths
      );
      return new NextResponse("File not found", { status: 404 });
    }

    return serveImageBuffer(fileBuffer, filename);
  } catch (error) {
    console.error("Error serving note image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}

function serveImageBuffer(fileBuffer: Buffer, filename: string) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: { [key: string]: string } = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
  };

  const contentType = contentTypes[ext] || "application/octet-stream";

  // Convert Buffer to Uint8Array for NextResponse
  const uint8Array = new Uint8Array(fileBuffer);

  return new NextResponse(uint8Array, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000",
      "Content-Length": fileBuffer.length.toString(),
    },
  });
}
