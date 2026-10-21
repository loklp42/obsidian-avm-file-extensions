import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';
import { AvmCodeView, AVM_CODE_VIEW_TYPE } from './view';
import { SvgSuiteView, VIEW_TYPE_SVG } from './svg-view';
import { Language, TRANSLATIONS, TranslationDict } from './i18n';
import { renderHeroBanner, renderDonateBanner, createSectionHeading, AVM_ICONS } from './ui-components';

export interface ExtensionCategory {
	id: string;
	title: string;
	desc: string;
	icon: string;
	extensions: string[];
}

export const EXTENSION_CATEGORIES: ExtensionCategory[] = [
	{
		id: 'web',
		title: 'Веб и фронтенд',
		desc: 'Скрипты JavaScript/TypeScript, стили CSS/SCSS, разметка HTML и компоненты',
		icon: 'code-xml',
		extensions: ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'jsx', 'tsx', 'css', 'scss', 'sass', 'less', 'html', 'htm', 'xml', 'svelte', 'vue']
	},
	{
		id: 'configs',
		title: 'Конфигурации и структуры данных',
		desc: 'Форматы структурированных данных JSON/YAML/TOML, конфигурационные файлы и базы данных',
		icon: 'database',
		extensions: ['json', 'jsonc', 'json5', 'yaml', 'yml', 'toml', 'ini', 'conf', 'cfg', 'env', 'sql', 'graphql', 'gql']
	},
	{
		id: 'programming',
		title: 'Языки программирования',
		desc: 'Исходный код компилируемых и скриптовых языков, системные скрипты и Dockerfile',
		icon: 'terminal',
		extensions: ['py', 'pyw', 'go', 'rs', 'c', 'h', 'cpp', 'hpp', 'cs', 'java', 'kt', 'kts', 'swift', 'rb', 'php', 'lua', 'sh', 'bash', 'zsh', 'ps1', 'dockerfile']
	},
	{
		id: 'docs',
		title: 'Текстовые документы и логи',
		desc: 'Простой неформатированный текст, системные логи, табличные данные CSV и TSV',
		icon: 'file-text',
		extensions: ['txt', 'text', 'log', 'rtf', 'csv', 'tsv']
	}
];

export interface SvgStudioSettings {
	background: 'grid' | 'checkerboard' | 'dark' | 'light' | 'transparent';
	scrollMode: 'pan' | 'zoom';
	showCoordinates: boolean;
	syntaxHighlight: boolean;
	fitOnOpen: boolean;
	autoSave: boolean;
	exportScale: number;
}

export interface AvmFileExtensionsSettings {
	language: Language;
	extensions: string[];
	customExtensions: string[];
	svgSuiteEnabled: boolean;
	svgStudio: SvgStudioSettings;
	syntaxHighlight: boolean;
	showLineNumbers: boolean;
	highlightActiveLine: boolean;
	useNativeTabSize: boolean;
	tabSize: number;
}

const ALL_DEFAULT_EXTENSIONS = EXTENSION_CATEGORIES.flatMap(c => c.extensions);

const DEFAULT_SETTINGS: AvmFileExtensionsSettings = {
	language: 'ru',
	extensions: ALL_DEFAULT_EXTENSIONS,
	customExtensions: [],
	svgSuiteEnabled: true,
	svgStudio: {
		background: 'grid',
		scrollMode: 'pan',
		showCoordinates: true,
		syntaxHighlight: true,
		fitOnOpen: true,
		autoSave: true,
		exportScale: 2,
	},
	syntaxHighlight: true,
	showLineNumbers: false,
	highlightActiveLine: false,
	useNativeTabSize: true,
	tabSize: 4,
};

export default class AvmFileExtensionsPlugin extends Plugin {
	settings: AvmFileExtensionsSettings = DEFAULT_SETTINGS;
	private registeredExtensions: string[] = [];

