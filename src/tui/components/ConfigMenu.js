const React = require('react');
const { Box, Text, useInput } = require('ink');

const FORMATS = ['terminal', 'html', 'both'];
const DEPTHS = [100, 200, 500, 1000, 2000];
const THEMES = ['auto', 'dark', 'light'];

function ConfigMenu({ config, onSave, onBack }) {
  const [selectedField, setSelectedField] = React.useState(0);
  const fields = ['reportFormat', 'depth', 'theme'];

  useInput((input, key) => {
    if (key.escape || key.ctrlC || input === 'q') {
      onBack();
    } else if (key.upArrow) {
      setSelectedField(prev => Math.max(0, prev - 1));
    } else if (key.downArrow) {
      setSelectedField(prev => Math.min(fields.length - 1, prev + 1));
    } else if (key.leftArrow || key.rightArrow) {
      const field = fields[selectedField];
      if (field === 'reportFormat') {
        const idx = FORMATS.indexOf(config.reportFormat || 'both');
        const next = key.rightArrow
          ? FORMATS[(idx + 1) % FORMATS.length]
          : FORMATS[(idx - 1 + FORMATS.length) % FORMATS.length];
        onSave('reportFormat', next);
      } else if (field === 'depth') {
        const idx = DEPTHS.indexOf(config.depth || 500);
        const next = key.rightArrow
          ? DEPTHS[Math.min(idx + 1, DEPTHS.length - 1)]
          : DEPTHS[Math.max(idx - 1, 0)];
        onSave('depth', next);
      } else if (field === 'theme') {
        const idx = THEMES.indexOf(config.theme || 'auto');
        const next = key.rightArrow
          ? THEMES[(idx + 1) % THEMES.length]
          : THEMES[(idx - 1 + THEMES.length) % THEMES.length];
        onSave('theme', next);
      }
    }
  });

  const renderField = (label, value, options, fieldIndex) => {
    const isSelected = selectedField === fieldIndex;
    return React.createElement(Box, { key: fieldIndex, paddingLeft: 2 },
      React.createElement(Text, { bold: true, color: isSelected ? 'cyan' : undefined }, `${label}: `.padEnd(16)),
      React.createElement(Text, {
        color: isSelected ? 'cyan' : 'white',
        inverse: isSelected,
      }, ` ${value} `),
      React.createElement(Text, { dimColor: true }, isSelected ? '  ←→ change' : ''),
    );
  };

  return React.createElement(Box, { flexDirection: 'column', padding: 1 },
    React.createElement(Text, { bold: true, color: 'cyan' }, '┌─ Settings ─────────────────┐'),
    React.createElement(Text, null, ''),
    renderField('Report format', config.reportFormat || 'both', FORMATS, 0),
    renderField('Depth', String(config.depth || 500), DEPTHS, 1),
    renderField('Theme', config.theme || 'auto', THEMES, 2),
    React.createElement(Text, null, ''),
    React.createElement(Text, { dimColor: true }, '  ↑↓ select field | ←→ change value | Esc/back to return'),
    React.createElement(Text, { bold: true, color: 'cyan' }, '└────────────────────────────┘'),
  );
}

module.exports = ConfigMenu;
