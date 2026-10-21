import { TextFileView, WorkspaceLeaf, Notice, setIcon } from 'obsidian';
import type AvmFileExtensionsPlugin from './main';

export const VIEW_TYPE_SVG = 'avm-svg-suite-view';

const MIN_SCALE = 0.05;
const MAX_SCALE = 100;
const ZOOM_STEP = 1.18;
const PAN_STEP = 48;

function getSVGDimensions(svgEl: SVGSVGElement | Element) {
	const svg = svgEl as SVGSVGElement;
	const vb = svg.viewBox && svg.viewBox.baseVal;
	const w = parseFloat(svg.getAttribute('width') || '0') || (vb && vb.width) || 800;
	const h = parseFloat(svg.getAttribute('height') || '0') || (vb && vb.height) || 600;
	return { w, h };
}

function clamp(v: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, v));
}

function formatXML(xml: string): string {
	try {
		let out = '', depth = 0;
		const TAB = '  ';
		xml = xml.replace(/>\s*</g, '>\n<').trim();
		for (const line of xml.split('\n')) {
			const s = line.trim();
			if (!s) continue;
			if (/^<\//.test(s)) depth = Math.max(0, depth - 1);
			out += TAB.repeat(depth) + s + '\n';
			if (/^<[^/?!]/.test(s) && !s.endsWith('/>') && !/<\//.test(s)) depth++;
		}
		return out.trim();
	} catch {
		return xml;
	}
}

const ATTR_RE = /([\w:.-]+)(\s*=\s*)("[^"]*"|'[^']*')/g;

function appendTagTokens(parent: HTMLElement, tag: string) {
	const m = tag.match(/^(<\/?)([\w:.!?-][\w:.-]*)([\s\S]*?)(\/?>?)$/);
	if (!m) { parent.createSpan({ cls: 'tok-punct', text: tag }); return; }
	parent.createSpan({ cls: 'tok-punct', text: m[1] || '' });
	parent.createSpan({ cls: 'tok-tag', text: m[2] || '' });
	const attrs = m[3] || '';
	let last = 0, am: RegExpExecArray | null;
	ATTR_RE.lastIndex = 0;
	while ((am = ATTR_RE.exec(attrs))) {
		if (am.index > last) parent.appendText(attrs.slice(last, am.index));
		parent.createSpan({ cls: 'tok-attr', text: am[1] || '' });
		parent.appendText(am[2] || '');
		parent.createSpan({ cls: 'tok-value', text: am[3] || '' });
		last = ATTR_RE.lastIndex;
	}
	if (last < attrs.length) parent.appendText(attrs.slice(last));
	if (m[4]) parent.createSpan({ cls: 'tok-punct', text: m[4] });
}

function renderHighlighted(codeEl: HTMLElement, src: string) {
	codeEl.empty();
	let i = 0;
	while (i < src.length) {
		const lt = src.indexOf('<', i);
		if (lt === -1) { codeEl.appendText(src.slice(i)); break; }
		if (lt > i) codeEl.appendText(src.slice(i, lt));
		if (src.startsWith('<!--', lt)) {
			const end = src.indexOf('-->', lt);
			const stop = end === -1 ? src.length : end + 3;
			codeEl.createSpan({ cls: 'tok-comment', text: src.slice(lt, stop) });
			i = stop;
			continue;
		}
		const gt = src.indexOf('>', lt);
		const stop = gt === -1 ? src.length : gt + 1;
		appendTagTokens(codeEl, src.slice(lt, stop));
		i = stop;
	}
	codeEl.appendText('\n');
}

export class SVGViewer {
	canvas: HTMLElement;
	wrapper: HTMLElement;
	scale = 1;
	panX = 0;
	panY = 0;
	baseW = 800;
	baseH = 600;
	isPanning = false;
	lastX = 0;
	lastY = 0;
	lastTouchDist = 0;
	lastMidX = 0;
	lastMidY = 0;
	wheelMode = 'pan';
	userInteracted = false;
	onTransform: ((scale: number, panX: number, panY: number) => void) | null = null;
	private ac = new AbortController();

	constructor(canvas: HTMLElement, wrapper: HTMLElement) {
		this.canvas = canvas;
		this.wrapper = wrapper;
		this._attach();
	}

	private _attach() {
		const c = this.canvas;

		c.addEventListener('wheel', (e) => {
			e.preventDefault();
			this.userInteracted = true;
			const pinch = e.ctrlKey || e.metaKey;
			if (pinch || this.wheelMode === 'zoom') {
				const r = c.getBoundingClientRect();
				const factor = Math.pow(ZOOM_STEP, -e.deltaY / 100);
				this.zoomAt(e.clientX - r.left, e.clientY - r.top, factor);
			} else {
				this.pan(-e.deltaX, -e.deltaY);
			}
		}, { passive: false, signal: this.ac.signal });

		c.addEventListener('mousedown', (e) => {
			if (e.button !== 0 && e.button !== 1) return;
			this.isPanning = true;
			this.userInteracted = true;
			this.lastX = e.clientX;
			this.lastY = e.clientY;
			c.classList.add('smv-panning');
		}, { signal: this.ac.signal });

		window.addEventListener('mousemove', (e) => {
			if (!this.isPanning) return;
			this.pan(e.clientX - this.lastX, e.clientY - this.lastY);
			this.lastX = e.clientX;
			this.lastY = e.clientY;
		}, { signal: this.ac.signal });

		const stopPan = () => {
			if (!this.isPanning) return;
			this.isPanning = false;
			c.classList.remove('smv-panning');
		};
		window.addEventListener('mouseup', stopPan, { signal: this.ac.signal });

		c.addEventListener('touchstart', (e) => {
			this.userInteracted = true;
			if (e.touches.length === 1 && e.touches[0]) {
				this.isPanning = true;
				this.lastX = e.touches[0].clientX;
				this.lastY = e.touches[0].clientY;
			} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
				this.isPanning = false;
				this.lastTouchDist = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);
				this.lastMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
				this.lastMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
			}
		}, { passive: true, signal: this.ac.signal });

		c.addEventListener('touchmove', (e) => {
			if (e.touches.length === 1 && this.isPanning && e.touches[0]) {
				this.pan(e.touches[0].clientX - this.lastX, e.touches[0].clientY - this.lastY);
				this.lastX = e.touches[0].clientX;
				this.lastY = e.touches[0].clientY;
			} else if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
				const dist = Math.hypot(
					e.touches[0].clientX - e.touches[1].clientX,
					e.touches[0].clientY - e.touches[1].clientY
				);
				const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
				const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
				this.pan(midX - this.lastMidX, midY - this.lastMidY);
				if (this.lastTouchDist > 0) {
					const r = c.getBoundingClientRect();
					this.zoomAt(midX - r.left, midY - r.top, dist / this.lastTouchDist);
				}
				this.lastTouchDist = dist;
				this.lastMidX = midX;
				this.lastMidY = midY;
			}
		}, { passive: true, signal: this.ac.signal });

		c.addEventListener('touchend', () => { this.isPanning = false; this.lastTouchDist = 0; }, { signal: this.ac.signal });

		c.tabIndex = 0;
		c.addEventListener('keydown', (e) => {
			let handled = true;
			switch (e.key) {
				case '+': case '=': this.zoomAtCenter(ZOOM_STEP); break;
				case '-': case '_': this.zoomAtCenter(1 / ZOOM_STEP); break;
				case '0': this.reset(); break;
				case 'ArrowLeft': this.pan(PAN_STEP, 0); break;
				case 'ArrowRight': this.pan(-PAN_STEP, 0); break;
				case 'ArrowUp': this.pan(0, PAN_STEP); break;
				case 'ArrowDown': this.pan(0, -PAN_STEP); break;
				default: handled = false;
			}
			if (handled) { e.preventDefault(); this.userInteracted = true; }
		}, { signal: this.ac.signal });
	}

	destroy() {
		this.ac.abort();
	}

	apply() {
		// Set physical width and height for crisp vector rendering instead of CSS scale()
		const curW = Math.round(this.baseW * this.scale);
		const curH = Math.round(this.baseH * this.scale);
		this.wrapper.style.transform = `translate(${Math.round(this.panX)}px, ${Math.round(this.panY)}px)`;
		this.wrapper.style.width = `${curW}px`;
		this.wrapper.style.height = `${curH}px`;

		const svg = this.wrapper.querySelector('svg');
		if (svg) {
			svg.setAttribute('width', `${curW}`);
			svg.setAttribute('height', `${curH}`);
		}

		if (this.onTransform) this.onTransform(this.scale, this.panX, this.panY);
	}

	pan(dx: number, dy: number) {
		this.panX += dx;
		this.panY += dy;
		this.apply();
	}

	zoomAt(cx: number, cy: number, factor: number) {
		const newScale = clamp(this.scale * factor, MIN_SCALE, MAX_SCALE);
		const eff = newScale / this.scale;
		this.panX = cx - (cx - this.panX) * eff;
		this.panY = cy - (cy - this.panY) * eff;
		this.scale = newScale;
		this.apply();
	}

	zoomAtCenter(factor: number) {
		const r = this.canvas.getBoundingClientRect();
		this.zoomAt(r.width / 2, r.height / 2, factor);
	}

	reset() {
		this.scale = 1;
		this.panX = 0;
		this.panY = 0;
		this.apply();
	}

	syncDimensions() {
		const svg = this.wrapper.querySelector('svg');
		if (svg) {
			const { w, h } = getSVGDimensions(svg);
			this.baseW = w;
			this.baseH = h;
		}
	}

	fit() {
		this.syncDimensions();
		const cw = this.canvas.clientWidth;
		const ch = this.canvas.clientHeight;
		if (!cw || !ch) return;
		const margin = 36;
		const s = Math.min((cw - margin * 2) / this.baseW, (ch - margin * 2) / this.baseH);
		this.scale = clamp(s, MIN_SCALE, MAX_SCALE);
		this.panX = (cw - this.baseW * this.scale) / 2;
		this.panY = (ch - this.baseH * this.scale) / 2;
		this.apply();
	}
}

