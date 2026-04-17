import pg from "pg";


const { Pool } = pg;

//se exporta la variable de entorno de el archivo env.js
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // ⚠️ OBLIGATORIO para que Railway no rechace la conexión
  }
});

export const connectDB = async () => {
  try {
    if (!process.env.DATABASE_URL) throw new Error("La DATABASE_URL no está configurada correctamente.");

    // Verificamos la conexión
    const client = await pool.connect();
    console.log("Conexión exitosa de la base de datos");
    client.release(); // Liberamos el cliente de vuelta al pool
  } catch (error) {
    console.error("Error conectando a PostgreSQL:", error);
    process.exit(1); 
  }
};