	async onload() {
		await this.loadSettings();

		this.registerView(
			AVM_CODE_VIEW_TYPE,
			(leaf) => new AvmCodeView(leaf, this)
		);

		this.registerView(
			VIEW_TYPE_SVG,
			(leaf) => new SvgSuiteView(leaf, this)
		);

		this.applyExtensions();
		this.addSettingTab(new AvmFileExtensionsSettingTab(this.app, this));

		const vaultAny = this.app.vault as unknown as { on?: (event: string, callback: () => void) => void };
		if (typeof vaultAny.on === 'function') {
			try {
				this.registerEvent(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					(this.app.vault as any).on('config-changed', () => {
						this.syncCodeOptions();
					})
				);
			} catch {
				// fallback
			}
		}

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (file instanceof TFile) {
					if (file.extension === 'svg' && this.settings.svgSuiteEnabled) {
						menu.addItem(item => {
							item
								.setTitle('Открыть в AVM SVG Suite')
								.setIcon('image')
								.onClick(async () => {
									const leaf = this.app.workspace.getLeaf(false);
									await leaf.setViewState({ type: VIEW_TYPE_SVG, state: { file: file.path } });
								});
						});
					} else if (this.isCustomExtension(file.extension)) {
						menu.addItem(item => {
							item
								.setTitle('Открыть в AVM Code Editor')
								.setIcon('file-code')
								.onClick(async () => {
									const leaf = this.app.workspace.getLeaf(false);
									await leaf.openFile(file);
								});
						});
					}
				}
			})
		);
	}

	onunload() {
		this.cleanupExtensions();
	}

	isNativeLineNumbersEnabled(): boolean {
		if (this.settings.showLineNumbers) return true;
		const vault = this.app.vault as unknown as { getConfig?: (key: string) => unknown };
		if (vault && typeof vault.getConfig === 'function') {
			return Boolean(vault.getConfig('showLineNumber'));
		}
		return false;
	}

	getEffectiveTabSize(): number {
		if (this.settings.useNativeTabSize) {
			const vault = this.app.vault as unknown as { getConfig?: (key: string) => unknown };
			if (vault && typeof vault.getConfig === 'function') {
				const native = Number(vault.getConfig('tabSize'));
				if (!isNaN(native) && native > 0) return native;
			}
		}
		return this.settings.tabSize || 4;
	}

	syncCodeOptions() {
		for (const leaf of this.app.workspace.getLeavesOfType(AVM_CODE_VIEW_TYPE)) {
			if (leaf.view instanceof AvmCodeView) {
				leaf.view.reconfigureOptions();
			}
		}
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_SVG)) {
			if (leaf.view instanceof SvgSuiteView) {
				leaf.view.applySettings();
			}
		}
	}

	isCustomExtension(ext: string): boolean {
		const clean = (ext || '').toLowerCase();
		return this.registeredExtensions.includes(clean);
	}

	async loadSettings() {
		const data = await this.loadData();
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data);
		if (data && data.language && (data.language === 'ru' || data.language === 'en')) {
			this.settings.language = data.language;
		} else {
			this.settings.language = 'ru';
		}
		if (data && data.svgStudio) {
			this.settings.svgStudio = Object.assign({}, DEFAULT_SETTINGS.svgStudio, data.svgStudio);
		} else {
			this.settings.svgStudio = Object.assign({}, DEFAULT_SETTINGS.svgStudio);
		}
		if (!Array.isArray(this.settings.extensions)) {
			this.settings.extensions = ALL_DEFAULT_EXTENSIONS;
		}
		if (!Array.isArray(this.settings.customExtensions)) {
			this.settings.customExtensions = [];
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.syncCodeOptions();
	}

	applyExtensions() {
		this.cleanupExtensions();

		const allExts = [
			...this.settings.extensions,
			...this.settings.customExtensions
		];

		const uniqueExts = Array.from(
			new Set(
				allExts
					.map(ext => ext.trim().toLowerCase().replace(/^\./, ''))
					.filter(ext => ext.length > 0 && ext !== 'md' && ext !== 'svg')
			)
		);

		const viewRegistry = (this.app as unknown as {
			viewRegistry?: {
				registerExtensions?: (exts: string[], view: string) => void;
				unregisterExtensions?: (exts: string[]) => void;
			};
		}).viewRegistry;

		for (const ext of uniqueExts) {
			try {
				this.registerExtensions([ext], AVM_CODE_VIEW_TYPE);
				this.registeredExtensions.push(ext);
			} catch {
				try {
					if (viewRegistry && typeof viewRegistry.registerExtensions === 'function') {
						viewRegistry.registerExtensions([ext], AVM_CODE_VIEW_TYPE);
						this.registeredExtensions.push(ext);
					}
				} catch (subErr) {
					console.warn(`[AVM File Extensions] Не удалось зарегистрировать .${ext}:`, subErr);
				}
			}
		}

		if (this.settings.svgSuiteEnabled) {
			try {
				if (viewRegistry && typeof viewRegistry.unregisterExtensions === 'function') {
					viewRegistry.unregisterExtensions(['svg']);
				}
				this.registerExtensions(['svg'], VIEW_TYPE_SVG);
				this.registeredExtensions.push('svg');
			} catch (err) {
				console.warn('[AVM File Extensions] Ошибка регистрации SVG Suite:', err);
			}
		}
	}

	cleanupExtensions() {
		if (this.registeredExtensions.length === 0) return;

		const viewRegistry = (this.app as unknown as {
			viewRegistry?: {
				unregisterExtensions?: (exts: string[]) => void;
			};
		}).viewRegistry;

		if (viewRegistry && typeof viewRegistry.unregisterExtensions === 'function') {
			try {
				viewRegistry.unregisterExtensions(this.registeredExtensions);
			} catch (err) {
				console.warn('[AVM File Extensions] Ошибка при очистке расширений:', err);
			}
		}
		this.registeredExtensions = [];
	}
}

