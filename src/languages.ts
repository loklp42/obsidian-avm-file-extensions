import { Extension } from '@codemirror/state';
import { StreamLanguage } from '@codemirror/language';

// CodeMirror 6 static language parsers
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { xml } from '@codemirror/lang-xml';
import { sql } from '@codemirror/lang-sql';
import { yaml } from '@codemirror/lang-yaml';
import { rust } from '@codemirror/lang-rust';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { php } from '@codemirror/lang-php';
import { go } from '@codemirror/lang-go';

// StreamLanguage legacy modes
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { toml } from '@codemirror/legacy-modes/mode/toml';
import { properties } from '@codemirror/legacy-modes/mode/properties';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile';
import { swift } from '@codemirror/legacy-modes/mode/swift';
import { csharp } from '@codemirror/legacy-modes/mode/clike';

type LanguageFactory = () => Extension;
const langMap = new Map<string, LanguageFactory>();

function reg(exts: string[], factory: LanguageFactory): void {
	for (const ext of exts) {
		langMap.set(ext.toLowerCase(), factory);
	}
}

// 1. Web & JS / TS
reg(['js', 'jsx', 'mjs', 'cjs'], () => javascript({ jsx: true }));
reg(['ts', 'tsx', 'mts', 'cts'], () => javascript({ typescript: true, jsx: true }));
reg(['css', 'scss', 'sass', 'less'], () => css());
reg(['html', 'htm', 'svelte', 'vue'], () => html());
reg(['json', 'jsonc', 'json5'], () => json());
reg(['xml', 'svg', 'xsl', 'xsd'], () => xml());

// 2. Configs & Data
reg(['yaml', 'yml'], () => yaml());
reg(['toml'], () => StreamLanguage.define(toml));
reg(['ini', 'cfg', 'conf', 'env'], () => StreamLanguage.define(properties));
reg(['sql'], () => sql());

// 3. Texts, logs, tabular
reg(['log'], () => StreamLanguage.define(shell));
reg(['csv', 'tsv'], () => StreamLanguage.define(properties));

// 4. Programming languages
reg(['go'], () => go());
reg(['py', 'pyw', 'pyi'], () => python());
reg(['sh', 'bash', 'zsh'], () => StreamLanguage.define(shell));
reg(['ps1', 'psm1'], () => StreamLanguage.define(powerShell));
reg(['rs'], () => rust());
reg(['c', 'h', 'cpp', 'hpp', 'cc', 'cxx'], () => cpp());
reg(['java'], () => java());
reg(['cs', 'csx'], () => StreamLanguage.define(csharp));
reg(['php'], () => php());
reg(['rb', 'ruby'], () => StreamLanguage.define(ruby));
reg(['lua'], () => StreamLanguage.define(lua));
reg(['swift'], () => StreamLanguage.define(swift));
reg(['dockerfile'], () => StreamLanguage.define(dockerFile));

export function getLanguageSupportForExtension(ext: string): Extension {
	const clean = (ext || '').toLowerCase().replace(/^\./, '');
	const factory = langMap.get(clean);
	if (!factory) return [];
	try {
		return factory();
	} catch (e) {
		console.warn(`[AVM Syntax] Failed to initialize syntax for .${clean}:`, e);
		return [];
	}
}
