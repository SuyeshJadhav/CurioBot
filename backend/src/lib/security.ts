import { AppError } from "./errors";

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+previous/gi,
  /override\s+instruction/gi,
  /system\s+prompt/gi,
  /ignore\s+above/gi,
  /you\s+must\s+ignore/gi,
  /disregard\s+instructions/gi,
  /dan\s+mode/gi,
  /do\s+anything\s+now/gi,
  /jailbreak/gi,
  /reveal\s+your\s+instructions/gi,
  /rules\s+of\s+engagement/gi,
];

/**
 * Validates and sanitizes strings intended for LLM prompt insertion.
 * Throws an AppError if a high-confidence prompt injection is detected,
 * or returns a sanitized and length-capped string.
 */
export function validateAndSanitizePrompt(
  input: any,
  fieldName: string,
  maxLength: number
): string {
  if (input === undefined || input === null) return "";
  if (typeof input !== "string") {
    throw new AppError(400, `Invalid input type for ${fieldName}. Expected a string.`);
  }

  const trimmed = input.trim();

  // Enforce length limit
  if (trimmed.length > maxLength) {
    throw new AppError(
      400,
      `Input ${fieldName} exceeds the maximum length of ${maxLength} characters.`
    );
  }

  // Active prompt injection scanning
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new AppError(
        400,
        `Potential prompt injection detected in ${fieldName}. Please remove override keywords.`
      );
    }
  }

  return trimmed;
}

/**
 * Validates the interests array for type correctness, maximum array size,
 * element length, and prompt injection attempts.
 */
export function validateInterestsArray(interests: any): string[] {
  if (interests === undefined) return [];
  if (!Array.isArray(interests)) {
    throw new AppError(400, "interests must be an array of strings.");
  }
  if (interests.length > 50) {
    throw new AppError(400, "Maximum of 50 interests allowed.");
  }
  
  return interests.map((item, idx) => {
    return validateAndSanitizePrompt(item, `interests[${idx}]`, 50);
  });
}

/**
 * Validates only the length limit and basic sanitization for read-only system texts,
 * entirely bypassing the prompt injection regex matches.
 */
export function validateLengthOnly(
  input: any,
  fieldName: string,
  maxLength: number
): string {
  if (input === undefined || input === null) return "";
  if (typeof input !== "string") {
    throw new AppError(400, `Invalid input type for ${fieldName}. Expected a string.`);
  }

  const trimmed = input.trim();

  // Enforce length limit only
  if (trimmed.length > maxLength) {
    throw new AppError(
      400,
      `Input ${fieldName} exceeds the maximum length of ${maxLength} characters.`
    );
  }

  return trimmed;
}

