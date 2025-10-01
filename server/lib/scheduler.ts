import cron, { ScheduledTask } from "node-cron";
import { EventEmitter } from "events";

export class Scheduler extends EventEmitter {
  private tasks: Map<string, ScheduledTask> = new Map();

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
    
    console.log(`Scheduled weekly digest for league ${leagueId}: ${day} at ${time} (${timezone})`);
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
    
    console.log("Scheduled global cleanup job: daily at 3 AM UTC");
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
        console.log(`Skipping past reminder for ${deadlineType} (${hoursBefore}h before)`);
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
        `Scheduled ${deadlineType} reminder for league ${leagueId}: ${hoursBefore}h before (${reminderTime.toISOString()} ${timezone})`
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
}

export const scheduler = new Scheduler();
