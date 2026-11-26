const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const groupSize = 8;
const series = make => Array.from({ length: groupSize }, (_, index) => make(index));

function fill(ask, answer, why, hint, units = '') {
  const numeric = typeof answer === 'number';
  const accepted = Array.isArray(answer) ? answer : [String(answer)];
  if (units) accepted.push(`${answer}${units}`);
  const entry = { type: 'fill', ask, answer: accepted, why, hint };
  if (numeric) entry.inputMode = 'numeric';
  if (Array.isArray(answer)) entry.answerFormat = 'fraction';
  return entry;
}

function set(label, questions) {
  assert.equal(questions.length, groupSize, label);
  return { label, questions };
}

function drill(id, title, category, lesson, sets) {
  return { id: `calc-${id}`, title, unit: category, lesson, drill: { size: groupSize, sets: sets.map(item => item.label) }, questions: sets.flatMap(item => item.questions) };
}

function mentalMultiply(number, factor, scale = 1) {
  const value = number * scale;
  const result = value * factor;
  const unit = scale === 10 ? '十' : '百';
  if (scale !== 1) return fill(`${value} × ${factor} =（　）`, result,
    `${value} 是 ${number} 个${unit}。${number} × ${factor} = ${number * factor}，所以结果是 ${number * factor} 个${unit}，也就是 ${result}。`,
    `把 ${value} 看作 ${number} 个${unit}，再乘 ${factor}。`);

  const parts = String(number).split('').map((digit, index, digits) => Number(digit) * 10 ** (digits.length - index - 1));
  const pieces = parts.filter(Boolean);
  const products = pieces.map(part => `${part} × ${factor} = ${part * factor}`);
  return fill(`${number} × ${factor} =（　）`, result, `分开算 ${products.join('，')}。把这些积相加，得到 ${result}。`,
    `把 ${number} 拆成 ${pieces.join('、')}，再分别乘 ${factor}。`);
}

function writtenMultiply(number, factor, context = '') {
  const digits = String(number).split('').reverse().map(Number);
  const names = ['个', '十', '百'];
  let carry = 0;
  const steps = digits.map((digit, index) => {
    const before = carry;
    const total = digit * factor + before;
    carry = Math.floor(total / 10);
    const formula = `${digit}×${factor}${before ? `＋${before}` : ''}＝${total}`;
    const outcome = carry && index < digits.length - 1 ? `写 ${total % 10}，向前一位进 ${carry}` : `写 ${total}`;
    return `${names[index]}位 ${formula}，${outcome}`;
  });
  const ask = context || `用竖式计算 ${number} × ${factor}，填出得数。`;
  return fill(ask, number * factor, `${steps.join('。')}。所以 ${number} × ${factor} = ${number * factor}。`, '从个位乘起，每一位都加上后一位进来的数。');
}

function estimate(number, factor, scale, context = false) {
  const rounded = Math.round(number / scale) * scale;
  const unit = scale === 10 ? '整十数' : '整百数';
  const ask = context
    ? `每个书架大约放 ${number} 本书。把 ${number} 看成最接近的${unit}，估算 ${factor} 个书架大约放多少本。`
    : `把 ${number} 看成最接近的${unit}，估算 ${number} × ${factor} 约等于多少。`;
  return fill(ask, rounded * factor, `${number} 最接近 ${rounded}。${rounded} × ${factor} = ${rounded * factor}。`,
    `先找到 ${number} 两边的${unit}，再比较哪个离它更近。`, context ? '本' : '');
}

function calculate(expression, answer, explanation, hint) {
  return fill(`${expression} =（　）`, answer, explanation, hint);
}

