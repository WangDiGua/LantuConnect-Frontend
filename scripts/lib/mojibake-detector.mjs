const MOJIBAKE_FRAGMENTS = [
  '璇峰',
  '鍐欐',
  '鏈嶅姟',
  '璁板綍',
  '鏂囦欢',
  '璧勬簮',
  '鍙傛暟',
  '鍚嶇О',
  '鍦板潃',
  '鎻愪氦',
  '鎻忚堪',
  '閫夋嫨',
  '鍔犺浇',
  '閿欒',
  '鑳藉姏',
  '宸ュ叿',
  '鍏煎',
  '鍘熺敓',
  '鍩庡競',
  '杩斿洖',
  '鐧剧偧',
  '闃块噷',
  '鏈湴',
  '宸插彂甯',
];

const CHINESE_QUESTION_MARK_PATTERN = /[\u3400-\u9fff]{2,}\?(?=[\u3400-\u9fff0-9])/u;

export function detectMojibakeInLine(line) {
  if (!line) return false;
  if (MOJIBAKE_FRAGMENTS.some((fragment) => line.includes(fragment))) {
    return true;
  }
  return CHINESE_QUESTION_MARK_PATTERN.test(line);
}

export function listMojibakeHits(text) {
  return text
    .split(/\r?\n/)
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => detectMojibakeInLine(line));
}
