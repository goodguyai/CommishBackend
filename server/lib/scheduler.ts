import cron from "node-cron";
import { EventEmitter } from "events";

export class Scheduler extends EventEmitter {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

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

    const task = cron.schedule(
      cronTime,
      () => {
        this.emit("digest_due", { leagueId, timezone });
      },
      {
        scheduled: false,
        timezone,
      }
    );

    this.tasks.set(`digest_${leagueId}`, task);
    task.start();
    
    console.log(`Scheduled weekly digest for league ${leagueId}: ${day} at ${time} (${timezone})`);
  }

  scheduleSyncJob(leagueId: string, intervalMinutes: number = 15) {
    const task = cron.schedule(
      `*/${intervalMinutes} * * * *`,
      () => {
        this.emit("sync_due", { leagueId });
      },
      {
        scheduled: false,
      }
    );

    this.tasks.set(`sync_${leagueId}`, task);
    task.start();
    
    console.log(`Scheduled sync job for league ${leagueId} every ${intervalMinutes} minutes`);
  }

  unschedule(taskKey: string) {
    const task = this.tasks.get(taskKey);
    if (task) {
      task.stop();
      task.destroy();
      this.tasks.delete(taskKey);
      console.log(`Unscheduled task: ${taskKey}`);
    }
  }

  unscheduleLeague(leagueId: string) {
    this.unschedule(`digest_${leagueId}`);
    this.unschedule(`sync_${leagueId}`);
  }

  scheduleGlobalCleanup() {
    // Run daily at 3 AM UTC to clean up expired wizard sessions
    const task = cron.schedule(
      "0 3 * * *",
      () => {
        this.emit("cleanup_due");
      },
      {
        scheduled: false,
        timezone: "UTC"
      }
    );

    this.tasks.set("global_cleanup", task);
    task.start();
    
    console.log("Scheduled global cleanup job: daily at 3 AM UTC");
  }
}

export const scheduler = new Scheduler();
