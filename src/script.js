const canvas = document.getElementById("wheel");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinBtn");
const uploadBtn = document.getElementById("uploadBtn");
const fileInput = document.getElementById("fileInput");
const statusText = document.getElementById("status");
const dropZone = document.getElementById("dropZone");

let items = [];
// 🌟 全新低饱和马卡龙配色（非常适合白底）
const colors = [
  "#FFB3B3", // 樱花粉
  "#FFD6A5", // 奶油橘
  "#FDFFB6", // 柠檬黄
  "#CAFFBF", // 薄荷绿
  "#9BF6FF", // 婴儿蓝
  "#A0C4FF", // 浅灰蓝
  "#BDB2FF", // 香芋紫
  "#FFC6FF", // 粉紫色
];

let currentRotation = 0;

// 读取数据
function parseData(text) {
  items = text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item !== "");
  if (items.length > 0) {
    statusText.innerHTML = `成功导入 <b style="color:#FF6B6B">${items.length}</b> 个选项，可以开始抽奖啦！`;
    drawWheel();
  } else {
    statusText.innerText = "文件为空，请重新编辑名单.txt";
  }
}

uploadBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => parseData(event.target.result);
  reader.readAsText(file, "UTF-8");
});

// 🌟 拖拽功能
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
  if (dragCounter === 0) dropZone.classList.remove("active");
});
window.addEventListener("drop", (e) => {
  e.preventDefault();
  dragCounter = 0;
  dropZone.classList.remove("active");
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    if (!file.name.endsWith(".txt")) {
      Swal.fire({
        icon: "error",
        title: "格式错误",
        text: "只能拖入 .txt 文件哦~",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => parseData(event.target.result);
    reader.readAsText(file, "UTF-8");
  }
});

// 🌟 绘制转盘（适配白底：去掉黑圈，增加白边）
function drawWheel() {
  // 解决高分屏模糊
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = 500;

  canvas.width = logicalWidth * dpr;
  canvas.height = logicalWidth * dpr;
  canvas.style.width = logicalWidth + "px";
  canvas.style.height = logicalWidth + "px";

  ctx.scale(dpr, dpr);

  const centerX = logicalWidth / 2;
  const centerY = logicalWidth / 2;
  const radius = logicalWidth / 2 - 10; // 留出一点边距给外圈光晕
  const sliceAngle = (2 * Math.PI) / items.length;

  ctx.clearRect(0, 0, logicalWidth, logicalWidth);

  // 画扇形
  for (let i = 0; i < items.length; i++) {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);

    const startAngle = i * sliceAngle - Math.PI / 2 - sliceAngle / 2;
    const endAngle = startAngle + sliceAngle;

    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();

    // 扇形之间的白色分割线
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 画文字
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + sliceAngle / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    // 纯深色文字，去除阴影，保证极度清晰
    ctx.fillStyle = "#4A4A4A";
    ctx.textRendering = "geometricPrecision";

    let fontSize = items.length > 8 ? 16 : 20;
    ctx.font = `bold ${fontSize}px -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif`;

    let text = items[i];
    if (text.length > 6) text = text.substring(0, 6) + "...";

    ctx.fillText(text, radius - 25, 0);
    ctx.restore();
  }

  // 🌟 画一圈白色的外边框（替代原本的黑底盘）
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 2, 0, 2 * Math.PI);
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = 12;
  ctx.stroke();

  // 再画一圈彩色的虚线作为装饰
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 8, 0, 2 * Math.PI);
  ctx.strokeStyle = "#FFB3B3"; // 淡淡的粉色虚线
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 10]); // 虚线样式
  ctx.stroke();
  ctx.setLineDash([]); // 恢复实线
}

// 抽奖逻辑
spinBtn.addEventListener("click", () => {
  if (items.length === 0) {
    Swal.fire({ icon: "warning", title: "等等！", text: "请先导入名单哦~" });
    return;
  }
  if (gsap.isTweening(canvas)) return;
  spinBtn.disabled = true;

  const extraSpins = 6 + Math.floor(Math.random() * 4);
  const randomDegree = Math.floor(Math.random() * 360);
  const totalRotation = extraSpins * 360 + randomDegree;
  currentRotation += totalRotation;

  gsap.to(canvas, {
    rotation: currentRotation,
    duration: 5,
    ease: "power4.out",
    onComplete: () => {
      spinBtn.disabled = false;
      calculateResult();
    },
  });
});

// 计算结果
function calculateResult() {
  const actualDegree = currentRotation % 360;
  const sliceDegree = 360 / items.length;
  let targetIndex =
    Math.floor((360 - actualDegree + sliceDegree / 2) / sliceDegree) %
    items.length;
  if (targetIndex < 0) targetIndex += items.length;

  const prize = items[targetIndex];

  setTimeout(() => {
    Swal.fire({
      title: "🎉 恭喜中奖 🎉",
      html: `<div style="font-size: 36px; font-weight: bold; color: #FF6B6B; margin-top: 20px;">${prize}</div>`,
      icon: "success",
      confirmButtonText: "太棒了！",
      confirmButtonColor: "#FFB3B3", // 配合粉色系
      backdrop: `rgba(255, 255, 255, 0.4)`,
    });
  }, 300);
}

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

// 内置兜底奖品
const FALLBACK_PRIZES = [
  "棒棒糖",
  "精美笔记本",
  "免写作业券",
  "中性笔",
  "小零食",
  "神秘盲盒",
];

// 加载顺序：奖品.txt → 奖品.js → 内置默认
async function initPrizes() {
  let list = await loadListFromTxt("./奖品.txt");
  let source = "奖品.txt";

  if (!list) {
    list = parseRawList(window.defaultPrizes);
    source = list.length > 0 ? "奖品.js" : "内置默认奖品";
  }
  if (list.length === 0) list = FALLBACK_PRIZES.slice();

  items = list;
  drawWheel();

  statusText.innerHTML = `已从 <b>${source}</b> 读取 <b style="color:#FF6B6B">${items.length}</b> 个奖品，可以开始抽奖啦！`;
  if (source === "内置默认奖品") {
    statusText.innerHTML +=
      '<br><span style="color:#b0b8c4">读不到 奖品.txt / 奖品.js，可以先把名单拖进页面</span>';
  }
}

initPrizes();
