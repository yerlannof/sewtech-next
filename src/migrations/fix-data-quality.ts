/**
 * Data Quality Fix: batch-fix FAQ, specs, meta for all 741 products in Payload CMS
 *
 * Steps:
 *   1. Load all products from DB + opencart source data
 *   2. Translate English FAQ fragments (130 JUKI products, ~158 FAQ items)
 *   3. Generate FAQ for non-JUKI products without FAQ (368 products)
 *   4. Extract specifications for products without specs (203 products)
 *   5. Generate meta_title / meta_description for all products
 *   6. Clean English fragments in specification values (268 values)
 *
 * Usage:
 *   cd ~/projects/sewtech-next
 *   npx tsx src/migrations/fix-data-quality.ts 2>&1 | tee /tmp/fix-data.log
 *   npx tsx src/migrations/fix-data-quality.ts --step=faq
 *   npx tsx src/migrations/fix-data-quality.ts --step=meta
 *   npx tsx src/migrations/fix-data-quality.ts --step=specs
 *   npx tsx src/migrations/fix-data-quality.ts --step=clean
 *
 * Prerequisites:
 *   - PostgreSQL running (docker compose up -d)
 *   - Dev server NOT running (Payload needs exclusive DB access)
 */

import 'dotenv/config'
import path from 'path'
import fs from 'fs'
import { getPayload, type Payload } from 'payload'
import config from '../payload/payload.config'
import * as cheerio from 'cheerio'

// ─── Paths ───────────────────────────────────────────────────────

const PROJECT_ROOT = '/home/yerla/projects/sewtech-next'
const OC_DATA_DIR = path.join(PROJECT_ROOT, 'data/opencart')
const OC_PRODUCTS_JSON = path.join(OC_DATA_DIR, 'products.json')
const JUKI_RAG_DIR = '/home/yerla/projects/juki-rag-project'
const JUKI_PRODUCTS_JSON = path.join(JUKI_RAG_DIR, 'output/opencart_import/products.json')

// ─── Interfaces ──────────────────────────────────────────────────

interface PayloadProduct {
  id: number
  name: string
  slug: string
  sku: string
  brand?: { id: number; name: string } | number | null
  category?: { id: number; name: string } | number | null
  subcategory?: { id: number; name: string } | number | null
  shortDescription?: string
  descriptionHtml?: string
  specifications?: Array<{ name: string; value: string; unit?: string; id?: string }>
  faq?: Array<{ question: string; answer: string; id?: string }>
  meta?: { title?: string; description?: string; image?: unknown }
  price?: number
  priceOnRequest?: boolean
  inStock?: boolean
}

interface OCProduct {
  id: number
  name: string
  model: string
  sku: string
  manufacturer_id: number
  price: number
  quantity: number
  stock_status_id: number
  image: string | null
  additional_images: string[]
  category_id: number | null
  attributes: Array<{ attribute_id: number; name: string; value: string }>
  description_ru: string
  description_en: string
  meta_title: string
  meta_description: string
  seo_url: string
}

interface JukiProduct {
  name: string
  model: string
  sku: string
  subtitle: string
  category: string
  subcategory: string
  attributes: Array<{ attribute_name: string; attribute_group: string; text: string; sort_order: number }>
  seo: { meta_title: string; meta_description: string }
  faq: Array<{ question: string; answer: string; category: string }>
  description: string
}

// ─── Stats ───────────────────────────────────────────────────────

const stats = {
  faqTranslated: 0,
  faqItemsTranslated: 0,
  faqRemoved: 0,
  faqGenerated: 0,
  specsExtracted: 0,
  metaUpdated: 0,
  specsCleaned: 0,
  errors: 0,
}

// ═══════════════════════════════════════════════════════════════════
// TRANSLATION DICTIONARIES (from juki-rag-project/scripts/generate_product_cards.py)
// ═══════════════════════════════════════════════════════════════════

