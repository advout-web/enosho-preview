/**
 * ENOSHO Theme - main.js（依存ライブラリなし）
 */
(function () {
	'use strict';

	var doc = document;
	var body = doc.body;
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- 読み込み完了 ---------- */
	if (doc.readyState === 'complete') {
		body.classList.add('is-ready');
	} else {
		window.addEventListener('load', function () { body.classList.add('is-ready'); });
	}

	/* ---------- ヘッダー：下スクロールで隠れ、上スクロールで現れる ---------- */
	var header = doc.getElementById('site-header');
	var lastY = window.scrollY;
	var ticking = false;
	function onScroll() {
		var y = window.scrollY;
		if (header && !body.classList.contains('is-drawer-open')) {
			if (y > lastY && y > 200) {
				header.classList.add('is-hidden');
			} else if (y < lastY - 4 || y < 200) {
				header.classList.remove('is-hidden');
			}
		}
		lastY = y;
		ticking = false;
	}
	window.addEventListener('scroll', function () {
		if (!ticking) {
			window.requestAnimationFrame(onScroll);
			ticking = true;
		}
	}, { passive: true });
	if (header) {
		header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
	}

	/* ---------- ドロワー ---------- */
	var menuBtn = doc.querySelector('.menu-btn');
	var drawer = doc.getElementById('drawer');
	function setDrawer(open) {
		if (!menuBtn || !drawer) return;
		menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
		menuBtn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
		drawer.classList.toggle('is-open', open);
		drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
		body.classList.toggle('is-drawer-open', open);
		if (open) {
			header.classList.remove('is-hidden');
			var first = drawer.querySelector('a');
			if (first) first.focus({ preventScroll: true });
		}
	}
	if (menuBtn && drawer) {
		menuBtn.addEventListener('click', function () {
			setDrawer(menuBtn.getAttribute('aria-expanded') !== 'true');
		});
		drawer.addEventListener('click', function (e) {
			if (e.target.closest('a')) setDrawer(false);
		});
		doc.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && drawer.classList.contains('is-open')) {
				setDrawer(false);
				menuBtn.focus();
			}
		});
		window.addEventListener('resize', function () {
			if (window.innerWidth > 960 && drawer.classList.contains('is-open')) setDrawer(false);
		});
	}

	/* ---------- スクロール出現 ---------- */
	var revealEls = doc.querySelectorAll('.reveal, .reveal-stagger, .js-split');
	if ('IntersectionObserver' in window && !reduceMotion) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (entry.isIntersecting) {
					entry.target.classList.add('is-in');
					io.unobserve(entry.target);
				}
			});
		}, { rootMargin: '0px 0px -8% 0px' });
		revealEls.forEach(function (el) { io.observe(el); });
	} else {
		revealEls.forEach(function (el) { el.classList.add('is-in'); });
	}

	/* ---------- FV：部屋ごとにエアコン（ノーマル／お掃除機能付きの台数・オプション）を選び、合計の目安を表示 ---------- */
	var planWrap = doc.querySelector('.fv__plan[data-calc]');
	var calc = doc.querySelector('.fv__calc');
	var dialog = doc.getElementById('room-dialog');
	if (planWrap && calc && dialog) {
		var cfg = {};
		try { cfg = JSON.parse(planWrap.getAttribute('data-calc')); } catch (e) { cfg = {}; }
		var price = { normal: Number(cfg.standard) || 6600, robot: Number(cfg.robot) || 12100 };
		var discFrom = Number(cfg.discountFrom) || 3;
		var disc = Number(cfg.discount) || 1000;
		var optById = {};
		(cfg.options || []).forEach(function (o) { optById[o.id] = o; });
		var MAX = 9;
		var yen = function (n) { return (n < 0 ? '−¥' : '¥') + Math.abs(n).toLocaleString('ja-JP'); };
		var rooms = planWrap.querySelectorAll('.plan-room');
		var state = {}; // 部屋名 → { normal, robot, opts: { id: true } }
		var current = null;
		var get = function (name) {
			if (!state[name]) state[name] = { normal: 0, robot: 0, opts: {} };
			return state[name];
		};
		var units = function (r) { return r.normal + r.robot; };

		var renderRooms = function () {
			rooms.forEach(function (el) {
				var r = state[el.getAttribute('data-room')];
				var n = r ? units(r) : 0;
				el.setAttribute('aria-pressed', n > 0 ? 'true' : 'false');
				var parts = [];
				if (r && r.normal) parts.push('ノーマル' + r.normal);
				if (r && r.robot) parts.push('お掃除' + r.robot);
				var oc = r ? Object.keys(r.opts).filter(function (k) { return r.opts[k]; }).length : 0;
				if (oc) parts.push('OP' + oc);
				el.querySelector('.js-room-summary').textContent = parts.join('・');
				el.querySelector('.js-room-count').textContent = n ? n + '台' : '';
				el.setAttribute('aria-label', el.getAttribute('data-room') + 'のエアコンを選ぶ' + (n ? '（' + parts.join('、') + '）' : ''));
			});
		};

		var renderCalc = function () {
			var normal = 0, robot = 0, optLines = {}, quotes = [];
			Object.keys(state).forEach(function (name) {
				var r = state[name]; var n = units(r);
				normal += r.normal; robot += r.robot;
				if (!n) return;
				Object.keys(r.opts).forEach(function (id) {
					if (!r.opts[id] || !optById[id]) return;
					var o = optById[id];
					if (o.yen == null) { quotes.push(o.name + '（' + name + '）'); return; }
					if (!optLines[id]) optLines[id] = { name: o.name, units: 0, yen: o.yen };
					optLines[id].units += n;
				});
			});
			var total = normal + robot;
			var off = Math.max(0, total - (discFrom - 1));
			var sum = normal * price.normal + robot * price.robot - off * disc;
			var lines = [];
			if (normal) lines.push(['ノーマル ×' + normal + '台', normal * price.normal]);
			if (robot) lines.push(['お掃除機能付き ×' + robot + '台', robot * price.robot]);
			if (off) lines.push([discFrom + '台目以降の値引き ×' + off + '台', -off * disc]);
			Object.keys(optLines).forEach(function (id) {
				var l = optLines[id];
				lines.push([l.name + ' ×' + l.units + '台', l.units * l.yen]);
				sum += l.units * l.yen;
			});
			calc.querySelector('.fv__calc-body').hidden = total === 0;
			calc.querySelector('.fv__calc-hint').hidden = total > 0;
			calc.querySelector('.js-calc-units').textContent = total;
			calc.querySelector('.js-calc-total').textContent = yen(sum);
			var ul = calc.querySelector('.js-calc-lines');
			ul.textContent = '';
			lines.forEach(function (l) {
				var li = doc.createElement('li');
				var a = doc.createElement('span'); a.textContent = l[0];
				var b = doc.createElement('span'); b.textContent = yen(l[1]);
				li.appendChild(a); li.appendChild(b); ul.appendChild(li);
			});
			var q = calc.querySelector('.js-calc-quote');
			q.hidden = !quotes.length;
			q.textContent = quotes.length ? '別途お見積り：' + quotes.join('、') : '';
			calc.classList.toggle('is-active', total > 0);
		};

		var renderDialog = function () {
			var r = get(current);
			dialog.querySelector('.js-dialog-room').textContent = current;
			dialog.querySelectorAll('.stepper').forEach(function (st) {
				var t = st.getAttribute('data-type');
				st.querySelector('.js-step-val').textContent = r[t];
				st.querySelector('[data-step="-1"]').disabled = r[t] <= 0;
				st.querySelector('[data-step="1"]').disabled = r[t] >= MAX;
			});
			dialog.querySelectorAll('.room-dialog__opts input').forEach(function (cb) {
				cb.checked = !!r.opts[cb.value];
				cb.disabled = units(r) === 0;
			});
			dialog.querySelector('.room-dialog__opts').classList.toggle('is-disabled', units(r) === 0);
			dialog.querySelector('.js-dialog-sub').textContent = units(r) + '台';
		};
		var update = function () { renderDialog(); renderRooms(); renderCalc(); };

		var open = function (room) {
			current = room.getAttribute('data-room');
			var r = get(current);
			if (units(r) === 0) r.normal = 1; // 開いたらまずノーマル1台を入れる（よくある選び方）
			update();
			if (typeof dialog.showModal === 'function') { dialog.showModal(); } else { dialog.setAttribute('open', ''); }
			var first = dialog.querySelector('.stepper [data-step="1"]');
			if (first) first.focus();
		};
		var close = function () {
			if (typeof dialog.close === 'function') { dialog.close(); } else { dialog.removeAttribute('open'); }
		};
		dialog.addEventListener('close', function () {
			var el = planWrap.querySelector('.plan--pc .plan-room[data-room="' + current + '"]');
			if (window.matchMedia('(max-width: 640px)').matches) el = planWrap.querySelector('.plan--sp .plan-room[data-room="' + current + '"]');
			if (el) el.focus({ preventScroll: true });
		});
		dialog.addEventListener('click', function (e) {
			if (e.target === dialog) close(); // 背景を押したら閉じる
			var step = e.target.closest('.js-step');
			if (step) {
				var t = step.closest('.stepper').getAttribute('data-type');
				var r = get(current);
				r[t] = Math.max(0, Math.min(MAX, r[t] + Number(step.getAttribute('data-step'))));
				update();
			}
			if (e.target.closest('.js-dialog-close')) close();
		});
		dialog.addEventListener('change', function (e) {
			if (e.target.matches('.room-dialog__opts input')) {
				get(current).opts[e.target.value] = e.target.checked;
				update();
			}
		});
		rooms.forEach(function (room) {
			room.addEventListener('click', function () { open(room); });
			room.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(room); }
			});
		});
		planWrap.classList.add('is-interactive');
	}

	/* ---------- ご予約フォーム：人が入力欄を操作したときだけ確認用の値を入れる（ボット対策） ---------- */
	function markHuman(e) {
		var form = e.target && e.target.closest ? e.target.closest('.wpcf7-form') : null;
		if (!form) return;
		var ts = form.querySelector('input[name="enosho_ts"]');
		var human = form.querySelector('input[name="enosho_human"]');
		if (ts && human && ts.value) {
			human.value = 'ok.' + ts.value.split('').reverse().join('');
		}
	}
	['keydown', 'pointerdown', 'focusin', 'change'].forEach(function (type) {
		doc.addEventListener(type, markHuman, true);
	});

	/* ---------- 予約フォーム（ReserveKit）：人が操作したときだけ、表示時刻の署名を Cookie に入れる（ボット対策） ---------- */
	var rkWrap = doc.querySelector('.rk-wrap[data-rk-token]');
	if (rkWrap) {
		var rkDone = false;
		var rkMark = function (e) {
			if (rkDone || !rkWrap.contains(e.target)) return;
			rkDone = true;
			var secure = location.protocol === 'https:' ? '; Secure' : '';
			doc.cookie = 'enosho_rk=' + rkWrap.getAttribute('data-rk-token') + '.h; path=/; max-age=86400; SameSite=Lax' + secure;
		};
		['pointerdown', 'keydown', 'focusin'].forEach(function (type) {
			doc.addEventListener(type, rkMark, true);
		});
	}
})();
