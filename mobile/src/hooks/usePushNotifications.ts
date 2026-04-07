import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

const isExpoGo = Constants.appOwnership === 'expo';

let Notifications: typeof import('expo-notifications') | null = null;
if (!isExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications!.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    /* expo-notifications not available */
  }
}

/**
 * Registers the device for push notifications when the user is signed in.
 * Uses native FCM/APNs tokens and stores them in device_tokens via Supabase.
 */
export function usePushNotifications() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.id || !Notifications) return;

    async function registerPush() {
      try {
        const { status: existingStatus } =
          await Notifications!.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications!.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') return;

        // Get native FCM/APNs token (NOT Expo push token)
        const tokenData = await Notifications!.getDevicePushTokenAsync();
        const pushToken = tokenData.data as string;
        const platform = Platform.OS === 'ios' ? 'ios' : 'android';

        // Store directly via Supabase
        const { error } = await supabase.from('device_tokens').upsert(
          {
            user_id: profile!.id,
            token: pushToken,
            platform,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );

        if (error) {
          console.log('Push token save failed:', error.message);
        }
      } catch (err) {
        console.log('Push registration error:', err);
      }
    }

    registerPush();
  }, [profile?.id]);

  // Set up Android notification channel
  useEffect(() => {
    if (!Notifications || Platform.OS !== 'android') return;
    Notifications.setNotificationChannelAsync('default', {
      name: 'Kamioi',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7C3AED',
      sound: 'default',
    });
  }, []);
}
