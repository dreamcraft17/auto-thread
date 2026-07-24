import db from '../config/database';
import { User, NotificationPreferences } from '../types';

export class UserRepository {
  async findByEmail(email: string): Promise<User | undefined> {
    return db('users').where({ email }).first();
  }

  async findById(id: string): Promise<User | undefined> {
    return db('users').where({ id }).first();
  }

  async findByThreadsUsername(username: string): Promise<User | undefined> {
    return db('users').where({ threads_username: username }).first();
  }

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
    threadsUsername: string;
    threadsPasswordEncrypted: string;
    timezone?: string;
  }): Promise<User> {
    const [user] = await db('users')
      .insert({
        email: data.email,
        username: data.username,
        password_hash: data.passwordHash,
        threads_username: data.threadsUsername,
        threads_password_encrypted: data.threadsPasswordEncrypted,
        timezone: data.timezone || 'UTC',
      })
      .returning('*');
    return user;
  }

  async update(id: string, data: Partial<{
    threads_session_token: string | null;
    threads_password_encrypted: string;
    notification_preferences: NotificationPreferences;
    timezone: string;
    login_attempts: number;
    locked_until: Date | null;
    updated_at: Date;
  }>): Promise<User> {
    const [user] = await db('users')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return user;
  }
}
