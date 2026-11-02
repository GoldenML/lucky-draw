/* ============================================================
   🎯 幸运抽人 —— 名字高速滚动，点停止后减速定格
   ============================================================ */

const nameBox = document.getElementById("nameBox");
const nameText = document.getElementById("nameText");
const actionBtn = document.getElementById("actionBtn");
const btnIcon = actionBtn.querySelector(".btn-icon");
const btnLabel = actionBtn.querySelector(".btn-label");
const hint = document.getElementById("hint");
const statusEl = document.getElementById("status");
const uniqueToggle = document.getElementById("uniqueToggle");
const soundToggle = document.getElementById("soundToggle");
const uploadBtn = document.getElementById("uploadBtn");
const resetBtn = document.getElementById("resetBtn");
const fileInput = document.getElementById("fileInput");
const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const dropZone = document.getElementById("dropZone");
const classBar = document.getElementById("classBar");

/* ---------------- 数据 ---------------- */
// 兜底名单：只有在读不到 人名.js 的时候才会用到
const DEFAULT_NAMES = [
  "张伟",
  "王芳",
  "李娜",
  "刘洋",
  "陈静",
  "杨帆",
  "赵敏",
  "黄磊",
  "周杰",
  "吴桐",
  "徐蕾",
  "孙悦",
  "马超",
  "朱琳",
  "胡杨",
  "何雨",
  "高飞",
  "林夕",
  "罗一鸣",
  "郑晓雨",
];

// 🌟 把文本（txt / 反引号字符串 / 数组）解析成列表
function parseRawList(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter((s) => s !== "");
  }
  return String(raw)
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== "");
}

// 🌟 读取同目录的 txt；失败（比如双击打开）返回 null
async function loadListFromTxt(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return null;
    const list = parseRawList(await res.text());
    return list.length > 0 ? list : null;
  } catch (err) {
    return null;
  }
}

/* ---------------- 分组（班级）数据结构 ---------------- */
// 每个班一个分组：{ key, label, source, names: [], drawn: [] }
const CLASS_LIST = ["9", "10", "11", "12", "13", "14"];

let groups = [];
let currentKey = null;

// 当前分组的别名（指向 groups 里的数组，原地修改即可）
let names = [];
let drawnIdx = [];
let sourceLabel = "";

let phase = "idle"; // idle | spinning | stopping
let timer = null;
let delay = 45;
let currentIdx = -1;

/* ---------------- 分组操作 ---------------- */
function currentGroup() {
  return groups.find((g) => g.key === currentKey) || null;
}

function applyGroup(key) {
  const g = groups.find((item) => item.key === key);
  if (!g) return;
  currentKey = key;
  names = g.names;
  drawnIdx = g.drawn;
  sourceLabel = g.source;
}

function renderClassBar() {
  if (!classBar) return;
  classBar.innerHTML = "";

  // 只有一个分组时不显示切换条
  if (groups.length <= 1) {
    classBar.style.display = "none";
    return;
  }
  classBar.style.display = "flex";

  groups.forEach((g) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "class-pill" + (g.key === currentKey ? " active" : "");
    btn.textContent = g.label;
    btn.disabled = phase !== "idle";
    btn.addEventListener("click", () => switchGroup(g.key));
    classBar.appendChild(btn);
  });
}

function switchGroup(key) {
  if (phase !== "idle" || key === currentKey) return;

  applyGroup(key);
  currentIdx = -1;
  nameBox.classList.remove("landed", "rolling");
  setDisplayName("准备开始");
  hint.textContent = `已切换到 ${currentGroup().label} · 按空格或点按钮开始`;
  btnIcon.textContent = "▶";
  btnLabel.textContent = "开始抽人";

  renderClassBar();
  renderHistory(false);
  renderStatus();
}

