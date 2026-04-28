// Centralized input sanitization to defend against XSS, SQL injection patterns,
// and file-name based attacks. All user/admin inputs should pass through these
// helpers BEFORE being sent to the database, storage, or any external service.

// Strip HTML tags, control characters, and common injection patterns.
// Keeps unicode letters, numbers, punctuation and whitespace.
export const sanitizeText = (input: string, maxLen = 2000): string => {
  if (typeof input !== "string") return "";
  let s = input;

  // Remove null bytes and control chars (except \n, \r, \t)
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // Strip HTML tags and script/iframe/style blocks entirely
  s = s.replace(/<\s*(script|iframe|style|object|embed|link|meta)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, "");

  // Remove javascript: / data: / vbscript: URI schemes
  s = s.replace(/\b(javascript|vbscript|data)\s*:/gi, "");

  // Neutralize on* event handler patterns
  s = s.replace(/\bon[a-z]+\s*=\s*(['"]).*?\1/gi, "");

  // Strip common SQL injection signatures (defense-in-depth; parameterized queries are primary)
  s = s.replace(/(\b(union|select|insert|update|delete|drop|alter|create|exec|execute|truncate)\b\s+\b)/gi, " ");
  s = s.replace(/(--|\/\*|\*\/|;--|;\s*$)/g, " ");
  s = s.replace(/\b(or|and)\b\s+\d+\s*=\s*\d+/gi, " ");

  // Collapse whitespace and trim
  s = s.replace(/\s+/g, " ").trim();

  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
};

// Stricter — for short single-line fields like names, cities, states
export const sanitizeShort = (input: string, maxLen = 120): string =>
  sanitizeText(input, maxLen);

// Numeric sanitization. Returns NaN if invalid.
export const sanitizeNumber = (input: string | number, max = 1e15): number => {
  if (typeof input === "number") return Number.isFinite(input) && input >= 0 && input <= max ? input : NaN;
  if (typeof input !== "string") return NaN;
  const cleaned = input.replace(/[^\d.\-]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > max) return NaN;
  return n;
};

// Email validation + sanitization
export const sanitizeEmail = (input: string): string => {
  if (typeof input !== "string") return "";
  const s = input.trim().toLowerCase().slice(0, 254);
  // Basic RFC-ish check
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s)) return "";
  return s;
};

// File-name sanitization — strips path traversal, special chars, keeps only
// safe alnum + dash + underscore + single dot for extension.
export const sanitizeFileName = (name: string): string => {
  if (typeof name !== "string") return "file";
  const base = name.split(/[\\/]/).pop() || "file";
  const cleaned = base
    .replace(/[^\w.\-]/g, "_")     // allow word chars, dot, hyphen
    .replace(/_{2,}/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 120);
  return cleaned || "file";
};

// Whitelist guard — returns the value only if it is in the allowed list,
// otherwise returns "" (or fallback).
export const whitelist = <T extends string>(value: string, allowed: readonly T[], fallback: T | "" = ""): T | "" => {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
};

// Safe extension extractor — only allows known image/video extensions
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];
const VIDEO_EXTS = ["mp4", "webm", "mov", "m4v"];

export const safeImageExt = (name: string): string => {
  const ext = (name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return IMAGE_EXTS.includes(ext) ? ext : "jpg";
};

export const safeVideoExt = (name: string): string => {
  const ext = (name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return VIDEO_EXTS.includes(ext) ? ext : "mp4";
};

// Validate uploaded image file — type, size, and name
export const validateImageFile = (file: File, maxBytes: number): string | null => {
  if (!file.type.startsWith("image/")) return `${sanitizeFileName(file.name)} is not a valid image`;
  if (file.size > maxBytes) return `${sanitizeFileName(file.name)} exceeds size limit`;
  return null;
};

export const validateVideoFile = (file: File, maxBytes = 200 * 1024 * 1024): string | null => {
  if (!file.type.startsWith("video/")) return `${sanitizeFileName(file.name)} is not a valid video`;
  if (file.size > maxBytes) return `${sanitizeFileName(file.name)} exceeds size limit`;
  return null;
};
