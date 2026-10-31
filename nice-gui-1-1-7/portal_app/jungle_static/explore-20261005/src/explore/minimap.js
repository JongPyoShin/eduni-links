export function createMinimap(canvas, region, learningBirds = []) {
  const context = canvas?.getContext('2d');
  if (!context) return { update() {} };
  const { minX, maxX, minZ, maxZ } = region.bounds;
  const width = canvas.width, height = canvas.height;
  const point = ({ x, z }) => [
    Math.max(0, Math.min(width, (x - minX) / (maxX - minX) * width)),
    Math.max(0, Math.min(height, (z - minZ) / (maxZ - minZ) * height)),
  ];
  // Keep static geometry off the frame path; no extra WebGL context.
  const background = canvas.ownerDocument.createElement('canvas');
  background.width = width; background.height = height;
  const map = background.getContext('2d');
  const palettes = { cave: ['#aaa2bd', '#8babc4'], 'sky-ridge': ['#c2d4df', '#c2d4df'], waterfall: ['#a9c9b9', '#8dc5d5'] };
  const [groundColor, waterColor] = palettes[region.props] || ['#b6cc93', '#8dc5d5'];
  map.fillStyle = groundColor; map.fillRect(0, 0, width, height);
  if (region.water) { map.fillStyle = waterColor; map.fillRect(0, 0, width, point({ x: minX, z: region.water.edgeZ })[1]); }
  map.strokeStyle = '#99734d'; map.lineWidth = 3; map.lineJoin = 'round';
  for (const trail of [region.trail, ...region.trails]) {
    map.beginPath();
    trail.points.forEach((value, index) => map[index ? 'lineTo' : 'moveTo'](...point(value)));
    map.stroke();
  }
  for (const landmark of Object.values(region.landmarks)) {
    map.beginPath(); map.arc(...point(landmark), 3, 0, Math.PI * 2);
    map.fillStyle = '#f7df72'; map.fill();
  }
  for (const bird of learningBirds) {
    map.beginPath(); map.arc(...point(bird), 2.6, 0, Math.PI * 2);
    map.fillStyle = '#d87640'; map.fill();
    map.strokeStyle = '#fff8df'; map.lineWidth = 1; map.stroke();
  }
  let lastUpdate = -Infinity;
  return {
    update(position, timestamp) {
      if (timestamp - lastUpdate < 100) return;
      lastUpdate = timestamp;
      context.drawImage(background, 0, 0);
      context.beginPath(); context.arc(...point(position), 4, 0, Math.PI * 2);
      context.fillStyle = '#176ac7'; context.fill();
      context.strokeStyle = '#fff'; context.lineWidth = 2; context.stroke();
    },
  };
}
