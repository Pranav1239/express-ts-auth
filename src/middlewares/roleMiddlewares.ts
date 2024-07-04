// src/middleware/auth.middleware.ts
import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../interfaces/express";


export const authorizeRole = (role: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === "owner") {
      return next();
    }
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
};

export const authorizeAdmin = authorizeRole("admin");