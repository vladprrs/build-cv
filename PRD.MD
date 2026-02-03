# PRD: Build CV — Experience Management System

| Meta | Details |
| :--- | :--- |
| **Product Name** | Build CV |
| **Version** | 1.0 (MVP) |
| **Status** | Approved for Development |
| **Goal** | Создание персональной Headless CMS для управления профессиональным опытом и подготовки данных для RAG-генерации резюме. |

---

## 1. Введение

### 1.1 Описание продукта
**Build CV** — это локальное веб-приложение для структурирования карьеры. Оно позволяет пользователю декомпозировать свой опыт на атомарные блоки ("хайлайты"), обогащать их метаданными (метрики, навыки, домены) и использовать эти данные для автоматической сборки целевых резюме через AI-агенты (RAG pipelines).

### 1.2 Проблема
При поиске работы кандидатам уровня Senior+ необходимо адаптировать резюме под каждую вакансию. Хранение всех достижений в одном DOCX-файле или в голове приводит к:
1.  Потере контекста и деталей старых проектов.
2.  Сложности выборки релевантного опыта (например, "показать только Fintech проекты с метриками роста").
3.  Отсутствию структурированных данных для скармливания нейросетям (ChatGPT/Claude).

### 1.3 Решение
Приложение, которое работает как база данных знаний о карьере. Пользователь один раз заносит опыт, а система позволяет экспортировать идеально отфильтрованный JSON-набор для генерации конкретного резюме.

---

## 2. Глоссарий и Модель Данных

### 2.1 Сущности

#### **Highlight (Хайлайт)**
Атомарная единица опыта. Это может быть достижение, конкретный проект, зона ответственности или полученный навык.
*Пример: "Увеличил конверсию в покупку на 15% за счет редизайна чекаута".*

#### **Job Context (Место работы)**
Контейнер, объединяющий хайлайты хронологически.
*Пример: "Senior Product Manager в Acme Corp (2020-2022)".*

#### **Taxonomy (Таксономия)**
Словари для классификации опыта: Домены (Fintech, Edtech), Скиллы (Python, Product Strategy).

### 2.2 Схема данных (TypeScript Definition)

Разработчики должны использовать эту схему как основу для БД и типов.

```typescript
// Типы хайлайтов
type HighlightType = 'achievement' | 'project' | 'responsibility' | 'education';

// Метрика (строгая типизация для визуализации)
interface Metric {
  label: string;       // Например: "Revenue Growth"
  value: number;       // Например: 30
  unit: string;        // Например: "%"
  prefix?: string;     // Например: "$" или "+"
  description?: string; // Контекст метрики
}

// Место работы (Контейнер)
interface Job {
  id: string;          // UUID
  company: string;     // Название компании
  role: string;        // Должность
  startDate: string;   // ISO Date (YYYY-MM-DD)
  endDate?: string;    // ISO Date или null (если текущее)
  logoUrl?: string;    // Опционально
  website?: string;
}

// Основная сущность
interface Highlight {
  id: string;          // UUID
  jobId?: string;      // Foreign Key к Job (может быть null для пет-проектов)
  type: HighlightType;
  
  title: string;       // Краткий заголовок (для UI списка)
  content: string;     // Полное текстовое описание (для экспорта в резюме)
  
  startDate: string;   // ISO Date
  endDate?: string;    
  
  // Метаданные (Tags)
  domains: string[];   // ["e-commerce", "b2b"]
  skills: string[];    // ["sql", "ab-testing", "figma"]
  keywords: string[];  // ["growth", "optimization"] - скрытые теги для поиска
  
  metrics: Metric[];   // Массив метрик
  
  isHidden: boolean;   // Soft delete / Архив
  createdAt: string;
  updatedAt: string;
}
```

---

## 3. Функциональные требования (MVP)

### 3.1 Управление данными (CRUD)

**FR-001: Создание и редактирование Job (Места работы)**
*   Пользователь может добавить компанию, роль и период работы.
*   Валидация: Дата начала не может быть позже даты окончания.

**FR-002: Управление Highlight (Хайлайтом)**
*   Создание хайлайта внутри контекста Job или как независимой единицы.
*   **Rich Editor:** Текстовые поля (Title, Content).
*   **Metrics Builder:** Специальный UI компонент для добавления метрик (три поля: Value, Unit, Label) вместо ввода текста.
*   **Tags Input:** Ввод доменов и скиллов с автодополнением (предлагать уже созданные ранее теги).

**FR-003: Просмотр списка (Views)**
*   **Timeline View (Основной):** Хайлайты сгруппированы по Job, отсортированы хронологически (новые сверху). Визуально напоминает LinkedIn профиль.
*   **Table View:** Плоская таблица всех хайлайтов для массового редактирования и поиска.