/* ---------------- 取值 ---------------- */
function getPool() {
  if (!uniqueToggle.checked) return names.map((_, i) => i);
  return names.map((_, i) => i).filter((i) => !drawnIdx.includes(i));
}

/* ---------------- 名字字号自适应 ---------------- */
function setDisplayName(text) {
  nameText.textContent = text;
  let weight = 0;
  for (const ch of text) {
    weight += /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/.test(ch) ? 1 : 0.56;
  }
  let fs;
  if (weight <= 1.6) fs = 150;
  else if (weight <= 2.6) fs = 132;
  else if (weight <= 4) fs = 108;
  else if (weight <= 6) fs = 86;
  else if (weight <= 9) fs = 66;
  else if (weight <= 13) fs = 52;
  else fs = 40;
  nameText.style.setProperty("--fs", fs + "px");
}

/* ---------------- 音效 ---------------- */
let actx = null;

function initAudio() {
  if (!actx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) actx = new AC();
  }
  if (actx && actx.state === "suspended") actx.resume();
}

function beep(freq, dur, type, vol) {
  if (!actx || !soundToggle.checked) return;
  const o = actx.createOscillator();
  const g = actx.createGain();
  const t = actx.currentTime;
  o.type = type || "triangle";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(actx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function playTick() {
  beep(1150 + Math.random() * 180, 0.045, "square", 0.016);
}

function playWin() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    setTimeout(() => beep(f, 0.32, "triangle", 0.07), i * 110);
  });
}

/* ---------------- 撒花 ---------------- */
const confettiCanvas = document.getElementById("confetti");
const cctx = confettiCanvas.getContext("2d");
const CONFETTI_COLORS = [
  "#FF6B6B",
  "#FFD166",
  "#06D6A0",
  "#4EA8FF",
  "#BDB2FF",
  "#FF9FD0",
];
let parts = [];
let cRAF = null;

