const LTR_CHARS = 'A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF'+'\u2C00-\uFB1C\uFDFE-\uFE6F\uFEFD-\uFFFF';
const RTL_CHARS = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const IS_RTL_REGEX = new RegExp('^[^'+LTR_CHARS+']*['+RTL_CHARS+']');

export function isRTL(char: string){
  if(char.length > 0){
    return(IS_RTL_REGEX.test(char[0]))
  } else {
    return false;
  }
}
