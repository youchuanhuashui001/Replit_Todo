// Simple printf parser and formatter

export type Token = 
  | { type: 'text'; value: string }
  | { 
      type: 'specifier'; 
      match: string;
      flags: string; 
      width: string; 
      precision: string; 
      length: string; 
      specifier: string;
    };

export function parsePrintf(formatString: string): Token[] {
  const tokens: Token[] = [];
  
  // Regex to match printf specifiers
  // % [flags] [width] [.precision] [length] specifier
  // Flags: -, +, space, #, 0
  // Width: number or *
  // Precision: .number or .*
  // Length: h, l, j, z, t, L
  // Specifier: d, i, u, o, x, X, f, F, e, E, g, G, a, A, c, s, p, n, %, b
  const regex = /%([-+ #0]*)(?:(\d+)|\*)?(?:\.(\d+)|\.\*)?([hljztL]*)([diuoxXfFeEgGaAcspn%b])/g;
  
  let lastIndex = 0;
  let match;
  
  while ((match = regex.exec(formatString)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: formatString.slice(lastIndex, match.index)
      });
    }
    
    tokens.push({
      type: 'specifier',
      match: match[0],
      flags: match[1] || '',
      width: match[2] || '',
      precision: match[3] || '',
      length: match[4] || '',
      specifier: match[5]
    });
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < formatString.length) {
    tokens.push({
      type: 'text',
      value: formatString.slice(lastIndex)
    });
  }
  
  return tokens;
}

export function formatPrintf(tokens: Token[], args: string[]): string {
  let result = '';
  let argIndex = 0;
  
  for (const token of tokens) {
    if (token.type === 'text') {
      result += token.value;
      continue;
    }
    
    if (token.type === 'specifier') {
      if (token.specifier === '%') {
        result += '%';
        continue;
      }
      
      const argValue = args[argIndex] !== undefined ? args[argIndex] : '';
      argIndex++;
      
      try {
        result += formatToken(token, argValue);
      } catch (e) {
        // Fallback to raw match if formatting fails
        result += token.match;
      }
    }
  }
  
  return result;
}

function formatToken(token: any, value: string): string {
  const { flags, width, precision, specifier } = token;
  
  let formatted = '';
  
  // Basic numeric parsing
  const numValue = parseFloat(value);
  const intValue = parseInt(value, 10);
  const isNumeric = !isNaN(numValue);
  
  switch (specifier) {
    case 's':
      formatted = value;
      if (precision) {
        formatted = formatted.substring(0, parseInt(precision, 10));
      }
      break;
    case 'c':
      formatted = value.charAt(0) || '';
      break;
    case 'd':
    case 'i':
      if (!isNumeric) formatted = 'NaN';
      else {
        formatted = Math.trunc(numValue).toString(10);
      }
      break;
    case 'u':
      if (!isNumeric) formatted = 'NaN';
      else {
        formatted = Math.abs(Math.trunc(numValue)).toString(10);
      }
      break;
    case 'o':
      if (!isNumeric) formatted = 'NaN';
      else {
        formatted = Math.trunc(Math.abs(numValue)).toString(8);
        if (flags.includes('#') && formatted !== '0') formatted = '0' + formatted;
      }
      break;
    case 'x':
      if (!isNumeric) formatted = 'NaN';
      else {
        formatted = Math.trunc(Math.abs(numValue)).toString(16).toLowerCase();
        if (flags.includes('#') && formatted !== '0') formatted = '0x' + formatted;
      }
      break;
    case 'X':
      if (!isNumeric) formatted = 'NaN';
      else {
        formatted = Math.trunc(Math.abs(numValue)).toString(16).toUpperCase();
        if (flags.includes('#') && formatted !== '0') formatted = '0X' + formatted;
      }
      break;
    case 'b': // binary extension
      if (!isNumeric) formatted = 'NaN';
      else {
        formatted = Math.trunc(Math.abs(numValue)).toString(2);
        if (flags.includes('#') && formatted !== '0') formatted = '0b' + formatted;
      }
      break;
    case 'f':
    case 'F':
      if (!isNumeric) formatted = 'NaN';
      else {
        const prec = precision ? parseInt(precision, 10) : 6;
        formatted = numValue.toFixed(prec);
      }
      break;
    case 'e':
      if (!isNumeric) formatted = 'NaN';
      else {
        const prec = precision ? parseInt(precision, 10) : 6;
        formatted = numValue.toExponential(prec).toLowerCase();
      }
      break;
    case 'E':
      if (!isNumeric) formatted = 'NaN';
      else {
        const prec = precision ? parseInt(precision, 10) : 6;
        formatted = numValue.toExponential(prec).toUpperCase();
      }
      break;
    case 'g':
    case 'G':
      if (!isNumeric) formatted = 'NaN';
      else {
        // approximate g implementation
        const prec = precision ? parseInt(precision, 10) : 6;
        const eStr = numValue.toExponential(prec);
        const fStr = numValue.toFixed(prec);
        formatted = eStr.length < fStr.length ? eStr : fStr;
        if (specifier === 'G') formatted = formatted.toUpperCase();
        else formatted = formatted.toLowerCase();
      }
      break;
    case 'p':
      formatted = value ? `0x${Math.abs(parseInt(value) || 0).toString(16)}` : '(nil)';
      break;
    default:
      formatted = value;
  }

  // Handle numeric flags (+, space)
  if ('diuoxXfFeEgG'.includes(specifier) && isNumeric) {
    if (numValue >= 0) {
      if (flags.includes('+')) formatted = '+' + formatted;
      else if (flags.includes(' ')) formatted = ' ' + formatted;
    }
  }
  
  // Padding width
  if (width) {
    const w = parseInt(width, 10);
    if (formatted.length < w) {
      const padChar = (flags.includes('0') && !flags.includes('-') && 'diuoxXfFeEgG'.includes(specifier)) ? '0' : ' ';
      if (flags.includes('-')) {
        // Left justify
        formatted = formatted.padEnd(w, padChar);
      } else {
        // Right justify
        if (padChar === '0' && ('+- '.includes(formatted[0]))) {
          // move sign to front of padding
          formatted = formatted[0] + formatted.slice(1).padStart(w - 1, '0');
        } else {
          formatted = formatted.padStart(w, padChar);
        }
      }
    }
  }

  return formatted;
}
