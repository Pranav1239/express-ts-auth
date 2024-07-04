import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';
export interface RequestPayload extends Request {
  payload?: string | JwtPayload;
}
