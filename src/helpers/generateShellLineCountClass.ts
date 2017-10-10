import {MAX_SHELL_LINES} from '../settings';

export const generateShellLineCountClass = (lines: number, prefix='shell-lines-') => `${prefix}${(lines < MAX_SHELL_LINES) ? lines : 'max'}`;
