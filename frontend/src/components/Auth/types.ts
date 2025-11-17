import z from "zod";

z.config({ jitless: true });

export const loginSchema = z.object({
    username: z
        .string()
        .min(1, "Dieses Feld darf nicht leer sein")
        .min(3, "Der Benutzername muss mindestens 3 Zeichen lang sein")
        .refine(val => !/\s/.test(val), {
            message: "Der Benutzername darf keine Leerzeichen enthalten",
        }),
    password: z
        .string()
        .min(1, "Dieses Feld darf nicht leer sein")
        .min(6, "Das Passwort muss mindestens 6 Zeichen lang sein")
        .refine(val => !/\s/.test(val), {
            message: "Das Passwort darf keine Leerzeichen enthalten",
        }),
});

export const registerSchema = loginSchema
    .extend({
        passwordRetype: z.string(),
    })
    .refine(data => data.password === data.passwordRetype, {
        message: "Die Passwörter stimmen nicht überein",
        path: ["passwordRetype"],
    });
