(() => {
  const guest = store;
  const labels = { correct: '答对', wrong: '答错', written: '已看示例' };
  const filters = { all: '全部作答题目', correct: '有答对记录', wrong: '有答错记录', review: '待订正', written: '开放题' };
  const dateFormat = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'short', timeStyle: 'short' });
  let authMode = 'login';
  let accountMessage = '';
  let filter = 'all';
  let subjectFilter = 'all';
  const android = window.StudyAndroid;

  async function api(path, body) {
    if (android) {
      await new Promise(resolve => setTimeout(resolve, 0));
      const { status, data } = JSON.parse(android.request(path, JSON.stringify(body ?? {})));
      if (status >= 400) throw Object.assign(new Error(data.error), { status });
      return data;
    }
    const response = await fetch(`/api/${path}`, body === undefined ? { cache: 'no-store' } : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw Object.assign(new Error(data.error), { status: response.status });
    return data;
  }

  const draftKey = user => `fangxue-account-draft-${user.id}-${user.username}`;

  function useAccount(data) {
    account.user = data.user;
    filter = subjectFilter = 'all';
    if (!data.user) {
      store = guest;
      session = guest.session;
      return;
    }
    store = { records: data.records, session: null };
    session = null;
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey(data.user)) || 'null');
      if (Array.isArray(draft?.ids) && draft.ids.every(id => questionMap[id])) session = draft;
    } catch { /* The stored answers are still available from SQLite. */ }
  }

  async function restoreState() {
    if (account.busy) return;
    account.busy = true;
    try {
      const data = await api('state');
      accountMessage = '';
      if (data.user?.id === account.user?.id) {
        if (data.user) store.records = data.records;
        render();
        return;
      }
      useAccount(data);
      if (route.page === 'quiz' || route.page === 'finish') go('home');
      else render();
    } catch {
      accountMessage = android ? '暂时无法读取手机上的记录，请重试。' : '暂时连不上本机数据库，请确认学习网页窗口仍在运行，再试一次。';
      if (route.page === 'account') render();
    } finally {
      account.busy = false;
    }
  }

  function accountPage() {
    const message = `<p class="notice" id="account-message" role="status" ${accountMessage ? '' : 'hidden'}>${escape(accountMessage)}</p>`;
    if (account.user) {
      const migration = android ? button('导入电脑记录','account-import') : button('下载手机迁移文件','account-export');
      const tip = android ? '要迁移电脑记录，请在电脑端下载迁移文件，再用这里的同名账号导入。' : '要把记录搬到手机，请下载迁移文件，然后在安卓 App 里登录同名账号导入。';
      return `<section class="study">${pageHead('学习账号',android ? '每次提交的作答结果都会存到这部手机。' : '每次提交的作答结果都会存到这台电脑的数据库。')}
        <article class="panel account-panel"><h2>${escape(account.user.username)}</h2><p>每个账号有独立的正确率、错题本和作答记录。</p>${message}
        <div class="question-buttons">${button('查看学习记录','records','','primary')}${migration}${button('退出登录','account-logout')}</div><p>${tip}</p></article></section>`;
    }
    const register = authMode === 'register';
    const title = register ? '创建学习账号' : '登录学习账号';
    return `<section class="study">${pageHead(title,'登录后，作答结果会按账号保存。')}
      <article class="panel account-panel"><form id="learning-account-form" class="account-form">
      <label for="account-name">账号名</label><input class="answer-field" id="account-name" name="username" autocomplete="username" autocapitalize="none" required minlength="3" maxlength="24" ${register ? 'aria-describedby="account-name-tip"' : ''}>
      ${register ? '<p id="account-name-tip" class="account-tip">3–24 个字符，可用汉字、英文字母、数字、下划线或短横线。</p>' : ''}
      <label for="account-password">密码</label><input class="answer-field" id="account-password" name="password" type="password" autocomplete="${register ? 'new-password' : 'current-password'}" required minlength="8" maxlength="128" ${register ? 'aria-describedby="account-password-tip"' : ''}>
      ${register ? '<p id="account-password-tip" class="account-tip">至少 8 个字符。</p>' : ''}${message}
      <div class="question-buttons"><button type="submit" class="btn primary">${register ? '创建并登录' : '登录'}</button>${button(register ? '已有账号，去登录' : '创建账号','account-mode')}</div>
      </form></article></section>`;
  }

  function totals(list) {
    let correct = 0;
    let objective = 0;
    for (const record of list) {
      correct += record.correct;
      objective += record.correct + record.wrong;
    }
    return { correct, objective, rate: objective ? `${Math.round(correct / objective * 100)}%` : '—' };
  }

  function answerList() {
    const all = Object.entries(store.records).filter(([id]) => questionMap[id]);
    const entries = all.filter(([id, record]) =>
      (subjectFilter === 'all' || questionMap[id].subject === subjectFilter) &&
      (filter === 'all' || record[filter])
    ).sort(([,a], [,b]) => b.at.localeCompare(a.at));
    if (!entries.length) return `<p class="account-empty">${all.length ? '这个筛选条件下没有记录。' : '完成一道题后，就能在这里看到记录。'}</p>`;
    return `<div class="row-list">${entries.map(([id,record]) => {
      const q = questionMap[id];
      const count = q.type === 'write' ? `看示例 ${record.written} 次` : `答对 ${record.correct} 次 · 答错 ${record.wrong} 次`;
      return `<article class="record-row account-answer"><div><p class="answer-name">${escape(q.ask)}</p>
        <small>${subjects[q.subject].name} · ${topicMap[q.topic].title} · ${count}</small><br><small>最近作答 ${dateFormat.format(new Date(record.at))}</small></div>
        <div class="account-answer-actions"><span class="answer-badge ${record.latest}">最近${labels[record.latest]}</span>${button('再练这题','account-repractice',q.id)}</div></article>`;
    }).join('')}</div>`;
  }

  function recordsPage() {
    const list = Object.values(store.records);
    const accuracy = totals(list);
    const objectiveQuestions = list.filter(record => typeof record.first === 'boolean');
    const firstCorrect = objectiveQuestions.filter(record => record.first).length;
    const firstRate = objectiveQuestions.length ? `${Math.round(firstCorrect / objectiveQuestions.length * 100)}%` : '—';
    const selectOptions = (options, selected) => Object.entries(options).map(([key,label])=>`<option value="${key}" ${selected === key ? 'selected' : ''}>${label}</option>`).join('');
    const subjectNames = Object.fromEntries(Object.entries(subjects).map(([key,value]) => [key,value.name]));
    return `${pageHead('学习记录',`${escape(account.user.username)} · 查看各科正确率、答对题和错题。`,button('刷新记录','account-refresh'))}
      ${stats([['累计客观题正确率',accuracy.rate],['客观题首答正确率',firstRate],['待订正题目',errors().length]])}
      <p class="record-method">累计答对 ${accuracy.correct} / ${accuracy.objective} 次 · 已练 ${list.length} / ${questions.length} 题。累计正确率包含重复作答，首答正确率按每题第一次作答计算。开放题另计。</p>
      <div class="subjects">${Object.entries(subjects).map(([key,s]) => {
        const qs = bySubject(key);
        const entries = qs.map(q => store.records[q.id]).filter(Boolean);
        const score = totals(entries);
        return `<article class="subject-card ${key}"><div class="card-top"><div class="subject-icon" aria-hidden="true">${s.icon}</div><h3>${s.name}</h3></div>
          <p class="card-description">正确率 ${score.rate} · 答对 ${score.correct} / ${score.objective} 次<br>已练 ${entries.length} / ${qs.length} 题</p>${progress(entries.length,qs.length,`${s.name}已练题目`)}
          <div class="subject-bottom">${textButton(`继续练${s.name}`,'subject',key)}</div></article>`;
      }).join('')}</div>
      <section class="panel account-details" aria-labelledby="answer-detail-title"><div class="account-detail-header"><h2 id="answer-detail-title">逐题记录</h2>
      <div class="account-filters"><label>学科<select id="account-subject-filter">${selectOptions({ all:'全部学科', ...subjectNames },subjectFilter)}</select></label>
      <label>作答结果<select id="account-result-filter">${selectOptions(filters,filter)}</select></label></div></div>
      <p class="notice" role="status" ${accountMessage ? '' : 'hidden'}>${escape(accountMessage)}</p><div id="account-answer-list" aria-live="polite">${answerList()}</div></section>${footer()}`;
  }

  const account = {
    user: null,
    busy: false,
    accountPage,
    recordsPage,
    saveDraft(draft) {
      try { sessionStorage.setItem(draftKey(this.user), JSON.stringify(draft)); }
      catch { /* The attempt records are already saved on the server. */ }
    },
    decorate() {
      const label = document.querySelector('#account-nav-text');
      label.textContent = this.user ? '学习账号' : '登录 / 注册';
    },
    onImport({status, data}) {
      if (status === 200) {
        if (data.user.id !== this.user?.id) return;
        store.records = data.records;
        accountMessage = `已导入 ${data.imported} 条作答记录。${data.skipped ? `已存在的 ${data.skipped} 条记录已跳过。` : ''}`;
      } else {
        accountMessage = data.error;
      }
      if (route.page === 'account' || route.page === 'records') render();
    },
    async submit(question, value) {
      const previous = session.pendingAttempt;
      const answerKey = JSON.stringify(value);
      const makeAttemptId = () => crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
        const digit = crypto.getRandomValues(new Uint8Array(1))[0] & 15;
        return (char === 'x' ? digit : (digit & 3) | 8).toString(16);
      });
      const attemptId = previous?.questionId === question.id && previous.answerKey === answerKey ? previous.attemptId : makeAttemptId();
      session.pendingAttempt = { attemptId, questionId: question.id, answerKey };
      save();
      const submitButton = main.querySelector('#exercise button[type="submit"]');
      const input = main.querySelector('#response');
      this.busy = true;
      submitButton.disabled = true;
      if (input) input.readOnly = true;
      showValidation('正在保存作答记录…');
      try {
        const data = await api('attempts', { accountId: this.user.id, attemptId, questionId: question.id, answer: value });
        delete session.pendingAttempt;
        applyMark(data.result, data.records);
      } catch (error) {
        if (error.status === 401 || error.status === 409) {
          accountMessage = error.message;
          authMode = 'login';
          useAccount({ user: null });
          go('account');
        } else {
          showValidation(error.status ? error.message : '作答结果暂未确认，请再点一次提交。');
        }
      } finally {
        this.busy = false;
        submitButton.disabled = false;
        if (input) input.readOnly = false;
      }
    }
  };

  async function authenticate(form) {
    if (account.busy) return;
    account.busy = true;
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    const message = form.querySelector('#account-message');
    message.hidden = true;
    const input = Object.fromEntries(new FormData(form));
    try {
      const data = await api(authMode, input);
      accountMessage = '';
      useAccount(data);
      go('home');
    } catch (error) {
      message.hidden = false;
      message.textContent = error.status ? error.message : '暂时连不上本机数据库，请稍后再试。';
    } finally {
      account.busy = false;
      submit.disabled = false;
    }
  }

  async function logout() {
    account.busy = true;
    try {
      await api('logout', {});
      accountMessage = '';
      useAccount({ user: null });
      authMode = 'login';
      go('account');
    } catch {
      accountMessage = '退出没有完成，请重试。';
      render();
    } finally {
      account.busy = false;
    }
  }

  globalThis.studyAccount = account;
  document.querySelector('.nav').insertAdjacentHTML('beforeend', '<button type="button" class="nav-button" data-act="account"><span class="nav-icon" aria-hidden="true">◎</span><span class="nav-text" id="account-nav-text">登录 / 注册</span></button>');
  actions.account = () => go('account');
  actions['account-mode'] = () => {
    authMode = authMode === 'login' ? 'register' : 'login';
    accountMessage = '';
    go('account');
  };
  actions['account-logout'] = logout;
  actions['account-import'] = () => android?.chooseImport();
  actions['account-export'] = async () => {
    account.busy = true;
    try {
      const data = await api('export-records');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `放学小书桌-${data.username}-学习记录.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      accountMessage = `已生成迁移文件，共 ${data.attempts.length} 条作答记录。`;
    } catch (error) {
      accountMessage = error.status ? error.message : '暂时无法下载迁移文件，请重试。';
    } finally {
      account.busy = false;
      render();
    }
  };
  actions['account-refresh'] = restoreState;
  actions['account-repractice'] = id => start(topicMap[questionMap[id].topic].title, [questionMap[id]], 'records');
  main.addEventListener('submit', event => {
    if (event.target.id !== 'learning-account-form') return;
    event.preventDefault();
    authenticate(event.target);
  });
  main.addEventListener('change', event => {
    if (event.target.id === 'account-result-filter') filter = event.target.value;
    else if (event.target.id === 'account-subject-filter') subjectFilter = event.target.value;
    else return;
    main.querySelector('#account-answer-list').innerHTML = answerList();
  });
  if (android) {
    window.studyAndroidBack = () => {
      if (account.busy) return true;
      if (route.page === 'home') return false;
      if (route.page === 'quiz' || route.page === 'finish') go(session.back, session.key);
      else if (route.page === 'study') go('subject', topicMap[route.key].subject);
      else if (route.page === 'drills') go('subject', 'math');
      else go('home');
      return true;
    };
  }
  restoreState();
})();