/** Exact value matches — checked first */
const SPEC_VALUE_EXACT: Record<string, string> = {
  // General
  'Provided as standard': 'Стандартная комплектация',
  'Provide as standard': 'Стандартная комплектация',
  'Provide': 'Стандартная комплектация',
  'Standard': 'Стандарт',
  'Standard equipment': 'Стандартная комплектация',
  'Option': 'Опция',
  'Not provided': 'Не предусмотрено',
  // Application
  'Light-weight': 'Лёгкие ткани',
  'Medium-weight': 'Средние ткани',
  'Heavy-weight': 'Тяжёлые ткани',
  'Extra Heavy-weight': 'Сверхтяжёлые ткани',
  'Light- to medium-weight': 'Лёгкие и средние ткани',
  'Medium- to heavy-weight': 'Средние и тяжёлые ткани',
  'Light- to heavy-weight': 'Лёгкие — тяжёлые ткани',
  // Lubrication
  'Fully-dry head type': 'Полностью сухая головка',
  'Semi-dry': 'Полусухая',
  'Semi-dry head type': 'Полусухая головка',
  'Minute-quantity lubrication': 'Микросмазка',
  'Automatic': 'Автоматическая',
  'Automatiac': 'Автоматическая',
  'Fully automatic': 'Полностью автоматическая',
  'Hook: minute-quantity lubrication': 'Челнок: микросмазка',
  'Lubrication': 'Смазка',
  'Lubricating oil': 'Масло для смазки',
  'Automatic (The needle bar mechanism and upper looper mechanism do not require lubrication.)': 'Автоматическая (игловодитель и верхний петлитель не требуют смазки)',
  // Tension
  'Active tension': 'Активное натяжение',
  'Active tension (electronic thread tension control mechanism)': 'Активное натяжение (электронное управление)',
  'Active tension (electronic thread tension control system)': 'Активное натяжение (электронное управление)',
  'Electronic control': 'Электронное управление',
  // Drive
  'Compact AC servomotor (direct-drive system)': 'Компактный серводвигатель (прямой привод)',
  'Compact AC servomotor (400W) that is directly connected to the main shaft (direct-drive system)': 'Серводвигатель 400 Вт (прямой привод)',
  // Thread trimming
  'Double-edge rotary system': 'Двухсторонняя роторная система',
  'Rotary type': 'Роторный тип',
  // Hook
  'Automatic-lubricating full-rotary hook': 'Полноповоротный челнок с автосмазкой',
  'Double-capacity shuttle hook': 'Челнок двойной ёмкости',
  'Standard hook': 'Стандартный челнок',
  'DP hook (with titanium-treated inner hook)': 'Челнок DP (с титановым покрытием)',
  // Feed / stitch adjustment
  'By push-button': 'Кнопочная',
  'By lever (with micro-adjustment)': 'Рычагом (с микрорегулировкой)',
  'By dial': 'Регулятором',
  'By micro-adjustment mechanism': 'Микрорегулировкой',
  'By an oiler': 'Маслёнкой',
  'Slide type': 'Ползункового типа',
  'Link type': 'Рычажного типа',
  'Chucking system': 'Цанговая система',
  // Needle bar
  'Lower bushing method': 'Нижняя втулка',
  'Upper/lower bushing method': 'Верхняя/нижняя втулка',
  // Stitch type
  'Single-needle lockstitch': 'Одноигольный челночный стежок',
  '1-needle overlock': 'Одноигольный оверлок',
  '2-needle overlock': 'Двухигольный оверлок',
  'Safety stitching': 'Стачивающе-обмёточный',
  '3-needle safety stitching': 'Трёхигольный стачивающе-обмёточный',
  // Bobbin winder
  'Built on the machine head': 'Встроен в головку',
  'Built in the machine arm': 'Встроен в рукав',
  'Built-in the machine head': 'Встроен в головку',
  'Built in the top of machine head (provided with the bobbin thread retaining plate)': 'Встроен в верхнюю часть головки (с пластиной фиксации нити)',
  // Auto-lifter
  'Provided as standard (stepping motor type)': 'Стандарт (шаговый двигатель)',
  'Stepping motor': 'Шаговый двигатель',
  // Counter
  'Provided as standard (up/down method)': 'Стандарт (прямой/обратный счёт)',
  'Provided as standard (reset with the push of a button)': 'Стандарт (сброс кнопкой)',
  // Feed mode
  'Intermittent or continuous (switchover method)': 'Прерывистая или непрерывная (переключаемая)',
  'Intermittent feed by stepping motor': 'Прерывистая подача (шаговый двигатель)',
  // Memory
  'USB flash memory': 'USB-флеш',
  'Internal-organs memory': 'Встроенная память',
  // Type
  'Premium Digital Type': 'Премиум цифровой',
  'Digital Type': 'Цифровой',
  // Hook types (extended)
  'Horizontal-axis full-rotary double-capacity hook': 'Горизонтальный полноповоротный челнок двойной ёмкости',
  'Vertical-axis double-capacity hook': 'Вертикальный челнок двойной ёмкости',
  'Horizontal-axis double-capacity hook': 'Горизонтальный челнок двойной ёмкости',
  'Double-capacity rotary hook': 'Полноповоротный челнок двойной ёмкости',
  'Vertical-axis large hook (1.8 - fold )': 'Вертикальный увеличенный челнок (×1.8)',
  'Vertical-axis large hook (1.8-fold)': 'Вертикальный увеличенный челнок (×1.8)',
  'Vertical-axis 1.6-fold capacity hook (latch type)': 'Вертикальный челнок ×1.6 (замкового типа)',
  'Large shuttle-hook': 'Увеличенный челнок',
  'Standard shuttle hook': 'Стандартный челнок',
  'Vertical-axis regular hook': 'Вертикальный стандартный челнок',
  'Horizontal-axis rotary hook': 'Горизонтальный полноповоротный челнок',
  // Lubrication (extended)
  'Semi-dry head automatic (Tank system)': 'Полусухая головка, автосмазка (резервуар)',
  'Automatic (Tank system)': 'Автоматическая (резервуар)',
  'Automatic oil lubrication system': 'Автоматическая масляная система смазки',
  'Automatic lubrication': 'Автоматическая смазка',
  'Semi-dry type': 'Полусухой тип',
  // Tension (extended)
  'Single/Double-tension': 'Одинарное/двойное натяжение',
  'Independent right and left active tension mechanism': 'Независимое правое и левое активное натяжение',
  // Feed
  'Intermittent': 'Прерывистая',
  'Continuous': 'Непрерывная',
  // Additional Application values
  'Light-weight materials': 'Лёгкие ткани',
  'Medium-weight materials': 'Средние ткани',
  'Heavy-weight materials': 'Тяжёлые ткани',
  'Extra heavy-weight materials': 'Сверхтяжёлые ткани',
  'Light- to medium-weight materials': 'Лёгкие и средние ткани',
  'Medium- to heavy-weight materials': 'Средние и тяжёлые ткани',
  'Light-weight to heavy-weight': 'Лёгкие — тяжёлые ткани',
  'Light to medium weight': 'Лёгкие и средние ткани',
  'Medium to heavy weight': 'Средние и тяжёлые ткани',
  // Yes/No
  'Yes': 'Да',
  'No': 'Нет',
  'Provided': 'Предусмотрено',
  'Not provided as standard': 'Не входит в комплект',
  // Motor types
  'Direct Drive': 'Прямой привод',
  'Servo motor': 'Серводвигатель',
  'AC servo motor': 'Серводвигатель переменного тока',
  // Bed / platform types
  'Flat-bed': 'Плоская платформа',
  'Cylinder-bed': 'Цилиндрическая платформа',
  'Post-bed': 'Колонковая платформа',
  'Feed-off-the-arm': 'Рукавная платформа',
  // Stitch types
  '301 (Lockstitch)': '301 (Челночный стежок)',
  '401 (Chainstitch)': '401 (Цепной стежок)',
  '504/505 (Overlock)': '504/505 (Оверлок)',
  '516 (Safety stitch)': '516 (Стачивающе-обмёточный)',
  '602/605 (Coverstitch)': '602/605 (Плоский шов)',
  // Misc common values
  'Built-in type (LED)': 'Встроенный (LED)',
  'LED light': 'LED подсветка',
  'LCD touch panel': 'LCD сенсорная панель',
  'Touch panel': 'Сенсорная панель',
  'Operation panel': 'Панель управления',
  'Stepping motor type': 'Шаговый двигатель',
  'Solenoid type': 'Соленоидный',
  'Pneumatic type': 'Пневматический',
  'Electromagnetic type': 'Электромагнитный',
  // Various
  'No lubrication': 'Без смазки',
  'Electric type': 'Электрический',
  'Spring type': 'Пружинный',
  'Reverse feed': 'Обратная подача',
  'Continuous feed': 'Непрерывная подача',
  'Full-Rotation double capacity hook': 'Полноповоротный челнок двойной ёмкости',
  'Special semi-rotation hook': 'Специальный полуповоротный челнок',
  'Vertical-axis hook': 'Вертикальный челнок',
  'Horizontal-axis hook': 'Горизонтальный челнок',
  'Compact-size servomotor': 'Компактный серводвигатель',
  'Dry head': 'Сухая головка',
  'Dry-head': 'Сухая головка',
  'Dry': 'Сухая (безмасляная)',
  'Auto': 'Авто',
  'Pneumatic': 'Пневматический',
  // Values that are just the param name repeated
  'Application': '—',
  'Stitch type': '—',
  'Max. sewing speed': '—',
  'Normal sewing speed': '—',
  'Needle bar stroke': '—',
  'Power requirement / Power consumption': '—',
  'Power requirement / and power consumption': '—',
  'Power requirement': '—',
  'Weight': '—',
  'Total weight': '—',
  'Auto-lifter': '—',
}

