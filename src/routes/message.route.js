import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getContacts, getConversations, getMessages, sendMessage } from "../controllers/message.controller.js";



const router = express.Router();

router.get("/contacts", protectRoute, getContacts);
router.get("/conversations", protectRoute, getConversations);
router.post("/send", protectRoute, sendMessage);
router.get("/:id_conversacion", protectRoute, getMessages);

export default router;