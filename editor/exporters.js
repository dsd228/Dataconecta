// editor/exporters.js
// Export helpers: generate HTML, CSS, React component markup from a Fabric object or component definition.
// Basic implementations: generate static HTML/CSS and a React functional component.

export function generateHTMLFromComponent(componentJson, options = {}) {
  // componentJson: fabric toJSON for a group/component. For demo we output an image snapshot plus wrapper.
  const html = `<div class="dc-component">\n  <!-- Rendered by browser: use canvas.toDataURL to produce an <img> -->\n  <img src="${options.dataUrl || ''}" alt="${options.name || 'component'}" />\n</div>\n`;
  return html;
}

export function generateCSSFromTokens(tokens = { primary:'#4f46e5', font:'Inter, system-ui' }) {
  return `:root {\n  --dc-primary: ${tokens.primary};\n  --dc-font: ${tokens.font};\n}\n\nbody { font-family: var(--dc-font); }\n`;
}

export function generateReactComponent(componentJson, name = 'DCComponent') {
  // Simple React component using inline styles: export JSX string
  const jsx = `import React from 'react';\n\nexport default function ${name}({ className = '' }) {\n  return (\n    <div className={className} style={{ display:'inline-block' }}>\n      {/* Replace with <img src={...} /> exported from canvas */}\n      <img alt="${name}" src={/* data URL here */ ''} />\n    </div>\n  );\n}\n`;
  return jsx;
}