/** Fragment replacements — applied in order, longer/more specific first */
const SPEC_VALUE_FRAGMENTS: Array<[string, string]> = [
  ['kg/roll', 'кг/рулон'],
  ['Эквивалент to ISO', 'эквивалент ISO'],
  ['эквивалент to ISO', 'эквивалент ISO'],
  ['sti/min', 'ст/мин'],
  ['Semi-dry / hook section,', 'Полусухая / челнок,'],
  ['Semi-dry / hook section:', 'Полусухая / челнок:'],
  ['Semi-dry / Hook section:', 'Полусухая / Челнок:'],
  ['Semi-dry / ', 'Полусухая / '],
  ['Semi-dry/', 'Полусухая/'],
  ['Only the hook section needs a minute-quantity lubrication.', 'Только челнок требует микросмазки.'],
  ['No lubrication is required when the non-lubricated hook (optional) is used.', 'Безмасляный челнок (опция) не требует смазки.'],
  ['Fully-dry head type', 'Полностью сухая головка'],
  ['Semi-dry head type', 'Полусухая головка'],
  ['Minute-quantity lubrication', 'Микросмазка'],
  ['minute-quantity lubrication', 'микросмазка'],
  ['Non-lubricated hook', 'Безмасляный челнок'],
  ['non-lubricated hook', 'безмасляный челнок'],
  ['equivalent to ISO', 'эквивалент ISO'],
  ['JUKI New Defrix Oil No.1 or JUKI CORPORATION GENUINE OIL 7', 'JUKI New Defrix Oil №1 / JUKI GENUINE OIL 7'],
  ['JUKI New Defrix Oil No.1', 'JUKI New Defrix Oil №1'],
  ['JUKI New Defrix Oil No.2', 'JUKI New Defrix Oil №2'],
  ['distance from needle to machine arm:', 'от иглы до рукава:'],
  ['Machine head (include motor)', 'Головка (с мотором)'],
  ['Machine head (Control box, motor, panel)', 'Головка (блок управления, мотор, панель)'],
  ['Machine head:', 'Головка:'],
  ['Machine head', 'Головка'],
  ['Control box', 'Блок управления'],
  ['machine head', 'головка'],
  ['Compact AC servomotor', 'Компактный серводвигатель'],
  ['that is directly connected to the main shaft', 'с прямым приводом'],
  ['direct-drive system', 'прямой привод'],
  ['Direct-drive system', 'Прямой привод'],
  ['AC servomotor', 'Серводвигатель'],
  ['Automatic-lubricating full-rotary hook', 'Полноповоротный челнок с автосмазкой'],
  ['Vertical axis full-rotary hook', 'Вертикальный полноповоротный челнок'],
  ['Vertical-axis full-rotary hook', 'Вертикальный полноповоротный челнок'],
  ['Horizontal-axis full-rotary hook', 'Горизонтальный полноповоротный челнок'],
  ['full-rotary hook', 'полноповоротный челнок'],
  ['Full-rotary hook', 'Полноповоротный челнок'],
  ['Double-capacity shuttle hook', 'Челнок двойной ёмкости'],
  ['DP type, full-rotary hook', 'Тип DP, полноповоротный челнок'],
  ['DP hook', 'Челнок DP'],
  ['titanium-treated inner hook', 'титановое покрытие внутреннего челнока'],
  ['Standard hook', 'Стандартный челнок'],
  ['Vertical axis', 'Вертикальная ось'],
  ['Horizontal axis', 'Горизонтальная ось'],
  ['fold-capacity hook', 'челнок увеличенной ёмкости'],
  ['Adjustable on the operation panel', 'Регулируется на панели'],
  ['By hand:', 'Вручную:'],
  ['By knee:', 'Коленом:'],
  ['By pedal:', 'Педалью:'],
  ['By lever:', 'Рычагом:'],
  ['By lever', 'Рычагом'],
  ['Auto:', 'Авто:'],
  ['1st stage', '1-я ступень'],
  ['2nd stage', '2-я ступень'],
  ['Lift of the presser foot', 'Подъём прижимной лапки'],
  ['Max. lift of the presser foot', 'Макс. подъём лапки'],
  ['presser foot pressure', 'давление лапки'],
  ['presser foot', 'прижимная лапка'],
  ['Presser foot', 'Прижимная лапка'],
  ['Single-needle lockstitch', 'Одноигольный челночный стежок'],
  ['1-needle, Lockstitch', 'Одноигольная прямострочная'],
  ['2-needle, Lockstitch', 'Двухигольная прямострочная'],
  ['Unison-feed, Lockstitch', 'Тройное продвижение, челночный стежок'],
  ['Lockstitch Sewing System', 'Челночный стежок'],
  ['Lockstitch', 'Челночный стежок'],
  ['lockstitch', 'челночный стежок'],
  ['Chainstitch', 'Цепной стежок'],
  ['chainstitch', 'цепной стежок'],
  ['Coverstitch', 'Плоский шов'],
  ['coverstitch', 'плоский шов'],
  ['Overlock', 'Оверлок'],
  ['overlock', 'оверлок'],
  ['Safety stitch', 'Стачивающе-обмёточный'],
  ['safety stitch', 'стачивающе-обмёточный'],
  ['Zigzag', 'Зигзаг'],
  ['zigzag', 'зигзаг'],
  ['Bartacking', 'Закрепка'],
  ['bartacking', 'закрепка'],
  ['Buttonholing', 'Петление'],
  ['buttonholing', 'петление'],
  ['Button sewing', 'Пришивание пуговиц'],
  ['button sewing', 'пришивание пуговиц'],
  ['Unison-feed', 'Тройное продвижение'],
  ['unison-feed', 'тройное продвижение'],
  ['Drop feed', 'Нижний транспортёр'],
  ['drop feed', 'нижний транспортёр'],
  ['Needle feed', 'Игольный транспорт'],
  ['needle feed', 'игольный транспорт'],
  ['Differential feed', 'Дифференциальная подача'],
  ['differential feed', 'дифференциальная подача'],
  ['For gathering', 'Сборка'],
  ['for gathering', 'сборка'],
  ['For stretching', 'Растяжение'],
  ['for stretching', 'растяжение'],
  ['Gathering', 'Сборка'],
  ['Stretching', 'Растяжение'],
  ['with micro-adjustment', 'с микрорегулировкой'],
  ['Active tension', 'Активное натяжение'],
  ['electronic thread tension control mechanism', 'электронное управление натяжением'],
  ['electronic thread tension control system', 'электронное управление натяжением'],
  ['Electronic control', 'Электронное управление'],
  ['electronic control', 'электронное управление'],
  ['Needle thread clamp', 'Зажим игольной нити'],
  ['needle thread clamp', 'зажим игольной нити'],
  ['Shorter-thread remaining type', 'Тип с коротким остатком нити'],
  ['shorter-thread remaining', 'с коротким остатком нити'],
  ['Thread trimmer', 'Обрезчик нити'],
  ['thread trimmer', 'обрезчик нити'],
  ['Double-edge rotary system', 'Двухсторонняя роторная'],
  ['Rotary knife system', 'Роторный нож'],
  ['rotary knife', 'роторный нож'],
  ['Bobbin thread winder', 'Намотка шпульной нити'],
  ['Built in the top of machine head', 'Встроен в верхнюю часть головки'],
  ['Built on the machine head', 'Встроен в головку'],
  ['Built in the machine arm', 'Встроен в рукав'],
  ['Built-in the machine head', 'Встроен в головку'],
  ['provided with the bobbin thread retaining plate', 'с пластиной фиксации нити'],
  ['stepping motor type', 'шаговый двигатель'],
  ['Stepping motor', 'Шаговый двигатель'],
  ['stepping motor', 'шаговый двигатель'],
  ['Single-phase', 'Однофазный'],
  ['single-phase', 'однофазный'],
  ['3-phase', 'Трёхфазный'],
  ['Lower bushing method', 'Нижняя втулка'],
  ['Upper/lower bushing method', 'Верхняя/нижняя втулка'],
  ['excluding some subclass model', 'кроме некоторых подклассов'],
  ['up/down method', 'прямой/обратный счёт'],
  ['reset with the push of a button', 'сброс кнопкой'],
  ['Provided as standard', 'Стандартная комплектация'],
  ['provided as standard', 'стандартная комплектация'],
  ['At the time of shipment', 'При поставке'],
  ['at the time of shipment', 'при поставке'],
  ['at the time of delivery', 'при поставке'],
  ['touch-back switch function', 'функция Touch-back'],
  ['one-touch changeover switch function', 'переключение одним нажатием'],
  ['Intermittent or continuous', 'Прерывистая или непрерывная'],
  ['switchover method', 'переключаемая'],
  ['Intermittent feed', 'Прерывистая подача'],
  ['By push-button', 'Кнопочная'],
  ['By dial', 'Регулятором'],
  ['Slide type', 'Ползункового типа'],
  ['Link type', 'Рычажного типа'],
  ['Not provided', 'Не предусмотрено'],
  ['not provided', 'не предусмотрено'],
  ['Needle cooler', 'Охлаждение иглы'],
  ['Micro-lifter', 'Микролифтер'],
  ['patterns', 'шаблонов'],
  ['pattern', 'шаблон'],
  ['stitches', 'стежков'],
  ['optional', 'опция'],
  ['Optional', 'Опция'],
  ['double-capacity hook', 'челнок двойной ёмкости'],
  ['Double-capacity hook', 'Челнок двойной ёмкости'],
  ['double-capacity shuttle', 'челнок двойной ёмкости'],
  ['rotary hook', 'полноповоротный челнок'],
  ['shuttle hook', 'челнок'],
  ['shuttle-hook', 'челнок'],
  ['regular hook', 'стандартный челнок'],
  ['latch type', 'замкового типа'],
  ['1.6-fold capacity', '×1.6'],
  ['1.8 - fold', '×1.8'],
  ['1.8-fold', '×1.8'],
  ['Large hook', 'Увеличенный челнок'],
  ['large hook', 'увеличенный челнок'],
  ['Tank system', 'резервуар'],
  ['tank system', 'резервуар'],
  ['oil lubrication system', 'масляная система смазки'],
  ['Automatic lubrication', 'Автоматическая смазка'],
  ['automatic lubrication', 'автоматическая смазка'],
  ['three-phase', 'трёхфазный'],
  ['Three-phase', 'Трёхфазный'],
  ['Main motor output', 'Мощность двигателя'],
  ['forward / backward', 'вперёд/назад'],
  ['forward/backward', 'вперёд/назад'],
  ['Max.', 'Макс.'],
  ['max.', 'макс.'],
  ['Double-tension', 'Двойное натяжение'],
  ['Single-tension', 'Одинарное натяжение'],
  ['active tension mechanism', 'активное натяжение'],
  ['Independent right and left', 'Независимое правое и левое'],
  ['refer to subclass machine list', 'см. список подклассов'],
  ['thread stand is not included', 'без стойки для нитей'],
  ['include motor, control box, panel', 'вкл. мотор, блок управления, панель'],
  ['include motor, control box', 'вкл. мотор, блок управления'],
  ['include motor', 'вкл. мотор'],
  ['normal/reverse feed', 'прямая/обратная подача'],
  ['stitch length', 'длина стежка'],
  ['Stitch length', 'Длина стежка'],
  ['or less', 'и менее'],
  ['or more', 'и более'],
  ['by hand', 'вручную'],
  ['By hand', 'Вручную'],
  ['by knee', 'коленом'],
  ['By knee', 'Коленом'],
  ['by pedal', 'педалью'],
  ['By pedal', 'Педалью'],
  ['Centralized oil wick lubrication', 'Централизованная фитильная смазка'],
  ['Centralized tank method', 'Централизованный резервуарный метод'],
  ['Oil Shielding System', 'Система масляной защиты'],
  ['hook section', 'секция челнока'],
  ['Hook section', 'Секция челнока'],
  ['Spun thread', 'Крученая нить'],
  ['spun thread', 'крученая нить'],
  ['cotton thread', 'хлопковая нить'],
  ['Cotton thread', 'Хлопковая нить'],
  ['Continuous feed', 'Непрерывная подача'],
  ['continuous feed', 'непрерывная подача'],
  ['Reverse feed', 'Обратная подача'],
  ['reverse feed', 'обратная подача'],
  ['feed pitch', 'шаг подачи'],
  ['Normal/Reverse feed', 'Прямая/обратная подача'],
  ['general-purpose motor', 'универсальный мотор'],
  ['General-purpose motor', 'Универсальный мотор'],
  ['Compact-size servomotor', 'Компактный серводвигатель'],
  ['control box', 'блок управления'],
  ['automatic-lubricating', 'с автосмазкой'],
  ['Automatic-lubricating', 'С автосмазкой'],
  ['titanium-coated inner hook', 'титановое покрытие внутреннего челнока'],
  ['by an oiler', 'маслёнкой'],
  ['By an oiler', 'Маслёнкой'],
  ['No lubrication', 'Без смазки'],
  ['no lubrication', 'без смазки'],
  ['pneumatic auto-lifter', 'пневматический автоподъёмник'],
  ['top and bottom covering stitch', 'верхний и нижний распошивальный шов'],
  ['bottom covering stitch', 'нижний распошивальный шов'],
  ['top covering stitch', 'верхний распошивальный шов'],
  ['Short-table type', 'Короткий стол'],
  ['Long-table type', 'Длинный стол'],
  ['Spring type dial thread tension controller', 'Пружинный дисковый регулятор натяжения'],
  ['Vertical-axis', 'Вертикальный'],
  ['Horizontal-axis', 'Горизонтальный'],
  ['Double-capacity', 'Двойной ёмкости'],
  ['double-capacity', 'двойной ёмкости'],
  ['double capacity', 'двойной ёмкости'],
  ['auto-lifter', 'автоподъёмник'],
  ['Auto-lifter', 'Автоподъёмник'],
  ['fold-capacity', 'увеличенной ёмкости'],
  ['Electric type', 'Электрический'],
  ['electric type', 'электрический'],
  ['Semi-Dry', 'Полусухой'],
  ['Semi-dry', 'Полусухой'],
  ['Semi-automatic', 'Полуавтоматическая'],
  ['semi-automatic', 'полуавтоматическая'],
  ['Lubrication', 'Смазка'],
  ['lubrication', 'смазка'],
  ['mechanism', 'механизм'],
  ['stroke', 'ход'],
  ['Intermittent', 'Прерывистая'],
  ['Continuous', 'Непрерывная'],
  ['Hook', 'Челнок'],
  ['Normal', 'Нормал.'],
  ['automatic', 'автоматический'],
  ['Automatic', 'Автоматический'],
  ['lifter', 'подъёмник'],
  ['type', 'тип'],
  ['capacity', 'ёмкости'],
  ['Supplied', 'В комплекте'],
  ['looper', 'петлитель'],
  ['spreader', 'расширитель'],
  ['Hand lifter', 'Ручной подъёмник'],
  ['Hand', 'Ручной'],
  ['Knee', 'Коленный'],
  ['top feed dog', 'верхняя рейка'],
  ['feed dog', 'зубчатая рейка'],
  ['full-rotary', 'полноповоротный'],
  ['Full-Rotation', 'Полноповоротный'],
  ['semi-rotation', 'полуповоротный'],
  ['Double-size', 'Двойного размера'],
  ['Triple-size', 'Тройного размера'],
  ['Large', 'Увеличенной'],
  ['Dry', 'Сухой'],
  ['Rotary', 'Ротационный'],
  ['bobbin removal', 'извлечение шпульки'],
  ['presser', 'прижимной'],
  ['Intermediate', 'Промежуточный'],
  ['lift', 'подъём'],
  ['frame', 'рама'],
  ['head', 'головка'],
  ['times', 'кратный'],
  ['Equivalent', 'Эквивалент'],
  ['equivalent', 'эквивалент'],
  ['Pneumatic', 'Пневматический'],
  ['solenoid', 'соленоидный'],
  ['Compliant', 'Совместимо'],
  ['can also be used', 'также может использоваться'],
  ['can be used when', 'может использоваться когда'],
  ['at a sewing speed of', 'при скорости шитья'],
  ['less than', 'менее'],
  ['up to', 'до'],
  ['Power consumption', 'Потребляемая мощность'],
  ['Power requirement', 'Требования к питанию'],
  ['Power supply', 'Электропитание'],
  ['Single-', 'Однофазный'],
  ['3 - phase', 'Трёхфазный'],
  ['phase', 'фазный'],
  ['sit/min', 'ст/мин'],
  ['rpm', 'об/мин'],
  ['Needle gauge', 'Межигольное расстояние'],
  ['needle gauge', 'межигольное расстояние'],
  ['Memory', 'Память'],
  [' and ', ' и '],
  ['grease', 'консистентная смазка'],
  ['Needle bar', 'Игловодитель'],
  ['needle bar', 'игловодитель'],
  ['dry head', 'сухая головка'],
  ['Dry head', 'Сухая головка'],
  ['gears', 'шестерни'],
  ['hook', 'челнок'],
  ['the machine', 'машины'],
  ['table', 'стол'],
  ['normal', 'нормал.'],
  ['Rotary double capacity hook', 'Ротационный челнок двойной ёмкости'],
  // IMPORTANT: "without" MUST come BEFORE "with"
  ['without', 'без'],
  ['Without', 'Без'],
  ['with', 'с'],
  // Remaining
  ['Total weight', 'Общий вес'],
  ['Operation panel', 'Панель управления'],
  ['Operation Panel', 'Панель управления'],
  ['Special', 'Специальный'],
  ['special', 'специальный'],
  ['do not require', 'не требуют'],
  ['does not require', 'не требует'],
  ['is not required', 'не требуется'],
  ['not required', 'не требуется'],
  ['set to', 'установлена на'],
  ['when the', 'когда'],
  ['When the', 'Когда'],
  ['when', 'при'],
  ['When', 'При'],
  ['oil wick', 'фитильная'],
  ['knife', 'нож'],
  ['pitch conversion gears', 'шестерни преобразования шага'],
  ['Centralized', 'Централизованный'],
  ['centralized', 'централизованный'],
  ['pcs', 'шт.'],
  ['Main feed', 'Основная подача'],
  ['Differential-feed', 'Дифференциальная подача'],
  ['method', 'метод'],
]

