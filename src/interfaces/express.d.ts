import { Request } from "express";
import { Account } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: Account & { role: string };
}