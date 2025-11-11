import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { getEncryptionKey } from "@/lib/maintenance-crypto";
import crypto from "crypto";

const IV_LENGTH = 16;

function decrypt(text: string, key: Buffer) {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export async function GET() {
  try {
    const encryptionKey = await getEncryptionKey();
    if (!encryptionKey) {
      return NextResponse.json(
        { message: "No encryption key" },
        { status: 500 }
      );
    }

    const logs: any[] = [];

    // ✅ maintenance image logs
    const maintenanceDir = path.join(process.cwd(), "logs", "maintenance");
    try {
      const maintenanceFiles = await fs.readdir(maintenanceDir);
      for (const file of maintenanceFiles) {
        const lines = (
          await fs.readFile(path.join(maintenanceDir, file), "utf8")
        )
          .split("\n")
          .filter(Boolean);
        for (const line of lines) {
          try {
            const decrypted = decrypt(line, encryptionKey);
            const obj = JSON.parse(decrypted);
            logs.push({ ...obj, uploadType: "maintenance" });
          } catch (e) {
            console.error("Failed to decrypt maintenance log:", e);
          }
        }
      }
    } catch (error) {
      console.log("No maintenance logs directory found");
    }

    // ✅ note image logs
    const noteDir = path.join(process.cwd(), "logs", "notes");
    try {
      const noteFiles = await fs.readdir(noteDir);
      for (const file of noteFiles) {
        const lines = (await fs.readFile(path.join(noteDir, file), "utf8"))
          .split("\n")
          .filter(Boolean);
        for (const line of lines) {
          try {
            const decrypted = decrypt(line, encryptionKey);
            const obj = JSON.parse(decrypted);
            logs.push({ ...obj, uploadType: "note" });
          } catch (e) {
            console.error("Failed to decrypt note log:", e);
          }
        }
      }
    } catch (error) {
      console.log("No note logs directory found");
    }

    // Sort logs by timestamp (newest first)
    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error reading logs:", error);
    return NextResponse.json(
      { message: "Error reading logs" },
      { status: 500 }
    );
  }
}
