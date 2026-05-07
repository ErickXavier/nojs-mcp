import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadJSON, loadDoc } from "../knowledge.js";
import type { DirectivesKB, FiltersKB, ApiKB } from "../knowledge.js";

// ── Structured validation error interface ──
interface ValidationError {
    message: string;
    severity: "error" | "warning" | "info";
    location?: {
        line: number;
        column: number;
    };
    fixSuggestion?: string;
    code?: string;
}

// ── Helpers for location detection ──
function offsetToLocation(
    source: string,
    offset: number
): { line: number; column: number } {
    const lines = source.slice(0, offset).split("\n");
    return { line: lines.length, column: lines[lines.length - 1].length + 1 };
}

// ── Extract the full opening tag surrounding a given offset (respects quotes) ──
function extractElementTag(html: string, offset: number): string | null {
    // Scan backwards from offset to find the opening '<' (skip '<' inside quotes)
    let start = -1;
    let inQuote: string | null = null;
    for (let i = offset; i >= 0; i--) {
        const ch = html[i];
        if (inQuote) {
            if (ch === inQuote) inQuote = null;
        } else {
            if (ch === '"' || ch === "'") {
                inQuote = ch;
            } else if (ch === "<") {
                start = i;
                break;
            }
        }
    }
    if (start === -1) return null;

    // Scan forward from start to find the real closing '>' (skip '>' inside quotes)
    inQuote = null;
    for (let i = start; i < html.length; i++) {
        const ch = html[i];
        if (inQuote) {
            if (ch === inQuote) inQuote = null;
        } else {
            if (ch === '"' || ch === "'") {
                inQuote = ch;
            } else if (ch === ">") {
                return html.slice(start, i + 1);
            }
        }
    }
    return null;
}

// ── Known NoJS directives for validation ──
let _directiveNames: Set<string> | null = null;

function getDirectiveNames(): Set<string> {
    if (!_directiveNames) {
        const kb = loadJSON<DirectivesKB>("directives.json");
        _directiveNames = new Set(
            kb.directives.map((d) => d.name.replace(/\*$/, "").replace(/:$/, ""))
        );
    }
    return _directiveNames;
}

