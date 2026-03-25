import jwt from 'jsonwebtoken';
import { env } from './env';

export type JwtUser = {
  sub: string;
  roles: Array<'user' | 'admin'>;
};

export function signAccessToken(payload: JwtUser) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}
