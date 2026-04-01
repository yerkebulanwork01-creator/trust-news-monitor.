// Ключевые слова для фильтрации (расширенный список)
const KEYWORDS = [
  // Основные названия (включая казахское написание)
  'самрук-казына', 
  'самрук-қазына', 
  'samruk-kazyna',
  'sk-trust',
  'skt',
  
  // Личности и проекты
  'адиева', 
  'skai', 
  'masa',
  
  // Общие темы (для теста можно добавить более широкие, потом убрать)
  'грант нко',
  'благотворительность',
  'социальные проекты',
  'фонд развития',
  'асхат оралов' // пример для проверки активности
];

export function isRelevantByKeywords(text: string): boolean {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  
  // Проверяем наличие хотя бы одного ключевого слова
  return KEYWORDS.some(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    // Ищем как отдельное слово или в составе фразы
    return lowerText.includes(lowerKeyword);
  });
}