export function registerTools(server: McpServer): void {
    // ── validate_template ──
    server.tool(
        "validate_template",
        "Validate a NoJS HTML template for syntax errors, unknown directives, and best practices",
        { html: z.string().describe("The HTML template to validate") },
        async ({ html }) => {
            const errors: ValidationError[] = [];
            const warnings: ValidationError[] = [];
            const info: ValidationError[] = [];
            const knownDirectives = getDirectiveNames();

            // Extract all attributes from HTML (with positions)
            const attrRegex = /\s([a-z][a-z0-9\-:]*?)(?:=|[\s>])/gi;
            let match: RegExpExecArray | null;

            // Check for potential NoJS directive typos
            const possibleTypos: Record<string, string> = {
                bnd: "bind",
                bing: "bind",
                binde: "bind",
                "bind-htm": "bind-html",
                iff: "if",
                els: "else",
                "else-iff": "else-if",
                shw: "show",
                hid: "hide",
                ech: "each",
                forech: "foreach",
                modle: "model",
                stat: "state",
                stor: "store",
                rout: "route",
                "route-vew": "route-view",
                validat: "validate",
                animat: "animate",
                "on-click": "on:click",
                "on-submit": "on:submit",
                "on-input": "on:input",
            };

            while ((match = attrRegex.exec(html)) !== null) {
                const attr = match[1].toLowerCase();
                if (possibleTypos[attr]) {
                    const correction = possibleTypos[attr];
                    errors.push({
                        message: `Unknown attribute "${attr}" — did you mean "${correction}"?`,
                        severity: "error",
                        location: offsetToLocation(html, match.index + 1),
                        fixSuggestion: `Replace "${attr}" with "${correction}"`,
                        code: "NOJS-V001",
                    });
                }
            }

            // Check for each without "in" keyword
            const eachRegex = /each="([^"]+)"/g;
            while ((match = eachRegex.exec(html)) !== null) {
                if (!match[1].includes(" in ")) {
                    errors.push({
                        message: `Invalid "each" syntax: "${match[1]}" — expected format: "item in items"`,
                        severity: "error",
                        location: offsetToLocation(html, match.index),
                        fixSuggestion: `Use each="item in ${match[1]}" (replace "item" with your iterator variable)`,
                        code: "NOJS-V002",
                    });
                }
            }

            // Check foreach without from
            const foreachRegex = /foreach=/g;
            while ((match = foreachRegex.exec(html)) !== null) {
                const elementTag = extractElementTag(html, match.index);
                if (elementTag && !elementTag.includes("from=")) {
                    errors.push({
                        message: `"foreach" directive requires a "from" attribute to specify the source array`,
                        severity: "error",
                        location: offsetToLocation(html, match.index),
                        fixSuggestion: `Add from="arrayExpression" alongside foreach`,
                        code: "NOJS-V003",
                    });
                }
            }

            // Check for fetch directives (get, post, put, delete) without "as"
            const fetchRegex =
                /\s(get|post|put|delete)="([^"]+)"/gi;
            while ((match = fetchRegex.exec(html)) !== null) {
                const directive = match[1].toLowerCase();
                // Extract the full element tag respecting quotes
                const elementTag = extractElementTag(html, match.index);
                if (elementTag && !elementTag.includes("as=")) {
                    errors.push({
                        message: `Fetch directive "${directive}" missing "as" attribute to name the response data`,
                        severity: "error",
                        location: offsetToLocation(html, match.index + 1),
                        fixSuggestion: `Add as="data" (or a descriptive name) to the element with ${directive}="${match[2]}"`,
                        code: "NOJS-V004",
                    });
                }
            }

            // Check for if and show on the same element
            const tagRegex = /<([a-z][a-z0-9]*)\s([^>]+)>/gi;
            while ((match = tagRegex.exec(html)) !== null) {
                const attrsStr = match[2];
                const hasIf = /\bif=/.test(attrsStr);
                const hasShow = /\bshow=/.test(attrsStr);
                if (hasIf && hasShow) {
                    errors.push({
                        message: `Element <${match[1]}> has both "if" and "show" — these are redundant together`,
                        severity: "error",
                        location: offsetToLocation(html, match.index),
                        fixSuggestion: `Remove "show" (if removes the element from DOM entirely; show only toggles visibility). Use "if" for conditional rendering or "show" for CSS-based toggle.`,
                        code: "NOJS-V005",
                    });
                }
            }

            // Check for missing validate on form elements with validation attributes
            const formRegex = /<form\s([^>]*)>/gi;
            while ((match = formRegex.exec(html)) !== null) {
                const formAttrs = match[1];
                if (!formAttrs.includes("validate")) {
                    // Check if any child inputs have validate attributes
                    const formEnd = html.indexOf("</form>", match.index);
                    if (formEnd > -1) {
                        const formContent = html.slice(match.index, formEnd);
                        if (/validate="[^"]+"/i.test(formContent)) {
                            warnings.push({
                                message: `<form> has validated inputs but is missing the "validate" attribute on the form element`,
                                severity: "warning",
                                location: offsetToLocation(html, match.index),
                                fixSuggestion: `Add "validate" attribute to the <form> tag to enable form-level validation`,
                                code: "NOJS-V006",
                            });
                        }
                    }
                }
            }

            // Check for deprecated syntax
            const modeHashRegex = /mode="(hash|history)"/g;
            while ((match = modeHashRegex.exec(html)) !== null) {
                warnings.push({
                    message: `Deprecated: router "mode" option. Use "useHash: true" instead of "mode: '${match[1]}'"`,
                    severity: "warning",
                    location: offsetToLocation(html, match.index),
                    code: "NOJS-V007",
                });
            }

            // Check model on non-input elements
            const modelOnDivRegex =
                /<(div|span|p|h[1-6]|section|article|main|header|footer)\s[^>]*model=/gi;
            while ((match = modelOnDivRegex.exec(html)) !== null) {
                warnings.push({
                    message: `"model" directive on <${match[1]}> — "model" is designed for form inputs (<input>, <select>, <textarea>)`,
                    severity: "warning",
                    location: offsetToLocation(html, match.index),
                    code: "NOJS-V008",
                });
            }

            // Check bind-html without sanitization warning
            const bindHtmlRegex = /bind-html=/g;
            while ((match = bindHtmlRegex.exec(html)) !== null) {
                info.push({
                    message: `"bind-html" renders HTML (sanitized by default via the built-in DOMParser-based sanitizer). Review content sources to prevent XSS.`,
                    severity: "info",
                    location: offsetToLocation(html, match.index),
                    code: "NOJS-V009",
                });
            }

            // Check for on: events with invalid modifiers
            const onRegex = /on:([a-z]+)\.([a-z.]+)/gi;
            const validModifiers = new Set([
                "prevent",
                "stop",
                "once",
                "self",
                "debounce",
                "throttle",
                "enter",
                "escape",
                "tab",
                "space",
                "delete",
                "backspace",
                "up",
                "down",
                "left",
                "right",
                "ctrl",
                "alt",
                "shift",
                "meta",
            ]);
            while ((match = onRegex.exec(html)) !== null) {
                const mods = match[2].split(".");
                for (const mod of mods) {
                    if (!validModifiers.has(mod)) {
                        warnings.push({
                            message: `Unknown event modifier ".${mod}" on "on:${match[1]}"`,
                            severity: "warning",
                            location: offsetToLocation(html, match.index),
                            fixSuggestion: `Valid modifiers: ${[...validModifiers].join(", ")}`,
                            code: "NOJS-V010",
                        });
                    }
                }
            }

            const valid = errors.length === 0;
            const fixable =
                errors.filter((e) => e.fixSuggestion).length +
                warnings.filter((w) => w.fixSuggestion).length;

            let summary = valid
                ? "Template is valid."
                : `Found ${errors.length} error(s).`;
            if (warnings.length > 0) {
                summary += ` ${warnings.length} warning(s).`;
            }
            if (info.length > 0) {
                summary += ` ${info.length} info notice(s).`;
            }
            if (fixable > 0) {
                summary += ` ${fixable} issue(s) have fix suggestions.`;
            }

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(
                            { valid, errors, warnings, info, summary, fixable },
                            null,
                            2
                        ),
                    },
                ],
            };
        }
    );

    // ── explain_directive ──
    server.tool(
        "explain_directive",
        "Get a detailed explanation of a NoJS directive with syntax and examples",
        {
            directive: z
                .string()
                .describe(
                    'The directive name to explain (e.g., "bind", "each", "model")'
                ),
        },
        async ({ directive }) => {
            const kb = loadJSON<DirectivesKB>("directives.json");
            const name = directive.toLowerCase().trim();

            // Find exact match or partial match
            const found = kb.directives.find(
                (d) =>
                    d.name === name ||
                    d.name === `${name}` ||
                    d.name.startsWith(name)
            );

            if (!found) {
                // Suggest similar
                const suggestions = kb.directives
                    .filter(
                        (d) => d.name.includes(name) || d.category.includes(name)
                    )
                    .map((d) => d.name)
                    .slice(0, 5);

                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `Directive "${directive}" not found.${suggestions.length > 0 ? ` Did you mean: ${suggestions.join(", ")}?` : ""}\n\nUse list_directives to see all available directives.`,
                        },
                    ],
                };
            }

            const category = kb.categories.find((c) => c.id === found.category);
            let explanation = `# ${found.name}\n\n`;
            explanation += `**Category**: ${category?.name || found.category}\n`;
            explanation += `**Description**: ${found.description}\n\n`;
            explanation += `## Syntax\n\n\`\`\`html\n${found.syntax}\n\`\`\`\n\n`;

            if (found.examples && found.examples.length > 0) {
                explanation += `## Examples\n\n`;
                for (const ex of found.examples) {
                    explanation += `### ${ex.description}\n\n\`\`\`html\n${ex.html}\n\`\`\`\n\n`;
                }
            }

            if (found.notes) {
                explanation += `## Notes\n\n${found.notes}\n`;
            }

            return {
                content: [{ type: "text" as const, text: explanation }],
            };
        }
    );

    // ── list_directives ──
    server.tool(
        "list_directives",
        "List all NoJS directives, optionally filtered by category",
        {
            category: z
                .string()
                .optional()
                .describe(
                    'Filter by category: data, state, binding, conditionals, loops, events, styling, forms, routing, animation, dnd, i18n, refs, misc'
                ),
        },
        async ({ category }) => {
            const kb = loadJSON<DirectivesKB>("directives.json");

            let directives = kb.directives;
            if (category) {
                directives = directives.filter(
                    (d) => d.category === category.toLowerCase()
                );
            }

            if (directives.length === 0) {
                const cats = kb.categories.map((c) => c.id).join(", ");
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `No directives found for category "${category}". Available categories: ${cats}`,
                        },
                    ],
                };
            }

            // Group by category
            const groups: Record<string, typeof directives> = {};
            for (const d of directives) {
                if (!groups[d.category]) groups[d.category] = [];
                groups[d.category].push(d);
            }

            let output = `# NoJS Directives${category ? ` (${category})` : ""}\n\n`;
            output += `Total: ${directives.length} directives\n\n`;

            for (const [cat, items] of Object.entries(groups)) {
                const catInfo = kb.categories.find((c) => c.id === cat);
                output += `## ${catInfo?.name || cat}\n\n`;
                output += `| Directive | Description |\n|---|---|\n`;
                for (const d of items) {
                    output += `| \`${d.name}\` | ${d.description} |\n`;
                }
                output += `\n`;
            }

            return {
                content: [{ type: "text" as const, text: output }],
            };
        }
    );

    // ── scaffold_component ──
    server.tool(
        "scaffold_component",
        "Generate a NoJS component template following framework conventions",
        {
            type: z
                .enum(["form", "list", "detail", "card", "modal", "nav"])
                .describe("Component type to scaffold"),
            features: z
                .array(z.string())
                .optional()
                .describe(
                    'Optional features to include: "validation", "i18n", "state", "fetch", "animation", "dnd"'
                ),
        },
        async ({ type, features = [] }) => {
            const templates: Record<string, string> = {
                form: `<div state="{ email: '', password: '', loading: false }">
  <h2>Login</h2>
  <form validate on:submit.prevent="loading = true">
    <div class="field">
      <label>Email</label>
      <input model="email" type="email" validate="required,email"
             error-required="Email is required" error-email="Invalid email">
    </div>
    <div class="field">
      <label>Password</label>
      <input model="password" type="password" validate="required"
             error-required="Password is required">
    </div>
    <p if="$form.firstError" class="error" bind="$form.firstError"></p>
    <button type="submit" class-disabled="!$form.valid || loading">
      <span hide="loading">Submit</span>
      <span show="loading">Loading...</span>
    </button>
  </form>
</div>`,

                list: `<div state="{ search: '' }">
  <input model="search" placeholder="Search...">
  <div get="/items" as="items">
    <div each="item in items" key="item.id"
         animate="fadeIn" animate-stagger="50">
      <h3 bind="item.title"></h3>
      <p bind="item.description | truncate(100)"></p>
    </div>
    <p if="items.length === 0">No items found.</p>
  </div>
</div>`,

                detail: `<div get="/items/{$route.params.id}" as="item">
  <template if="item">
    <h1 bind="item.title"></h1>
    <p bind="item.description"></p>
    <span bind="item.createdAt | relative"></span>
  </template>
  <template else>
    <p>Loading...</p>
  </template>
</div>`,

                card: `<div class="card" state="{ expanded: false }">
  <div class="card-header">
    <h3 bind="title"></h3>
    <button on:click="expanded = !expanded">
      <span hide="expanded">▸</span>
      <span show="expanded">▾</span>
    </button>
  </div>
  <div class="card-body" show="expanded" animate="fadeInDown">
    <p bind="description"></p>
  </div>
</div>`,

                modal: `<div state="{ open: false }">
  <button on:click="open = true">Open Modal</button>
  <div class="modal-overlay" show="open" on:click.self="open = false"
       animate-enter="fadeIn" animate-leave="fadeOut">
    <div class="modal-content" animate-enter="fadeInUp" animate-leave="fadeOutDown">
      <div class="modal-header">
        <h2>Modal Title</h2>
        <button on:click="open = false">&times;</button>
      </div>
      <div class="modal-body">
        <p>Modal content goes here.</p>
      </div>
      <div class="modal-footer">
        <button on:click="open = false">Close</button>
      </div>
    </div>
  </div>
</div>`,

                nav: `<nav class="navbar">
  <a route="/" class="logo">App</a>
  <div class="nav-links">
    <a route="/" route-active="active">Home</a>
    <a route="/features" route-active="active">Features</a>
    <a route="/about" route-active="active">About</a>
    <a route="/contact" route-active="active">Contact</a>
  </div>
</nav>`,
            };

            let html = templates[type] || templates["card"];
            let description = `NoJS ${type} component template`;

            // Add feature hints
            const featureNotes: string[] = [];
            if (features.includes("i18n")) {
                featureNotes.push(
                    "Add t=\"key\" to text elements for i18n support"
                );
            }
            if (features.includes("animation")) {
                featureNotes.push(
                    'Add animate="fadeIn" or transition="slide" for animations'
                );
            }
            if (features.includes("dnd")) {
                featureNotes.push(
                    "Add drag/drop attributes for drag-and-drop support"
                );
            }

            let output = `## Generated ${type} template\n\n\`\`\`html\n${html}\n\`\`\`\n`;
            if (featureNotes.length > 0) {
                output += `\n## Feature Notes\n\n${featureNotes.map((n) => `- ${n}`).join("\n")}\n`;
            }

            return {
                content: [{ type: "text" as const, text: output }],
            };
        }
    );

    // ── get_cheatsheet ──
    server.tool(
        "get_cheatsheet",
        "Get a condensed NoJS directive cheatsheet for quick reference",
        {},
        async () => {
            const cheatsheet = loadDoc("cheatsheet.md");
            return {
                content: [{ type: "text" as const, text: cheatsheet }],
            };
        }
    );
}
