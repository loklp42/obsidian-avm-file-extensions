export type Language = 'ru' | 'en';

export interface TranslationDict {
	headerTitle: string;
	headerDesc: string;
	btnEnableAll: string;
	btnDisableAll: string;
	noticeAllEnabled: string;
	noticeAllDisabled: string;
	langSelectLabel: string;
	
	// SVG Studio
	svgHeading: string;
	svgEnabledName: string;
	svgEnabledDesc: string;
	svgBgName: string;
	svgBgDesc: string;
	svgBgGrid: string;
	svgBgChecker: string;
	svgBgDark: string;
	svgBgLight: string;
	svgBgTransparent: string;
	svgScrollName: string;
	svgScrollDesc: string;
	svgScrollPan: string;
	svgScrollZoom: string;
	svgCoordsName: string;
	svgCoordsDesc: string;
	svgSyntaxName: string;
	svgSyntaxDesc: string;
	svgFitName: string;
	svgFitDesc: string;
	svgAutoSaveName: string;
	svgAutoSaveDesc: string;
	svgExportScaleName: string;
	svgExportScaleDesc: string;
	svgExportScale1: string;
	svgExportScale2: string;
	svgExportScale3: string;
	svgExportScale4: string;

	// Code Editor
	codeHeading: string;
	syntaxHighlightName: string;
	syntaxHighlightDesc: string;
	lineNumbersName: string;
	lineNumbersDesc: string;
	inheritTabName: string;
	inheritTabDesc: string;
	customTabName: string;
	customTabDesc: string;
	tabSpaces2: string;
	tabSpaces4: string;
	tabSpaces8: string;

	// Categories
	catHeading: string;
	catWebTitle: string;
	catWebDesc: string;
	catConfigsTitle: string;
	catConfigsDesc: string;
	catProgTitle: string;
	catProgDesc: string;
	catDocsTitle: string;
	catDocsDesc: string;
	tooltipToggleCat: string;

	// Custom
	customHeading: string;
	customCardTitle: string;
	customCardDesc: string;
	customInputPlaceholder: string;
	btnAdd: string;
	customEmpty: string;
	noticeAdded: string;

	// Reset
	resetHeading: string;
	resetName: string;
	resetDesc: string;
	btnReset: string;
	noticeReset: string;

	donateHeading: string;
	donateTitle: string;
	donateDesc: string;
	donateBtn: string;
}