export class SvgSuiteView extends TextFileView {
	private rootEl!: HTMLElement;
	private toolbarEl!: HTMLElement;
	private bodyEl!: HTMLElement;
	private canvasEl!: HTMLElement;
	private wrapperEl!: HTMLElement;
	private errorEl!: HTMLElement;
	private codePanelEl!: HTMLElement;
	private codeHighlightEl!: HTMLElement;
	private codeEditorEl!: HTMLTextAreaElement;
	private zoomLabel!: HTMLElement;
	private coordsEl!: HTMLElement;
	private codeToggleBtn!: HTMLElement;
	private bgBtn!: HTMLElement;

	private viewer!: SVGViewer;
	private plugin: AvmFileExtensionsPlugin;
	private codeVisible = false;
	private bgMode = 'grid';
	private autoSave = true;
	private codePanelWidth = 360;
	private suppressSave = false;

	constructor(leaf: WorkspaceLeaf, plugin: AvmFileExtensionsPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_SVG;
	}

	getDisplayText(): string {
		return this.file ? this.file.name : 'SVG';
	}

	getIcon(): string {
		return 'image';
	}

	applySettings() {
		const s = this.plugin.settings.svgStudio;
		this.bgMode = s.background;
		this.canvasEl.dataset.bg = s.background;
		this.autoSave = s.autoSave;
		if (this.viewer) {
			this.viewer.wheelMode = s.scrollMode;
		}
		if (this.coordsEl) {
			this.coordsEl.parentElement?.classList.toggle('smv-hidden', !s.showCoordinates);
		}
		if (this.codeVisible && this.codeHighlightEl) {
			this._updateCodeHighlight(this.codeEditorEl.value);
		}
	}

