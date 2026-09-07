import { worldToScreen } from "./transforms.js";

const PRESETS = {
  sparkle: { color: "#fff1a8", life: 0.62, speed: 38, size: 3, count: 8 },
  ember: { color: "#ffd27a", life: 0.85, speed: 30, size: 3, count: 10 },
  leaf: { color: "#bce59b", life: 0.9, speed: 24, size: 4, count: 7 },
  feather: { color: "#7dd3fc", life: 0.8, speed: 28, size: 4, count: 6 },
  "soft-burst": { color: "#fff7d1", life: 0.48, speed: 64, size: 4, count: 10 },
  "glow-pulse": { color: "#ffe09a", life: 0.7, speed: 0, size: 18, count: 1 },
};

export class EffectSystem {
  constructor({ maxParticles = 120 } = {}) {
    this.maxParticles = maxParticles;
    this.particles = [];
    this.lastPreset = null;
  }

  spawn(preset, x, y, { intensity = 1 } = {}) {
    const config = PRESETS[preset];
    if (!config) return 0;
    this.lastPreset = preset;
    const count = Math.max(1, Math.round(config.count * intensity));
    let created = 0;
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const angle = (i / count) * Math.PI * 2 + (preset === "ember" ? -Math.PI / 2 : 0);
      const speed = config.speed * (0.65 + (i % 4) * 0.12);
      this.particles.push({ preset, x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, life: config.life * (0.78 + (i % 3) * 0.1), size: config.size, color: config.color });
      created++;
    }
    return created;
  }

  update(dt) {
    const seconds = Math.min(0.05, Math.max(0, dt / 1000));
    for (const particle of this.particles) {
      particle.age += seconds;
      particle.x += particle.vx * seconds;
      particle.y += particle.vy * seconds;
      if (particle.preset === "ember") particle.vy -= 12 * seconds;
      if (particle.preset === "leaf") particle.vx += Math.sin(particle.age * 6) * 3 * seconds;
    }
    this.particles = this.particles.filter((particle) => particle.age < particle.life);
  }

  draw(ctx, cam, viewW, viewH) {
    ctx.save();
    for (const particle of this.particles) {
      const p = worldToScreen(particle.x, particle.y, cam, viewW, viewH);
      const alpha = Math.max(0, 1 - particle.age / particle.life);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;
      if (particle.preset === "glow-pulse") {
        const radius = particle.size * (1 + particle.age / particle.life);
        const gradient = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, radius);
        gradient.addColorStop(0, particle.color); gradient.addColorStop(1, "rgba(255,220,120,0)");
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, particle.size * (0.6 + alpha * 0.4) * cam.zoom, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  get activeCount() { return this.particles.length; }
}

export const EFFECT_PRESETS = Object.freeze(Object.keys(PRESETS));
