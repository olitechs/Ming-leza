import { z } from "zod";

/**
 * Accept international phone numbers with an optional leading plus sign and
 * common visual separators. Validate the number of digits separately so a
 * string of spaces or punctuation cannot pass registration.
 */
export const registrationPhoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .regex(/^\+?[0-9 ()-]{7,20}$/)
  .refine((value) => {
    const digits = value.replace(/\D/g, "").length;
    return digits >= 7 && digits <= 15;
  });
