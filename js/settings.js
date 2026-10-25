// 遊戲設定（存在瀏覽器，與存檔分開）
const KEY = 'sgz-settings';
const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
export const SETTINGS = {
  music: 0.5, sfx: 0.7, quality: mobile ? 'low' : 'high', textSpeed: 'normal', autoPlay: false, skipSeen: false, mobile,
};
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { }
SETTINGS.mobile = mobile;
export function saveSettings() { try { const { mobile: _, ...s } = SETTINGS; localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { } }
export const QUALITY = {
  low: { name: '低', pixelRatio: 1, shadow: 1024, shadows: true, soldierCap: 220, grass: 1500, trees: 0.5 },
  medium: { name: '中', pixelRatio: 1.25, shadow: 2048, shadows: true, soldierCap: 320, grass: 4000, trees: 0.8 },
  high: { name: '高', pixelRatio: 2, shadow: 4096, shadows: true, soldierCap: 400, grass: 7000, trees: 1 },
};
export const Q = () => QUALITY[SETTINGS.quality] || QUALITY.high;
export const TEXT_SPEED = { slow: 45, normal: 28, fast: 12, instant: 0 };
