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

	/* ---------- FV：エアコンのある部屋を選ぶと、台数と合計の目安を表示（PC とスマホの図面は選択を共有） ---------- */
	var planWrap = doc.querySelector('.fv__plan[data-price]');
	var calc = doc.querySelector('.fv__calc');
	if (planWrap && calc) {
		var price = {};
		try { price = JSON.parse(planWrap.getAttribute('data-price')); } catch (e) { price = {}; }
		var unit = Number(price.standard) || 6600;
		var from = Number(price.discount_from) || 3;
		var off = Number(price.discount) || 1000;
		var yen = function (n) { return '¥' + Number(n).toLocaleString('ja-JP'); };
		var rooms = planWrap.querySelectorAll('.plan-room');
		var chosen = {};
		var render = function () {
			var names = Object.keys(chosen).filter(function (k) { return chosen[k]; });
			var n = names.length;
			rooms.forEach(function (r) {
				r.setAttribute('aria-pressed', chosen[r.getAttribute('data-room')] ? 'true' : 'false');
			});
			var full = Math.min(n, from - 1);
			var cheap = Math.max(0, n - full);
			var total = full * unit + cheap * (unit - off);
			calc.querySelector('.fv__calc-body').hidden = n === 0;
			calc.querySelector('.fv__calc-hint').hidden = n > 0;
			calc.querySelector('.js-calc-units').textContent = n;
			calc.querySelector('.js-calc-total').textContent = yen(total);
			calc.querySelector('.js-calc-detail').textContent = n ? names.join('・') + '（' + yen(unit) + '×' + full + '台' + (cheap ? '＋' + yen(unit - off) + '×' + cheap + '台' : '') + '）' : '';
			calc.classList.toggle('is-active', n > 0);
		};
		var toggle = function (room) {
			var key = room.getAttribute('data-room');
			chosen[key] = !chosen[key];
			render();
		};
		rooms.forEach(function (room) {
			room.addEventListener('click', function () { toggle(room); });
			room.addEventListener('keydown', function (e) {
				if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(room); }
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
