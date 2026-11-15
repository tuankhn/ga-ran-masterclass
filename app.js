(() => {
  // 1. Reduced-motion video sync
  const calmMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  for (const video of document.querySelectorAll('video[autoplay]')) {
    const syncVideo = () => {
      if (calmMedia.matches) {
        video.removeAttribute('autoplay');
        video.pause();
        video.load();
      } else {
        video.play().catch(() => {});
      }
    };
    syncVideo();
    calmMedia.addEventListener('change', syncVideo);
  }

  // 2. Batch Calculator & Native Range Slider
  const slider = document.getElementById('chicken-mass');
  const massOutput = document.getElementById('chicken-mass-output');
  const presetBtns = [...document.querySelectorAll('.preset-btn[data-mass]')];
  const unitBtns = [...document.querySelectorAll('.unit-btn[data-unit]')];
  const wheatReadout = document.getElementById('ratio-wheat-readout');
  const cornReadout = document.getElementById('ratio-corn-readout');
  const drizzleReadout = document.getElementById('drizzle-readout');

  const cheatMassLabel = document.getElementById('cheat-mass-label');
  const cheatMarinadeSummary = document.getElementById('cheat-marinade-summary');
  const cheatFlourSummary = document.getElementById('cheat-flour-summary');
  const cheatDrizzleSummary = document.getElementById('cheat-drizzle-summary');

  let currentMass = 1.0;
  let currentUnit = 'both';
  let currentFlavor = 'kfc';

  const fmtNum = (val) => {
    const rounded = Math.round(val * 10) / 10;
    if (Number.isInteger(rounded)) {
      return rounded >= 1000 ? rounded.toLocaleString('vi-VN') : String(rounded);
    }
    return String(rounded).replace('.', ',');
  };

  const fmtSpoonFraction = (val) => {
    const rounded = Math.round(val * 4) / 4;
    const whole = Math.floor(rounded);
    const frac = rounded - whole;
    let fracStr = '';
    if (Math.abs(frac - 0.25) < 0.05) fracStr = '1/4';
    else if (Math.abs(frac - 0.5) < 0.05) fracStr = '1/2';
    else if (Math.abs(frac - 0.75) < 0.05) fracStr = '3/4';
    if (whole === 0 && fracStr) return fracStr;
    if (whole > 0 && fracStr) return `${whole} + ${fracStr}`;
    return fmtNum(rounded);
  };

  function syncSliderCSSVars() {
    if (!slider) return;
    slider.style.setProperty('--attr-min', slider.min || 0.5);
    slider.style.setProperty('--attr-max', slider.max || 5);
    slider.style.setProperty('--control-value', slider.value);
  }

  function updatePrepProgress() {
    const allVisibleChecks = [...document.querySelectorAll('.ing-item:not([hidden]) input[type="checkbox"]')];
    const checkedCount = allVisibleChecks.filter((c) => c.checked).length;
    const totalCount = allVisibleChecks.length;
    const prog = document.getElementById('prep-progress');
    const statusText = document.getElementById('prep-status-text');
    if (prog && statusText) {
      prog.max = totalCount;
      prog.value = checkedCount;
      statusText.textContent = `Tích vào từng dòng khi bạn lấy nguyên liệu ra bàn bếp (Đã chuẩn bị ${checkedCount} / ${totalCount})`;
    }
  }

  function renderBatch() {
    syncSliderCSSVars();
    const gTotal = Math.round(currentMass * 1000);
    const massText = `${fmtNum(currentMass)} kg (${gTotal.toLocaleString('vi-VN')}g)`;
    if (massOutput) massOutput.textContent = massText;
    if (slider) slider.setAttribute('aria-valuetext', `${fmtNum(currentMass)} ký thịt gà (${gTotal} gram)`);

    for (const btn of presetBtns) {
      const m = parseFloat(btn.dataset.mass);
      btn.setAttribute('aria-pressed', String(Math.abs(m - currentMass) < 0.01));
    }

    // Flavor rows visibility
    const rowCayenne = document.getElementById('row-cayenne');
    const rowHerbs = document.getElementById('row-herbs');
    if (rowCayenne) rowCayenne.hidden = currentFlavor === 'kfc';
    if (rowHerbs) rowHerbs.hidden = currentFlavor === 'popeyes';

    // Update each ingredient amount
    const amounts = document.querySelectorAll('.ing-amount');
    for (const el of amounts) {
      const baseG = parseFloat(el.dataset.baseG || '0');
      const unitG = el.dataset.unitG || 'g';
      const baseSpoon = parseFloat(el.dataset.baseSpoon || '0');
      const spoonName = el.dataset.spoonName || '';
      const customNote = el.dataset.spoon || '';

      let scaledG = baseG * currentMass;
      if (unitG === 'quả') {
        scaledG = Math.max(1, Math.round(scaledG));
      }

      const gramPart = `${fmtNum(scaledG)}${unitG === 'quả' || unitG === 'g tổng' || unitG === 'ml' ? ' ' + unitG : unitG}`;
      const spoonPart = baseSpoon > 0 ? `${fmtSpoonFraction(baseSpoon * currentMass)} ${spoonName}` : customNote;

      if (currentUnit === 'gram') {
        el.textContent = gramPart;
      } else if (currentUnit === 'spoon') {
        el.textContent = spoonPart || gramPart;
      } else {
        if (unitG === 'quả') {
          el.textContent = gramPart;
        } else if (spoonPart) {
          el.textContent = `${gramPart} (${spoonPart})`;
        } else {
          el.textContent = gramPart;
        }
      }
    }

    // Update 7:3 readouts & drizzle callout
    const wheatG = Math.round(280 * currentMass);
    const cornG = Math.round(120 * currentMass);
    const totalFlourG = wheatG + cornG;
    if (wheatReadout) wheatReadout.textContent = `${fmtNum(wheatG)}g tạo khung vảy xù sắc nét`;
    if (cornReadout) cornReadout.textContent = `${fmtNum(cornG)}g hút ẩm giúp vỏ giòn rụm`;

    const minTbsp = Math.max(1.5, Math.round(3 * currentMass * 2) / 2);
    const maxTbsp = Math.max(2, Math.round(4 * currentMass * 2) / 2);
    const drizzleMl = Math.round(50 * currentMass);
    if (drizzleReadout) {
      drizzleReadout.textContent = `Múc ${fmtNum(minTbsp)} – ${fmtNum(maxTbsp)} muỗng canh (~${drizzleMl} ml) nước sữa ướp ở Tô A rưới vào ${fmtNum(totalFlourG)}g bột khô Thau B rồi xoa đầu ngón tay thành hạt vụn cỡ đậu xanh.`;
    }

    // Update printable modal cheat sheet
    if (cheatMassLabel) cheatMassLabel.textContent = `${fmtNum(currentMass)} kg (${gTotal.toLocaleString('vi-VN')}g)`;
    if (cheatMarinadeSummary) {
      const eggs = Math.max(1, Math.round(1 * currentMass));
      const cayenneNote = currentFlavor === 'kfc' ? '' : ` + ${fmtNum(2.5 * currentMass)}g ớt Cayenne`;
      cheatMarinadeSummary.textContent = `${gTotal.toLocaleString('vi-VN')}g gà tươi + ${fmtNum(250 * currentMass)} ml sữa tươi không đường + ${fmtNum(15 * currentMass)} ml giấm trắng (nghỉ 5 phút) + ${eggs} quả trứng + ${fmtNum(10 * currentMass)}g muối + ${fmtNum(5 * currentMass)}g bột tỏi + ${fmtNum(5 * currentMass)}g bột hành + ${fmtNum(3 * currentMass)}g tiêu đen + ${fmtNum(5 * currentMass)}g Paprika${cayenneNote}.`;
    }
    if (cheatFlourSummary) {
      const herbNote = currentFlavor === 'popeyes' ? '' : ` + ${fmtSpoonFraction(0.5 * currentMass)} m.cà phê mỗi vị Oregano, Thyme, bột gừng`;
      cheatFlourSummary.textContent = `${fmtNum(wheatG)}g bột mì số 11 + ${fmtNum(cornG)}g tinh bột bắp + ${fmtNum(5 * currentMass)}g bột nở + ${fmtNum(6 * currentMass)}g muối + ${fmtNum(6 * currentMass)}g bột tỏi + ${fmtNum(6 * currentMass)}g bột hành + ${fmtNum(6 * currentMass)}g Paprika + ${fmtNum(5 * currentMass)}g hạt nêm gà + ${fmtNum(3 * currentMass)}g tiêu đen${herbNote}.`;
    }
    if (cheatDrizzleSummary) {
      cheatDrizzleSummary.textContent = `${fmtNum(minTbsp)} – ${fmtNum(maxTbsp)} muỗng canh (~${drizzleMl} ml)`;
    }

    updatePrepProgress();
  }

  if (slider) {
    slider.addEventListener('input', () => {
      currentMass = parseFloat(slider.value);
      renderBatch();
    });
  }

  for (const btn of presetBtns) {
    btn.addEventListener('click', () => {
      currentMass = parseFloat(btn.dataset.mass);
      if (slider) slider.value = String(currentMass);
      renderBatch();
    });
  }

  for (const btn of unitBtns) {
    btn.addEventListener('click', () => {
      currentUnit = btn.dataset.unit;
      for (const b of unitBtns) {
        b.setAttribute('aria-pressed', String(b === btn));
      }
      renderBatch();
    });
  }

  document.querySelectorAll('.ing-item input[type="checkbox"]').forEach((chk) => {
    chk.addEventListener('change', updatePrepProgress);
  });

  const resetChecksBtn = document.getElementById('reset-checks');
  if (resetChecksBtn) {
    resetChecksBtn.addEventListener('click', () => {
      document.querySelectorAll('.ing-item input[type="checkbox"]').forEach((chk) => {
        chk.checked = false;
      });
      updatePrepProgress();
    });
  }

  // 3. Tabbed Flavor Interface
  const tabs = [...document.querySelectorAll('[focusgroup*="tablist"] [role="tab"]')];
  const panels = [...document.querySelectorAll('.tab-panels-grid > [role="tabpanel"]')];

  function selectTab(selectedTab) {
    if (!selectedTab) return;
    currentFlavor = selectedTab.dataset.flavor || 'kfc';
    for (const tab of tabs) {
      const isSelected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(isSelected));
      tab.toggleAttribute('focusgroupstart', isSelected);
    }
    for (const panel of panels) {
      const isActive = panel.getAttribute('aria-labelledby') === selectedTab.id;
      if (isActive) {
        panel.removeAttribute('hidden');
        panel.setAttribute('tabindex', '0');
      } else {
        panel.setAttribute('hidden', 'until-found');
        panel.removeAttribute('tabindex');
      }
    }
    renderBatch();
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('focus', () => selectTab(tab));
  }

  for (const panel of panels) {
    panel.addEventListener('beforematch', () => {
      const matchingTab = document.getElementById(panel.getAttribute('aria-labelledby'));
      if (matchingTab) selectTab(matchingTab);
    });
  }

  renderBatch();

  // 4. Interactive 4-Step Technique Stepper & Roadmap Jumpers
  const stageBtns = [...document.querySelectorAll('[data-stage-btn]')];
  const stageCards = [...document.querySelectorAll('.stage-card[data-stage]')];
  const stageList = document.getElementById('stage-list');
  const toggleAllBtn = document.getElementById('toggle-all-stages');

  function activateStage(indexStr, scrollIntoSection = false) {
    if (stageList && stageList.classList.contains('show-all')) {
      stageList.classList.remove('show-all');
      if (toggleAllBtn) {
        toggleAllBtn.setAttribute('aria-pressed', 'false');
        toggleAllBtn.textContent = 'Xem tất cả 4 bước cùng lúc';
      }
    }
    for (const btn of stageBtns) {
      const active = btn.dataset.stageBtn === indexStr;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
    }
    for (const card of stageCards) {
      card.classList.toggle('is-active', card.dataset.stage === indexStr);
    }
    if (scrollIntoSection) {
      const section = document.getElementById('quy-trinh');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  for (const btn of stageBtns) {
    btn.addEventListener('click', () => activateStage(btn.dataset.stageBtn, false));
  }

  document.querySelectorAll('[data-next-stage]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activateStage(btn.dataset.nextStage, true);
    });
  });

  document.querySelectorAll('[data-jump-stage]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      activateStage(link.dataset.jumpStage, true);
    });
  });

  if (toggleAllBtn && stageList) {
    toggleAllBtn.addEventListener('click', () => {
      const showingAll = stageList.classList.toggle('show-all');
      toggleAllBtn.setAttribute('aria-pressed', String(showingAll));
      toggleAllBtn.textContent = showingAll ? 'Thu gọn về xem từng bước' : 'Xem tất cả 4 bước cùng lúc';
    });
  }

  // 5. Interactive Stove Timer & Web Audio Bell + 8–10 Squeeze Counter
  const timerClock = document.getElementById('timer-clock');
  const timerTemp = document.getElementById('timer-temp');
  const timerCoach = document.getElementById('timer-coach');
  const timerStartBtn = document.getElementById('timer-start-btn');
  const timerResetBtn = document.getElementById('timer-reset-btn');
  const timerTestSoundBtn = document.getElementById('timer-test-sound');
  const timerModeBtns = [...document.querySelectorAll('.timer-mode-btn')];

  let totalSeconds = 600;
  let remainingSeconds = 600;
  let activeMode = 'wings';
  let timerInterval = null;

  function playKitchenChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [880, 1174.66, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.16);
        gain.gain.setValueAtTime(0.22, ctx.currentTime + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.65);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.16);
        osc.stop(ctx.currentTime + idx * 0.16 + 0.68);
      });
    } catch {
      // AudioContext blocked or unsupported
    }
  }

  function formatClock(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const mm = m < 10 ? '0' + m : String(m);
    const ss = s < 10 ? '0' + s : String(s);
    return `${mm}:${ss}`;
  }

  function getCoachMessage(mode, elapsed, rem) {
    if (rem === 0) {
      if (mode === 'df1') {
        return 'Hoàn tất Lửa 1 (chín 85%)! Vớt gà ra xếp lên vỉ lưới thoáng khí và chuyển sang chế độ Nghỉ 5p.';
      }
      if (mode === 'rest') {
        return 'Đã nghỉ đủ 5 phút! Bật lửa lớn đưa dầu lên 180°C rồi bấm chế độ Double Fry Lửa 2 (2 phút).';
      }
      return 'Đã chín vàng chuẩn tiệm! Vớt gà ra xếp ngay lên vỉ lưới (cooling rack), tuyệt đối không đặt lên giấy thấm dầu.';
    }
    if (elapsed === 0) {
      if (mode === 'rest') {
        return 'Đặt gà trên vỉ lưới thoáng cả mặt dưới trong 5 phút để hơi nước từ thịt thoát ra mà không làm mềm vỏ.';
      }
      if (mode === 'df2') {
        return 'Lửa 2 (180°C): Dầu thật nóng, thả gà vào chiên lại đúng 2 phút để ép hết dầu thừa và khóa cứng lớp vảy xù.';
      }
      return 'Sẵn sàng: Lăn bột xong miếng nào thả ngay miếng đó vào dầu 175°C. Trong 90 giây đầu tiên không dùng đũa đảo.';
    }
    if (mode !== 'rest' && elapsed < 90) {
      return 'Đang định hình khung vảy (90 giây đầu): Tuyệt đối đừng dùng đũa chạm hay lật miếng gà lúc này kẻo tróc vảy bột.';
    }
    if (mode !== 'rest' && rem <= 60) {
      return 'Phút cuối cùng: Chuẩn bị sẵn vỉ lưới (cooling rack). Nhấc gà lên để ráo dầu vài giây trước khi xếp lên vỉ.';
    }
    return 'Đang chiên ổn định: Giữ lửa vừa để bọt khí sủi đều. Lật nhẹ miếng gà mỗi 3 phút cho vỏ vàng đồng nhất.';
  }

  function renderTimer() {
    if (timerClock) timerClock.textContent = formatClock(remainingSeconds);
    const elapsed = totalSeconds - remainingSeconds;
    if (timerCoach) timerCoach.textContent = getCoachMessage(activeMode, elapsed, remainingSeconds);
  }

  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (timerStartBtn) timerStartBtn.textContent = remainingSeconds === 0 ? 'Chạy lại' : 'Tiếp tục bấm giờ';
  }

  for (const btn of timerModeBtns) {
    btn.addEventListener('click', () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      totalSeconds = parseInt(btn.dataset.seconds || '600', 10);
      remainingSeconds = totalSeconds;
      activeMode = btn.dataset.mode || 'wings';
      for (const b of timerModeBtns) {
        b.setAttribute('aria-pressed', String(b === btn));
      }
      if (timerTemp) timerTemp.textContent = `Nhiệt mục tiêu: ${btn.dataset.temp}`;
      if (timerStartBtn) timerStartBtn.textContent = 'Bắt đầu bấm giờ';
      renderTimer();
    });
  }

  if (timerStartBtn) {
    timerStartBtn.addEventListener('click', () => {
      if (timerInterval) {
        stopTimer();
        return;
      }
      if (remainingSeconds <= 0) {
        remainingSeconds = totalSeconds;
      }
      timerStartBtn.textContent = 'Tạm dừng';
      renderTimer();
      timerInterval = setInterval(() => {
        remainingSeconds = Math.max(0, remainingSeconds - 1);
        renderTimer();
        if (remainingSeconds === 0) {
          stopTimer();
          playKitchenChime();
        }
      }, 1000);
    });
  }

  if (timerResetBtn) {
    timerResetBtn.addEventListener('click', () => {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
      remainingSeconds = totalSeconds;
      if (timerStartBtn) timerStartBtn.textContent = 'Bắt đầu bấm giờ';
      renderTimer();
    });
  }

  if (timerTestSoundBtn) {
    timerTestSoundBtn.addEventListener('click', playKitchenChime);
  }

  // Squeeze Counter (8–10 presses in dry flour)
  let squeezeCount = 0;
  const squeezeReadout = document.getElementById('squeeze-readout');
  const squeezeTapBtn = document.getElementById('squeeze-tap-btn');
  const squeezeResetBtn = document.getElementById('squeeze-reset-btn');

  function renderSqueeze() {
    if (!squeezeReadout) return;
    if (squeezeCount >= 8 && squeezeCount <= 10) {
      squeezeReadout.textContent = `${squeezeCount} / 10 nhịp · Đạt chuẩn! Cầm miếng gà giũ mạnh bột thừa và thả vào chảo dầu.`;
    } else if (squeezeCount > 10) {
      squeezeReadout.textContent = `${squeezeCount} nhịp · Đừng bóp thêm kẻo chai bột! Giũ bột thừa và thả vào chảo ngay.`;
    } else {
      squeezeReadout.textContent = `${squeezeCount} / 10 nhịp (Chuẩn: 8 – 10 nhịp bóp nhẹ rồi giũ bột thừa)`;
    }
  }

  if (squeezeTapBtn) {
    squeezeTapBtn.addEventListener('click', () => {
      squeezeCount += 1;
      if (squeezeCount === 8 || squeezeCount === 10) {
        playKitchenChime();
      }
      renderSqueeze();
    });
  }

  if (squeezeResetBtn) {
    squeezeResetBtn.addEventListener('click', () => {
      squeezeCount = 0;
      renderSqueeze();
    });
  }

  // 6. Modal Dialog with Light-Dismiss Fallback
  const dialog = document.getElementById('cheat-sheet-dialog');
  const openDialogBtns = [
    document.getElementById('open-cheat-sheet'),
    document.getElementById('open-cheat-sheet-faq'),
    document.getElementById('open-cheat-sheet-footer'),
  ].filter(Boolean);
  const printBtn = document.getElementById('print-cheat-sheet');

  for (const btn of openDialogBtns) {
    btn.addEventListener('click', () => {
      if (dialog && typeof dialog.showModal === 'function') {
        dialog.showModal();
      }
    });
  }

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (dialog && !('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isDialogContent =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (isDialogContent) return;
      dialog.close();
    });
  }
})();
