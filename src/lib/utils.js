import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (userId, userRole, res) => { // Añadimos userRole
    const { JWT_SECRET } = ENV;
    if (!JWT_SECRET) {
        throw new Error("JWT_SECRET no está configurada");
    }

    // Guardamos el ID y el ROL en el payload
    const token = jwt.sign({ userId, userRole }, JWT_SECRET, {
        expiresIn: "7d",
    });

    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: "strict",
        secure: false, 
    });

    return token;
};