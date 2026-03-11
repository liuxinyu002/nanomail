/**
 * Token Truncator Utility
 * Estimates and manages token counts for LLM context windows
 */

/**
 * Options for truncation strategy
 */
export interface TruncationOptions {
  preserveHeaders?: boolean
  preserveSignature?: boolean
}

/**
 * Result of truncation operation
 */
export interface TruncationResult {
  text: string
  wasTruncated: boolean
  originalTokens: number
}

/**
 * Token estimation and truncation utility
 * Approximates tokens (4 chars ≈ 1 token for English)
 */
export class TokenTruncator {
  // Approximate characters per token (conservative estimate)
  private static readonly CHARS_PER_TOKEN = 4
  // Tokens reserved for truncation notice
  private static readonly RESERVE_TOKENS = 50

  /**
   * Estimate token count from text
   * Uses approximation: 4 characters per token
   */
  estimateTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0
    }
    return Math.ceil(text.length / TokenTruncator.CHARS_PER_TOKEN)
  }

  /**
   * Truncate text to fit within context window
   * Preserves beginning (70%) and end (30%), removes middle
   */
  truncate(text: string, maxTokens: number): TruncationResult {
    const estimated = this.estimateTokens(text)

    if (estimated <= maxTokens) {
      return {
        text,
        wasTruncated: false,
        originalTokens: estimated
      }
    }

    const keepTokens = maxTokens - TokenTruncator.RESERVE_TOKENS
    const charsToKeep = keepTokens * TokenTruncator.CHARS_PER_TOKEN

    // 70% beginning, 30% end
    const startChars = Math.floor(charsToKeep * 0.7)
    const endChars = Math.floor(charsToKeep * 0.3)

    const truncationNotice = '\n\n[...content truncated for token limit...]\n\n'

    const truncated =
      text.slice(0, startChars) +
      truncationNotice +
      text.slice(-endChars)

    return {
      text: truncated,
      wasTruncated: true,
      originalTokens: estimated
    }
  }

  /**
   * Truncate with strategy to preserve headers and/or signature
   */
  truncateWithStrategy(
    text: string,
    maxTokens: number,
    options: TruncationOptions = {}
  ): TruncationResult {
    let processedText = text
    let headerPart = ''
    let signaturePart = ''

    // Extract headers if preserving
    if (options.preserveHeaders) {
      const headerMatch = text.match(/^(From:.*?)(?=\n\n|\n$|$)/s)
      if (headerMatch) {
        headerPart = headerMatch[1] + '\n\n'
        processedText = processedText.slice(headerMatch[0].length)
      }
    }

    // Extract signature if preserving
    if (options.preserveSignature) {
      const sigMatch = processedText.match(/(\n\n--\s*\n.*$)/s)
      if (sigMatch) {
        signaturePart = sigMatch[1]
        processedText = processedText.slice(0, -sigMatch[0].length)
      }
    }

    // Truncate the middle content
    const headerTokens = this.estimateTokens(headerPart)
    const sigTokens = this.estimateTokens(signaturePart)
    const availableTokens = maxTokens - headerTokens - sigTokens - TokenTruncator.RESERVE_TOKENS

    if (availableTokens <= 0) {
      // Not enough space for content
      return {
        text: headerPart + '[...content truncated...]' + signaturePart,
        wasTruncated: true,
        originalTokens: this.estimateTokens(text)
      }
    }

    const result = this.truncate(processedText, availableTokens + TokenTruncator.RESERVE_TOKENS)

    return {
      text: headerPart + result.text + signaturePart,
      wasTruncated: result.wasTruncated,
      originalTokens: this.estimateTokens(text)
    }
  }

  /**
   * Split text into chunks that fit within token limit
   * Tries to break at word boundaries
   */
  chunkText(text: string, maxTokensPerChunk: number): string[] {
    const estimated = this.estimateTokens(text)

    if (estimated <= maxTokensPerChunk) {
      return [text]
    }

    const chunks: string[] = []
    const maxChars = maxTokensPerChunk * TokenTruncator.CHARS_PER_TOKEN
    const words = text.split(/(\s+)/)

    let currentChunk = ''

    for (const word of words) {
      if (currentChunk.length + word.length > maxChars && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = word
      } else {
        currentChunk += word
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }
}