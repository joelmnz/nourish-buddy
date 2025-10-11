import * as cron from 'node-cron';
import webpush from 'web-push';
import { getDb } from '../db/index.ts';
import { pushSubscriptions, mealPlanSlots, settings } from '../db/schema.ts';
import { eq } from 'drizzle-orm';
import { getEnv } from '../config/env.ts';

type ScheduledJob = {
  endpoint: string;
  slotKey: string;
  task: ReturnType<typeof cron.schedule>;
};

const scheduledJobs: ScheduledJob[] = [];

export function initializeScheduler() {
  const env = getEnv();

  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );

  rebuildAllSchedules().catch((err) => {
    console.error('Failed to initialize scheduler:', err);
  });
}

export async function rebuildAllSchedules() {
  stopAllSchedules();

  const db = await getDb();

  const settingsRow = await db.select().from(settings).limit(1);
  if (settingsRow.length === 0 || !settingsRow[0]?.remindersEnabled) {
    console.log('Reminders disabled, skipping schedule rebuild');
    return;
  }

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.enabled, true));

  const slots = await db.select().from(mealPlanSlots);

  for (const sub of subscriptions) {
    for (const slot of slots) {
      scheduleNotificationForSlot(sub, slot);
    }
  }

  console.log(`Scheduled ${scheduledJobs.length} notification jobs`);
}

function scheduleNotificationForSlot(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
    tz: string;
  },
  slot: {
    slotKey: string;
    time24h: string;
    name: string;
  }
) {
  const parts = slot.time24h.split(':');
  const hours = parts[0] ? parseInt(parts[0], 10) : NaN;
  const minutes = parts[1] ? parseInt(parts[1], 10) : NaN;

  if (isNaN(hours) || isNaN(minutes)) {
    console.error(`Invalid time format for slot ${slot.slotKey}: ${slot.time24h}`);
    return;
  }

  const cronExpression = `${minutes} ${hours} * * *`;

  const task = cron.schedule(
    cronExpression,
    async () => {
      await sendPushNotification(subscription, slot);
    },
    {
      timezone: subscription.tz,
    }
  );

  scheduledJobs.push({
    endpoint: subscription.endpoint,
    slotKey: slot.slotKey,
    task,
  });
}

async function sendPushNotification(
  subscription: {
    endpoint: string;
    p256dh: string;
    auth: string;
  },
  slot: {
    name: string;
  }
) {
  const payload = JSON.stringify({
    title: 'Meal Reminder',
    body: `Time for ${slot.name}`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
  });

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload
    );
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const statusCode = err.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        console.log(`Subscription expired or invalid: ${subscription.endpoint}`);
        const db = await getDb();
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, subscription.endpoint));
      } else {
        console.error('Failed to send push notification:', err);
      }
    } else {
      console.error('Failed to send push notification:', err);
    }
  }
}

function stopAllSchedules() {
  for (const job of scheduledJobs) {
    job.task.stop();
  }
  scheduledJobs.length = 0;
}

export function stopScheduler() {
  stopAllSchedules();
  console.log('Scheduler stopped');
}
