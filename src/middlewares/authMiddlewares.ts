import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../utils/db";

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) return res.status(401).json({ message: "Missing token" });

  jwt.verify(token, process.env.JWT_SECRET as string, async (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    const userAccount = await db.user.findUnique({
      where: { id: (user as any).userId },
    });
    if (!userAccount)
      return res.status(404).json({ message: "User not found" });

    (req as any).user = userAccount;
    next();
  });
};