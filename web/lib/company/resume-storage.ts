import "server-only";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
};

function storageDir(): string {
  // Относительный путь резолвится от cwd процесса (web/), абсолютный - через env
  return process.env.RESUME_STORAGE_DIR?.trim() || "storage/resumes";
}

export function validateResumeFile(file: File): string | null {
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED[ext]) return "Поддерживаются только PDF и DOC/DOCX.";
  if (file.size > MAX_RESUME_BYTES) return "Файл больше 5 МБ.";
  if (file.size === 0) return "Пустой файл.";
  return null;
}

/** Сохраняет файл, возвращает имя файла (ключ) для applications.resume_file. */
export async function saveResumeFile(applicationKey: string, file: File): Promise<string> {
  const ext = path.extname(file.name).toLowerCase();
  const fileName = `${applicationKey}${ext}`;
  const dir = storageDir();
  await mkdir(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buf);
  return fileName;
}

export async function readResumeFile(
  fileName: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  // Ключ создаётся только сервером, но на всякий случай режем путь до basename
  const safe = path.basename(fileName);
  const ext = path.extname(safe).toLowerCase();
  const contentType = ALLOWED[ext] ?? "application/octet-stream";
  try {
    const body = await readFile(path.join(storageDir(), safe));
    return { body, contentType };
  } catch {
    return null;
  }
}

export async function deleteResumeFile(fileName: string): Promise<void> {
  const safe = path.basename(fileName);
  try {
    await unlink(path.join(storageDir(), safe));
  } catch {
    // файла уже нет - не ошибка
  }
}
