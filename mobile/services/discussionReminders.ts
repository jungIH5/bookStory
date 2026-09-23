import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;
async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  channelReady = true;
  await Notifications.setNotificationChannelAsync('discussion-reminders', {
    name: '토론 시간 알림',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
  });
}

async function ensurePermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

const tenMinId = (roomId: number) => `discussion-10min-${roomId}`;
const oneMinId = (roomId: number) => `discussion-1min-${roomId}`;

interface ReminderRoom {
  id: number;
  scheduled_at: string;
  reading_minutes: number;
  discussion_minutes: number;
}

/** 토론 종료 10분 전 / 1분 전 로컬 알림을 예약한다. 같은 방에 대해 다시 호출하면 기존 예약을 대체한다. */
export async function scheduleDiscussionReminders(room: ReminderRoom) {
  const start = new Date(room.scheduled_at).getTime();
  const discEnd = start + ((room.reading_minutes || 0) + (room.discussion_minutes || 0)) * 60000;
  const tenMinAt = discEnd - 10 * 60000;
  const oneMinAt = discEnd - 60000;
  const now = Date.now();
  if (oneMinAt <= now) return; // 이미 지난 시점이면 예약하지 않음

  const granted = await ensurePermission();
  if (!granted) return;
  await ensureAndroidChannel();

  if (tenMinAt > now) {
    await Notifications.scheduleNotificationAsync({
      identifier: tenMinId(room.id),
      content: {
        title: '⏰ 토론 종료 10분 전',
        body: '슬슬 이야기를 마무리할 준비를 해주세요.',
        sound: 'default',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(tenMinAt), channelId: 'discussion-reminders' },
    });
  } else {
    await Notifications.cancelScheduledNotificationAsync(tenMinId(room.id)).catch(() => {});
  }

  await Notifications.scheduleNotificationAsync({
    identifier: oneMinId(room.id),
    content: {
      title: '🔔 토론 종료 1분 전',
      body: '곧 토론이 끝나요!',
      sound: 'default',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(oneMinAt), channelId: 'discussion-reminders' },
  });
}

/** 방을 나가거나 삭제됐을 때 등, 더 이상 필요 없어진 예약 알림을 취소한다. */
export async function cancelDiscussionReminders(roomId: number) {
  await Notifications.cancelScheduledNotificationAsync(tenMinId(roomId)).catch(() => {});
  await Notifications.cancelScheduledNotificationAsync(oneMinId(roomId)).catch(() => {});
}
