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
    if (!encryptionKey)
      return NextResponse.json(
        { message: "No encryption key" },
        { status: 500 }
      );

    const logsDir = path.join(process.cwd(), "logs", "maintenance");
    const files = await fs.readdir(logsDir);
    const allLogs: any[] = [];

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const lines = (await fs.readFile(filePath, "utf8"))
        .split("\n")
        .filter(Boolean);
      for (const line of lines) {
        try {
          const decrypted = decrypt(line, encryptionKey);
          const obj = JSON.parse(decrypted);
          allLogs.push({ ...obj, date: obj.timestamp });
        } catch (e) {
          console.error("Failed to decrypt log:", e);
        }
      }
    }

    allLogs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return NextResponse.json({ logs: allLogs });
  } catch (error) {
    console.error("Error reading logs:", error);
    return NextResponse.json(
      { message: "Error reading logs" },
      { status: 500 }
    );
  }
}