function sizeConfetti() {
  const dpr = window.devicePixelRatio || 1;
  confettiCanvas.width = window.innerWidth * dpr;
  confettiCanvas.height = window.innerHeight * dpr;
  confettiCanvas.style.width = window.innerWidth + "px";
  confettiCanvas.style.height = window.innerHeight + "px";
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function launchConfetti() {
  sizeConfetti();
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.38;
  parts = [];
  for (let i = 0; i < 170; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4 + Math.random() * 10;
    parts.push({
      x: cx + (Math.random() - 0.5) * 90,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3.5,
      g: 0.16 + Math.random() * 0.1,
      size: 5 + Math.random() * 7,
      color:
        CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.36,
      life: 1,
    });
  }
  if (!cRAF) cRAF = requestAnimationFrame(confettiLoop);
}

function confettiLoop() {
  cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  let alive = false;
  for (const p of parts) {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.994;
    p.rot += p.vr;
    p.life -= 0.0075;
    if (p.life > 0 && p.y < window.innerHeight + 60) {
      alive = true;
      cctx.save();
      cctx.globalAlpha = Math.min(1, p.life);
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      cctx.restore();
    }
  }
  if (alive) {
    cRAF = requestAnimationFrame(confettiLoop);
  } else {
    cRAF = null;
    cctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

window.addEventListener("resize", () => {
  if (cRAF) sizeConfetti();
});

/* ---------------- 核心：滚动 / 停止 ---------------- */
function pickIndex(pool, avoid) {
  if (pool.length <= 1) return pool[0];
  let idx;
  let guard = 0;
  do {
    idx = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  } while (idx === avoid && guard < 20);
  return idx;
}

function tick() {
  const pool = getPool();
  if (pool.length === 0) {
    finish();
    return;
  }

  currentIdx = pickIndex(pool, currentIdx);
  setDisplayName(names[currentIdx]);
  playTick();

  if (phase === "spinning") {
    delay = Math.max(30, delay * 0.965);
    timer = setTimeout(tick, delay);
  } else if (phase === "stopping") {
    delay = delay * 1.22 + 6;
    if (delay >= 200) {
      timer = setTimeout(finish, delay);
    } else {
      timer = setTimeout(tick, delay);
    }
  }
}

function start() {
  if (names.length === 0) {
    Swal.fire({
      icon: "warning",
      title: "等等！",
      text: "名单是空的，先导入一份吧~",
    });
    return;
  }
  if (getPool().length === 0) {
    Swal.fire({
      icon: "info",
      title: "都抽完啦",
      text: "所有人都已经抽过了，点「重置已抽」可以重新开始~",
      confirmButtonColor: "#FFB3B3",
    });
    return;
  }

  initAudio();
  phase = "spinning";
  delay = 45;
  currentIdx = -1;

  nameBox.classList.remove("landed");
  nameBox.classList.add("rolling");
  actionBtn.classList.add("is-stop");
  actionBtn.disabled = false;
  btnIcon.textContent = "■";
  btnLabel.textContent = "停 止";
  hint.textContent = "点按钮停下，揭晓幸运儿！";
  renderClassBar();

  tick();
}

function stop() {
  if (phase !== "spinning") return;
  phase = "stopping";
  actionBtn.disabled = true;
  btnIcon.textContent = "…";
  btnLabel.textContent = "揭晓中";
  hint.textContent = "马上揭晓…";
  renderClassBar();
}

function finish() {
  clearTimeout(timer);
  timer = null;
  phase = "idle";

  const idx = currentIdx >= 0 ? currentIdx : 0;
  const name = names[idx];
  if (!drawnIdx.includes(idx)) drawnIdx.push(idx);

  nameBox.classList.remove("rolling");
  nameBox.classList.add("landed");
  setDisplayName(name);

  actionBtn.classList.remove("is-stop");
  actionBtn.disabled = false;
  btnIcon.textContent = "▶";
  btnLabel.textContent = "再抽一次";
  hint.textContent = `🎉 恭喜 ${name} ！`;

  if (window.gsap) {
    gsap.fromTo(
      nameText,
      { scale: 0.86, opacity: 0.5 },
      { scale: 1, opacity: 1, duration: 0.55, ease: "elastic.out(1, 0.55)" },
    );
    gsap.fromTo(nameBox, { y: 8 }, { y: 0, duration: 0.5, ease: "power2.out" });
  }

  playWin();
  launchConfetti();
  renderHistory(true);
  renderStatus();
  renderClassBar();
}

function toggle() {
  if (phase === "spinning") stop();
  else if (phase === "idle") start();
}

actionBtn.addEventListener("click", toggle);

document.addEventListener("keydown", (e) => {
  if (e.key !== " " && e.code !== "Space") return;
  const el = document.activeElement;
  if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
  e.preventDefault();
  toggle();
});

/* ---------------- 名单导入 ---------------- */
function parseData(text) {
  const list = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== "");

  if (list.length === 0) {
    Swal.fire({
      icon: "error",
      title: "文件是空的",
      text: "请检查名单内容后重新导入~",
    });
    return;
  }

  // 导入的名单单独作为一个分组，不覆盖各班级数据
  let g = groups.find((item) => item.key === "custom");
  if (!g) {
    g = {
      key: "custom",
      label: "导入名单",
      source: "手动导入",
      names: [],
      drawn: [],
    };
    groups.push(g);
  }
  g.names = list;
  g.drawn = [];
  applyGroup("custom");

  currentIdx = -1;
  nameBox.classList.remove("landed", "rolling");
  setDisplayName("准备开始");
  hint.textContent = "按空格键，或点击下方按钮开始";
  btnIcon.textContent = "▶";
  btnLabel.textContent = "开始抽人";
  renderClassBar();
  renderHistory(false);
  renderStatus();

  Swal.fire({
    icon: "success",
    title: "导入成功",
    text: `共 ${names.length} 位选手，可以开始啦！`,
    timer: 1400,
    showConfirmButton: false,
    backdrop: "rgba(255,255,255,0.35)",
  });
}

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => parseData(ev.target.result);
  reader.readAsText(file, "UTF-8");
  fileInput.value = "";
});

