#!/usr/bin/env python3
import re

# Read used classes
with open('/tmp/used.txt') as f:
    used = set(line.strip() for line in f)

# Read components.css
with open('src/styles/components.css') as f:
    comp_lines = f.readlines()

# Read layout.css
with open('src/styles/layout.css') as f:
    layout_lines = f.readlines()

def should_keep_line(line, in_rule=False):
    """Check if line should be kept"""
    stripped = line.strip()

    # Always keep comments, empty lines, closing braces
    if not stripped or stripped.startswith('/*') or stripped == '*/':
        return True
    if stripped == '}':
        return True

    # Check if selector starts with any used class (or is a pseudo/modifier)
    for cls in used:
        # Match: .fw-xxx { or .fw-xxx:hover or .fw-xxx__part
        if (stripped.startswith(f'.{cls} ') or
            stripped.startswith(f'.{cls}:') or
            stripped.startswith(f'.{cls}[') or
            stripped.startswith(f'.{cls}::') or
            stripped.startswith(f'.{cls}--') or
            stripped.startswith(f'.{cls}__') or
            stripped.startswith(f'.{cls},{') or
            stripped.startswith(f'.{cls}\n')):
            return True

    # Keep @media rules
    if stripped.startswith('@'):
        return True

    return False

# Filter components.css
result = []
in_rule = False
for line in comp_lines:
    if should_keep_line(line, in_rule):
        result.append(line)
    elif line.strip() == '{':
        in_rule = True
        result.append(line)

# Add layout section header
result.append('\n/* ============================================================')
result.append('   LAYOUT — App shell, cockpit, mobile responsive')
result.append('   ============================================================ */\n')

# Add layout.css content
for line in layout_lines:
    stripped = line.strip()
    # Skip header comment
    if '/*' in stripped and 'App Layout' in stripped:
        continue
    if '*/' in stripped and stripped.startswith('*/'):
        continue
    result.append(line)

# Write merged file
with open('src/styles/components.css', 'w') as f:
    f.writelines(result)

# Count lines
lines = len([l for l in result if l.strip()])
print(f"✓ Merged components.css: {lines} lines")
