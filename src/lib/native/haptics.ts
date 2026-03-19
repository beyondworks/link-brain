import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from '@/lib/platform';

export async function hapticLight() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Light });
}

export async function hapticMedium() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function hapticHeavy() {
  if (!isNative) return;
  await Haptics.impact({ style: ImpactStyle.Heavy });
}

export async function hapticSuccess() {
  if (!isNative) return;
  await Haptics.notification({ type: NotificationType.Success });
}

export async function hapticWarning() {
  if (!isNative) return;
  await Haptics.notification({ type: NotificationType.Warning });
}

export async function hapticError() {
  if (!isNative) return;
  await Haptics.notification({ type: NotificationType.Error });
}
