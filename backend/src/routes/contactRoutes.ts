import { Router } from "express";
import { auth } from "../middlewares/auth";
import { authOptional } from "../middlewares/authOptional";
import { validate } from "../middlewares/validate";
import {
  submitContactMessage,
  getMyContactMessages
} from "../controllers/contactController";
import {
  createContactSchema,
  listMyContactQuerySchema
} from "../validators/contactSchemas";

const router = Router();

router.post("/", authOptional, validate(createContactSchema), submitContactMessage);
router.get("/my", auth, validate(listMyContactQuerySchema, "query"), getMyContactMessages);

export default router;