/** Unit regex patterns */
const UNIT_PATTERNS: Array<[RegExp, string]> = [
  [/(\d)mm\b/g, '$1мм'],
  [/(\d)\s+mm\b/g, '$1 мм'],
  [/(\d)kg\b/g, '$1кг'],
  [/(\d)\s+kg\b/g, '$1 кг'],
  [/(\d)Kg\b/g, '$1кг'],
  [/(\d)\s+Kg\b/g, '$1 кг'],
  [/(\d)W\b/g, '$1Вт'],
  [/(\d)\s+W\b/g, '$1 Вт'],
]

/** Subcategory short names for meta_title */
const SUBCAT_SHORT: Record<string, string> = {
  'Одноигольная прямострочная машина (челночный стежок)': 'Прямострочная',
  'Двухигольная прямострочная машина (челночный стежок)': '2-игольная прямострочная',
  'Автоматическая швейная машина': 'Автомат',
  'Пуговичная машина (для пришивания пуговиц)': 'Пуговичная машина',
  'Петельная машина (для изготовления петель)': 'Петельная машина',
  'Плоскошовная (распошивальная) машина': 'Плоскошовная',
  'Двухниточная цепного стежка': 'Цепной стежок',
  'Оверлок / краеобмёточная машина': 'Оверлок',
  'Рукавная машина (с цилиндрической платформой)': 'Рукавная машина',
  'Машина с плоской платформой': 'Плоская платформа',
  'Машина для шитья по шаблону': 'Шаблонная машина',
  'Машина для выполнения строчек по программе': 'Программируемая',
  'Машина для точечной прошивки': 'Точечная прошивка',
  'Машина для установки кнопок': 'Кнопочная машина',
  'Блок управления / мотор / панель': 'Блок управления',
  'Программное обеспечение / системы': 'ПО / системы',
}

