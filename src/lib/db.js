import pg from "pg";
import { ENV } from "./env.js";

const { Pool } = pg;

//se exporta la variable de entorno de el archivo env.js
export const pool = new Pool({
  connectionString: ENV.DATABASE_URL,
});

export const connectDB = async () => {
  try {
    if (!ENV.DATABASE_URL) throw new Error("La DATABASE_URL no está configurada correctamente.");

    // Verificamos la conexión
    const client = await pool.connect();
    console.log("Conexión exitosa de la base de datos");
    client.release(); // Liberamos el cliente de vuelta al pool
  } catch (error) {
    console.error("Error conectando a PostgreSQL:", error);
    process.exit(1); 
  }
};