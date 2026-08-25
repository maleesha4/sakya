import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query } from "../../../../lib/database";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("profile_photo");
    const userId = formData.get("user_id");

    if (!file || typeof file.arrayBuffer !== "function" || !userId) {
      return NextResponse.json({ error: "File or user ID missing" }, { status: 400 });
    }

    // Validate type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Only .jpg, .jpeg, or .png allowed" }, { status: 400 });
    }

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || (file.type === "image/png" ? ".png" : ".jpg");
    const fileName = `profile_${userId}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Update DB
    await query(
      "UPDATE students SET profile_photo = $1 WHERE user_id = $2 RETURNING profile_photo",
      [`/uploads/${fileName}`, userId]
    );

    return NextResponse.json({
      message: "Profile photo updated",
      path: `/uploads/${fileName}`,
      success: true,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