// ═══════════════════════════════════════════════════════════════════
// TRANSLATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

/** Translate a spec value from English to Russian using the dictionary */
function translateSpecValue(value: string): string {
  if (!value) return value
  const trimmed = value.trim()

  // 1. Exact match
  if (SPEC_VALUE_EXACT[trimmed]) {
    return SPEC_VALUE_EXACT[trimmed]
  }

  // 2. Fragment replacement
  let result = trimmed
  for (const [en, ru] of SPEC_VALUE_FRAGMENTS) {
    if (result.includes(en)) {
      result = result.split(en).join(ru)
    }
  }

  // 3. Unit patterns
  for (const [regex, replacement] of UNIT_PATTERNS) {
    // Reset regex state (global flag)
    regex.lastIndex = 0
    result = result.replace(regex, replacement)
  }

  return result
}

/** Check if text contains significant English (3+ consecutive ASCII letters) */
function hasEnglish(text: string): boolean {
  return /[a-zA-Z]{3,}/.test(text)
}

/** Check if text is primarily English (>50% ASCII letters) */
function isPrimarilyEnglish(text: string): boolean {
  const latin = (text.match(/[a-zA-Z]/g) || []).length
  const cyrillic = (text.match(/[а-яА-ЯёЁ]/g) || []).length
  return latin > cyrillic && latin > 10
}

