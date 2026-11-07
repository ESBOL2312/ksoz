import { getWebApp, supports } from './webapp';

function hf() {
  return supports('6.1') ? getWebApp()!.HapticFeedback : null;
}

export const haptics = {
  success: () => hf()?.notificationOccurred('success'),
  warning: () => hf()?.notificationOccurred('warning'),
  error: () => hf()?.notificationOccurred('error'),
  tap: () => hf()?.impactOccurred('light'),
  select: () => hf()?.selectionChanged(),
};
