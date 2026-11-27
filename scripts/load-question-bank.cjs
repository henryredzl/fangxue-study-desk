const cityQuestions = require('../city-bank.js');

function embeddedBank(html, id) {
  const opening = `<script id="${id}" type="application/json">`;
  const start = html.indexOf(opening);
  const end = html.indexOf('</script>', start + opening.length);
  if (start === -1 || end === -1) throw new Error(`Missing ${id} in index.html.`);
  return JSON.parse(html.slice(start + opening.length, end));
}

function loadQuestionBank(html) {
  const curriculum = embeddedBank(html, 'question-bank');
  const olympiad = embeddedBank(html, 'olympiad-bank');
  const english = embeddedBank(html, 'english-lesson-bank');
  const questions = new Map();
  function add(id, question) {
    if (!id || questions.has(id)) throw new Error(`Invalid or repeated question ID: ${id}`);
    questions.set(id, question);
  }

  for (const topic of Object.values(curriculum).flat()) {
    topic.questions.forEach((question, index) => add(`${topic.id}-${index + 1}`, question));
  }
  for (const question of Object.values(cityQuestions).flat()) add(question.id, question);
  for (const paper of olympiad) {
    for (const stage of paper.stages) {
      for (const question of stage.questions) add(question.id, question);
    }
  }
  for (const unit of english) {
    for (const lesson of unit.lessons) {
      for (const question of lesson.questions) add(question.id, question);
    }
  }
  return questions;
}

module.exports = loadQuestionBank;
