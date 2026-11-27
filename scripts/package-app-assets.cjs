const fs = require('node:fs');
const path = require('node:path');
const loadQuestionBank = require('./load-question-bank.cjs');

function packageAssets(output, platform) {
  if (!output) throw new Error('An app assets folder is required.');
  const root = path.resolve(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const gradingBank = Object.fromEntries(Array.from(loadQuestionBank(html), ([id, question]) => {
    const {type, answer, choices, caseSensitive} = question;
    return [id,{type,answer,choices,caseSensitive}];
  }));
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'question-bank.json'), JSON.stringify(gradingBank));
  const isIOS = platform === 'ios';
  const prefix = isIOS ? './' : '/';
  const css = isIOS ? 'mobile.css' : 'android.css';
  const policy = "default-src 'none'; script-src studydesk: 'unsafe-inline'; style-src studydesk: 'unsafe-inline'; img-src studydesk: data:; media-src data:; base-uri 'none'; form-action 'none'";
  const mobileHtml = (isIOS ? html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n  <meta http-equiv="Content-Security-Policy" content="${policy}">`) : html)
    .replace('</head>', `<link rel="stylesheet" href="${prefix}account.css">\n<link rel="stylesheet" href="${prefix}${css}">\n</head>`)
    .replace('</body>', `<script src="${prefix}account.js"></script>\n</body>`)
    .replaceAll(' target="_blank"', '');
  fs.writeFileSync(path.join(output, 'index.html'), mobileHtml);
  for (const file of ['city-bank.js', 'account.js', 'account.css']) fs.copyFileSync(path.join(root, file), path.join(output, file));
  fs.copyFileSync(path.join(root, 'android', 'src', 'main', 'android.css'), path.join(output, css));
}

module.exports = packageAssets;
if (require.main === module) packageAssets(process.argv[2], 'ios');
