import cron from "node-cron";
import { EventEmitter } from "events";

export class Scheduler extends EventEmitter {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  scheduleWeeklyDigest(leagueId: string, timezone: string = "America/New_York") {
    // Schedule for Sundays at 9 AM in the league's timezone
    const task = cron.schedule(
      "0 9 * * 0",
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
    
    console.log(`Scheduled weekly digest for league ${leagueId} in ${timezone}`);
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
}

export const scheduler = new Scheduler();
