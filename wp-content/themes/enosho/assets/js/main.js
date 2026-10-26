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

	/* ---------- FV：間取り図のお部屋を選ぶと「選んだお部屋」欄に料金を表示 ---------- */
	var picked = doc.querySelector('.fv__picked');
	if (picked) {
		var hint = picked.querySelector('.fv__picked-hint');
		var detail = picked.querySelector('.fv__picked-body');
		var nameEl = picked.querySelector('.fv__picked-name');
		var priceEl = picked.querySelector('.fv__picked-price');
		var timeEl = picked.querySelector('.fv__picked-time');
		var rooms = doc.querySelectorAll('.plan--pc .plan-room');
		var show = function (room) {
			rooms.forEach(function (r) { r.classList.toggle('is-active', r === room); });
			nameEl.textContent = room.getAttribute('data-name');
			priceEl.textContent = room.getAttribute('data-price');
			timeEl.textContent = '作業時間（目安）：' + room.getAttribute('data-time');
			hint.hidden = true;
			detail.hidden = false;
			picked.classList.add('is-active');
		};
		rooms.forEach(function (room) {
			room.addEventListener('mouseenter', function () { show(room); });
			room.addEventListener('focus', function () { show(room); });
		});
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
