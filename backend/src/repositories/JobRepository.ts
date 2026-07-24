import db from '../config/database';
import { Job, JobStatus } from '../types';

export class JobRepository {
  async create(data: {
    postId: string;
    jobType: string;
    status?: JobStatus;
    attemptNumber?: number;
    nextRetryTime?: Date | null;
  }): Promise<Job> {
    const [job] = await db('jobs')
      .insert({
        post_id: data.postId,
        job_type: data.jobType,
        status: data.status || 'pending',
        attempt_number: data.attemptNumber || 1,
        next_retry_time: data.nextRetryTime || null,
      })
      .returning('*');
    return { ...job, execution_logs: job.execution_logs || [] };
  }

  async update(id: string, data: Partial<{
    status: JobStatus;
    attempt_number: number;
    next_retry_time: Date | null;
    error_message: string | null;
    execution_logs: string[];
  }>): Promise<Job> {
    const [job] = await db('jobs')
      .where({ id })
      .update({ ...data, updated_at: new Date() })
      .returning('*');
    return { ...job, execution_logs: job.execution_logs || [] };
  }

  async appendLog(id: string, log: string): Promise<void> {
    await db('jobs')
      .where({ id })
      .update({
        execution_logs: db.raw(
          "COALESCE(execution_logs, '[]'::jsonb) || ?::jsonb",
          [JSON.stringify([log])]
        ),
        updated_at: new Date(),
      });
  }

  async getByPostId(postId: string): Promise<Job | undefined> {
    const job = await db('jobs').where({ post_id: postId }).orderBy('created_at', 'desc').first();
    return job ? { ...job, execution_logs: job.execution_logs || [] } : undefined;
  }
}
