import { TextFileView, WorkspaceLeaf, Scope } from 'obsidian';
import { EditorState, Compartment } from '@codemirror/state';
import {
	EditorView,
	lineNumbers,
	highlightActiveLineGutter,
	highlightSpecialChars,
	drawSelection,
	dropCursor,
	keymap
} from '@codemirror/view';
import {
	defaultKeymap,
	history,
	historyKeymap,
	indentWithTab
} from '@codemirror/commands';
import {
	bracketMatching,
	indentOnInput,
	indentUnit,
	syntaxHighlighting,
	defaultHighlightStyle
} from '@codemirror/language';
import { oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import { getLanguageSupportForExtension } from './languages';
import { avmHighlightStyle } from './theme';
import type AvmFileExtensionsPlugin from './main';

export const AVM_CODE_VIEW_TYPE = 'avm-code-editor';

export class AvmCodeView extends TextFileView {
	private editor: EditorView | null = null;
	private langCompartment = new Compartment();
	private lineNumbersCompartment = new Compartment();
	private tabCompartment = new Compartment();
	private syntaxCompartment = new Compartment();
	private plugin: AvmFileExtensionsPlugin;
	private suppressSave = false;

	constructor(leaf: WorkspaceLeaf, plugin: AvmFileExtensionsPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.scope = new Scope(this.app.scope);
	}

	getViewType(): string {
		return AVM_CODE_VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file ? this.file.name : 'Code';
	}

	getIcon(): string {
		return 'file-code';
	}

	private getLineNumbersExtension() {
		const enabled = this.plugin.isNativeLineNumbersEnabled();
		return enabled ? [lineNumbers(), highlightActiveLineGutter()] : [];
	}

	private getTabExtension() {
		const size = this.plugin.getEffectiveTabSize();
		return [
			EditorState.tabSize.of(size),
			indentUnit.of(" ".repeat(size))
		];
	}

	private getSyntaxHighlightExtension() {
		if (!this.plugin.settings.syntaxHighlight) return [];
		return [
			syntaxHighlighting(oneDarkHighlightStyle),
			syntaxHighlighting(avmHighlightStyle),
			syntaxHighlighting(defaultHighlightStyle, { fallback: true })
		];
	}

	public reconfigureOptions(): void {
		if (!this.editor) return;
		this.editor.dispatch({
			effects: [
				this.lineNumbersCompartment.reconfigure(this.getLineNumbersExtension()),
				this.tabCompartment.reconfigure(this.getTabExtension()),
				this.syntaxCompartment.reconfigure(this.getSyntaxHighlightExtension())
			]
		});
	}

	private buildEditorExtensions(ext: string) {
		const langSupport = getLanguageSupportForExtension(ext);

		return [
			this.syntaxCompartment.of(this.getSyntaxHighlightExtension()),
			this.langCompartment.of(langSupport),
			highlightSpecialChars(),
			history(),
			drawSelection(),
			dropCursor(),
			EditorState.allowMultipleSelections.of(true),
			indentOnInput(),
			bracketMatching(),
			this.lineNumbersCompartment.of(this.getLineNumbersExtension()),
			this.tabCompartment.of(this.getTabExtension()),
			keymap.of([
				...defaultKeymap,
				...historyKeymap,
				indentWithTab
			]),
			EditorView.updateListener.of((update) => {
				if (update.docChanged && !this.suppressSave) {
					this.requestSave();
				}
			})
		];
	}

	async onOpen(): Promise<void> {
		await super.onOpen();
		this.contentEl.empty();
		this.contentEl.addClass('avm-code-view');

		const ext = this.file ? this.file.extension : '';

		const state = EditorState.create({
			doc: this.data || '',
			extensions: this.buildEditorExtensions(ext)
		});

		this.editor = new EditorView({
			state,
			parent: this.contentEl
		});
	}

	getViewData(): string {
		return this.editor ? this.editor.state.doc.toString() : this.data;
	}

	setViewData(data: string, clear: boolean): void {
		this.data = data;
		if (!this.editor) return;

		const ext = this.file ? this.file.extension : '';

		if (clear) {
			const state = EditorState.create({
				doc: data,
				extensions: this.buildEditorExtensions(ext)
			});
			this.editor.setState(state);
		} else {
			this.suppressSave = true;
			this.editor.dispatch({
				changes: { from: 0, to: this.editor.state.doc.length, insert: data }
			});
			this.suppressSave = false;
		}
	}

	clear(): void {
		this.setViewData('', true);
	}

	async onClose(): Promise<void> {
		if (this.editor) {
			this.editor.destroy();
			this.editor = null;
		}
	}
}
