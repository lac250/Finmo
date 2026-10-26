export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('Este navegador não suporta notificações de ambiente.');
    return 'unsupported';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      try {
        new Notification('Finmo', {
          body: 'Notificações ativadas! Você receberá alertas dos seus desafios e metas.',
          icon: '/icon-192.svg',
          badge: '/favicon.svg',
        });
      } catch (err) {
        console.warn('Could not instantiate Notification object directly', err);
      }
    }
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function sendLocalPushNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    new Notification(title, {
      icon: '/icon-192.svg',
      badge: '/favicon.svg',
      ...options,
    });
  } catch (e) {
    console.warn('Error sending local notification', e);
  }
}