	private _updateCodeHighlight(val: string) {
		if (this.plugin.settings.svgStudio.syntaxHighlight) {
			this.codeHighlightEl.style.display = '';
			renderHighlighted(this.codeHighlightEl, val);
		} else {
			this.codeHighlightEl.empty();
			this.codeHighlightEl.style.display = 'none';
		}
	}

	async onOpen(): Promise<void> {
		await super.onOpen();
		this.contentEl.empty();
		this.contentEl.addClass('smv-root-container');

		this._buildUI();
		this._attachCodeEditor();
		this.viewer = new SVGViewer(this.canvasEl, this.wrapperEl);
		this.viewer.onTransform = (scale) => {
			this.zoomLabel.textContent = `${Math.round(scale * 100)}%`;
		};

		this.applySettings();

		this.canvasEl.addEventListener('mousemove', (e) => {
			if (!this.plugin.settings.svgStudio.showCoordinates) return;
			const svg = this.wrapperEl.querySelector('svg');
			if (!svg) return;
			const r = this.canvasEl.getBoundingClientRect();
			const sx = Math.round((e.clientX - r.left - this.viewer.panX) / this.viewer.scale);
			const sy = Math.round((e.clientY - r.top - this.viewer.panY) / this.viewer.scale);
			this.coordsEl.textContent = `x: ${sx}  y: ${sy}`;
		});

		this.canvasEl.addEventListener('mouseleave', () => {
			this.coordsEl.textContent = '';
		});

		this._renderSVG(this.data || '');
		if (this.plugin.settings.svgStudio.fitOnOpen) {
			setTimeout(() => {
				if (this.viewer) this.viewer.fit();
			}, 60);
		}
	}

