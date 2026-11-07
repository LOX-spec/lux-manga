const fontChoices = ['Tajawal', 'Cairo', 'IBM Plex Sans Arabic'];
function applyAppFont(value) {
  const font = fontChoices.includes(value) ? value : 'Tajawal';
  document.documentElement.style.setProperty('--app-font', '"' + font + '"');
  try { localStorage.setItem('lux.app.font', font); } catch {}
}
const settingsBeforeFonts = renderSettings;
renderSettings = function() {
  settingsBeforeFonts();
  let selected = 'Tajawal';
  try { selected = localStorage.getItem('lux.app.font') || selected; } catch {}
  const section = document.createElement('section');
  section.className = 'backup-panel';
  section.innerHTML = '<label for="appFontFamily">خط القراءة والعناوين</label><select id="appFontFamily">' +
    fontChoices.map(font => '<option' + (font === selected ? ' selected' : '') + '>' + font + '</option>').join('') +
    '</select><p>يُحفظ الخط على هذا الجهاز ويُطبّق على التطبيق والقارئ.</p>';
  $('#page').append(section);
  section.querySelector('select').onchange = event => applyAppFont(event.target.value);
};
const sitesBeforeStats = renderSites;
renderSites = function() {
  sitesBeforeStats();
  const container = $('#page .source-overview');
  if (!container) return;
  const snapshot = [
    [state.sites.length, 'مصادر مضافة'],
    [books().length, 'أعمال في المكتبة'],
    [state.sites.filter(site => syncing.has(site.id)).length, 'عمليات فحص جارية']
  ];
  const items = snapshot.map(([value, label]) => {
    const item = document.createElement('div');
    const count = document.createElement('b');
    count.textContent = value.toLocaleString('ar-SA');
    const caption = document.createElement('small');
    caption.textContent = label;
    item.append(count, caption);
    return item;
  });
  container.replaceChildren(...items);
};
