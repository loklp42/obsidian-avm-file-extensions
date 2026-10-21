import { tags as t } from '@lezer/highlight';
import { HighlightStyle } from '@codemirror/language';

export const avmHighlightStyle = HighlightStyle.define([
	// Keywords & flow control
	{ tag: t.keyword, color: '#e06c75', fontWeight: 'bold' },
	{ tag: [t.definitionKeyword, t.moduleKeyword, t.controlKeyword], color: '#e06c75', fontWeight: 'bold' },

	// Functions & builtins
	{ tag: [t.function(t.variableName), t.function(t.propertyName), t.standard(t.variableName)], color: '#61afef' },

	// Types, classes & section headings
	{ tag: [t.heading, t.typeName, t.className, t.namespace], color: '#e5c07b', fontWeight: 'bold' },

	// Properties & attributes
	{ tag: [t.propertyName, t.attributeName], color: '#e06c75' },

	// Literals & strings
	{ tag: [t.string, t.special(t.string)], color: '#98c379' },
	{ tag: [t.number, t.bool, t.null, t.atom], color: '#d19a66' },

	// Comments
	{ tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: '#5c6370', fontStyle: 'italic' },

	// Variables & punctuation
	{ tag: t.variableName, color: '#abb2bf' },
	{ tag: [t.operator, t.punctuation], color: '#56b6c2' },

	// HTML / XML tags
	{ tag: t.tagName, color: '#e06c75' }
]);
