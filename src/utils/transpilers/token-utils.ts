import type { BoundVariableToken } from '../../types/messages.js';

function cleanTokenName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/^(?:static|schemes|sys|m3|md|core|primitives|semantic|theme|colors|spacing|typography)\s*[/\\_-]\s*/i, '')
    .replace(/^(?:light|dark)\s*[/\\_-]\s*/i, '');
  return cleaned.trim() || name;
}

function toCamelCaseToken(name: string): string {
  const cleaned = cleanTokenName(name);
  return cleaned
    .trim()
    .replace(/[/\\_\s-]+([a-zA-Z0-9])/g, (_, chr: string) => chr.toUpperCase())
    .replace(/^[^a-zA-Z_$]+/, '')
    .replace(/^[A-Z]/, (chr) => chr.toLowerCase()) || 'token';
}

function toPascalCaseToken(name: string): string {
  const camel = toCamelCaseToken(name);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

export function getPlatformToken(
  token: BoundVariableToken,
  platform: 'react-native' | 'flutter' | 'swiftui' | 'compose'
): string {
  const camel = toCamelCaseToken(token.variableName);
  const pascal = toPascalCaseToken(token.variableName);

  switch (platform) {
    case 'react-native':
      return `tokens.${camel}`;

    case 'flutter':
      if (token.codeSyntax?.android) return token.codeSyntax.android;
      if (token.field === 'fill' || token.field === 'stroke') return `AppColors.${camel}`;
      if (token.field.includes('Radius') || token.field === 'cornerRadius') return `AppRadius.${camel}`;
      if (['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing'].includes(token.field)) {
        return `AppTypography.${camel}`;
      }
      return `AppSpacing.${camel}`;

    case 'swiftui':
      if (token.codeSyntax?.ios) return token.codeSyntax.ios;
      if (token.field === 'fill' || token.field === 'stroke') return `Color("${cleanTokenName(token.variableName)}")`;
      if (['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing'].includes(token.field)) {
        return `Theme.${camel}`;
      }
      return `Theme.${camel}`;

    case 'compose':
      if (token.codeSyntax?.android) return token.codeSyntax.android;
      if (token.field === 'fill' || token.field === 'stroke') return `AppColors.${pascal}`;
      if (token.field.includes('Radius') || token.field === 'cornerRadius') return `AppRadius.${pascal}`;
      if (['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing'].includes(token.field)) {
        return `AppTypography.${pascal}`;
      }
      return `AppSpacing.${pascal}`;

    default:
      return `tokens.${camel}`;
  }
}
