export function createWelcomeEmailTemplate(name, clientURL, role) {
  // Personalización de pasos según el rol
  let nextSteps = "";

  if (role === "geriatra" || role === "administrador") {
    nextSteps = `
      <li style="margin-bottom: 10px;">Configura tu perfil profesional y cédula</li>
      <li style="margin-bottom: 10px;">Registra o vincula a tus primeros pacientes</li>
      <li style="margin-bottom: 10px;">Comienza a programar citas y medicación</li>
    `;
  } else if (role === "cuidador") {
    nextSteps = `
      <li style="margin-bottom: 10px;">Vincula el perfil de la persona mayor a tu cargo</li>
      <li style="margin-bottom: 10px;">Revisa el calendario de tomas de medicamentos</li>
      <li style="margin-bottom: 10px;">Mantente en contacto directo con el geriatra</li>
    `;
  } else {
    nextSteps = `
      <li style="margin-bottom: 10px;">¡Diviértete con nuestros juegos cognitivos!</li>
      <li style="margin-bottom: 10px;">Revisa tus próximas citas médicas</li>
      <li style="margin-bottom: 10px;">Registra tus tomas de medicamentos</li>
    `;
  }

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bienvenido a OldFit</title>
  </head>
  <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: linear-gradient(to right, #36D1DC, #5B86E5); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <img src="https://cdn-icons-png.flaticon.com/512/3063/3063061.png" alt="OldFit Logo" style="width: 80px; height: 80px; margin-bottom: 20px; border-radius: 50%; background-color: white; padding: 10px;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 500;">¡Bienvenido a OldFit!</h1>
    </div>
    <div style="background-color: #ffffff; padding: 35px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
      <p style="font-size: 18px; color: #5B86E5;"><strong>Hola ${name},</strong></p>
      <p>Estamos muy felices de que te unas a <strong>OldFit</strong>. Nuestra misión es facilitar el cuidado integral y mejorar la calidad de vida de las personas mayores a través de la tecnología.</p>
      
      <div style="background-color: #f8f9fa; padding: 25px; border-radius: 10px; margin: 25px 0; border-left: 4px solid #36D1DC;">
        <p style="font-size: 16px; margin: 0 0 15px 0;"><strong>Tus primeros pasos como ${role}:</strong></p>
        <ul style="padding-left: 20px; margin: 0;">
          ${nextSteps}
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${clientURL}" style="background: linear-gradient(to right, #36D1DC, #5B86E5); color: white; text-decoration: none; padding: 12px 30px; border-radius: 50px; font-weight: 500; display: inline-block;">Acceder a la plataforma</a>
      </div>
      
      <p style="margin-bottom: 5px;">Si tienes alguna duda, nuestro equipo de soporte está aquí para ayudarte.</p>
      <p style="margin-top: 0;">¡Hagamos del cuidado algo más sencillo!</p>
      
      <p style="margin-top: 25px; margin-bottom: 0;">Atentamente,<br>El Equipo de OldFit</p>
    </div>
    
    <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
      <p>© 2026 OldFit. Todos los derechos reservados.</p>
    </div>
  </body>
  </html>`;
}