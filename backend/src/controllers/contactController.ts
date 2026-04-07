import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as contactService from "../services/contactService";
import { ContactMessageStatus } from "../models/ContactMessage";

export const submitContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const result = await contactService.createContactMessage(req.body, req.user?.id);
  res.status(201).json(result);
});

export const getMyContactMessages = asyncHandler(async (req: Request, res: Response) => {
  const page = req.query.page ? Number(req.query.page) : undefined;
  const limit = req.query.limit ? Number(req.query.limit) : undefined;

  const result = await contactService.listMyContactMessages(req.user!.id, page, limit);
  res.json(result);
});

export const getAdminContactMessages = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, status, search } = req.query;

  const result = await contactService.listAdminContactMessages({
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    status: status as ContactMessageStatus | undefined,
    search: search as string | undefined
  });

  res.json(result);
});

export const markContactReviewed = asyncHandler(async (req: Request, res: Response) => {
  const contact = await contactService.markContactAsReviewed(req.params.id, req.user!.id);

  res.json({
    message: "Contact request marked as reviewed",
    contact
  });
});

export const replyContactMessage = asyncHandler(async (req: Request, res: Response) => {
  const contact = await contactService.replyToContactMessage(
    req.params.id,
    req.user!.id,
    req.body.replyMessage
  );

  res.json({
    message: "Reply sent successfully",
    contact
  });
});