/** Extract brand name from product */
function getBrandName(product: PayloadProduct): string {
  if (product.brand && typeof product.brand === 'object') {
    return product.brand.name
  }
  // Fallback: extract from product name
  const match = product.name.match(/^(?:Швейная машина\s+)?(\S+)/)
  return match?.[1] || ''
}

/** Extract category name from product */
function getCategoryName(product: PayloadProduct): string {
  if (product.category && typeof product.category === 'object') {
    return product.category.name
  }
  return ''
}

/** Extract model from SKU */
function getModel(product: PayloadProduct): string {
  // SKU like "JUKI-DDL-9000CF" → "DDL-9000CF"
  // SKU like "DONWEI DW-2516" → "DW-2516"
  const sku = product.sku || ''
  const parts = sku.split('-')
  if (parts.length > 2 && parts[0] === 'JUKI') {
    return parts.slice(1).join('-')
  }
  return sku
}

/** Strip HTML to plain text */
function stripHtml(html: string): string {
  const $ = cheerio.load(html)
  return $.text().replace(/\s+/g, ' ').trim()
}

/** Extract key points from description HTML */
function extractKeyPoints(html: string): string[] {
  if (!html) return []
  const $ = cheerio.load(html)
  const points: string[] = []

  // Get list items
  $('li').each((_, el) => {
    const text = $(el).text().trim()
    if (text.length > 10 && text.length < 300) {
      points.push(text)
    }
  })

  // Get paragraphs if no list items
  if (points.length === 0) {
    $('p').each((_, el) => {
      const text = $(el).text().trim()
      if (text.length > 20 && text.length < 300) {
        points.push(text)
      }
    })
  }

  return points.slice(0, 5)
}

// ═══════════════════════════════════════════════════════════════════
// STEP 2: Translate English FAQ
// ═══════════════════════════════════════════════════════════════════

function fixEnglishFAQ(products: PayloadProduct[]): Array<{ id: number; faq: PayloadProduct['faq'] }> {
  const updates: Array<{ id: number; faq: PayloadProduct['faq'] }> = []

  for (const product of products) {
    if (!product.faq || product.faq.length === 0) continue

    let changed = false
    const fixedFaq: Array<{ question: string; answer: string }> = []

    for (const item of product.faq) {
      let q = item.question
      let a = item.answer

      const qHasEn = hasEnglish(q)
      const aHasEn = hasEnglish(a)

      if (!qHasEn && !aHasEn) {
        fixedFaq.push({ question: q, answer: a })
        continue
      }

      // If entirely English and untranslatable — skip this FAQ item
      if (isPrimarilyEnglish(q) && isPrimarilyEnglish(a)) {
        changed = true
        stats.faqRemoved++
        continue
      }

      // Translate English fragments
      if (qHasEn) {
        q = translateSpecValue(q)
        if (q !== item.question) changed = true
      }
      if (aHasEn) {
        a = translateSpecValue(a)
        if (a !== item.answer) changed = true
      }

      // If answer is still mostly English after translation — skip
      if (isPrimarilyEnglish(a)) {
        changed = true
        stats.faqRemoved++
        continue
      }

      fixedFaq.push({ question: q, answer: a })
      if (q !== item.question || a !== item.answer) {
        stats.faqItemsTranslated++
      }
    }

    if (changed) {
      updates.push({ id: product.id, faq: fixedFaq })
      stats.faqTranslated++
    }
  }

  return updates
}

// ═══════════════════════════════════════════════════════════════════
// STEP 3: Generate FAQ for non-JUKI
// ═══════════════════════════════════════════════════════════════════

function generateNonJukiFAQ(
  products: PayloadProduct[],
  ocMap: Map<string, OCProduct>,
): Array<{ id: number; faq: Array<{ question: string; answer: string }> }> {
  const updates: Array<{ id: number; faq: Array<{ question: string; answer: string }> }> = []

  for (const product of products) {
    // Skip if already has FAQ
    if (product.faq && product.faq.length > 0) continue

    // Skip JUKI products (they get FAQ from juki-rag-project)
    const brand = getBrandName(product)
    if (brand === 'JUKI') continue

    const faq: Array<{ question: string; answer: string }> = []
    const name = product.name
    const sku = product.sku
    const category = getCategoryName(product)
    const ocProduct = ocMap.get(sku)

    // 1. What is this? → shortDescription or first sentence from HTML
    const shortDesc = product.shortDescription || ''
    const htmlDesc = product.descriptionHtml || ''
    let whatIs = shortDesc
    if (!whatIs && htmlDesc) {
      const plainText = stripHtml(htmlDesc)
      // First sentence
      const firstSentence = plainText.match(/^[^.!?]+[.!?]/)
      whatIs = firstSentence ? firstSentence[0] : plainText.slice(0, 200)
    }
    if (whatIs) {
      faq.push({
        question: `Что такое ${name}?`,
        answer: whatIs,
      })
    }

    // 2. Who manufactures? → brand info
    if (brand) {
      faq.push({
        question: `Кто производитель ${name.replace(/^.+?\s/, '')}?`,
        answer: `Производитель — ${brand}. Все товары ${brand} доступны к заказу в SEWTECH с доставкой по Казахстану.`,
      })
    }

    // 3. Specifications → top 5
    const specs = product.specifications || []
    if (specs.length > 0) {
      const top = specs.slice(0, 5)
      const specList = top.map((s) => `${s.name}: ${s.value}${s.unit ? ' ' + s.unit : ''}`).join('; ')
      faq.push({
        question: `Какие характеристики у ${name}?`,
        answer: `Основные характеристики: ${specList}.`,
      })
    }

    // 4. What is it for? → from category
    if (category) {
      faq.push({
        question: `Для чего используется ${name.replace(/^.+?\s/, '')}?`,
        answer: `${name} относится к категории «${category}». Подробные характеристики и применение смотрите в описании товара.`,
      })
    }

    // 5. How to order?
    faq.push({
      question: 'Как заказать?',
      answer: 'Позвоните по номеру +7 (727) 350-52-50 или оставьте заявку на сайте. Доставка по всему Казахстану.',
    })

    // 6. Price
    if (product.price && product.price > 0) {
      const formatted = new Intl.NumberFormat('ru-RU').format(product.price)
      faq.push({
        question: `Сколько стоит ${name}?`,
        answer: `Цена ${name} — ${formatted} тенге. Уточняйте актуальную цену и наличие у менеджера.`,
      })
    } else {
      faq.push({
        question: `Сколько стоит ${name}?`,
        answer: `Цена на ${name} предоставляется по запросу. Свяжитесь с нашим менеджером для уточнения.`,
      })
    }

    if (faq.length > 0) {
      updates.push({ id: product.id, faq })
      stats.faqGenerated++
    }
  }

  return updates
}