class AvmFileExtensionsSettingTab extends PluginSettingTab {
	plugin: AvmFileExtensionsPlugin;

	constructor(app: App, plugin: AvmFileExtensionsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass('avm-settings-container');

		const lang = this.plugin.settings.language || 'ru';
		const t = TRANSLATIONS[lang] || TRANSLATIONS.ru;

		// Hero Banner
		renderHeroBanner(containerEl, {
			title: t.headerTitle,
			badge: 'Code & SVG',
			desc: t.headerDesc,
			iconSvg: AVM_ICONS.code
		});

		// Quick actions and language selector row
		const actionsRow = containerEl.createDiv({ cls: 'avm-set-actions' });
		
		const actionsLeft = actionsRow.createDiv({ cls: 'avm-actions-left' });
		const enableAllBtn = actionsLeft.createEl('button', {
			cls: 'avm-action-btn avm-action-btn--cta',
			text: t.btnEnableAll
		});
		enableAllBtn.onclick = async () => {
			this.plugin.settings.extensions = [...ALL_DEFAULT_EXTENSIONS];
			await this.plugin.saveSettings();
			this.plugin.applyExtensions();
			this.display();
			new Notice(`${t.noticeAllEnabled} (${ALL_DEFAULT_EXTENSIONS.length})`);
		};

		const disableAllBtn = actionsLeft.createEl('button', {
			cls: 'avm-action-btn',
			text: t.btnDisableAll
		});
		disableAllBtn.onclick = async () => {
			this.plugin.settings.extensions = [];
			await this.plugin.saveSettings();
			this.plugin.applyExtensions();
			this.display();
			new Notice(t.noticeAllDisabled);
		};

		const actionsRight = actionsRow.createDiv({ cls: 'avm-actions-right' });
		actionsRight.createSpan({ cls: 'avm-lang-label', text: t.langSelectLabel });
		const langSelect = actionsRight.createEl('select', { cls: 'avm-lang-select dropdown' });
		langSelect.createEl('option', { value: 'ru', text: 'Русский' });
		langSelect.createEl('option', { value: 'en', text: 'English' });
		langSelect.value = lang;
		langSelect.onchange = async () => {
			const selected = langSelect.value as Language;
			this.plugin.settings.language = selected;
			await this.plugin.saveSettings();
			this.display();
		};

		// ── Section 1: SVG Studio ─────────────────────────
		createSectionHeading(containerEl, t.svgHeading, AVM_ICONS.fileImage);

		new Setting(containerEl)
			.setName(t.svgEnabledName)
			.setDesc(t.svgEnabledDesc)
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.svgSuiteEnabled)
					.onChange(async value => {
						this.plugin.settings.svgSuiteEnabled = value;
						await this.plugin.saveSettings();
						this.plugin.applyExtensions();
						this.display();
					});
			});

		if (this.plugin.settings.svgSuiteEnabled) {
			new Setting(containerEl)
				.setName(t.svgBgName)
				.setDesc(t.svgBgDesc)
				.addDropdown(drop => {
					drop
						.addOption('grid', t.svgBgGrid)
						.addOption('checkerboard', t.svgBgChecker)
						.addOption('dark', t.svgBgDark)
						.addOption('light', t.svgBgLight)
						.addOption('transparent', t.svgBgTransparent)
						.setValue(this.plugin.settings.svgStudio.background)
						.onChange(async (value: string) => {
							this.plugin.settings.svgStudio.background = value as 'grid' | 'checkerboard' | 'dark' | 'light' | 'transparent';
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName(t.svgScrollName)
				.setDesc(t.svgScrollDesc)
				.addDropdown(drop => {
					drop
						.addOption('pan', t.svgScrollPan)
						.addOption('zoom', t.svgScrollZoom)
						.setValue(this.plugin.settings.svgStudio.scrollMode)
						.onChange(async (value: string) => {
							this.plugin.settings.svgStudio.scrollMode = value as 'pan' | 'zoom';
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName(t.svgCoordsName)
				.setDesc(t.svgCoordsDesc)
				.addToggle(toggle => {
					toggle
						.setValue(this.plugin.settings.svgStudio.showCoordinates)
						.onChange(async value => {
							this.plugin.settings.svgStudio.showCoordinates = value;
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName(t.svgSyntaxName)
				.setDesc(t.svgSyntaxDesc)
				.addToggle(toggle => {
					toggle
						.setValue(this.plugin.settings.svgStudio.syntaxHighlight)
						.onChange(async value => {
							this.plugin.settings.svgStudio.syntaxHighlight = value;
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName(t.svgFitName)
				.setDesc(t.svgFitDesc)
				.addToggle(toggle => {
					toggle
						.setValue(this.plugin.settings.svgStudio.fitOnOpen)
						.onChange(async value => {
							this.plugin.settings.svgStudio.fitOnOpen = value;
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName(t.svgAutoSaveName)
				.setDesc(t.svgAutoSaveDesc)
				.addToggle(toggle => {
					toggle
						.setValue(this.plugin.settings.svgStudio.autoSave)
						.onChange(async value => {
							this.plugin.settings.svgStudio.autoSave = value;
							await this.plugin.saveSettings();
						});
				});

			new Setting(containerEl)
				.setName(t.svgExportScaleName)
				.setDesc(t.svgExportScaleDesc)
				.addDropdown(drop => {
					drop
						.addOption('1', t.svgExportScale1)
						.addOption('2', t.svgExportScale2)
						.addOption('3', t.svgExportScale3)
						.addOption('4', t.svgExportScale4)
						.setValue(String(this.plugin.settings.svgStudio.exportScale))
						.onChange(async value => {
							this.plugin.settings.svgStudio.exportScale = parseInt(value, 10) || 2;
							await this.plugin.saveSettings();
						});
				});
		}

		// ── Section 2: Editor Experience ──────────────────
		createSectionHeading(containerEl, t.codeHeading, AVM_ICONS.code);

		new Setting(containerEl)
			.setName(t.syntaxHighlightName)
			.setDesc(t.syntaxHighlightDesc)
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.syntaxHighlight)
					.onChange(async value => {
						this.plugin.settings.syntaxHighlight = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(t.lineNumbersName)
			.setDesc(t.lineNumbersDesc)
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.showLineNumbers)
					.onChange(async value => {
						this.plugin.settings.showLineNumbers = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName(t.inheritTabName)
			.setDesc(t.inheritTabDesc)
			.addToggle(toggle => {
				toggle
					.setValue(this.plugin.settings.useNativeTabSize)
					.onChange(async value => {
						this.plugin.settings.useNativeTabSize = value;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		if (!this.plugin.settings.useNativeTabSize) {
			new Setting(containerEl)
				.setName(t.customTabName)
				.setDesc(t.customTabDesc)
				.addDropdown(drop => {
					drop
						.addOption('2', t.tabSpaces2)
						.addOption('4', t.tabSpaces4)
						.addOption('8', t.tabSpaces8)
						.setValue(String(this.plugin.settings.tabSize))
						.onChange(async value => {
							this.plugin.settings.tabSize = parseInt(value, 10) || 4;
							await this.plugin.saveSettings();
						});
				});
		}

		// ── Section 3: Categories & Extensions ────────────
		createSectionHeading(containerEl, t.catHeading, AVM_ICONS.sliders);

		const activeSet = new Set(this.plugin.settings.extensions.map(e => e.toLowerCase()));

		const getCatLocalized = (catId: string) => {
			switch (catId) {
				case 'web': return { title: t.catWebTitle, desc: t.catWebDesc };
				case 'configs': return { title: t.catConfigsTitle, desc: t.catConfigsDesc };
				case 'programming': return { title: t.catProgTitle, desc: t.catProgDesc };
				case 'docs': return { title: t.catDocsTitle, desc: t.catDocsDesc };
				default: return { title: '', desc: '' };
			}
		};

		for (const cat of EXTENSION_CATEGORIES) {
			const loc = getCatLocalized(cat.id);
			const enabledInCat = cat.extensions.filter(ext => activeSet.has(ext)).length;
			const isAllEnabled = enabledInCat === cat.extensions.length;

			const card = containerEl.createDiv({ cls: 'avm-cat-card' });

			const head = card.createDiv({ cls: 'avm-cat-header' });
			const info = head.createDiv({ cls: 'avm-cat-info' });
			const titleSpan = info.createSpan({ cls: 'avm-cat-title', text: `${loc.title} (${enabledInCat}/${cat.extensions.length})` });
			info.createSpan({ cls: 'avm-cat-desc', text: loc.desc });

			const switchWrap = head.createDiv({ cls: 'avm-cat-switch-wrap' });
			const toggleEl = switchWrap.createDiv({
				cls: `checkbox-container ${isAllEnabled ? 'is-enabled' : ''}`,
				attr: {
					'role': 'switch',
					'aria-checked': String(isAllEnabled),
					'aria-label': t.tooltipToggleCat
				}
			});
			toggleEl.createEl('input', { type: 'checkbox', attr: isAllEnabled ? { checked: 'true' } : {} });

			const updateCardUI = () => {
				const currentEnabled = cat.extensions.filter(ext => activeSet.has(ext)).length;
				const currentAll = currentEnabled === cat.extensions.length;
				titleSpan.textContent = `${loc.title} (${currentEnabled}/${cat.extensions.length})`;
				toggleEl.classList.toggle('is-enabled', currentAll);
				toggleEl.setAttribute('aria-checked', String(currentAll));

				pillsWrap.querySelectorAll<HTMLButtonElement>('.avm-ext-pill').forEach(btn => {
					const ext = btn.dataset.ext || '';
					const active = activeSet.has(ext);
					btn.classList.toggle('avm-ext-pill--active', active);
				});
			};

			toggleEl.onclick = async (e) => {
				e.preventDefault();
				e.stopPropagation();
				const currentEnabled = cat.extensions.filter(ext => activeSet.has(ext)).length;
				const currentAll = currentEnabled === cat.extensions.length;
				const turnOn = !currentAll;

				if (turnOn) {
					for (const ext of cat.extensions) activeSet.add(ext);
				} else {
					for (const ext of cat.extensions) activeSet.delete(ext);
				}

				this.plugin.settings.extensions = Array.from(activeSet);
				updateCardUI();
				await this.plugin.saveSettings();
				this.plugin.applyExtensions();
			};

			const pillsWrap = card.createDiv({ cls: 'avm-ext-pills-wrap' });
			for (const ext of cat.extensions) {
				const isExtActive = activeSet.has(ext);
				const pill = pillsWrap.createEl('button', {
					cls: `avm-ext-pill ${isExtActive ? 'avm-ext-pill--active' : ''}`,
					text: `.${ext}`,
					attr: { 'data-ext': ext, 'type': 'button' }
				});
				pill.onclick = async (e) => {
					e.preventDefault();
					e.stopPropagation();
					if (activeSet.has(ext)) {
						activeSet.delete(ext);
					} else {
						activeSet.add(ext);
					}
					this.plugin.settings.extensions = Array.from(activeSet);
					updateCardUI();
					await this.plugin.saveSettings();
					this.plugin.applyExtensions();
				};
			}
		}

		// ── Section 4: Custom Extensions ──────────────────
		createSectionHeading(containerEl, t.customHeading, AVM_ICONS.sparkles);

		const customCard = containerEl.createDiv({ cls: 'avm-cat-card' });
		const customHead = customCard.createDiv({ cls: 'avm-cat-header' });
		const customInfo = customHead.createDiv({ cls: 'avm-cat-info' });
		const customTitle = customInfo.createSpan({
			cls: 'avm-cat-title',
			text: `${t.customCardTitle} (${this.plugin.settings.customExtensions.length})`
		});
		customInfo.createSpan({
			cls: 'avm-cat-desc',
			text: t.customCardDesc
		});

		// Input row for adding a custom extension
		const addWrap = customCard.createDiv({ cls: 'avm-custom-add-wrap' });
		const addInput = addWrap.createEl('input', {
			cls: 'avm-custom-input',
			type: 'text',
			attr: { placeholder: t.customInputPlaceholder }
		});
		const addBtn = addWrap.createEl('button', {
			cls: 'avm-custom-btn',
			text: t.btnAdd
		});

		const customPillsWrap = customCard.createDiv({ cls: 'avm-ext-pills-wrap' });

		const renderCustomPills = () => {
			customPillsWrap.empty();
			customTitle.textContent = `${t.customCardTitle} (${this.plugin.settings.customExtensions.length})`;

			if (this.plugin.settings.customExtensions.length === 0) {
				const emptyHint = customPillsWrap.createSpan({
					cls: 'avm-custom-empty',
					text: t.customEmpty
				});
				emptyHint.style.color = 'var(--text-faint)';
				emptyHint.style.fontSize = '12px';
				emptyHint.style.padding = '4px 0';
				return;
			}

			for (const ext of this.plugin.settings.customExtensions) {
				const pill = customPillsWrap.createEl('span', {
					cls: 'avm-ext-pill avm-ext-pill--active avm-custom-pill'
				});
				pill.createSpan({ text: `.${ext}` });
				const removeIcon = pill.createSpan({ cls: 'avm-custom-remove', text: '×' });
				removeIcon.onclick = async (e) => {
					e.stopPropagation();
					this.plugin.settings.customExtensions = this.plugin.settings.customExtensions.filter(e => e !== ext);
					await this.plugin.saveSettings();
					this.plugin.applyExtensions();
					renderCustomPills();
				};
			}
		};

		const handleAdd = async () => {
			const raw = addInput.value.trim().toLowerCase();
			if (!raw) return;
			const tokens = raw.split(/[\s,]+/).map(s => s.replace(/^\./, '').trim()).filter(s => s.length > 0 && s !== 'md' && s !== 'svg');
			let addedCount = 0;
			for (const tExt of tokens) {
				if (!this.plugin.settings.customExtensions.includes(tExt)) {
					this.plugin.settings.customExtensions.push(tExt);
					addedCount++;
				}
			}
			if (addedCount > 0) {
				addInput.value = '';
				await this.plugin.saveSettings();
				this.plugin.applyExtensions();
				renderCustomPills();
				new Notice(`${t.noticeAdded} ${addedCount}`);
			}
		};

		addBtn.onclick = handleAdd;
		addInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') {
				e.preventDefault();
				handleAdd();
			}
		});

		renderCustomPills();

		// ── Section 5: Reset ──────────────────────────────
		new Setting(containerEl)
			.setName(t.resetName)
			.setDesc(t.resetDesc)
			.addButton(btn => {
				btn
					.setButtonText(t.btnReset)
					.setClass('mod-warning')
					.onClick(async () => {
						this.plugin.settings.extensions = [...ALL_DEFAULT_EXTENSIONS];
						this.plugin.settings.customExtensions = [];
						this.plugin.settings.svgSuiteEnabled = true;
						this.plugin.settings.svgStudio = Object.assign({}, DEFAULT_SETTINGS.svgStudio);
						this.plugin.settings.showLineNumbers = false;
						this.plugin.settings.useNativeTabSize = true;
						this.plugin.settings.tabSize = 4;
						await this.plugin.saveSettings();
						this.plugin.applyExtensions();
						this.display();
						new Notice(t.noticeReset);
					});
			});

		// ── Section 6: Donate ─────────────────────────────
		renderDonateBanner(containerEl, t);
	}
}
