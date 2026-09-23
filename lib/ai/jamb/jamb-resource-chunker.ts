export type JambResourceChunkInput = {
  id: string;
  title: string;
  text: string;
  chapter?: string;
  page?: number;
};

const DEFAULT_CHUNK_SIZE = 1800;
const DEFAULT_OVERLAP = 250;

function cleanText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoParagraphs(text: string): string[] {
  return cleanText(text)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitLongParagraph(
  paragraph: string,
  maxLength: number,
): string[] {
  if (paragraph.length <= maxLength) {
    return [paragraph];
  }

  const sentences = paragraph
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (!current) {
      current = sentence;
      continue;
    }

    if ((current + " " + sentence).length <= maxLength) {
      current += " " + sentence;
    } else {
      chunks.push(current);
      current = sentence;
    }
  }

  if (current) {
    chunks.push(current);
  }

  if (!chunks.length) {
    for (let start = 0; start < paragraph.length; start += maxLength) {
      chunks.push(
        paragraph.slice(start, start + maxLength).trim(),
      );
    }
  }

  return chunks.filter(Boolean);
}

export function chunkAcademicText(
  text: string,
  options: {
    chunkSize?: number;
    overlap?: number;
    title?: string;
    chapter?: string;
  } = {},
): JambResourceChunkInput[] {
  const chunkSize = Math.max(
    options.chunkSize ?? DEFAULT_CHUNK_SIZE,
    500,
  );

  const overlap = Math.min(
    Math.max(options.overlap ?? DEFAULT_OVERLAP, 0),
    Math.floor(chunkSize / 2),
  );

  const paragraphs = splitIntoParagraphs(text);
  const pieces: string[] = [];

  for (const paragraph of paragraphs) {
    pieces.push(...splitLongParagraph(paragraph, chunkSize));
  }

  const chunks: JambResourceChunkInput[] = [];
  let current = "";

  const makeChunk = (
    id: string,
    content: string,
  ): JambResourceChunkInput => {
    const chunk: JambResourceChunkInput = {
      id,
      title:
        options.title ||
        `Resource section ${chunks.length + 1}`,
      text: content,
    };

    if (options.chapter) {
      chunk.chapter = options.chapter;
    }

    return chunk;
  };

  for (const piece of pieces) {
    if (!current) {
      current = piece;
      continue;
    }

    if ((current + "\n\n" + piece).length <= chunkSize) {
      current += "\n\n" + piece;
      continue;
    }

    chunks.push(
      makeChunk(
        `chunk-${chunks.length + 1}`,
        current.trim(),
      ),
    );

    const tail = current.slice(
      Math.max(0, current.length - overlap),
    );

    current = `${tail}\n\n${piece}`.trim();

    if (current.length > chunkSize) {
      const forced = current.slice(0, chunkSize).trim();

      chunks.push(
        makeChunk(
          `chunk-${chunks.length + 1}`,
          forced,
        ),
      );

      current = current.slice(
        Math.max(0, chunkSize - overlap),
      );
    }
  }

  if (current.trim()) {
    chunks.push(
      makeChunk(
        `chunk-${chunks.length + 1}`,
        current.trim(),
      ),
    );
  }

  return chunks;
}
