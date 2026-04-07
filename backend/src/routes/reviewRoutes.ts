import { Router } from "express";
import { auth } from "../middlewares/auth";
import { requireRole } from "../middlewares/requireRole";
import { validate } from "../middlewares/validate";
import * as reviewController from "../controllers/reviewController";
import {
  adminReviewListQuerySchema,
  createReviewSchema,
  moderateReviewSchema,
  helpfulVoteSchema,
  reviewIdParamSchema,
  sellerReplySchema,
  serviceReviewListQuerySchema,
  updateReviewSchema,
} from "../validators/reviewSchemas";

const router = Router();

router.get("/service/:serviceId", validate(serviceReviewListQuerySchema, "query"), reviewController.listServiceReviews);
router.get("/service/:serviceId/summary", reviewController.getServiceReviewSummary);
router.get("/service/:serviceId/me", auth, requireRole(["user", "admin"]), reviewController.getMyServiceReview);

router.post("/", auth, requireRole(["user", "admin"]), validate(createReviewSchema), reviewController.createReview);
router.patch("/:id", auth, requireRole(["user", "admin"]), validate(reviewIdParamSchema, "params"), validate(updateReviewSchema), reviewController.updateReview);
router.delete("/:id", auth, requireRole(["user", "admin"]), validate(reviewIdParamSchema, "params"), reviewController.deleteReview);

router.post("/:id/reply", auth, requireRole(["user", "admin"]), validate(reviewIdParamSchema, "params"), validate(sellerReplySchema), reviewController.replyToReview);
router.post("/:id/helpful", auth, requireRole(["user", "admin"]), validate(reviewIdParamSchema, "params"), validate(helpfulVoteSchema), reviewController.voteReviewHelpful);

router.get("/admin/list", auth, requireRole(["admin"]), validate(adminReviewListQuerySchema, "query"), reviewController.listReviewsForAdmin);
router.patch("/:id/moderate", auth, requireRole(["admin"]), validate(reviewIdParamSchema, "params"), validate(moderateReviewSchema), reviewController.moderateReview);
router.delete("/:id/admin", auth, requireRole(["admin"]), validate(reviewIdParamSchema, "params"), reviewController.deleteReviewByAdmin);

export default router;