// ═══════════════════════════════════════════════════════════════════
// STEP 4: Extract specifications from OpenCart attributes
// ═══════════════════════════════════════════════════════════════════

function extractSpecifications(
  products: PayloadProduct[],
  ocMap: Map<string, OCProduct>,
): Array<{ id: number; specifications: Array<{ name: string; value: string; unit?: string }> }> {
  const updates: Array<{ id: number; specifications: Array<{ name: string; value: string; unit?: string }> }> = []

  for (const product of products) {
    // Skip if already has specs
    if (product.specifications && product.specifications.length > 0) continue

    const sku = product.sku
    const ocProduct = ocMap.get(sku)

    const specs: Array<{ name: string; value: string; unit?: string }> = []

    // Method 1: From OpenCart attributes
    if (ocProduct && ocProduct.attributes.length > 0) {
      for (const attr of ocProduct.attributes) {
        if (!attr.name || !attr.value) continue
        // Extract unit if value ends with known units
        let unit: string | undefined
        const unitMatch = attr.value.match(/\s+(мм|мм²|кг|Вт|В|бар|л|шт|об\/мин|ст\/мин)$/)
        if (unitMatch) {
          unit = unitMatch[1]
        }
        specs.push({ name: attr.name, value: attr.value, ...(unit && { unit }) })
      }
    }

    // Method 2: Parse from descriptionHtml (tables / key-value pairs)
    if (specs.length === 0 && product.descriptionHtml) {
      const $ = cheerio.load(product.descriptionHtml)

      // Try table rows
      $('table tr').each((_, row) => {
        const cells = $(row).find('td, th')
        if (cells.length >= 2) {
          const name = $(cells[0]).text().trim()
          const value = $(cells[1]).text().trim()
          if (name && value && name.length < 100 && value.length < 200) {
            specs.push({ name, value })
          }
        }
      })

      // Try definition lists
      if (specs.length === 0) {
        $('dt').each((_, dt) => {
          const dd = $(dt).next('dd')
          if (dd.length) {
            const name = $(dt).text().trim()
            const value = dd.text().trim()
            if (name && value) {
              specs.push({ name, value })
            }
          }
        })
      }

      // Try pattern "Название: значение" in paragraphs
      if (specs.length === 0) {
        const text = $.text()
        const regex = /([А-ЯЁа-яёA-Za-z][А-ЯЁа-яёA-Za-z\s]{2,30}):\s*([^\n;]{3,100})/g
        let m: RegExpExecArray | null
        while ((m = regex.exec(text)) !== null) {
          specs.push({ name: m[1].trim(), value: m[2].trim() })
        }
      }
    }

    if (specs.length > 0) {
      updates.push({ id: product.id, specifications: specs })
      stats.specsExtracted++
    }
  }

  return updates
}

// ═══════════════════════════════════════════════════════════════════
// STEP 5: Generate SEO meta
// ═══════════════════════════════════════════════════════════════════

function generateSEOMeta(
  products: PayloadProduct[],
  jukiMap: Map<string, JukiProduct>,
  ocMap: Map<string, OCProduct>,
): Array<{ id: number; meta: { title: string; description: string } }> {
  const updates: Array<{ id: number; meta: { title: string; description: string } }> = []

  for (const product of products) {
    // Skip if already has good meta
    const existingMeta = product.meta
    if (
      existingMeta?.title &&
      existingMeta.title.length > 10 &&
      existingMeta?.description &&
      existingMeta.description.length > 10
    ) {
      continue
    }

    const brand = getBrandName(product)
    const sku = product.sku
    const category = getCategoryName(product)
    const name = product.name

    // Check JUKI source for pre-built meta
    const juki = jukiMap.get(sku)
    if (juki?.seo?.meta_title && juki?.seo?.meta_description) {
      updates.push({
        id: product.id,
        meta: {
          title: juki.seo.meta_title.slice(0, 60),
          description: juki.seo.meta_description.slice(0, 155),
        },
      })
      stats.metaUpdated++
      continue
    }

    // Check OpenCart source
    const oc = ocMap.get(sku)
    if (oc?.meta_title && oc.meta_title.length > 10 && oc?.meta_description && oc.meta_description.length > 10) {
      updates.push({
        id: product.id,
        meta: {
          title: oc.meta_title.slice(0, 60),
          description: oc.meta_description.slice(0, 155),
        },
      })
      stats.metaUpdated++
      continue
    }

    // Generate meta_title: "{BRAND} {MODEL} — {shortType} | Купить Алматы"
    const model = getModel(product)
    const shortType = SUBCAT_SHORT[category] || ''

    let metaTitle = ''
    if (brand && shortType) {
      metaTitle = `${brand} ${model} — ${shortType} | Купить Алматы`
    } else if (brand) {
      metaTitle = `${brand} ${model} | Купить Алматы`
    } else {
      metaTitle = `${name} | Купить Алматы`
    }

    // Progressive fallback for length
    if (metaTitle.length > 60) {
      metaTitle = `${brand} ${model} — ${shortType} | Алматы`
    }
    if (metaTitle.length > 60) {
      metaTitle = `${brand} ${model} | Купить Алматы`
    }
    if (metaTitle.length > 60) {
      metaTitle = metaTitle.slice(0, 57) + '...'
    }

    // Generate meta_description
    let desc = product.shortDescription || ''
    if (!desc && product.descriptionHtml) {
      desc = stripHtml(product.descriptionHtml).slice(0, 120)
    }
    if (!desc) {
      desc = name
    }

    let metaDesc = `${name}. ${desc.length > 80 ? desc.slice(0, 80) + '...' : desc} Доставка по Казахстану. Звоните!`
    if (metaDesc.length > 155) {
      metaDesc = `${name}. Доставка по Казахстану. Звоните +7 (727) 350-52-50!`
    }
    if (metaDesc.length > 155) {
      metaDesc = metaDesc.slice(0, 152) + '...'
    }

    updates.push({
      id: product.id,
      meta: { title: metaTitle, description: metaDesc },
    })
    stats.metaUpdated++
  }

  return updates
}

// ═══════════════════════════════════════════════════════════════════
// STEP 6: Clean English fragments in specs
// ═══════════════════════════════════════════════════════════════════

function cleanEnglishSpecs(
  products: PayloadProduct[],
): Array<{ id: number; specifications: Array<{ name: string; value: string; unit?: string }> }> {
  const updates: Array<{ id: number; specifications: Array<{ name: string; value: string; unit?: string }> }> = []

  for (const product of products) {
    if (!product.specifications || product.specifications.length === 0) continue

    let changed = false
    const cleanedSpecs = product.specifications.map((spec) => {
      // Translate value
      if (hasEnglish(spec.value)) {
        const translated = translateSpecValue(spec.value)
        if (translated !== spec.value) {
          changed = true
          stats.specsCleaned++
          return { name: spec.name, value: translated, ...(spec.unit && { unit: spec.unit }) }
        }
      }
      return { name: spec.name, value: spec.value, ...(spec.unit && { unit: spec.unit }) }
    })

    if (changed) {
      updates.push({ id: product.id, specifications: cleanedSpecs })
    }
  }

  return updates
}