	private _buildUI() {
		this.rootEl = this.contentEl.createDiv({ cls: 'smv-root' });

		// Toolbar
		this.toolbarEl = this.rootEl.createDiv({ cls: 'smv-toolbar' });
		const tgLeft = this.toolbarEl.createDiv({ cls: 'smv-tg' });

		const addBtn = (parent: HTMLElement, icon: string, title: string, fn: () => void) => {
			const b = parent.createEl('button', { cls: 'smv-btn', attr: { 'aria-label': title, title } });
			setIcon(b, icon);
			b.onclick = fn;
			return b;
		};

		addBtn(tgLeft, 'zoom-in', 'Zoom in (+)', () => this.viewer.zoomAtCenter(ZOOM_STEP));
		addBtn(tgLeft, 'zoom-out', 'Zoom out (-)', () => this.viewer.zoomAtCenter(1 / ZOOM_STEP));
		this.zoomLabel = tgLeft.createSpan({ cls: 'smv-zoom-label', text: '100%' });
		addBtn(tgLeft, 'maximize', 'Fit to screen', () => this.viewer.fit());
		addBtn(tgLeft, 'rotate-ccw', 'Reset view (100%)', () => this.viewer.reset());

		tgLeft.createDiv({ cls: 'smv-sep' });

		this.bgBtn = addBtn(tgLeft, 'grid', 'Switch background', () => this._cycleBg());

		const tgMid = this.toolbarEl.createDiv({ cls: 'smv-tg smv-tg--mid' });
		this.coordsEl = tgMid.createSpan({ cls: 'smv-coords', text: '' });

		const tgRight = this.toolbarEl.createDiv({ cls: 'smv-tg smv-tg--right' });
		addBtn(tgRight, 'download', 'Export PNG', () => this.exportPNG());

		this.codeToggleBtn = tgRight.createEl('button', { cls: 'smv-btn', attr: { 'aria-label': 'SVG Code', title: 'SVG Code' } });
		setIcon(this.codeToggleBtn, 'code');
		this.codeToggleBtn.createSpan({ cls: 'smv-btn-text', text: 'Code' });
		this.codeToggleBtn.onclick = () => this.toggleCodePanel();

		// Body
		this.bodyEl = this.rootEl.createDiv({ cls: 'smv-body' });
		this.canvasEl = this.bodyEl.createDiv({ cls: 'smv-canvas' });
		this.canvasEl.dataset.bg = this.bgMode;
		this.wrapperEl = this.canvasEl.createDiv({ cls: 'smv-wrapper' });
		this.errorEl = this.canvasEl.createDiv({ cls: 'smv-error smv-hidden' });
		this.errorEl.createDiv({ cls: 'smv-error-inner', text: 'SVG syntax error' });

		// Code panel
		this.codePanelEl = this.bodyEl.createDiv({ cls: 'smv-code-panel smv-hidden' });
		this.codePanelEl.style.width = `${this.codePanelWidth}px`;

		const cpHeader = this.codePanelEl.createDiv({ cls: 'smv-code-header' });
		cpHeader.createSpan({ cls: 'smv-code-title', text: 'SVG Source' });
		const cpHBtns = cpHeader.createDiv({ cls: 'smv-code-actions' });
		const fmtBtn = cpHBtns.createEl('button', { cls: 'smv-btn', attr: { title: 'Format XML' } });
		setIcon(fmtBtn, 'align-left');
		fmtBtn.onclick = () => this._formatCode();

		const stack = this.codePanelEl.createDiv({ cls: 'smv-editor-stack' });
		this.codeHighlightEl = stack.createEl('pre', { cls: 'smv-code-highlight' });
		this.codeEditorEl = stack.createEl('textarea', { cls: 'smv-code-editor smv-code-editor--transparent' });
	}