/* ---------------- 拖拽导入 ---------------- */
let dragCounter = 0;

window.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragCounter++;
  if (dragCounter === 1) dropZone.classList.add("active");
});

window.addEventListener("dragover", (e) => e.preventDefault());

window.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dropZone.classList.remove("active");
  }
});

window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove("active");

  if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
  const file = e.dataTransfer.files[0];
  if (!file.name.toLowerCase().endsWith(".txt")) {
    Swal.fire({
      icon: "error",
      title: "格式错误",
      text: "只能拖入 .txt 文件哦~",
    });
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => parseData(ev.target.result);
  reader.readAsText(file, "UTF-8");
});

/* ---------------- 重置 ---------------- */
resetBtn.addEventListener("click", () => {
  if (phase !== "idle") return;
  drawnIdx.length = 0; // 只清空当前班级
  currentIdx = -1;
  nameBox.classList.remove("landed", "rolling");
  setDisplayName("准备开始");
  hint.textContent = `已重置 ${currentGroup().label} · 按空格或点按钮开始`;
  btnIcon.textContent = "▶";
  btnLabel.textContent = "开始抽人";
  renderHistory(false);
  renderStatus();
});

uniqueToggle.addEventListener("change", () => {
  if (phase === "idle") renderStatus();
});

/* ---------------- 渲染 ---------------- */
function renderHistory(highlightNew) {
  historyCount.textContent = drawnIdx.length;
  if (drawnIdx.length === 0) {
    historyList.innerHTML = '<span class="empty">还没有抽到人～</span>';
    return;
  }
  historyList.innerHTML = "";
  drawnIdx.forEach((idx, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    if (highlightNew && i === drawnIdx.length - 1) chip.classList.add("is-new");
    chip.textContent = names[idx];
    historyList.appendChild(chip);
  });
  if (highlightNew) historyList.scrollTop = historyList.scrollHeight;
}

function renderStatus() {
  const left = getPool().length;
  statusEl.innerHTML = `<b>${currentGroup().label}</b> · 共 <b>${names.length}</b> 人 · 剩余 <b>${left}</b> 人可抽${
    uniqueToggle.checked ? " · 不重复" : ""
  } · ${sourceLabel}`;
}

/* ---------------- 初始化 ----------------
   优先读 名单/9班.txt ~ 14班.txt（按班级切换）
   读不到则退回单名单：人名.txt → 人名.js → 示例名单
------------------------------------------------ */
async function initNames() {
  const loaded = await Promise.all(
    CLASS_LIST.map(async (cls) => ({
      cls,
      list: await loadListFromTxt(`./名单/${cls}班.txt`),
    })),
  );

  const allOk = loaded.every((r) => r.list && r.list.length > 0);

  if (allOk) {
    groups = loaded.map((r) => ({
      key: r.cls,
      label: `${r.cls}班`,
      source: `名单/${r.cls}班.txt`,
      names: r.list,
      drawn: [],
    }));
  } else {
    let list = await loadListFromTxt("./人名.txt");
    let source = "人名.txt";

    if (!list) {
      list = parseRawList(window.defaultNames);
      source = "人名.js";
    }
    if (!list || list.length === 0) {
      list = DEFAULT_NAMES.slice();
      source = "示例名单";
    }

    groups = [{ key: "all", label: "全部", source, names: list, drawn: [] }];
  }

  applyGroup(groups[0].key); // 默认 9 班
  renderClassBar();
  setDisplayName("准备开始");
  hint.textContent = `已读取 ${currentGroup().label} ${names.length} 位选手 · 按空格或点按钮开始`;
  renderHistory(false);
  renderStatus();
}

initNames();