export const TRANSLATIONS: Record<Language, TranslationDict> = {
	ru: {
		headerTitle: 'AVM File Extensions',
		headerDesc: 'Управление поддержкой внешних кодовых расширений, файлов конфигураций и векторной графики в стиле экосистемы Ave Maria.',
		btnEnableAll: 'Включить все категории',
		btnDisableAll: 'Отключить все',
		noticeAllEnabled: 'Включены все стандартные расширения',
		noticeAllDisabled: 'Все расширения отключены',
		langSelectLabel: 'Язык:',

		svgHeading: 'Векторная графика (SVG Studio)',
		svgEnabledName: 'Интерактивная векторная студия SVG',
		svgEnabledDesc: 'Открывать векторные файлы .svg в интерактивном холсте с бесконечным зумом без потери резкости, просмотром исходного кода и экспортом в PNG.',
		svgBgName: 'Фоновая подложка холста',
		svgBgDesc: 'Визуальный фон рабочей области под векторным изображением.',
		svgBgGrid: 'Точечная сетка (Grid)',
		svgBgChecker: 'Шахматка прозрачности',
		svgBgDark: 'Тёмный монохром',
		svgBgLight: 'Светлый монохром',
		svgBgTransparent: 'Системная тема',
		svgScrollName: 'Действие колесика мыши',
		svgScrollDesc: '«Панорамирование» — колесо перемещает холст (зум через Ctrl+колесо). «Масштабирование» — колесо сразу масштабирует вектор под курсором.',
		svgScrollPan: 'Панорамирование (Скролл холста)',
		svgScrollZoom: 'Масштабирование (Мгновенный зум)',
		svgCoordsName: 'Отображение координат курсора',
		svgCoordsDesc: 'Выводить точные координаты X, Y относительно viewBox изображения в тулбаре.',
		svgSyntaxName: 'Подсветка синтаксиса в панели кода',
		svgSyntaxDesc: 'Цветовая раскраска тегов, атрибутов и значений в редакторе разметки SVG.',
		svgFitName: 'Автоматическая центровка при открытии',
		svgFitDesc: 'Подгонять масштаб и центрировать изображение по размеру рабочей области при открытии файла.',
		svgAutoSaveName: 'Автосохранение исходного кода',
		svgAutoSaveDesc: 'Мгновенно сохранять изменения в файл при редактировании разметки в сплит-панели.',
		svgExportScaleName: 'Разрешение при экспорте в PNG',
		svgExportScaleDesc: 'Множитель плотности растрирования для сохранения четких PNG-изображений.',
		svgExportScale1: '1× (Стандартное разрешение)',
		svgExportScale2: '2× (Чёткое @2x)',
		svgExportScale3: '3× (Высокое @3x)',
		svgExportScale4: '4× (Ultra HD / Retina @4x)',

		codeHeading: 'Настройки редактора кода',
		syntaxHighlightName: 'Подсветка синтаксиса',
		syntaxHighlightDesc: 'Включить интеллектуальную подсветку синтаксиса на базе CodeMirror 6 для кодовых файлов.',
		lineNumbersName: 'Принудительные номера строк',
		lineNumbersDesc: 'Всегда отображать нумерацию строк в кодовых файлах (если выключено, используется глобальный параметр Obsidian).',
		inheritTabName: 'Наследовать табуляцию Obsidian',
		inheritTabDesc: 'Использовать глобальный размер отступа и табуляции из настроек Obsidian (раздел «Редактор»).',
		customTabName: 'Пользовательский размер табуляции',
		customTabDesc: 'Количество пробелов на один уровень отступа в кодовых файлах.',
		tabSpaces2: '2 пробела',
		tabSpaces4: '4 пробела',
		tabSpaces8: '8 пробелов',

		catHeading: 'Категории форматов файлов',
		catWebTitle: 'Веб и фронтенд',
		catWebDesc: 'Скрипты JavaScript/TypeScript, стили CSS/SCSS, разметка HTML и компоненты',
		catConfigsTitle: 'Конфигурации и структуры данных',
		catConfigsDesc: 'Форматы структурированных данных JSON/YAML/TOML, конфигурационные файлы и базы данных',
		catProgTitle: 'Языки программирования',
		catProgDesc: 'Исходный код компилируемых и скриптовых языков, системные скрипты и Dockerfile',
		catDocsTitle: 'Текстовые документы и логи',
		catDocsDesc: 'Простой неформатированный текст, системные логи, табличные данные CSV и TSV',
		tooltipToggleCat: 'Переключить категорию',

		customHeading: 'Дополнительные форматы',
		customCardTitle: 'Собственные расширения',
		customCardDesc: 'Добавьте любые нестандартные форматы (например: zig, nim, prisma, astro). Для известных языков включится подсветка, остальные откроются в безопасном текстовом режиме.',
		customInputPlaceholder: 'Введите расширение (например: zig, nim, proto)',
		btnAdd: 'Добавить',
		customEmpty: 'Нет добавленных форматов. Введите расширение выше и нажмите «Добавить».',
		noticeAdded: 'Добавлено форматов:',

		resetHeading: 'Сброс параметров',
		resetName: 'Сброс параметров',
		resetDesc: 'Восстановить заводской набор экосистемы (все категории включены).',
		btnReset: 'Сбросить всё к дефолту',
		noticeReset: 'Настройки AVM File Extensions сброшены',

		donateHeading: 'Поддержка проекта',
		donateTitle: 'Поддержать разработку экосистемы Ave Maria',
		donateDesc: 'Если вам нравятся наши плагины и вы хотите поддержать развитие открытых инструментов для Obsidian — вы можете отправить донат автору.',
		donateBtn: 'Поддержать через DonationAlerts',
	},
	en: {
		headerTitle: 'AVM File Extensions',
		headerDesc: 'Manage syntax support for external code files, configurations, and vector graphics in Ave Maria ecosystem style.',
		btnEnableAll: 'Enable all categories',
		btnDisableAll: 'Disable all',
		noticeAllEnabled: 'All default extensions enabled',
		noticeAllDisabled: 'All extensions disabled',
		langSelectLabel: 'Language:',

		svgHeading: 'Vector Graphics (SVG Studio)',
		svgEnabledName: 'Interactive SVG Vector Studio',
		svgEnabledDesc: 'Open .svg vector files in an interactive canvas with pixel-free zoom, live code panel, and PNG export.',
		svgBgName: 'Default canvas background',
		svgBgDesc: 'Visual backdrop behind the vector graphics.',
		svgBgGrid: 'Dot grid',
		svgBgChecker: 'Checkerboard',
		svgBgDark: 'Solid dark',
		svgBgLight: 'Solid light',
		svgBgTransparent: 'Theme default',
		svgScrollName: 'Mouse wheel / Trackpad action',
		svgScrollDesc: '«Pan» moves the canvas (zoom with Ctrl+wheel). «Zoom» magnifies the vector directly under the cursor.',
		svgScrollPan: 'Pan (Canvas scroll)',
		svgScrollZoom: 'Zoom (Instant mouse wheel zoom)',
		svgCoordsName: 'Show cursor coordinates',
		svgCoordsDesc: 'Display live X, Y coordinates relative to viewBox in the toolbar.',
		svgSyntaxName: 'Syntax highlighting in code panel',
		svgSyntaxDesc: 'Colorized markup highlighting for tags, attributes, and values in SVG editor.',
		svgFitName: 'Fit on open',
		svgFitDesc: 'Automatically scale and center the SVG to viewport when opening a file.',
		svgAutoSaveName: 'Auto-save source code',
		svgAutoSaveDesc: 'Instantly save file changes when editing XML in the split code panel.',
		svgExportScaleName: 'PNG export resolution',
		svgExportScaleDesc: 'Pixel density multiplier for raster PNG export.',
		svgExportScale1: '1× (Standard resolution)',
		svgExportScale2: '2× (Sharp @2x)',
		svgExportScale3: '3× (High @3x)',
		svgExportScale4: '4× (Ultra HD / Retina @4x)',

		codeHeading: 'Code Editor Settings',
		syntaxHighlightName: 'Syntax highlighting',
		syntaxHighlightDesc: 'Enable intelligent CodeMirror 6 syntax highlighting for code files.',
		lineNumbersName: 'Force line numbers',
		lineNumbersDesc: 'Always display line numbers in code files (if disabled, Obsidian global setting is used).',
		inheritTabName: 'Inherit Obsidian tab size',
		inheritTabDesc: 'Use global tab and indent size from Obsidian settings (Editor section).',
		customTabName: 'Custom tab size',
		customTabDesc: 'Number of spaces per indent level in code files.',
		tabSpaces2: '2 spaces',
		tabSpaces4: '4 spaces',
		tabSpaces8: '8 spaces',

		catHeading: 'File Format Categories',
		catWebTitle: 'Web & Frontend',
		catWebDesc: 'JavaScript/TypeScript scripts, CSS/SCSS styling, HTML markup, and components',
		catConfigsTitle: 'Configs & Data Structures',
		catConfigsDesc: 'Structured data formats (JSON/YAML/TOML), config files, and database queries',
		catProgTitle: 'Programming Languages',
		catProgDesc: 'Compiled & scripting language sources, system scripts, and Dockerfile',
		catDocsTitle: 'Text Documents & Logs',
		catDocsDesc: 'Plain unformatted text, system logs, CSV, and TSV tabular data',
		tooltipToggleCat: 'Toggle category',

		customHeading: 'Additional Formats',
		customCardTitle: 'Custom Extensions',
		customCardDesc: 'Add any custom format (e.g. zig, nim, prisma, astro). Known languages get syntax highlighting, others open safely in plain text mode.',
		customInputPlaceholder: 'Enter extension (e.g. zig, nim, proto)',
		btnAdd: 'Add',
		customEmpty: 'No custom extensions added. Type an extension above and press "Add".',
		noticeAdded: 'Extensions added:',

		resetHeading: 'Reset Settings',
		resetName: 'Reset settings',
		resetDesc: 'Restore factory ecosystem defaults (all categories enabled).',
		btnReset: 'Reset all to default',
		noticeReset: 'AVM File Extensions settings reset',

		donateHeading: 'Support the Project',
		donateTitle: 'Support Ave Maria Ecosystem Development',
		donateDesc: 'If you enjoy our plugins and want to support the development of modern open-source Obsidian tools, consider sending a donation.',
		donateBtn: 'Support via DonationAlerts',
	}
};
