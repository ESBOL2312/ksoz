import { onBeforeUnmount, onMounted } from 'vue';
import { getWebApp, supports } from './webapp';

/**
 * Показывает системную кнопку «назад» Telegram, пока компонент смонтирован.
 * Возвращает true, если кнопка Telegram доступна (иначе экран рисует свою).
 */
export function useBackButton(onBack: () => void): boolean {
  const available = supports('6.1');
  if (!available) return false;
  const bb = getWebApp()!.BackButton;
  onMounted(() => {
    bb.onClick(onBack);
    bb.show();
  });
  onBeforeUnmount(() => {
    bb.offClick(onBack);
    bb.hide();
  });
  return true;
}
