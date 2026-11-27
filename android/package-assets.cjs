const fs = require('node:fs');
const path = require('node:path');

const output = process.argv[2];
if (!output) throw new Error('An Android assets folder is required.');
const desktop = path.join(__dirname, '..');
const cityQuestions = require('../city-bank.js');
const html = fs.readFileSync(path.join(desktop, 'index.html'), 'utf8');
const bank = html.match(/<script id="question-bank" type="application\/json">([\s\S]*?)<\/script>/);
if (!bank) throw new Error('Missing question bank in index.html.');
fs.mkdirSync(output, { recursive: true });
const originalQuestions = Object.values(JSON.parse(bank[1])).flatMap(topics => topics.flatMap(topic =>
  topic.questions.map((question, index) => ({...question,id:`${topic.id}-${index + 1}`}))
));
const gradingBank = Object.fromEntries([...originalQuestions,...Object.values(cityQuestions).flat()].map(question => {
  const {id, type, answer, choices, caseSensitive} = question;
  return [id,{type,answer,choices,caseSensitive}];
}));
fs.writeFileSync(path.join(output, 'question-bank.json'), JSON.stringify(gradingBank));
const mobileHtml = html.replace('</head>', '<link rel="stylesheet" href="/account.css">\n<link rel="stylesheet" href="/android.css">\n</head>')
  .replace('</body>', '<script src="/account.js"></script>\n</body>')
  .replaceAll(' target="_blank"', '');
fs.writeFileSync(path.join(output, 'index.html'), mobileHtml);
for (const file of ['city-bank.js', 'account.js', 'account.css']) fs.copyFileSync(path.join(desktop, file), path.join(output, file));
fs.copyFileSync(path.join(__dirname, 'src', 'main', 'android.css'), path.join(output, 'android.css'));