function fractionOperation(a, b, denominator, subtract) {
  const numerator = subtract ? a - b : a + b;
  const left = a === denominator ? '1' : `${a}/${denominator}`;
  const expression = `${left} ${subtract ? '−' : '+'} ${b}/${denominator}`;
  const fraction = `${numerator}/${denominator}`;
  const isWhole = numerator === 0 || numerator === denominator;
  const accepted = isWhole ? [String(numerator / denominator), fraction] : [fraction];
  const operation = subtract ? '减' : '相加';
  const convert = a === denominator ? `把 1 看成 ${denominator}/${denominator}。` : '';
  const result = isWhole ? `写成 ${fraction} 或 ${accepted[0]} 都可以。` : `得 ${fraction}。`;
  return fill(`${expression} =（　）`, accepted, `${convert}分母还是 ${denominator}，分子 ${a} ${subtract ? '−' : '+'} ${b} = ${numerator}。${result}`,
    a === denominator ? `先想：${denominator} 个 ${denominator} 分之一是多少？` : `分母相同，分母保留，把两个分子${operation}。`);
}

function unitConvert(value, source, target, ratio, reverse = false) {
  const answer = reverse ? value / ratio : value * ratio;
  const equivalence = reverse ? `1 ${target} = ${ratio} ${source}` : `1 ${source} = ${ratio} ${target}`;
  return fill(`${value} ${source} =（　）${target}`, answer,
    `${equivalence}。${value} ${reverse ? '÷' : '×'} ${ratio} = ${answer}。`, `先写出两个单位的关系：${equivalence}。`, target);
}

