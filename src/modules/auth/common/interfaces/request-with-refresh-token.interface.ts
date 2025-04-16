import { Request } from "express";

export interface IRequestWithRefreshToken extends Request {
  cookies: {
    refreshToken?: string;
  };
  body: {
    refreshToken?: string;
  };
}
