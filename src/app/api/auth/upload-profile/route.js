//app/api/auth/upload-profile/route.js
import { NextResponse } from "next/server";
import { query } from "../../../../lib/database";
import path from "path";
import { writeFile } from "fs/promises";
import { verifyToken } from "../../../../lib/auth";

export async function POST(req) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("profile_photo");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save into public/uploads folder
    const fileName = `user_${user.id}_${Date.now()}.png`;
    const filePath = path.join(process.cwd(), "public", "uploads", fileName);

    await writeFile(filePath, buffer);

    const dbPath = `/uploads/${fileName}`;

    await query(
      `UPDATE users SET profile_photo=$1, updated_at=NOW() WHERE id=$2`,
      [dbPath, user.id]
    );

    return NextResponse.json({
      success: true,
      path: dbPath,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
