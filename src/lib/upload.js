// src/lib/upload.js
import fs from 'fs';
import path from 'path';

export async function uploadFile(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filename = Date.now() + '-' + file.name;
  const filepath = path.join(process.cwd(), 'public', 'uploads', filename);

  // Ensure uploads dir exists
  const dir = path.dirname(filepath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filepath, buffer);

  return `/uploads/${filename}`;  // Relative path for serving
}