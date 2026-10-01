/**
 * DouyinTV - Injected JS: virtual cursor + live stream blocking + unmute
 */
(function() {
    'use strict';
    if (window.__douyinTV) return;
    window.__douyinTV = true;

    // ==================== VIRTUAL CURSOR (lazy) ====================
    var cursor = null, crossH = null, crossV = null, cursorCreated = false;

    function ensureCursor() {
        if (cursorCreated) return;
        cursorCreated = true;
        cursor = document.createElement('div');
        cursor.id = '__tv-cursor';
        cursor.style.cssText = 'position:fixed;width:48px;height:48px;border-radius:50%;background:radial-gradient(circle,rgba(255,60,60,0.95) 0%,rgba(255,0,0,0.7) 50%,transparent 70%);border:4px solid #fff;box-shadow:0 0 0 2px rgba(255,0,0,0.8),0 0 20px 6px rgba(255,50,50,0.7),0 0 40px 12px rgba(255,0,0,0.3),inset 0 0 8px rgba(255,255,255,0.5);pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);transition:left 0.04s ease-out,top 0.04s ease-out;display:none;will-change:left,top';
        document.documentElement.appendChild(cursor);
        crossH = document.createElement('div');
        crossH.style.cssText = 'position:fixed;width:100vw;height:2px;background:linear-gradient(90deg,transparent,rgba(255,50,50,0.4),transparent);pointer-events:none;z-index:2147483646;display:none';
        crossV = document.createElement('div');
        crossV.style.cssText = 'position:fixed;width:2px;height:100vh;background:linear-gradient(180deg,transparent,rgba(255,50,50,0.4),transparent);pointer-events:none;z-index:2147483646;display:none';
        document.documentElement.appendChild(crossH);
        document.documentElement.appendChild(crossV);
    }

    function ripple(x, y, color) {
        var r = document.createElement('div');
        r.style.cssText = 'position:fixed;left:'+x+'px;top:'+y+'px;width:10px;height:10px;border-radius:50%;background:'+color+';transform:translate(-50%,-50%);pointer-events:none;z-index:2147483647;animation:__tvR 0.4s ease-out forwards';
        document.documentElement.appendChild(r);
        setTimeout(function(){ r.remove(); }, 500);
    }

    var s = document.createElement('style');
    s.textContent = '@keyframes __tvR{0%{width:10px;height:10px;opacity:1}100%{width:60px;height:60px;opacity:0}}';
    document.head.appendChild(s);

    window.__tvCursor = {
        updatePosition: function(x, y, visible) {
            ensureCursor();
            cursor.style.left = x + 'px';
            cursor.style.top = y + 'px';
            cursor.style.display = visible ? 'block' : 'none';
            crossH.style.top = y + 'px';
            crossH.style.display = visible ? 'block' : 'none';
            crossV.style.left = x + 'px';
            crossV.style.display = visible ? 'block' : 'none';
        },
        clickAt: function(x, y, button) {
            ripple(x, y, button === 'right' ? 'rgba(255,255,0,0.8)' : 'rgba(255,80,80,0.8)');
            var el = document.elementFromPoint(x, y);
            if (!el) return;
            if (button === 'right') {
                el.dispatchEvent(new MouseEvent('contextmenu', {bubbles:true,cancelable:true,clientX:x,clientY:y,button:2}));
            } else {
                ['pointerdown','mousedown'].forEach(function(t){
                    el.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}));
                });
                ['pointerup','mouseup','click'].forEach(function(t){
                    el.dispatchEvent(new MouseEvent(t,{bubbles:true,cancelable:true,clientX:x,clientY:y,button:0}));
                });
            }
        }
    };

    // ==================== BLOCK LIVE STREAMS ====================
    function blockLiveStreams() {
        // Hide all live stream containers
        document.querySelectorAll('[class*="LivePlayer"],[class*="LiveLink"],[class*="time-live-tag"]').forEach(function(el) {
            // Walk up to find the feed item container
            var p = el;
            for (var i = 0; i < 5; i++) {
                p = p.parentElement;
                if (!p) break;
                var cls = p.className || '';
                // Stop at a reasonable container level
                if (cls.includes('feed') || cls.includes('card') || cls.includes('item') || cls.includes('waterfall') || cls.includes('list')) {
                    p.style.display = 'none';
                    return;
                }
            }
            // Fallback: hide the direct parent
            if (el.parentElement) el.parentElement.style.display = 'none';
        });
    }

    // ==================== UNMUTE VIDEOS ====================
    function unmuteVideos() {
        document.querySelectorAll('video').forEach(function(v) {
            if (v.muted) v.muted = false;
            if (v.volume < 0.5) v.volume = 1.0;
        });
    }

    // ==================== AUTO-NAVIGATE TO RECOMMEND (one-shot) ====================
    var recommendTried = false;
    function switchToRecommend() {
        if (recommendTried) return;
        if (location.pathname !== '/jingxuan') return;
        recommendTried = true;
        // Find and click "推荐" link
        var links = document.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
            if (links[i].innerText && links[i].innerText.trim() === '推荐') {
                links[i].click();
                return;
            }
        }
    }

    // ==================== HIDE LOGIN OVERLAY ====================
    function hideLoginOverlay() {
        // Don't remove the login button itself, just remove blocking overlays
        // Only hide the login backdrop/mask so it doesn't block interaction.
        // Keep the login dialog/modal itself visible so the QR code can be scanned (see README).
        document.querySelectorAll('[class*="login-mask"],[class*="login-guide"],[class*="login-backdrop"],[class*="login-bg"]').forEach(function(el) {
            if (el.style.position === 'fixed' || window.getComputedStyle(el).position === 'fixed') {
                el.style.display = 'none';
            }
        });
    }

    // Run all maintenance tasks periodically
    function maintain() {
        blockLiveStreams();
        unmuteVideos();
        hideLoginOverlay();
    }

    // MutationObserver for SPA navigation — only block live + unmute
    var observer = new MutationObserver(function() {
        maintain();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setInterval(maintain, 2000);

    // Passive scroll
    document.addEventListener('scroll', function(){}, {passive:true});

    // ==================== ENABLE AUTO-PLAY (连播) ====================
    // The 连播 control is an xgplayer (西瓜播放器) setting icon in the bottom-right control bar:
    //   xg-icon.xgplayer-autoplay-setting.automatic-continuous
    //     └ div.xgplayer-icon
    //         └ div.xgplayer-setting-label
    //             ├ button.xg-switch          <- the actual toggle ("lit" = class xg-switch-checked)
    //             │   └ span.xg-switch-inner
    //             └ span.xgplayer-setting-title "连播"
    // Verified facts (via Chrome DevTools Protocol on the box):
    //   * a plain el.click() does NOTHING — the handler needs a full pointer sequence
    //     (pointerdown/mousedown/pointerup/mouseup/click)
    //   * there are TWO copies in the DOM (bar + hidden settings panel below the viewport),
    //     so we must pick the VISIBLE one
    var __autoPlayEnabled = false;
    var __autoClickBest = false;

    function pressEl(el) {
        // Full pointer sequence — plain .click() does not trigger the xgplayer handler
        var r = el.getBoundingClientRect();
        var opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0 };
        var seq = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
        for (var i = 0; i < seq.length; i++) {
            var t = seq[i], ev;
            try {
                ev = (t.indexOf('pointer') === 0 && window.PointerEvent) ? new PointerEvent(t, opts) : new MouseEvent(t, opts);
            } catch (e) { ev = new MouseEvent(t, opts); }
            el.dispatchEvent(ev);
        }
    }

    function findXgSwitch() {
        // The VISIBLE xgplayer-autoplay-setting icon and its xg-switch button
        var icons = document.querySelectorAll('.xgplayer-autoplay-setting');
        for (var i = 0; i < icons.length; i++) {
            var r = icons[i].getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight) {
                var btn = icons[i].querySelector('button.xg-switch') || icons[i].querySelector('.xg-switch');
                if (btn) return btn;
            }
        }
        return null;
    }

    function xgState(btn) {
        // "lit" = xg-switch-checked class (aria-checked is NOT in sync — ignore it)
        var cls = (btn.className || '').toString();
        if (/xg-switch-checked/.test(cls)) return 'on';
        return 'off';
    }

    // Generic fallbacks (in case Douyin swaps the player markup)
    function findLabel(txt) {
        var best = null, bestLen = 1e9;
        var all = document.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var t = (el.textContent || '').trim();
            if (t && t.indexOf(txt) !== -1 && t.length < bestLen) {
                var r = el.getBoundingClientRect();
                if (r.width > 0 && r.height > 0 && r.top >= 0 && r.top < window.innerHeight) {
                    best = el; bestLen = t.length;
                }
            }
        }
        return best;
    }

    function contextHasText(node, txt) {
        if (!node) return false;
        var chain = [node];
        var p = node.parentElement;
        for (var i = 0; i < 3 && p; i++) { chain.push(p); p = p.parentElement; }
        for (var j = 0; j < chain.length; j++) {
            var c = chain[j];
            if (c && c.textContent && c.textContent.indexOf(txt) !== -1) return true;
            if (c && c.parentElement) {
                var sibs = c.parentElement.children;
                for (var k = 0; k < sibs.length; k++) {
                    if (sibs[k].textContent && sibs[k].textContent.indexOf(txt) !== -1) return true;
                }
            }
        }
        return false;
    }

    function readToggleState(label) {
        var nodes = [];
        var n = label;
        for (var i = 0; i < 4 && n; i++) { nodes.push(n); n = n.parentElement; }
        if (label.parentElement) {
            var sibs = label.parentElement.children;
            for (var s = 0; s < sibs.length; s++) nodes.push(sibs[s]);
        }
        for (var a = 0; a < nodes.length; a++) {
            var el = nodes[a];
            if (!el || !el.getAttribute) continue;
            var cls = (el.className || '').toString();
            if (/xg-switch-checked|checked|is-on|is_on|switch-on|switch_on/i.test(cls)) return 'on';
            if (/switch-off|switch_off/i.test(cls)) return 'off';
            var ac = el.getAttribute('aria-checked');
            var ap = el.getAttribute('aria-pressed');
            var role = el.getAttribute('role');
            if ((role === 'switch' || role === 'checkbox')) {
                if (ac === 'false' || ap === 'false') return 'off';
            }
        }
        return 'unknown';
    }

    function clickToggle(label) {
        // 1) the xg-switch button next to the 连播 label (xgplayer structure)
        var parent = label.parentElement;
        if (parent) {
            var btn = parent.querySelector('button.xg-switch') || parent.querySelector('.xg-switch');
            if (btn) { pressEl(btn); return true; }
            // 2) any non-label sibling
            var kids = parent.children;
            for (var j = 0; j < kids.length; j++) {
                var kid = kids[j];
                if (kid !== label && kid.tagName && kid.tagName.toLowerCase() !== 'script' && kid.tagName.toLowerCase() !== 'style') {
                    pressEl(kid); return true;
                }
            }
            // 3) the container itself
            pressEl(parent); return true;
        }
        // 4) last resort: the label (bubbles up)
        pressEl(label); return true;
    }

    function wakeControls() {
        // The control bar (with the 连播 switch) auto-hides when idle. A synthetic
        // pointermove/mousemove on the <video> bubbles up to the xgplayer root and
        // makes the bar (and the switch) appear.
        try {
            var v = document.querySelector('video');
            var target = v || document.body || document.documentElement;
            var r = target.getBoundingClientRect ? target.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
            var opts = { bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
            var seq = ['pointermove', 'mousemove'];
            for (var i = 0; i < seq.length; i++) {
                var t = seq[i], ev;
                try {
                    ev = (t.indexOf('pointer') === 0 && window.PointerEvent) ? new PointerEvent(t, opts) : new MouseEvent(t, opts);
                } catch (e) { ev = new MouseEvent(t, opts); }
                target.dispatchEvent(ev);
            }
        } catch (e) {}
    }

    function enableAutoPlay() {
        try {
            if (__autoPlayEnabled) return;
            wakeControls();
            // Preferred: xgplayer switch (verified structure)
            var btn = findXgSwitch();
            if (btn) {
                if (xgState(btn) === 'on') { __autoPlayEnabled = true; return; }
                pressEl(btn);
                return; // next interval re-checks; only presses again if still off (no oscillation)
            }
            // Fallback: generic label-based search
            var label = findLabel('连播');
            if (!label) return;
            var state = readToggleState(label);
            if (state === 'on') { __autoPlayEnabled = true; return; }
            clickToggle(label);
            if (state === 'unknown') {
                if (__autoClickBest) { __autoPlayEnabled = true; }
                else { __autoClickBest = true; }
            }
        } catch (e) {}
    }

    // ==================== PAGE READY ====================
    function signalReady() {
        try { if (window.Android) window.Android.onPageReady(); } catch(e) {}
        try {
            setTimeout(enableAutoPlay, 1500);
            setTimeout(enableAutoPlay, 5000);
            setTimeout(enableAutoPlay, 10000);
        } catch(e) {}
    }
    if (document.readyState === 'complete') signalReady();
    else window.addEventListener('load', function() {
        signalReady();
        // Initial run after page load
        setTimeout(maintain, 1000);
        setTimeout(switchToRecommend, 2000);
    });

    // The 连播 toggle only appears ~30s after a video starts on slow boxes; retry on an interval.
    setTimeout(enableAutoPlay, 3000);
    setInterval(enableAutoPlay, 8000);
})();
