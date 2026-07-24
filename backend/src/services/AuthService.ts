import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { encrypt, decrypt } from '../utils/encryption';
import { loginToThreads } from '../utils/playwright';
import { UserRepository } from '../repositories/UserRepository';
import { ActivityLogRepository } from '../repositories/ActivityLogRepository';
import { User } from '../types';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
  }
}

export class AuthService {
  constructor(
    private userRepo = new UserRepository(),
    private activityLogRepo = new ActivityLogRepository()
  ) {}

  async login(username: string, password: string, timezone = 'UTC'): Promise<{
    token: string;
    user: { id: string; email: string; username: string; timezone: string };
    expiresIn: number;
  }> {
    const existing = await this.userRepo.findByThreadsUsername(username);

    if (existing?.locked_until && new Date(existing.locked_until) > new Date()) {
      throw new AppError('ACCOUNT_LOCKED', 'Account locked due to too many failed attempts. Try again later.', 429);
    }

    const loginResult = await loginToThreads(username, password);

    if (!loginResult.success) {
      if (existing) {
        const attempts = (existing.login_attempts || 0) + 1;
        const lockedUntil = attempts >= env.maxLoginAttempts
          ? new Date(Date.now() + env.lockoutMinutes * 60_000)
          : null;
        await this.userRepo.update(existing.id, {
          login_attempts: attempts,
          locked_until: lockedUntil,
        });
      }
      throw new AppError('INVALID_CREDENTIALS', 'Invalid username or password', 401);
    }

    let user: User;

    if (existing) {
      user = await this.userRepo.update(existing.id, {
        threads_session_token: loginResult.sessionToken || null,
        threads_password_encrypted: encrypt(password),
        login_attempts: 0,
        locked_until: null,
      });
    } else {
      const passwordHash = await bcrypt.hash(password, 10);
      user = await this.userRepo.create({
        email: `${username}@threads.local`,
        username,
        passwordHash,
        threadsUsername: username,
        threadsPasswordEncrypted: encrypt(password),
        timezone,
      });
      if (loginResult.sessionToken) {
        user = await this.userRepo.update(user.id, {
          threads_session_token: loginResult.sessionToken,
        });
      }
    }

    await this.activityLogRepo.create({
      userId: user.id,
      action: 'LOGIN',
      details: { username },
    });

    const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: env.jwtExpiry as jwt.SignOptions['expiresIn'] });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        timezone: user.timezone,
      },
      expiresIn: 86400,
    };
  }

  async validateSession(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.is_active) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired session', 401);
    }
    return user;
  }

  async getThreadsCredentials(user: User): Promise<{ username: string; password: string; sessionToken: string | null }> {
    if (!user.threads_username || !user.threads_password_encrypted) {
      throw new AppError('NO_THREADS_ACCOUNT', 'Threads account not configured', 400);
    }
    return {
      username: user.threads_username,
      password: decrypt(user.threads_password_encrypted),
      sessionToken: user.threads_session_token,
    };
  }

  async refreshThreadsSession(user: User): Promise<string> {
    const creds = await this.getThreadsCredentials(user);
    const result = await loginToThreads(creds.username, creds.password);
    if (!result.success || !result.sessionToken) {
      throw new AppError('SESSION_REFRESH_FAILED', result.error || 'Failed to refresh session', 401);
    }
    await this.userRepo.update(user.id, { threads_session_token: result.sessionToken });
    return result.sessionToken;
  }

  async updatePreferences(userId: string, preferences: Record<string, unknown>) {
    const user = await this.userRepo.update(userId, {
      notification_preferences: preferences as User['notification_preferences'],
    });
    return user.notification_preferences;
  }
}
