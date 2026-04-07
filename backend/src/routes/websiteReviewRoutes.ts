import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import * as controller from "../controllers/websiteReviewController";
import {
  adminWebsiteReviewListQuerySchema,
  createWebsiteReviewSchema,
  helpfulWebsiteVoteSchema,
  moderateWebsiteReviewSchema,
  updateWebsiteReviewSchema,
  websiteReviewIdParamSchema,
  websiteReviewListQuerySchema,
} from "../validators/websiteReviewSchemas";

const router = Router();

router.get("/", validate(websiteReviewListQuerySchema, "query"), controller.listWebsiteReviews);
router.get("/summary", controller.getWebsiteReviewSummary);
router.get("/me", auth, requireRole(["user", "admin"]), controller.getMyWebsiteReview);

router.post("/", auth, requireRole(["user", "admin"]), validate(createWebsiteReviewSchema), controller.createWebsiteReview);
router.patch("/:id", auth, requireRole(["user", "admin"]), validate(websiteReviewIdParamSchema, "params"), validate(updateWebsiteReviewSchema), controller.updateWebsiteReview);
router.delete("/:id", auth, requireRole(["user", "admin"]), validate(websiteReviewIdParamSchema, "params"), controller.deleteWebsiteReview);
router.post("/:id/helpful", auth, requireRole(["user", "admin"]), validate(websiteReviewIdParamSchema, "params"), validate(helpfulWebsiteVoteSchema), controller.voteWebsiteReviewHelpful);

router.get("/admin/list", auth, requireRole(["admin"]), validate(adminWebsiteReviewListQuerySchema, "query"), controller.listWebsiteReviewsForAdmin);
router.patch("/:id/moderate", auth, requireRole(["admin"]), validate(websiteReviewIdParamSchema, "params"), validate(moderateWebsiteReviewSchema), controller.moderateWebsiteReview);
router.delete("/:id/admin", auth, requireRole(["admin"]), validate(websiteReviewIdParamSchema, "params"), controller.deleteWebsiteReviewByAdmin);

export default router;
