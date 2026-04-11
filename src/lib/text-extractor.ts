/**
 * Extração de texto de arquivos para RAG.
 * Suporta: TXT, MD, PDF.
 * DOCX: extrai texto bruto dos blocos XML (sem dependência extra).
 */

export async function extractText(buffer: Buffer, fileType: string): Promise<string> {
  const type = fileType.toLowerCase().replace(".", "")

  switch (type) {
    case "txt":
    case "md":
    case "markdown":
      return buffer.toString("utf-8")

    case "pdf": {
      try {
        // Importa a lib interna diretamente para evitar o bug do pdf-parse/index.js
        // que tenta ler um arquivo de teste quando module.parent é null (Next.js)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require("pdf-parse/lib/pdf-parse.js")
        const data = await pdfParse(buffer)
        return data.text || ""
      } catch (err) {
        console.error("[extractText] Erro ao processar PDF:", err)
        throw new Error("Não foi possível extrair o texto do PDF.")
      }
    }

    case "docx": {
      // DOCX é um ZIP contendo word/document.xml
      // Extração simples sem dependência: remove tags XML e decodifica entidades
      try {
        const text = buffer.toString("utf-8")
        // Encontra blocos de texto entre tags <w:t> (word text runs)
        const matches = text.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
        const extracted = matches
          .map((m) => m.replace(/<[^>]+>/g, ""))
          .join(" ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#xD;/g, "\n")
          .replace(/\s+/g, " ")
          .trim()
        return extracted || "[Conteúdo DOCX não legível — tente exportar como TXT]"
      } catch {
        return "[Erro ao processar DOCX]"
      }
    }

    default:
      throw new Error(`Tipo de arquivo não suportado: ${type}`)
  }
}

/**
 * Divide texto em chunks menores para indexação.
 * Estratégia: divisão por parágrafos, com overlap de 1 parágrafo.
 */
export function chunkText(text: string, maxChunkSize = 1000): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20)

  const chunks: string[] = []
  let current = ""

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxChunkSize && current.length > 0) {
      chunks.push(current.trim())
      // Overlap: último parágrafo do chunk anterior vai para o próximo
      const lastPara = current.split("\n\n").pop() || ""
      current = lastPara.length > 50 ? lastPara + "\n\n" + para : para
    } else {
      current += (current ? "\n\n" : "") + para
    }
  }

  if (current.trim()) chunks.push(current.trim())

  return chunks.length > 0 ? chunks : [text.slice(0, maxChunkSize)]
}
