import "server-only";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Неверный формат запроса" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Файл больше 5 МБ" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  let text = "";

  try {
    if (ext === "txt") {
      text = buffer.toString("utf-8");

    } else if (ext === "pdf") {
      // pdf-parse
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      const data = await (pdfParse as (b: Buffer) => Promise<{ text: string }>)(buffer);
      text = data.text;

    } else if (ext === "docx") {
      // mammoth
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else if (ext === "doc") {
      // .doc — старый бинарный формат, частичное извлечение текста
      text = buffer.toString("latin1").replace(/[^\x20-\x7E\u0400-\u04FF\n\r\t ]+/g, " ").replace(/\s{3,}/g, "\n").trim();
      if (text.length < 50) {
        return NextResponse.json({ error: "Файл .doc не удалось прочитать. Сохраните как .docx или .txt" }, { status: 422 });
      }

    } else {
      return NextResponse.json({ error: "Формат не поддерживается. Используйте PDF, DOCX или TXT" }, { status: 422 });
    }
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "Не удалось прочитать файл. Попробуйте другой формат." }, { status: 422 });
  }

  text = text.trim();
  if (text.length < 30) {
    return NextResponse.json({ error: "Не удалось извлечь текст из файла — попробуйте вставить текст вручную" }, { status: 422 });
  }

  return NextResponse.json({ text: text.slice(0, 15000) });
}