// ═══════════════════════════════════════════════════════════════════
// BATCH UPDATE
// ═══════════════════════════════════════════════════════════════════

async function batchUpdate(
  payload: Payload,
  updates: Array<{ id: number; [key: string]: unknown }>,
  label: string,
) {
  let success = 0
  let errors = 0

  for (let i = 0; i < updates.length; i++) {
    const { id, ...data } = updates[i]
    try {
      await payload.update({
        collection: 'products',
        id,
        data: data as any,
      })
      success++
    } catch (err) {
      errors++
      stats.errors++
      console.error(`  Error updating #${id}: ${(err as Error).message?.slice(0, 80)}`)
    }

    if ((i + 1) % 25 === 0 || i === updates.length - 1) {
      console.log(`  [${label}] ${i + 1}/${updates.length} — ${success} ok, ${errors} errors`)
    }
  }

  return { success, errors }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)
  const stepArg = args.find((a) => a.startsWith('--step='))
  const step = stepArg?.split('=')[1] || 'all'

  console.log(`=== SEWTECH Data Quality Fix (step: ${step}) ===\n`)

  const payload = await getPayload({ config })
  console.log('Payload initialized.\n')

  // ── Step 1: Load all products ──────────────────────────────────

  console.log('--- Loading all products from DB ---')
  const allProducts: PayloadProduct[] = []
  let page = 1
  while (true) {
    const batch = await payload.find({
      collection: 'products',
      limit: 100,
      page,
      depth: 1, // Need brand/category names
    })
    allProducts.push(...(batch.docs as any[]))
    if (!batch.hasNextPage) break
    page++
  }
  console.log(`Loaded ${allProducts.length} products from DB\n`)

  // Load OpenCart source data (non-JUKI)
  console.log('--- Loading OpenCart source data ---')
  const ocProducts: OCProduct[] = fs.existsSync(OC_PRODUCTS_JSON)
    ? JSON.parse(fs.readFileSync(OC_PRODUCTS_JSON, 'utf-8'))
    : []
  console.log(`Loaded ${ocProducts.length} OpenCart products`)

  // Build SKU → OCProduct map
  const ocMap = new Map<string, OCProduct>()
  for (const p of ocProducts) {
    const sku = (p.sku || p.model).trim()
    if (sku) ocMap.set(sku, p)
  }

  // Load JUKI source data
  const jukiProducts: JukiProduct[] = fs.existsSync(JUKI_PRODUCTS_JSON)
    ? JSON.parse(fs.readFileSync(JUKI_PRODUCTS_JSON, 'utf-8'))
    : []
  console.log(`Loaded ${jukiProducts.length} JUKI source products\n`)

  // Build SKU → JukiProduct map
  const jukiMap = new Map<string, JukiProduct>()
  for (const p of jukiProducts) {
    if (p.sku) jukiMap.set(p.sku, p)
  }

  // ── Step 2: Fix English FAQ ────────────────────────────────────

  if (step === 'all' || step === 'faq') {
    console.log('--- Step 2: Translating English FAQ ---')
    const faqUpdates = fixEnglishFAQ(allProducts)
    console.log(`Found ${faqUpdates.length} products with English FAQ to fix`)
    if (faqUpdates.length > 0) {
      await batchUpdate(payload, faqUpdates, 'FAQ translate')
    }
    console.log(`  Translated: ${stats.faqItemsTranslated} items, removed: ${stats.faqRemoved} garbage items\n`)

    // Step 3: Generate FAQ for non-JUKI
    console.log('--- Step 3: Generating FAQ for non-JUKI products ---')
    const genFaqUpdates = generateNonJukiFAQ(allProducts, ocMap)
    console.log(`Generated FAQ for ${genFaqUpdates.length} products`)
    if (genFaqUpdates.length > 0) {
      await batchUpdate(payload, genFaqUpdates, 'FAQ generate')
    }
    console.log()
  }

  // ── Step 4: Extract specs ──────────────────────────────────────

  if (step === 'all' || step === 'specs') {
    console.log('--- Step 4: Extracting specifications ---')
    const specUpdates = extractSpecifications(allProducts, ocMap)
    console.log(`Found ${specUpdates.length} products needing specs`)
    if (specUpdates.length > 0) {
      await batchUpdate(payload, specUpdates, 'Specs extract')
    }
    console.log()
  }

  // ── Step 5: Generate SEO meta ──────────────────────────────────

  if (step === 'all' || step === 'meta') {
    console.log('--- Step 5: Generating SEO meta ---')
    const metaUpdates = generateSEOMeta(allProducts, jukiMap, ocMap)
    console.log(`Found ${metaUpdates.length} products needing meta`)
    if (metaUpdates.length > 0) {
      await batchUpdate(payload, metaUpdates, 'SEO meta')
    }
    console.log()
  }

  // ── Step 6: Clean English specs ────────────────────────────────

  if (step === 'all' || step === 'clean') {
    console.log('--- Step 6: Cleaning English spec values ---')
    // Re-load products to get latest specs (in case step 4 added new ones)
    let freshProducts: PayloadProduct[]
    if (step === 'all') {
      // In "all" mode, specs may have been updated but our allProducts is stale.
      // Reload from DB.
      freshProducts = []
      let p = 1
      while (true) {
        const batch = await payload.find({
          collection: 'products',
          limit: 100,
          page: p,
          depth: 0,
        })
        freshProducts.push(...(batch.docs as any[]))
        if (!batch.hasNextPage) break
        p++
      }
    } else {
      freshProducts = allProducts
    }

    const cleanUpdates = cleanEnglishSpecs(freshProducts)
    console.log(`Found ${cleanUpdates.length} products with English specs to clean`)
    if (cleanUpdates.length > 0) {
      await batchUpdate(payload, cleanUpdates, 'Specs clean')
    }
    console.log()
  }

  // ── Summary ────────────────────────────────────────────────────

  console.log('=== Data Quality Fix Complete ===')
  console.log(`FAQ translated:    ${stats.faqTranslated} products (${stats.faqItemsTranslated} items)`)
  console.log(`FAQ removed:       ${stats.faqRemoved} garbage items`)
  console.log(`FAQ generated:     ${stats.faqGenerated} non-JUKI products`)
  console.log(`Specs extracted:   ${stats.specsExtracted} products`)
  console.log(`Meta updated:      ${stats.metaUpdated} products`)
  console.log(`Specs cleaned:     ${stats.specsCleaned} values`)
  console.log(`Errors:            ${stats.errors}`)

  process.exit(0)
}

main().catch((err) => {
  console.error('Fix failed:', err)
  process.exit(1)
})
