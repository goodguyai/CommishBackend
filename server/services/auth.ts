import type { Request } from "express";
import type { IStorage } from "../storage";
import { randomUUID } from "crypto";

export type SessionUser = { 
  userId: string; 
  email?: string | null; 
  accountId?: string | null;
};

declare module "express-session" {
  interface SessionData {
    userId?: string;
    accountId?: string;
    email?: string;
  }
}

export class AuthService {
  constructor(private store: IStorage) {}

  async getSessionUser(req: Request): Promise<SessionUser | null> {
    if (!req.session?.userId) {
      return null;
    }
    
    const accountId = await this.store.getUserAccount?.(req.session.userId);
    
    return {
      userId: req.session.userId,
      email: req.session.email || null,
      accountId: accountId || null,
    };
  }

  async createDemoSession(req: Request): Promise<SessionUser> {
    const userId = randomUUID();
    req.session.userId = userId;
    req.session.email = null;
    
    return {
      userId,
      email: null,
      accountId: null,
    };
  }

  async ensureAccount(req: Request, user: SessionUser): Promise<string> {
    if (user.accountId) {
      req.session.accountId = user.accountId;
      return user.accountId;
    }
    
    const accountId = await this.store.createAccount?.({ 
      email: user.email || `user-${user.userId}@demo.local`,
      name: null, 
      plan: 'beta' 
    });
    
    if (accountId) {
      await this.store.linkUserAccount?.(user.userId, accountId, 'owner');
      req.session.accountId = accountId;
    }
    
    return accountId || "00000000-0000-0000-0000-000000000000";
  }
}
