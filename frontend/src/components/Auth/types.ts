import z from "zod";

export const loginSchema = z.object({
    username: z.string().min(1, "Dieses Feld darf nicht leer sein"),
    password: z
        .string()
        .min(1, "Dieses Feld darf nicht leer sein")
        .min(6, "Das Passwort muss mindestens 6 Zeichen lang sein"),
});

export const registerSchema = loginSchema
    .extend({
        passwordRetype: z
            .string()
            .min(1, "Dieses Feld darf nicht leer sein")
            .min(6, "Das Passwort muss mindestens 6 Zeichen lang sein"),
    })
    .refine(data => data.password === data.passwordRetype, {
        message: "Die Passwörter stimmen nicht überein",
        path: ["passwordRetype"],
    });
