(function () {
  const canvas = document.getElementById("starfield");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let animationFrameId;
  let stars = [];
  const numStars = 520; // 🌟 星星数量稍微调多一点
  const speed = 8;

  // 彩虹流星配色（饱和度调高，在白底上更清晰）
  const starColors = [
    "255, 107, 129", // 樱花粉
    "52, 172, 224", // 天蓝
    "130, 88, 255", // 紫罗兰
    "255, 159, 67", // 活力橙
    "46, 213, 115", // 薄荷绿
    "255, 71, 87", // 珊瑚红
    "0, 184, 148", // 翠绿色
  ];

  const init = (width, height) => {
    stars = [];
    for (let i = 0; i < numStars; i++) {
      const color = starColors[Math.floor(Math.random() * starColors.length)];
      stars.push({
        x: Math.random() * width * 2 - width,
        y: Math.random() * height * 2 - height,
        z: Math.random() * width,
        pz: 0,
        color: color,
      });
    }
  };

  const handleResize = () => {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    init(width, height);
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  const draw = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const cx = width / 2;
    const cy = height / 2;

    // 🌟 关键：0.15 的透明度让拖尾变得更长、更明显（如果觉得还是短，可以调到 0.1）
    ctx.fillStyle = "rgba(244, 247, 246, 0.15)";
    ctx.fillRect(0, 0, width, height);

    stars.forEach((star) => {
      star.pz = star.z;
      star.z -= speed;

      if (star.z <= 0) {
        star.z = width;
        star.x = Math.random() * width * 2 - width;
        star.y = Math.random() * height * 2 - height;
        star.pz = star.z;
        star.color = starColors[Math.floor(Math.random() * starColors.length)];
      }

      const sx = (star.x / star.z) * width + cx;
      const sy = (star.y / star.z) * height + cy;
      const px = (star.x / star.pz) * width + cx;
      const py = (star.y / star.pz) * height + cy;

      // 🌟 关键：基数从 3 改成了 6，让星星线条明显变粗
      const size = (1 - star.z / width) * 8;
      const alpha = 1 - star.z / width;

      // 1. 画流星的尾巴
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = `rgba(${star.color}, ${alpha * 0.6})`; // 尾巴稍微透明一点
      ctx.lineCap = "round";
      ctx.lineWidth = size;
      ctx.stroke();

      // 2. 画流星的头部（圆点），让它看起来像一颗闪耀的星星
      ctx.beginPath();
      ctx.arc(sx, sy, size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${star.color}, ${alpha})`; // 头部颜色更实
      ctx.fill();
    });

    animationFrameId = requestAnimationFrame(draw);
  };

  draw();

  window.addEventListener("beforeunload", () => {
    window.removeEventListener("resize", handleResize);
    cancelAnimationFrame(animationFrameId);
  });
})();
