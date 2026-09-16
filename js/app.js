// ============================================================
// 灵魂颜色测试 —— 交互逻辑
// ============================================================
(function () {
  'use strict';

  var $ = function (sel) { return document.querySelector(sel); };

  // 视图切换
  var VIEWS = ['view-start', 'view-quiz', 'view-result'];
  function show(viewId) {
    VIEWS.forEach(function (id) {
      $('#' + id).classList.toggle('hidden', id !== viewId);
    });
    window.scrollTo(0, 0);
  }

  // 工具
  function colorById(id) {
    return COLORS.find(function (c) { return c.id === id; });
  }

  // 判断颜色明暗，用于结果页文字对比
  function isLight(hex) {
    var h = hex.replace('#', '');
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return lum > 150;
  }

  // 状态
  var answers = []; // 每道题选中的 colorId
  var current = 0;
  var advancing = false;

  // ---------- 答题 ----------
  function startQuiz() {
    answers = [];
    current = 0;
    history.replaceState(null, '', location.pathname + location.search);
    show('view-quiz');
    renderQuestion();
  }

  function renderQuestion() {
    var q = QUESTIONS[current];
    $('#quiz-counter').textContent = (current + 1) + ' / ' + QUESTIONS.length;
    $('#progress-bar').style.width = (current / QUESTIONS.length * 100) + '%';
    $('#question-text').textContent = q.text;

    var box = $('#options');
    box.innerHTML = '';
    q.options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.innerHTML =
        '<span class="option__label">' + opt.label + '</span>' +
        '<span class="option__text">' + opt.text + '</span>';
      btn.addEventListener('click', function () { choose(opt.colorId, btn); });
      if (answers[current] === opt.colorId) btn.classList.add('option--selected');
      box.appendChild(btn);
    });

    $('#btn-back').style.visibility = current === 0 ? 'hidden' : 'visible';

    // 重新触发进入动画
    var quiz = $('#view-quiz');
    quiz.classList.remove('anim-in');
    void quiz.offsetWidth;
    quiz.classList.add('anim-in');
  }

  function choose(colorId, btn) {
    if (advancing) return;
    var btns = Array.prototype.slice.call(document.querySelectorAll('#options .option'));
    btns.forEach(function (b) { b.classList.remove('option--selected'); });
    btn.classList.add('option--selected');
    answers[current] = colorId;
    advancing = true;

    setTimeout(function () {
      advancing = false;
      if (current < QUESTIONS.length - 1) {
        current++;
        renderQuestion();
      } else {
        finishQuiz();
      }
    }, 260);
  }

  function finishQuiz() {
    $('#progress-bar').style.width = '100%';
    renderResult(computeResult(answers));
  }

  // ---------- 计分：票数 → 色系 → 最近选择 ----------
  function computeResult(ans) {
    var colorScore = {};
    var lastIdx = {};
    ans.forEach(function (cid, qi) {
      colorScore[cid] = (colorScore[cid] || 0) + 1;
      lastIdx[cid] = qi;
    });

    var familyScore = {};
    Object.keys(colorScore).forEach(function (cid) {
      var fam = colorById(cid).family;
      familyScore[fam] = (familyScore[fam] || 0) + colorScore[cid];
    });

    var best = null;
    Object.keys(colorScore).forEach(function (cid) {
      if (best === null) { best = cid; return; }
      var s = colorScore[cid], bs = colorScore[best];
      var f = familyScore[colorById(cid).family];
      var bf = familyScore[colorById(best).family];
      var l = lastIdx[cid], bl = lastIdx[best];
      if (s > bs || (s === bs && f > bf) || (s === bs && f === bf && l > bl)) {
        best = cid;
      }
    });
    return colorById(best);
  }

  // ---------- 结果页 ----------
  function renderResult(color) {
    var fam = FAMILIES[color.family];
    var light = isLight(color.hex);
    var result = $('#view-result');

    result.style.background = color.hex;
    result.classList.toggle('result--light', light);

    $('#result-name').textContent = color.name;
    $('#result-hex').textContent = color.hex;
    $('#result-family').textContent = fam.tag + ' · ' + fam.slogan;
    $('#result-desc').textContent = color.desc;

    show('view-result');
    history.replaceState(null, '', '#/c/' + encodeURIComponent(color.id));
  }

  // ---------- 分享 ----------
  function share() {
    var url = location.href;
    function copied() { toast('链接已复制，快去分享吧'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(copied, function () { prompt(url); });
    } else {
      prompt('复制下面的链接分享：', url);
    }
  }

  function toast(msg) {
    var t = $('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('toast--show');
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.classList.remove('toast--show'); }, 2200);
  }

  // ---------- 路由：从分享链接直接打开结果 ----------
  function route() {
    var m = location.hash.match(/^#\/c\/(.+)$/);
    if (m) {
      var color = colorById(decodeURIComponent(m[1]));
      if (color) { renderResult(color); return; }
    }
    show('view-start');
  }

  // ---------- 事件绑定 ----------
  $('#btn-start').addEventListener('click', startQuiz);
  $('#btn-retest').addEventListener('click', startQuiz);
  $('#btn-share').addEventListener('click', share);
  $('#btn-back').addEventListener('click', function () {
    if (current > 0) { current--; renderQuestion(); }
  });
  window.addEventListener('hashchange', route);

  // 初始化
  route();
})();