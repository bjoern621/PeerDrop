import z from "zod";
import { ParseKeys } from "i18next";

z.config({ jitless: true });

/**
 * Translation key of a validation message. The form translates it on render,
 * so a shown message follows a language switch.
 */
export type ValidationMessage = ParseKeys<"auth">;

const message = (key: ValidationMessage) => key;

export const loginSchema = z.object({
    username: z
        .string()
        .min(1, message("validation.required"))
        .min(3, message("validation.usernameTooShort"))
        .refine(val => !/\s/.test(val), {
            message: message("validation.usernameWhitespace"),
        }),
    password: z
        .string()
        .min(1, message("validation.required"))
        .min(6, message("validation.passwordTooShort"))
        .refine(val => !/\s/.test(val), {
            message: message("validation.passwordWhitespace"),
        }),
});

export const registerSchema = loginSchema
    .extend({
        passwordRetype: z.string(),
    })
    .refine(data => data.password === data.passwordRetype, {
        message: message("validation.passwordMismatch"),
        path: ["passwordRetype"],
    });