const drills = [
  drill('mental', '口算乘法', '多位数乘一位数', '整十、整百乘一位数时，先看有几个十或几个百。不进位乘法也可以把各数位拆开算。', [
    set('整十数乘一位数', series(i => mentalMultiply(i + 2, [3, 4, 2, 6, 7, 4, 9, 8][i], 10))),
    set('整百数乘一位数', series(i => mentalMultiply(i + 2, [5, 6, 8, 2, 7, 9, 4, 3][i], 100))),
    set('拆数口算', [12, 31, 42, 123, 211, 321, 121, 312].map((n, i) => mentalMultiply(n, [4, 3, 2, 2, 3, 3, 4, 2][i])))
  ]),
  drill('two-digit', '两位数乘一位数', '多位数乘一位数', '从个位乘起。个位满几十就向十位进几，算十位时记得把进位加上。', [
    set('两位数笔算起步', [11, 12, 13, 21, 22, 23, 32, 41].map((n, i) => writtenMultiply(n, [5, 3, 3, 4, 4, 3, 2, 2][i]))),
    set('个位进位', [17, 24, 36, 27, 18, 28, 19, 46].map((n, i) => writtenMultiply(n, [3, 4, 2, 3, 5, 2, 4, 2][i]))),
    set('积是三位数', [28, 46, 57, 69, 76, 88, 95, 79].map((n, i) => writtenMultiply(n, [6, 7, 3, 4, 5, 6, 8, 9][i])))
  ]),
  drill('three-digit', '三位数乘一位数', '多位数乘一位数', '依次算个位、十位、百位。连续进位时，算一位就把该位的进位记在下一位旁边。', [
    set('不进位与一次进位', [112, 243, 124, 411, 318, 217, 146, 213].map((n, i) => writtenMultiply(n, [4, 2, 2, 2, 3, 4, 2, 3][i]))),
    set('连续进位', [267, 358, 479, 556, 682, 768, 379, 998].map((n, i) => writtenMultiply(n, [3, 6, 4, 8, 7, 5, 9, 9][i]))),
    set('实际问题列式算', series(i => {
      const number = [128, 146, 237, 356, 218, 325, 276, 489][i];
      const factor = [3, 4, 4, 3, 5, 6, 7, 8][i];
      const [ask, unit] = [
        [`每箱装 ${number} 支彩笔，${factor} 箱共装多少支？`, '支'],
        [`礼堂每排有 ${number} 个座位，${factor} 排共有多少个座位？`, '个'],
        [`每包有 ${number} 张彩纸，${factor} 包共有多少张？`, '张'],
        [`每个书架摆 ${number} 本书，${factor} 个书架共摆多少本？`, '本'],
        [`每袋有 ${number} 粒种子，${factor} 袋共有多少粒？`, '粒'],
        [`一本故事书有 ${number} 页，${factor} 本同样的书共有多少页？`, '页'],
        [`每场演出有 ${number} 位观众，${factor} 场共接待多少人次？`, '人次'],
        [`每箱装 ${number} 块积木，${factor} 箱共有多少块？`, '块']
      ][i];
      const item = writtenMultiply(number, factor, ask);
      item.answer.push(`${number * factor}${unit}`);
      return item;
    }))
  ]),
  drill('zero', '乘数里有 0', '多位数乘一位数', '遇到中间的 0，要算上个位进来的数。末尾有 0 时，可先算 0 前面的数，再按原来的 0 的个数在积末尾添 0。', [
    set('中间有 0', [103, 204, 305, 409, 506, 708, 807, 909].map((n, i) => writtenMultiply(n, [2, 3, 4, 5, 6, 7, 8, 9][i]))),
    set('末尾有 0', [130, 250, 370, 460, 540, 690, 750, 980].map((n, i) => writtenMultiply(n, [3, 4, 2, 5, 6, 4, 7, 8][i]))),
    set('0 的位置辨清楚', [104, 140, 206, 260, 308, 380, 405, 450].map((n, i) => writtenMultiply(n, [3, 3, 5, 5, 7, 7, 9, 9][i])))
  ]),
  drill('estimate', '乘法估算', '多位数乘一位数', '按题意把多位数看成接近的整十数或整百数，再口算。估算结果用来判断大致范围。', [
    set('接近整十数', [18, 24, 27, 39, 52, 67, 84, 96].map((n, i) => estimate(n, i + 2, 10))),
    set('接近整百数', [108, 192, 206, 289, 318, 486, 593, 704].map((n, i) => estimate(n, i + 2, 100))),
    set('生活中的估算', [38, 53, 72, 87, 187, 206, 394, 708].map((n, i) => estimate(n, [4, 6, 3, 5, 7, 4, 8, 6][i], i < 4 ? 10 : 100, true)))
  ]),
  drill('same-order', '同级运算', '混合运算', '没有括号，只有加减或者只有乘除，要从左到右算。', [
    set('加减混合', series(i => {
      const a = 19 + 3 * i, b = 12 + i, c = 7 + i;
      return calculate(`${a} + ${b} − ${c}`, a + b - c, `先算 ${a} + ${b} = ${a + b}，再算 ${a + b} − ${c} = ${a + b - c}。`, '先算出左边两个数的和。');
    })),
    set('连减和减后加', series(i => {
      const a = 62 + 4 * i, b = 12 + 2 * i, c = 8 + i;
      const sign = i % 2 ? '+' : '−';
      const result = i % 2 ? a - b + c : a - b - c;
      return calculate(`${a} − ${b} ${sign} ${c}`, result, `先算 ${a} − ${b} = ${a - b}，再算 ${a - b} ${sign} ${c} = ${result}。`, '从左到右，先做前面的减法。');
    })),
    set('乘除混合', series(i => {
      const a = i + 2, b = 9 - i, c = i < 4 ? i + 2 : b;
      return i < 4
        ? calculate(`${a * b} ÷ ${b} × ${c}`, a * c, `先算 ${a * b} ÷ ${b} = ${a}，再算 ${a} × ${c} = ${a * c}。`, '这是同级运算，先算左边的除法。')
        : calculate(`${a} × ${b} ÷ ${c}`, a, `先算 ${a} × ${b} = ${a * b}，再算 ${a * b} ÷ ${c} = ${a}。`, '这是同级运算，先算左边的乘法。');
    }))
  ]),
  drill('priority', '先乘除后加减', '混合运算', '一个算式里有加减和乘除时，先圈出乘法或除法算出结果，再做加减。', [
    set('乘法和加减', series(i => {
      const a = i + 2, b = 9 - i, c = 48 + 4 * i, sign = i % 2 ? '−' : '+';
      const answer = i % 2 ? c - a * b : c + a * b;
      return calculate(`${c} ${sign} ${a} × ${b}`, answer, `先算 ${a} × ${b} = ${a * b}，再算 ${c} ${sign} ${a * b} = ${answer}。`, '哪两个数相乘？先算它们的积。');
    })),
    set('除法和加减', series(i => {
      const q = i + 2, d = 9 - i, a = 13 + 6 * i;
      return i % 2
        ? calculate(`${a} − ${q * d} ÷ ${d}`, a - q, `先算 ${q * d} ÷ ${d} = ${q}，再算 ${a} − ${q} = ${a - q}。`, '先算后面的除法。')
        : calculate(`${q * d} ÷ ${d} + ${a}`, q + a, `先算 ${q * d} ÷ ${d} = ${q}，再算 ${q} + ${a} = ${q + a}。`, '先算前面的除法。');
    })),
    set('两步计算应用', series(i => {
      const boxes = i + 2, per = [5, 7, 4, 6, 3, 8, 6, 9][i], spare = 3 + i;
      const product = boxes * per;
      return fill(`美术课有 ${boxes} 盒画笔，每盒 ${per} 支，桌上还有 ${spare} 支。一共有多少支？`, product + spare,
        `先算盒里的画笔：${boxes} × ${per} = ${product}。再加桌上的：${product} + ${spare} = ${product + spare}。`, '先求这些盒里一共有多少支。', '支');
    }))
  ]),
  drill('brackets', '有小括号的混合运算', '混合运算', '算式中的小括号像一组，把括号里的结果算出来，再继续算外面。', [
    set('先加再乘', series(i => {
      const a = 7 + i, b = 5 + 2 * i, c = 9 - i, sum = a + b;
      return calculate(`(${a} + ${b}) × ${c}`, sum * c, `先算括号里的 ${a} + ${b} = ${sum}，再算 ${sum} × ${c} = ${sum * c}。`, '先把小括号里的两个数相加。');
    })),
    set('先减再除', series(i => {
      const c = i + 2, q = 9 - i, b = 7 + 4 * i, a = c * q + b;
      return calculate(`(${a} − ${b}) ÷ ${c}`, q, `先算 ${a} − ${b} = ${c * q}，再算 ${c * q} ÷ ${c} = ${q}。`, '先算小括号里的减法。');
    })),
    set('先算括号里的除数', series(i => {
      const a = i + 2, b = 9 - i, sum = [4, 5, 6, 7, 8, 9, 6, 8][i];
      const c = Math.min(b, sum - 1);
      const d = sum - c;
      return calculate(`${a * sum} ÷ (${c} + ${d})`, a, `先算 ${c} + ${d} = ${sum}，再算 ${a * sum} ÷ ${sum} = ${a}。`, '先算括号里的和，再用前面的数除以这个和。');
    }))
  ]),
  drill('fraction-add', '同分母分数相加', '分数的初步认识', '同分母分数相加，分母保持原值，只把分子相加。答案用题中的分母，例如 3/8，合起来是一个整体时可以写 1。', [
    set('几分之一加几分之一', series(i => fractionOperation(1, 1, i + 3, false))),
    set('几分之几相加', [[2,2,5],[2,3,6],[3,2,7],[2,4,8],[3,4,9],[2,5,10],[4,3,8],[3,5,9]].map(([a,b,d]) => fractionOperation(a,b,d,false))),
    set('相加得一个整体', series(i => fractionOperation(Math.floor((i + 3) / 2), Math.ceil((i + 3) / 2), i + 3, false)))
  ]),
  drill('fraction-subtract', '同分母分数相减', '分数的初步认识', '同分母分数相减，分母保持原值，分子相减。用 1 减时，先把 1 写成分子、分母相同的分数。', [
    set('减去一份', series(i => fractionOperation(i + 2, 1, i + 3, true))),
    set('减去几份', [[4,2,5],[5,3,6],[5,2,7],[6,4,8],[7,3,9],[8,3,10],[4,4,7],[7,7,10]].map(([a,b,d]) => fractionOperation(a,b,d,true))),
    set('用 1 减分数', series(i => fractionOperation(i + 3, (i % 4) + 1, i + 3, true)))
  ]),
  drill('length', '长度单位换算', '毫米、分米和千米', '先确定两个长度单位的进率。换成小单位时乘进率，换成大单位时除以进率。', [
    set('厘米与毫米', series(i => unitConvert((i + 2) * (i < 4 ? 1 : 10), i < 4 ? '厘米' : '毫米', i < 4 ? '毫米' : '厘米', 10, i >= 4))),
    set('分米与厘米、米', series(i => {
      const [source,target] = [['分米','厘米'],['米','分米'],['厘米','分米'],['分米','米']][i % 4];
      const reverse = i % 4 >= 2;
      return unitConvert((i + 3) * (reverse ? 10 : 1),source,target,10,reverse);
    })),
    set('千米、米和分段路程', series(i => {
      if (i < 4) return unitConvert((i + 2) * (i < 2 ? 1 : 1000), i < 2 ? '千米' : '米', i < 2 ? '米' : '千米', 1000, i >= 2);
      const km = i - 3, meters = 80 * i + 120;
      return fill(`第一段步道长 ${km} 千米，第二段长 ${meters} 米。两段一共长多少米？`, km * 1000 + meters,
        `先把 ${km} 千米换成 ${km * 1000} 米，再加 ${meters} 米，得到 ${km * 1000 + meters} 米。`, '把两段的长度统一成米再相加。', '米');
    }))
  ]),
  drill('mass', '质量单位换算', '曹冲称象的故事', '1 千克等于 1000 克，1 吨等于 1000 千克。先把单位换相同，再计算。', [
    set('千克与克', series(i => unitConvert((i + 2) * (i < 4 ? 1 : 1000), i < 4 ? '千克' : '克', i < 4 ? '克' : '千克', 1000, i >= 4))),
    set('吨与千克', series(i => unitConvert((i + 3) * (i < 4 ? 1 : 1000), i < 4 ? '吨' : '千克', i < 4 ? '千克' : '吨', 1000, i >= 4))),
    set('换算后做加减', series(i => {
      const kg = i + 1, grams = 150 + 90 * i, add = i < 4;
      const result = add ? kg * 1000 + grams : kg * 1000 - grams;
      const ask = add ? `一袋米重 ${kg} 千克，一袋豆子重 ${grams} 克。两袋共重多少克？` : `一桶水重 ${kg} 千克，用掉 ${grams} 克后，还剩多少克？`;
      return fill(ask,result,`先把 ${kg} 千克换成 ${kg * 1000} 克，再算 ${kg * 1000} ${add ? '+' : '−'} ${grams} = ${result} 克。`,'先把千克换成克，再计算。','克');
    }))
  ])
];

const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const pattern = /(<script id="question-bank" type="application\/json">)[\s\S]*?(<\/script>)/;
const match = html.match(pattern);
assert.ok(match, 'Missing the question bank');
const curriculum = JSON.parse(match[0].slice(match[1].length, -match[2].length));
const otherVolumes = curriculum.math.filter(topic => topic.book && topic.book !== 'g3a');
const autumnCore = curriculum.math.filter(topic => (!topic.book || topic.book === 'g3a') && !topic.drill);
curriculum.math = [...autumnCore, ...drills, ...otherVolumes];
const asks = drills.flatMap(topic => topic.questions.map(question => question.ask));
assert.equal(new Set(asks).size, asks.length, 'Calculation questions must be distinct');
const bank = JSON.stringify(curriculum, null, 2).replaceAll('<', '\\u003c');
const updated = html.replace(pattern, (_, opening, closing) => `${opening}\n${bank}\n${closing}`);
if (updated !== html) fs.writeFileSync(htmlPath, updated);
console.log(`Calculation bank: ${drills.length} skills, ${asks.length} questions.`);
