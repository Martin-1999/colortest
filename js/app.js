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

  // hex → RGB 三元组
  function hexToRgb(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // 状态
  var answers = []; // 每道题选中的选项下标（0-3）
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
    q.options.forEach(function (opt, idx) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.innerHTML =
        '<span class="option__label">' + opt.label + '</span>' +
        '<span class="option__text">' + opt.text + '</span>';
      btn.addEventListener('click', function () { choose(idx, btn); });
      if (answers[current] === idx) btn.classList.add('option--selected');
      box.appendChild(btn);
    });

    $('#btn-back').style.visibility = current === 0 ? 'hidden' : 'visible';

    // 重新触发进入动画
    var quiz = $('#view-quiz');
    quiz.classList.remove('anim-in');
    void quiz.offsetWidth;
    quiz.classList.add('anim-in');
  }

  function choose(idx, btn) {
    if (advancing) return;
    var btns = Array.prototype.slice.call(document.querySelectorAll('#options .option'));
    btns.forEach(function (b) { b.classList.remove('option--selected'); });
    btn.classList.add('option--selected');
    answers[current] = idx;
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

  // ---------- 计分：六维人格模型 → 加权最近颜色 ----------
  // 每个维度在 5 题中出现（每题 ±1），故最大绝对偏移为 5
  var DIM_MAX = (function () {
    var totals = [0, 0, 0, 0, 0, 0];
    QUESTIONS.forEach(function (q) {
      var seen = [false, false, false, false, false, false];
      q.options.forEach(function (o) {
        o.d.forEach(function (v, i) { if (v !== 0) seen[i] = true; });
      });
      seen.forEach(function (s, i) { if (s) totals[i]++; });
    });
    return totals;
  })();

  function computeResult(ans) {
    var raw = [0, 0, 0, 0, 0, 0];
    ans.forEach(function (idx, qi) {
      var d = QUESTIONS[qi].options[idx].d;
      d.forEach(function (v, i) { raw[i] += v; });
    });

    var dims = DIMENSIONS.map(function (_, i) {
      var v = 50 + (raw[i] / DIM_MAX[i]) * 50;
      return Math.max(0, Math.min(100, Math.round(v)));
    });

    return { color: nearestColor(dims), dims: dims };
  }

  function nearestColor(dims) {
    var best = null, bestDist = Infinity;
    COLORS.forEach(function (c) {
      var d = 0;
      for (var i = 0; i < 6; i++) {
        var diff = dims[i] - c.profile[i];
        d += diff * diff;
      }
      var eff = d * (c.weight || 1);
      if (eff < bestDist) { bestDist = eff; best = c; }
    });
    return best;
  }

  // ---------- 结果页 ----------
  function renderResult(result) {
    var color = result.color;
    var dims = result.dims;
    var fam = FAMILIES[color.family];
    var light = isLight(color.hex);
    var view = $('#view-result');

    view.style.background = color.hex;
    view.classList.toggle('result--light', light);

    $('#result-name').textContent = color.name;
    $('#result-hex').textContent = color.hex;
    var rgb = hexToRgb(color.hex);
    $('#result-rgb').textContent = 'RGB ' + rgb[0] + ' · ' + rgb[1] + ' · ' + rgb[2];
    $('#result-family').textContent = fam.tag + ' · ' + fam.slogan;

    renderDims(dims);
    $('#result-analysis').textContent = buildAnalysis(dims);
    $('#result-desc').textContent = color.desc;

    show('view-result');
    drawRadar($('#result-radar'), dims, light);
    history.replaceState(null, '', '#/c/' + encodeURIComponent(color.id) + '/' + dims.join('-'));
  }

  // 六维小条（精确读数）
  function renderDims(dims) {
    var box = $('#result-dims');
    box.innerHTML = '';
    DIMENSIONS.forEach(function (dim, i) {
      var v = dims[i];
      var lean = v >= 50 ? dim.right : dim.left;
      var row = document.createElement('div');
      row.className = 'dim';
      row.innerHTML =
        '<span class="dim__name">' + dim.left + '·' + dim.right + '</span>' +
        '<span class="dim__bar"><span class="dim__fill" style="width:' + v + '%"></span>' +
        '<span class="dim__dot" style="left:' + v + '%"></span></span>' +
        '<span class="dim__val">' + lean + ' ' + v + '</span>';
      box.appendChild(row);
    });
  }

  // 性格分析文字
  function buildAnalysis(dims) {
    var order = [0, 1, 2, 3, 4, 5].sort(function (a, b) {
      return Math.abs(dims[b] - 50) - Math.abs(dims[a] - 50);
    });
    var extreme = Math.abs(dims[order[0]] - 50) >= 30;
    var parts = [];
    parts.push(extreme
      ? '你的灵魂不是单色的，它更像一个棱角分明的坐标——'
      : '你的灵魂相当均衡，没有哪一面压倒另一面，但它依然有自己的重心——');
    for (var k = 0; k < 2; k++) {
      var i = order[k];
      var dim = DIMENSIONS[i];
      parts.push(dims[i] >= 50 ? dim.rightDesc : dim.leftDesc);
    }
    var bal = DIMENSIONS[order[5]];
    parts.push('而在「' + bal.left + '—' + bal.right + '」这件事上，你反而相当从容，不偏不倚。');
    return parts.join('');
  }

  // 六边形雷达图
  function radarAngle(i) {
    return -Math.PI / 2 + i * (Math.PI * 2 / DIMENSIONS.length);
  }

  function drawRadar(canvas, dims, light) {
    var dpr = window.devicePixelRatio || 1;
    var size = Math.min(canvas.parentElement.clientWidth || 320, 360);
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var cx = size / 2, cy = size / 2;
    var R = size / 2 - 46;
    var n = DIMENSIONS.length;
    var stroke = light ? 'rgba(28,28,30,0.25)' : 'rgba(255,255,255,0.25)';
    var strong = light ? 'rgba(28,28,30,0.92)' : 'rgba(255,255,255,0.95)';
    var fill = light ? 'rgba(28,28,30,0.20)' : 'rgba(255,255,255,0.24)';
    var label = light ? 'rgba(28,28,30,0.85)' : 'rgba(255,255,255,0.85)';

    function pt(i, r) {
      var a = radarAngle(i);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    }

    // 网格环
    for (var ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      for (var i = 0; i <= n; i++) {
        var p = pt(i % n, R * ring / 4);
        if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 轴线
    for (var i = 0; i < n; i++) {
      var p = pt(i, R);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(p[0], p[1]);
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }

    // 数据多边形
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var q = pt(i % n, R * dims[i % n] / 100);
      if (i === 0) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = strong;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 顶点圆点
    for (var i = 0; i < n; i++) {
      var d = pt(i, R * dims[i] / 100);
      ctx.beginPath();
      ctx.arc(d[0], d[1], 3.5, 0, Math.PI * 2);
      ctx.fillStyle = light ? '#1c1c1e' : '#ffffff';
      ctx.fill();
    }

    // 轴标签（左极·右极）
    ctx.font = '12px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = label;
    for (var i = 0; i < n; i++) {
      var a = radarAngle(i);
      var lx = cx + (R + 30) * Math.cos(a);
      var ly = cy + (R + 30) * Math.sin(a);
      ctx.textAlign = Math.abs(Math.cos(a)) < 0.3 ? 'center' : (Math.cos(a) > 0 ? 'left' : 'right');
      ctx.textBaseline = Math.abs(Math.sin(a)) < 0.3 ? 'middle' : (Math.sin(a) > 0 ? 'top' : 'bottom');
      ctx.fillText(DIMENSIONS[i].left + '·' + DIMENSIONS[i].right, lx, ly);
    }
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
    var m = location.hash.match(/^#\/c\/([^/]+)(?:\/([\d-]+))?$/);
    if (m) {
      var color = colorById(decodeURIComponent(m[1]));
      if (color) {
        var dims = m[2]
          ? m[2].split('-').map(function (v) { return Number(v); })
          : color.profile.slice();
        renderResult({ color: color, dims: dims });
        return;
      }
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