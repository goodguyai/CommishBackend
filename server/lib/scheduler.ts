import cron, { ScheduledTask } from "node-cron";
import { EventEmitter } from "events";
import { storage } from "../storage";
import type { Job } from "@shared/schema";

export class Scheduler extends EventEmitter {
  private tasks: Map<string, ScheduledTask> = new Map();
  private jobTaskMap: Map<string, string> = new Map(); // Maps job.id to task key

  scheduleWeeklyDigest(
    leagueId: string, 
    timezone: string = "America/New_York",
    day: string = "Sunday",
    time: string = "09:00"
  ) {
    // Convert day to cron day-of-week (0-6, Sunday = 0)
    const dayMap: Record<string, number> = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };
    const cronDay = dayMap[day] ?? 0;

    // Parse time (HH:MM format)
    const [hour, minute] = time.split(':').map(Number);
    const cronTime = `${minute || 0} ${hour || 9} * * ${cronDay}`;

    const task = cron.createTask(
      cronTime,
      () => {
        this.emit("digest_due", { leagueId, timezone });
      },
      {
        timezone,
      }
    );

    this.tasks.set(`digest_${leagueId}`, task);
    task.start();
    
    console.log(`[Scheduler] Scheduled weekly digest for league ${leagueId}: ${day} at ${time} (${timezone})`);
  }

  scheduleSyncJob(leagueId: string, intervalMinutes: number = 15) {
    const task = cron.createTask(
      `*/${intervalMinutes} * * * *`,
      () => {
        this.emit("sync_due", { leagueId });
      }
    );

    this.tasks.set(`sync_${leagueId}`, task);
    task.start();
    
    console.log(`[Scheduler] Scheduled sync job for league ${leagueId} every ${intervalMinutes} minutes`);
  }

  unschedule(taskKey: string) {
    const task = this.tasks.get(taskKey);
    if (task) {
      task.stop();
      task.destroy();
      this.tasks.delete(taskKey);
      console.log(`[Scheduler] Unscheduled task: ${taskKey}`);
    }
  }

  unscheduleLeague(leagueId: string) {
    this.unschedule(`digest_${leagueId}`);
    this.unschedule(`sync_${leagueId}`);
  }

  scheduleGlobalCleanup() {
    // Idempotent guard: stop existing task if already scheduled
    if (this.tasks.has("global_cleanup")) {
      this.unschedule("global_cleanup");
    }

    // Run daily at 3 AM UTC to clean up expired wizard sessions
    const task = cron.createTask(
      "0 3 * * *",
      () => {
        this.emit("cleanup_due");
      },
      {
        timezone: "UTC"
      }
    );

    this.tasks.set("global_cleanup", task);
    task.start();
    
    console.log("[Scheduler] Scheduled global cleanup job: daily at 3 AM UTC");
  }

  scheduleReminder(
    leagueId: string,
    deadlineId: string,
    deadlineType: string,
    isoTime: Date,
    timezone: string = "America/New_York",
    hoursBeforeArr: number[] = [24, 1] // Default: 24 hours and 1 hour before
  ) {
    // Schedule multiple reminders for the same deadline
    hoursBeforeArr.forEach((hoursBefore) => {
      const reminderTime = new Date(isoTime.getTime() - (hoursBefore * 60 * 60 * 1000));
      
      // Skip if reminder time is in the past
      if (reminderTime <= new Date()) {
        console.log(`[Scheduler] Skipping past reminder for ${deadlineType} (${hoursBefore}h before)`);
        return;
      }

      // Convert to cron format (specific date/time)
      // Note: cron doesn't support specific dates, so we use a different approach
      // We'll schedule it to run every minute and check if it's time
      const taskKey = `reminder_${leagueId}_${deadlineId}_${hoursBefore}h`;
      
      // Create a one-time check task that runs every minute
      const task = cron.createTask(
        "* * * * *", // Check every minute
        () => {
          const now = new Date();
          // Check if we've reached the reminder time (within 1-minute window)
          if (now >= reminderTime && now < new Date(reminderTime.getTime() + 60000)) {
            this.emit("reminder_due", {
              leagueId,
              deadlineId,
              deadlineType,
              deadlineTime: isoTime,
              hoursBefore,
            });
            // Unschedule after firing
            this.unschedule(taskKey);
          }
        },
        {
          timezone,
        }
      );

      this.tasks.set(taskKey, task);
      task.start();
      
      console.log(
        `[Scheduler] Scheduled ${deadlineType} reminder for league ${leagueId}: ${hoursBefore}h before (${reminderTime.toISOString()} ${timezone})`
      );
    });
  }

  unscheduleReminders(leagueId: string, deadlineId?: string) {
    // Unschedule all reminders for a league or specific deadline
    const prefix = deadlineId 
      ? `reminder_${leagueId}_${deadlineId}`
      : `reminder_${leagueId}`;
    
    Array.from(this.tasks.keys())
      .filter(key => key.startsWith(prefix))
      .forEach(key => this.unschedule(key));
  }

  // Phase 3: Schedule highlights + digest enqueuing (Sunday 8 PM, league timezone)
  scheduleHighlightsDigest(
    leagueId: string,
    timezone: string = "America/New_York",
    getCurrentWeek: () => number = () => 1
  ) {
    // Sunday at 8 PM in league timezone
    const cronTime = "0 20 * * 0";

    const task = cron.createTask(
      cronTime,
      () => {
        const week = getCurrentWeek();
        this.emit("highlights_due", { leagueId, week, timezone });
      },
      {
        timezone,
      }
    );

    this.tasks.set(`highlights_${leagueId}`, task);
    task.start();
    
    console.log(`[Scheduler] Scheduled highlights digest for league ${leagueId}: Sunday at 20:00 (${timezone})`);
  }

  // Phase 3: Schedule rivalry card enqueuing (Monday 9 AM, league timezone)
  scheduleRivalryCard(
    leagueId: string,
    timezone: string = "America/New_York",
    getCurrentWeek: () => number = () => 1
  ) {
    // Monday at 9 AM in league timezone
    const cronTime = "0 9 * * 1";

    const task = cron.createTask(
      cronTime,
      () => {
        const week = getCurrentWeek();
        this.emit("rivalry_due", { leagueId, week, timezone });
      },
      {
        timezone,
      }
    );

    this.tasks.set(`rivalry_${leagueId}`, task);
    task.start();
    
    console.log(`[Scheduler] Scheduled rivalry card for league ${leagueId}: Monday at 09:00 (${timezone})`);
  }

  // Phase 3: Schedule global content poster (every 5 minutes)
  scheduleContentPoster() {
    // Idempotent guard: stop existing task if already scheduled
    if (this.tasks.has("content_poster")) {
      this.unschedule("content_poster");
    }

    // Every 5 minutes
    const cronTime = "*/5 * * * *";

    const task = cron.createTask(
      cronTime,
      () => {
        this.emit("content_poster_due");
      },
      {
        timezone: "UTC"
      }
    );

    this.tasks.set("content_poster", task);
    task.start();
    
    console.log("[Scheduler] Scheduled content poster: every 5 minutes (UTC)");
  }

  unscheduleLeaguePhase3(leagueId: string) {
    this.unschedule(`highlights_${leagueId}`);
    this.unschedule(`rivalry_${leagueId}`);
  }

  unscheduleAllLeagueJobs(leagueId: string) {
    this.unscheduleLeague(leagueId);
    this.unscheduleReminders(leagueId);
    this.unscheduleLeaguePhase3(leagueId);
  }

  // Phase 5: Schedule reminder job from database
  scheduleReminderJob(
    reminderId: string,
    leagueId: string,
    cronExpression: string,
    channelId: string,
    message: string,
    timezone: string = "America/New_York"
  ) {
    const taskKey = `reminder_job_${reminderId}`;

    // Unschedule existing task if already scheduled (idempotent)
    if (this.tasks.has(taskKey)) {
      this.unschedule(taskKey);
    }

    const task = cron.createTask(
      cronExpression,
      () => {
        this.emit("reminder_job_due", {
          reminderId,
          leagueId,
          channelId,
          message,
        });
      },
      {
        timezone,
      }
    );

    this.tasks.set(taskKey, task);
    task.start();

    console.log(`[Scheduler] Scheduled reminder job ${reminderId} for league ${leagueId}: ${cronExpression} (${timezone})`);
  }

  unscheduleReminderJob(reminderId: string) {
    this.unschedule(`reminder_job_${reminderId}`);
  }

  // Sleeper Settings Sync: Schedule automatic sync every 6 hours
  scheduleSleeperSync() {
    // Idempotent guard: stop existing task if already scheduled
    if (this.tasks.has("sleeper_sync")) {
      this.unschedule("sleeper_sync");
    }

    // Run every 6 hours at the top of the hour (0 */6 * * *)
    const task = cron.createTask(
      "0 */6 * * *",
      () => {
        this.emit("sleeper_sync_due");
      },
      {
        timezone: "UTC"
      }
    );

    this.tasks.set("sleeper_sync", task);
    task.start();
    
    console.log("[Scheduler] Scheduled Sleeper Settings Sync: every 6 hours (UTC)");
  }

  // Load and schedule jobs from database
  async loadJobsFromDatabase() {
    console.log("[Scheduler] Loading jobs from database...");
    try {
      const jobs = await storage.getEnabledJobs();
      console.log(`[Scheduler] Found ${jobs.length} enabled jobs to schedule`);
      
      for (const job of jobs) {
        await this.scheduleJob(job);
      }
    } catch (error) {
      console.error("Error loading jobs from database:", error);
    }
  }

  // Schedule a single job from the database
  private async scheduleJob(job: Job) {
    const taskKey = job.id;
    
    // Unschedule existing task if already scheduled (idempotent)
    if (this.tasks.has(taskKey)) {
      this.unschedule(taskKey);
    }

    const task = cron.createTask(
      job.cron,
      async () => {
        await this.executeJob(job);
      },
      {
        timezone: "UTC"
      }
    );

    this.tasks.set(taskKey, task);
    this.jobTaskMap.set(job.id, taskKey);
    task.start();
    
    console.log(`[Scheduler] Scheduled job ${job.id} (${job.kind}) for league ${job.leagueId}: ${job.cron} (UTC)`);
  }

  // Generic job execution handler
  private async executeJob(job: Job) {
    console.log(`[Scheduler] Executing job ${job.id} (${job.kind}) for league ${job.leagueId}`);
    
    // Create job run entry
    let runId: string;
    try {
      runId = await storage.createJobRun({
        jobId: job.id,
        status: "RUNNING",
        startedAt: new Date(),
      });
    } catch (error) {
      console.error(`Failed to create job run for job ${job.id}:`, error);
      return;
    }

    try {
      // Map job.kind to event name and emit
      const eventMap: Record<string, string> = {
        weekly_recap: "recap_due",
        announcements: "content_poster_due",
        sleeper_sync: "sleeper_sync_due",
        highlights: "highlights_due",
        rivalry: "rivalry_due",
      };

      const eventName = eventMap[job.kind];
      if (!eventName) {
        throw new Error(`Unknown job kind: ${job.kind}`);
      }

      // Emit the event with job context
      this.emit(eventName, {
        leagueId: job.leagueId,
        jobId: job.id,
        timezone: "UTC",
        config: job.config,
      });

      // Update job run as successful
      await storage.updateJobRun(runId, {
        status: "SUCCESS",
        finishedAt: new Date(),
        detail: { eventEmitted: eventName },
      });

      console.log(`[Scheduler] Job ${job.id} completed successfully`);
    } catch (error) {
      // Update job run as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorExcerpt = errorMessage.substring(0, 500);
      
      await storage.updateJobRun(runId, {
        status: "FAILED",
        finishedAt: new Date(),
        detail: { error: errorMessage },
      });

      // Create or update job failure record
      await storage.createOrUpdateJobFailure(job.id, errorExcerpt);

      console.error(`Job ${job.id} failed:`, error);
    }
  }

  // Refresh jobs from database (unschedule all, reload, reschedule)
  async refreshJobs() {
    console.log("[Scheduler] Refreshing jobs from database...");
    
    // Unschedule all job-based tasks (keep system tasks like global_cleanup)
    for (const [jobId, taskKey] of this.jobTaskMap.entries()) {
      this.unschedule(taskKey);
      this.jobTaskMap.delete(jobId);
    }
    
    // Reload jobs from database
    await this.loadJobsFromDatabase();
  }

  getTasks(): Map<string, ScheduledTask> {
    return this.tasks;
  }
}

export const scheduler = new Scheduler();
