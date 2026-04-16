import { resendClient, sender } from "../lib/resend.js";
import { createWelcomeEmailTemplate } from "./emailTemplates.js";

export const sendWelcomeEmail = async (email, name, clientURL, role) => {
  try {
    const { data, error } = await resendClient.emails.send({
      from: `${sender.name} <${sender.email}>`,
      to: email,
      subject: "Bienvenido a OldFit - Tu bienestar, nuestra prioridad",
      html: createWelcomeEmailTemplate(name, clientURL, role) // Enviamos el rol aquí
    });

    if (error) {
      console.error("Error al mandar el correo de Resend: ", error);
      // No lanzamos error aquí para que el registro del usuario no falle si el correo falla
      return; 
    }

    console.log("El correo de bienvenida se ha enviado con éxito a:", email);
  } catch (err) {
    console.error("Error crítico en sendWelcomeEmail: ", err);
  }
};