import { Resend } from "resend";

// Si la variable no existe, le ponemos un string cualquiera para que no explote al iniciar
const apiKey = process.env.RESEND_API_KEY || "re_dummy_key_for_build";

export const resendClient = new Resend(apiKey);

export const sender = {
    email: process.env.EMAIL_FROM || "onboarding@resend.dev",
    name: process.env.EMAIL_FROM_NAME || "Sistema",
};