### 3.2 Поиск и Фильтрация

**FR-004: Фильтры**
*   Фильтрация по: Типу (Achievement/Project), Домену (Multi-select), Скиллам.
*   Полнотекстовый поиск по Title и Content.
*   Переключатель "Only with metrics" (Показать только оцифрованные достижения).

### 3.3 RAG Export (Киллер-фича)

**FR-005: Конструктор экспорта**
Интерфейс для подготовки данных под генерацию.
1.  Пользователь выбирает критерии (например: "Domain: Foodtech" + "Type: Achievement").
2.  Система показывает превью списка (количество найденных записей).
3.  Кнопка **"Copy JSON context"**: Формирует оптимизированный JSON-промпт для LLM.
4.  Кнопка **"Copy Markdown"**: Для вставки в Notion/Obsidian.

### 3.4 Системные функции

**FR-006: Бэкап и Безопасность**
*   Все данные хранятся локально (SQLite).
*   Кнопка "Export Full Backup" (скачивает JSON файл со всей базой).
*   Кнопка "Import Backup" (восстанавливает базу из файла).

---

## 4. UI/UX Требования

### 4.1 Общая стилистика
*   **Дизайн:** Минимализм, "Data-dense" (высокая плотность информации).
*   **Тема:** Светлая/Темная (системная).
*   **Отзывчивость:** Desktop-first (основная работа ведется с ноутбука), но читабельно на мобильных.

### 4.2 Ключевые экраны

**1. Dashboard (Главная)**
*   Слева: Сайдбар с навигацией (Timeline, All Items, Export, Settings).
*   Центр: Лента опыта (Timeline View). Карточки Job, внутри них список карточек Highlights.
*   Справа (опционально): Виджет статистики ("Всего хайлайтов: 45", "Топ скиллов: Product Management").

**2. Модальное окно хайлайта**
*   Открывается поверх списка.
*   Поля: Title (крупно), Content (textarea), блок Metrics (инпуты в ряд), блок Tags (input c chips).
*   Цветовое кодирование типов хайлайтов (например: Achievement — золотой, Project — синий).

**3. Экран RAG Export**
*   Две колонки. Слева — панель настроек фильтрации. Справа — живое превью JSON результата.

### 4.3 UI States
*   **Empty State:** Если база пуста, показать кнопку "Add your first Job" и приветственный онбординг.
*   **Loading State:** Скелетоны при загрузке данных.
*   **Success Feedback:** Toast-уведомления при сохранении/копировании ("Copied to clipboard").

---

## 5. Технические требования

### 5.1 Технологический стек
*   **Frontend Framework:** Next.js 14+ (App Router).
*   **Language:** TypeScript (Strict mode).
*   **Styling:** Tailwind CSS + UI Library (shadcn/ui или Radix UI).
*   **Database:** SQLite (файл `cv_data.db` в корне проекта).
*   **ORM:** Drizzle ORM (предпочтительно) или Prisma.
*   **State Management:** React Query (TanStack Query) для серверного состояния.
*   **Validation:** Zod (для форм и API валидации).

### 5.2 Архитектура API (Next.js Server Actions / API Routes)

| Метод | Эндпоинт | Описание |
| :--- | :--- | :--- |
| `GET` | `/api/jobs` | Получить список мест работы (с вложенными хайлайтами или без) |
| `POST` | `/api/jobs` | Создать место работы |
| `GET` | `/api/highlights` | Поиск хайлайтов (query params: `domains`, `skills`, `q`) |
| `POST` | `/api/highlights` | Создать хайлайт |
| `PUT` | `/api/highlights/:id` | Обновить хайлайт |
| `DELETE`| `/api/highlights/:id` | Удалить (или архивировать) хайлайт |
| `GET` | `/api/taxonomy` | Получить уникальные списки всех domains и skills для автокомплита |
| `POST` | `/api/system/export` | Полный дамп БД в JSON |

### 5.3 Требования к производительности
*   **Latency:** Время ответа API < 100ms (так как база локальная).
*   **Search:** Поиск по тексту должен быть мгновенным (debounce 300ms на клиенте).

---

## 6. Приложения

### Пример выходного JSON для RAG
Именно такой формат должен генерировать сервис при нажатии "Copy JSON context":

```json
{
  "context": "Professional Experience",
  "request_filters": {
    "domains": ["Fintech"],
    "priority": "Achievements"
  },
  "highlights": [
    {
      "id": "uuid-1234",
      "title": "Launched Crypto Wallet",
      "company": "Revolut",
      "period": "2021-2022",
      "description": "Led the development of custodial wallet...",
      "metrics": "MAU: +50k, Revenue: $2M ARR",
      "tags": ["product", "crypto", "mobile"]
    }
  ]
}
```