	private _attachCodeEditor() {
		const ta = this.codeEditorEl;
		const hl = this.codeHighlightEl;

		ta.addEventListener('scroll', () => {
			hl.scrollTop = ta.scrollTop;
			hl.scrollLeft = ta.scrollLeft;
		});

		ta.addEventListener('input', () => {
			const val = ta.value;
			this._renderSVG(val);
			this._updateCodeHighlight(val);
			if (this.autoSave && !this.suppressSave) {
				this.requestSave();
			}
		});
	}

	private _cycleBg() {
		const modes = ['grid', 'checkerboard', 'dark', 'light', 'transparent'];
		const next = modes[(modes.indexOf(this.bgMode) + 1) % modes.length] || 'grid';
		this.bgMode = next;
		this.canvasEl.dataset.bg = next;
	}

	public toggleCodePanel() {
		this.codeVisible = !this.codeVisible;
		this.codePanelEl.classList.toggle('smv-hidden', !this.codeVisible);
		this.codeToggleBtn.classList.toggle('smv-btn--active', this.codeVisible);
		if (this.codeVisible) {
			this.codeEditorEl.value = this.data || '';
			this._updateCodeHighlight(this.data || '');
		}
	}

	private _formatCode() {
		const formatted = formatXML(this.codeEditorEl.value);
		this.codeEditorEl.value = formatted;
		this._renderSVG(formatted);
		this._updateCodeHighlight(formatted);
		this.requestSave();
	}

	private _renderSVG(xml: string) {
		this.wrapperEl.empty();
		try {
			const parser = new DOMParser();
			const doc = parser.parseFromString(xml, 'image/svg+xml');
			const err = doc.querySelector('parsererror');
			if (err) {
				this.errorEl.classList.remove('smv-hidden');
				return;
			}
			this.errorEl.classList.add('smv-hidden');
			const svg = doc.documentElement;
			this.wrapperEl.appendChild(svg);
			if (this.viewer) {
				this.viewer.syncDimensions();
				this.viewer.apply();
			}
		} catch {
			this.errorEl.classList.remove('smv-hidden');
		}
	}

	public exportPNG() {
		const svg = this.wrapperEl.querySelector('svg');
		if (!svg) { new Notice('No SVG found to export'); return; }
		const { w, h } = getSVGDimensions(svg);
		const scale = this.plugin.settings.svgStudio.exportScale || 2;
		const canvas = document.createElement('canvas');
		canvas.width = w * scale;
		canvas.height = h * scale;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const img = new Image();
		const xml = new XMLSerializer().serializeToString(svg);
		const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		img.onload = () => {
			ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
			URL.revokeObjectURL(url);
			canvas.toBlob(async (blob) => {
				if (!blob) return;
				const base = this.file ? this.file.basename : 'exported';
				const path = `${base}@${scale}x.png`;
				const buffer = await blob.arrayBuffer();
				await this.app.vault.adapter.writeBinary(path, buffer);
				new Notice(`Exported: ${path} (${Math.round(canvas.width)}×${Math.round(canvas.height)})`);
			});
		};
		img.src = url;
	}

	getViewData(): string {
		return this.codeVisible ? this.codeEditorEl.value : this.data;
	}

	setViewData(data: string, clear: boolean): void {
		this.data = data;
		this._renderSVG(data);
		if (this.codeVisible) {
			this.codeEditorEl.value = data;
			this._updateCodeHighlight(data);
		}
		if (clear && this.viewer) {
			setTimeout(() => this.viewer.fit(), 40);
		}
	}

	clear(): void {
		this.setViewData('', true);
	}

	async onClose(): Promise<void> {
		if (this.viewer) {
			this.viewer.destroy();
		}
	}
}
