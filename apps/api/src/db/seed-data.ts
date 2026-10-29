import type { Level } from '@ksoz/shared';

export const TOPICS = [
  { slug: 'basics', nameKk: 'Негіздер', nameRu: 'Основы', words: ['Сәлем', 'Рақмет', 'Кешіріңіз', 'Сау болыңыз', 'Иә', 'Жоқ'] },
  { slug: 'food', nameKk: 'Тағам', nameRu: 'Еда и напитки', words: ['Су', 'Нан', 'Ет', 'Сүт', 'Шай', 'Алма'] },
  { slug: 'home', nameKk: 'Үй және қала', nameRu: 'Дом и город', words: ['Үй', 'Мектеп', 'Қала', 'Ауыл', 'Көше'] },
  { slug: 'family', nameKk: 'Отбасы', nameRu: 'Семья и люди', words: ['Ана', 'Әке', 'Бала', 'Дос'] },
  { slug: 'animals', nameKk: 'Жануарлар', nameRu: 'Животные', words: ['Ит', 'Мысық', 'Жылқы', 'Қой'] },
  { slug: 'colors', nameKk: 'Түстер', nameRu: 'Цвета', words: ['Ақ', 'Қара', 'Қызыл', 'Көк'] },
  { slug: 'numbers', nameKk: 'Сандар', nameRu: 'Числа', words: ['Бір', 'Екі', 'Үш'] },
  { slug: 'verbs', nameKk: 'Етістіктер', nameRu: 'Глаголы', words: ['Бару', 'Келу', 'Жеу', 'Ішу', 'Сөйлеу', 'Білу'] },
  { slug: 'clothes', nameKk: 'Киім', nameRu: 'Одежда', words: ['Шапан', 'Тақия', 'Етік'] },
] as const;

/** Дополнительные слова для базара (в прототипе нет слов про одежду). */
export const EXTRA_WORDS: readonly { kk: string; ru: string; level: Level; example: string }[] = [
  { kk: 'Шапан', ru: 'халат, шапан', level: 'A2', example: 'Ол жаңа шапан киді. — Он надел новый шапан.' },
  { kk: 'Тақия', ru: 'тюбетейка', level: 'A2', example: '' },
  { kk: 'Етік', ru: 'сапоги', level: 'A2', example: '' },
];

export const CITIES = [
  { nameKk: 'Алматы', nameRu: 'Алматы' },
  { nameKk: 'Астана', nameRu: 'Астана' },
  { nameKk: 'Шымкент', nameRu: 'Шымкент' },
  { nameKk: 'Қарағанды', nameRu: 'Караганда' },
  { nameKk: 'Ақтөбе', nameRu: 'Актобе' },
  { nameKk: 'Тараз', nameRu: 'Тараз' },
  { nameKk: 'Павлодар', nameRu: 'Павлодар' },
  { nameKk: 'Өскемен', nameRu: 'Усть-Каменогорск' },
  { nameKk: 'Атырау', nameRu: 'Атырау' },
  { nameKk: 'Қостанай', nameRu: 'Костанай' },
] as const;

export const ITEMS: readonly {
  kk: string;
  category: 'kiim' | 'uy' | 'mal' | 'aspap';
  price: number;
  minLevel: Level;
  slot: string;
}[] = [
  { kk: 'Шапан', category: 'kiim', price: 120, minLevel: 'A1', slot: 'body' },
  { kk: 'Тақия', category: 'kiim', price: 80, minLevel: 'A1', slot: 'head' },
  { kk: 'Етік', category: 'kiim', price: 150, minLevel: 'A2', slot: 'feet' },
  { kk: 'Үй', category: 'uy', price: 250, minLevel: 'A1', slot: 'house' },
  { kk: 'Мысық', category: 'mal', price: 100, minLevel: 'A1', slot: 'pet' },
  { kk: 'Қой', category: 'mal', price: 160, minLevel: 'A1', slot: 'farm' },
  { kk: 'Жылқы', category: 'mal', price: 300, minLevel: 'A2', slot: 'farm' },
  { kk: 'Шай', category: 'aspap', price: 60, minLevel: 'A1', slot: 'table' },
];
