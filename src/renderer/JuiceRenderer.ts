/**
 * JuiceRenderer.ts
 * Implements the complete visual rendering pipeline and juice feedback
 * Conforms to GDD Section 13 (Art Direction & Juice Manifesto)
 */

import Matter from 'matter-js';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SkinStyle, Particle, Shockwave, ScreenFlash } from '../types';

export class JuiceRenderer {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;
  public world: PhysicsWorld;
  public skinStyle: SkinStyle = 'dummy';

  // Juice & FX State
  public particles: Particle[] = [];
  public shockwaves: Shockwave[] = [];
  public screenFlash: ScreenFlash = { alpha: 0, color: '#FFFDF7', decay: 0.12 };
  public screenShake: { intensity: number; decay: number; offsetX: number; offsetY: number } = {
    intensity: 0,
    decay: 0.88,
    offsetX: 0,
    offsetY: 0,
  };

  // Slow motion momentary dilation
  public slowMoFactor: number = 1.0;
  public targetSlowMo: number = 1.0;

  // Debug settings
  public showDebugHitboxes: boolean = false;
  public showForceVectors: boolean = false;
  public showGrid: boolean = true;

  // Colors from GDD 13.4 Master Palette
  private readonly PALETTE = {
    bgPaper: '#F2EFE6',
    mechanicalGraphite: '#25262A',
    concreteGray: '#777A80',
    concreteLight: '#B0B3B8',
    experimentBlue: '#4C8DFF',
    alertYellow: '#F5C84B',
    impactRed: '#E85D5D',
    pulseWhite: '#FFFDF7',
    woodBrown: '#C49A6C',
    woodDark: '#8F663C',
    barrelRed: '#D64545',
    steelGray: '#5C6370',
  };

  constructor(canvas: HTMLCanvasElement, world: PhysicsWorld) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not get 2D canvas context');
    this.ctx = context;
    this.world = world;

    // Hook collision impacts to spawn juice particles and screen shake
    this.world.onImpactCallback = (impact) => {
      this.handleCollisionImpact(impact.x, impact.y, impact.intensity);
    };

    this.world.onExplosionCallback = (x, y, radius) => {
      this.handleExplosionFX(x, y, radius);
    };

    this.world.onEvictCallback = (x, y, color) => {
      this.handleEvictFX(x, y, color);
    };
  }

  public handleEvictFX(x: number, y: number, color: string = this.PALETTE.concreteLight) {
    // Spawn subtle laboratory disintegration puff
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2.2 + 0.6;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // gentle upward sublimation
        size: Math.random() * 3.5 + 2,
        color: Math.random() > 0.35 ? color : this.PALETTE.pulseWhite,
        alpha: 0.85,
        maxLife: 22,
        life: 0,
        type: 'spark',
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  public handleCollisionImpact(x: number, y: number, intensity: number) {
    // Screen shake matrix as defined in GDD Section 13.11 & 13.28
    if (intensity > 14) {
      this.screenShake.intensity = Math.min(0.7, this.screenShake.intensity + 0.35);
      this.screenFlash = { alpha: 0.35, color: this.PALETTE.pulseWhite, decay: 0.08 };
      this.triggerSlowMo(0.35, 140);
    } else if (intensity > 8) {
      this.screenShake.intensity = Math.min(0.4, this.screenShake.intensity + 0.2);
    } else if (intensity > 3.5) {
      this.screenShake.intensity = Math.min(0.2, this.screenShake.intensity + 0.08);
    }

    // Spawn dust and spark particles proportional to force
    const particleCount = Math.min(Math.floor(intensity * 1.8), 24);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 3 + 1) * Math.min(intensity * 0.4, 4);
      const isSpark = Math.random() > 0.6;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isSpark ? 1.5 : 0.5),
        size: isSpark ? Math.random() * 3 + 2 : Math.random() * 6 + 4,
        color: isSpark ? (Math.random() > 0.5 ? this.PALETTE.alertYellow : this.PALETTE.pulseWhite) : this.PALETTE.concreteLight,
        alpha: 0.9,
        maxLife: isSpark ? 22 : 36,
        life: 0,
        type: isSpark ? 'spark' : 'dust',
        rotation: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 0.2,
      });
    }
  }

  public handleExplosionFX(x: number, y: number, radius: number) {
    // Multi-layer explosion sequence (Section 13.9: Flash -> Shockwave -> Debris -> Smoke)
    this.screenFlash = { alpha: 0.65, color: this.PALETTE.pulseWhite, decay: 0.06 };
    this.screenShake.intensity = 0.65;
    this.triggerSlowMo(0.25, 200);

    // Shockwave 1: High speed primary shockwave
    this.shockwaves.push({
      x,
      y,
      currentRadius: 10,
      maxRadius: radius * 1.15,
      maxLife: 26,
      life: 0,
      color: this.PALETTE.pulseWhite,
      lineWidth: 8,
    });

    // Shockwave 2: Heat ring
    this.shockwaves.push({
      x,
      y,
      currentRadius: 5,
      maxRadius: radius * 0.85,
      maxLife: 38,
      life: 0,
      color: this.PALETTE.impactRed,
      lineWidth: 5,
    });

    // Shrapnel / fire / smoke particles
    const particleCount = 45;
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 7 + 2) * (radius / 180);
      const typeRand = Math.random();

      let color = this.PALETTE.impactRed;
      let type: 'spark' | 'smoke' | 'debris' = 'debris';
      let size = Math.random() * 7 + 3;

      if (typeRand < 0.4) {
        color = this.PALETTE.alertYellow;
        type = 'spark';
        size = Math.random() * 4 + 2;
      } else if (typeRand < 0.7) {
        color = '#4A4A4F';
        type = 'smoke';
        size = Math.random() * 12 + 6;
      }

      this.particles.push({
        x: x + (Math.random() - 0.5) * 15,
        y: y + (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        size,
        color,
        alpha: 1.0,
        maxLife: type === 'smoke' ? 55 : 35,
        life: 0,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  public triggerSlowMo(factor: number, durationMs: number) {
    this.slowMoFactor = factor;
    setTimeout(() => {
      this.targetSlowMo = 1.0;
    }, durationMs);
  }

  public render(alpha: number = 1.0) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Smooth ramp slow-mo factor back to target
    this.slowMoFactor += (this.targetSlowMo - this.slowMoFactor) * 0.12;

    // Calculate screen shake displacement
    if (this.screenShake.intensity > 0.01) {
      const maxOffset = this.screenShake.intensity * 18;
      this.screenShake.offsetX = (Math.random() * 2 - 1) * maxOffset;
      this.screenShake.offsetY = (Math.random() * 2 - 1) * maxOffset;
      this.screenShake.intensity *= this.screenShake.decay;
    } else {
      this.screenShake.offsetX = 0;
      this.screenShake.offsetY = 0;
      this.screenShake.intensity = 0;
    }

    ctx.save();
    ctx.translate(this.screenShake.offsetX, this.screenShake.offsetY);

    // 1. Draw Background & Lab Grid
    this.drawBackground(ctx, w, h);

    // 2. Draw Static Platforms & World Boundaries
    this.drawWorldBodies(ctx);

    // 3. Draw Constraints / Ropes / Seesaw Pins
    this.drawWorldConstraints(ctx);

    // 4. Draw Ragdolls with Selected Skin Layer
    this.world.ragdolls.forEach((ragdoll) => {
      this.drawRagdoll(ctx, ragdoll);
    });

    // 5. Draw Particles (Dust, Sparks, Shrapnel)
    this.drawParticles(ctx);

    // 6. Draw Shockwaves
    this.drawShockwaves(ctx);

    // 7. Draw Drag Interaction Overlay (spring, contact highlight)
    this.drawDragInteraction(ctx);

    // 8. Draw Debug Overlays (if enabled)
    if (this.skinStyle === 'debug' || this.showDebugHitboxes || this.showForceVectors) {
      this.drawDebug(ctx);
    }

    // 9. Draw Screen Flash
    if (this.screenFlash.alpha > 0.01) {
      ctx.fillStyle = this.screenFlash.color;
      ctx.globalAlpha = this.screenFlash.alpha;
      ctx.fillRect(-20, -20, w + 40, h + 40);
      ctx.globalAlpha = 1.0;
      this.screenFlash.alpha -= this.screenFlash.decay;
    }

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.skinStyle === 'blueprint') {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-20, -20, w + 40, h + 40);
      // Blueprint grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      return;
    }

    // Standard Lab Paper Background (#F2EFE6)
    ctx.fillStyle = this.PALETTE.bgPaper;
    ctx.fillRect(-20, -20, w + 40, h + 40);

    if (this.showGrid) {
      // Subtle laboratory bench grid & measurement marks
      ctx.strokeStyle = 'rgba(37, 38, 42, 0.05)';
      ctx.lineWidth = 1;
      const step = 48;
      for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Metric crosshairs and measurement tick marks
      ctx.fillStyle = 'rgba(37, 38, 42, 0.2)';
      ctx.font = '9px monospace';
      for (let x = step * 2; x < w; x += step * 3) {
        ctx.fillText(`${x}mm`, x + 4, 18);
        ctx.beginPath();
        ctx.arc(x, h - 22, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawWorldBodies(ctx: CanvasRenderingContext2D) {
    const bodies = Matter.Composite.allBodies(this.world.engine.world);

    for (const body of bodies) {
      // Don't draw ragdoll limbs here (they are rendered with high fidelity in drawRagdoll)
      if (body.label && body.label.startsWith('ragdoll:')) continue;

      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      // Visual feedback for eviction / TTL expiration
      const meta = this.world.userPropMetadata.get(body.id);
      if (meta) {
        if (meta.isEvicting) {
          const progress = Math.min(1, Math.max(0, meta.evictionProgress));
          ctx.globalAlpha = Math.max(0, 1 - progress);
          const scale = Math.max(0.01, 1.0 - progress * 0.35);
          ctx.scale(scale, scale);
        } else if (meta.ttlMs > 0) {
          const age = performance.now() - meta.createdAt;
          const remaining = meta.ttlMs - age;
          // Warning blink in last 3 seconds
          if (remaining < 3000 && remaining > 0) {
            const blink = (Math.sin(performance.now() * 0.018) + 1) * 0.5;
            ctx.globalAlpha = 0.55 + 0.45 * blink;
          }
        }
      }

      const label = body.label || '';

      if (label.startsWith('boundary:')) {
        // Outer room boundaries (dark graphite)
        ctx.fillStyle = this.PALETTE.mechanicalGraphite;
        this.renderBodyVertices(ctx, body);
        ctx.fill();
      } else if (label.startsWith('platform:')) {
        // Steel / concrete platforms with hazard stripes or clean bevel
        ctx.fillStyle = '#484B52';
        ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
        ctx.lineWidth = 2.5;
        this.renderBodyVertices(ctx, body);
        ctx.fill();
        ctx.stroke();

        // Technical accent top line
        ctx.strokeStyle = this.PALETTE.experimentBlue;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const bounds = body.bounds;
        const halfW = (bounds.max.x - bounds.min.x) * 0.45;
        ctx.moveTo(-halfW, -6);
        ctx.lineTo(halfW, -6);
        ctx.stroke();
      } else if (label.includes('box_wood') || label.includes('user_small_box') || label.includes('user_heavy_box')) {
        // Wooden or metal crate with cross bracing
        const isHeavy = label.includes('heavy');
        ctx.fillStyle = isHeavy ? '#5A6270' : this.PALETTE.woodBrown;
        ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
        ctx.lineWidth = 2;
        this.renderBodyVertices(ctx, body);
        ctx.fill();
        ctx.stroke();

        // Cross brace
        const w = (body.bounds.max.x - body.bounds.min.x) * 0.7;
        const h = (body.bounds.max.y - body.bounds.min.y) * 0.7;
        ctx.strokeStyle = isHeavy ? '#3F444E' : this.PALETTE.woodDark;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(w / 2, h / 2);
        ctx.moveTo(w / 2, -h / 2);
        ctx.lineTo(-w / 2, h / 2);
        ctx.stroke();
      } else if (label.includes('explosive_barrel')) {
        // Red hazard barrel with yellow warning band
        ctx.fillStyle = this.PALETTE.barrelRed;
        ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
        ctx.lineWidth = 2.5;
        this.renderBodyVertices(ctx, body);
        ctx.fill();
        ctx.stroke();

        // Yellow warning stripe
        ctx.fillStyle = this.PALETTE.alertYellow;
        ctx.fillRect(-18, -6, 36, 12);
        ctx.fillStyle = this.PALETTE.mechanicalGraphite;
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TNT', 0, 0);
      } else if (label.includes('domino')) {
        // Dominos: Crisp graphite with white dot marker
        ctx.fillStyle = '#2D3037';
        ctx.strokeStyle = '#18191B';
        ctx.lineWidth = 2;
        this.renderBodyVertices(ctx, body);
        ctx.fill();
        ctx.stroke();

        // White division line
        ctx.strokeStyle = '#E2E0D8';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(4, 0);
        ctx.stroke();
      } else if (label.includes('ball')) {
        // Spheres: Bouncy ball, steel ball, bowling ball
        const radius = (body.bounds.max.x - body.bounds.min.x) / 2;
        const isBouncy = label.includes('bouncy');
        const isBowling = label.includes('bowling');

        ctx.fillStyle = isBouncy ? '#48BB78' : isBowling ? '#1F242D' : '#8A92A0';
        ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Highlight shine
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.beginPath();
        ctx.arc(-radius * 0.35, -radius * 0.35, radius * 0.28, 0, Math.PI * 2);
        ctx.fill();
      } else if (label.includes('seesaw_beam') || label.includes('plank')) {
        // Long wooden/metal balance beam
        ctx.fillStyle = '#8B6B48';
        ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
        ctx.lineWidth = 2;
        this.renderBodyVertices(ctx, body);
        ctx.fill();
        ctx.stroke();
      } else {
        // Default generic obstacle styling
        ctx.fillStyle = this.PALETTE.concreteGray;
        ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
        ctx.lineWidth = 2;
        this.renderBodyVertices(ctx, body);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  private renderBodyVertices(ctx: CanvasRenderingContext2D, body: Matter.Body) {
    ctx.beginPath();
    const vertices = body.vertices;
    if (vertices.length > 0) {
      ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
      for (let j = 1; j < vertices.length; j++) {
        ctx.lineTo(vertices[j].x - body.position.x, vertices[j].y - body.position.y);
      }
      ctx.closePath();
    }
  }

  private drawWorldConstraints(ctx: CanvasRenderingContext2D) {
    const allConstraints = Matter.Composite.allConstraints(this.world.engine.world);

    for (const c of allConstraints) {
      if (!c.bodyA && !c.pointA) continue;
      // Skip ragdoll internal joints (handled in ragdoll skin)
      if (c.label && ['neck', 'spine', 'shoulder_l', 'shoulder_r', 'elbow_l', 'elbow_r', 'hip_l', 'hip_r', 'knee_l', 'knee_r', 'ankle_l', 'ankle_r'].includes(c.label)) {
        continue;
      }
      if (c === this.world.dragState.constraint) continue;

      const pA = c.bodyA ? Matter.Vector.add(c.bodyA.position, c.pointA) : c.pointA;
      const pB = c.bodyB ? Matter.Vector.add(c.bodyB.position, c.pointB) : c.pointB;

      ctx.strokeStyle = '#25262A';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pA.x, pA.y);
      ctx.lineTo(pB.x, pB.y);
      ctx.stroke();

      // Pin circle
      ctx.fillStyle = this.PALETTE.experimentBlue;
      ctx.beginPath();
      ctx.arc(pA.x, pA.y, 4, 0, Math.PI * 2);
      ctx.arc(pB.x, pB.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /**
   * Ragdoll Skin Rendering
   * Implements "Crash Dummy Experimental" (Section 13.6), Stickman, Blueprint, and Debug
   */
  private drawRagdoll(ctx: CanvasRenderingContext2D, ragdoll: any) {
    const parts = ragdoll.parts;
    const isDummy = this.skinStyle === 'dummy';
    const isStickman = this.skinStyle === 'stickman';
    const isBlueprint = this.skinStyle === 'blueprint';

    // 1. Draw joint connecting bones/lines if in Stickman or Blueprint
    if (isStickman) {
      ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Spine line
      ctx.beginPath();
      ctx.moveTo(parts.head.position.x, parts.head.position.y);
      ctx.lineTo(parts.chest.position.x, parts.chest.position.y);
      ctx.lineTo(parts.pelvis.position.x, parts.pelvis.position.y);
      ctx.stroke();

      // Arms
      ctx.beginPath();
      ctx.moveTo(parts.chest.position.x, parts.chest.position.y - 10);
      ctx.lineTo(parts.leftUpperArm.position.x, parts.leftUpperArm.position.y);
      ctx.lineTo(parts.leftForearm.position.x, parts.leftForearm.position.y);
      ctx.moveTo(parts.chest.position.x, parts.chest.position.y - 10);
      ctx.lineTo(parts.rightUpperArm.position.x, parts.rightUpperArm.position.y);
      ctx.lineTo(parts.rightForearm.position.x, parts.rightForearm.position.y);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(parts.pelvis.position.x, parts.pelvis.position.y);
      ctx.lineTo(parts.leftThigh.position.x, parts.leftThigh.position.y);
      ctx.lineTo(parts.leftShin.position.x, parts.leftShin.position.y);
      ctx.lineTo(parts.leftFoot.position.x, parts.leftFoot.position.y);
      ctx.moveTo(parts.pelvis.position.x, parts.pelvis.position.y);
      ctx.lineTo(parts.rightThigh.position.x, parts.rightThigh.position.y);
      ctx.lineTo(parts.rightShin.position.x, parts.rightShin.position.y);
      ctx.lineTo(parts.rightFoot.position.x, parts.rightFoot.position.y);
      ctx.stroke();

      // Head circle
      ctx.fillStyle = '#FFFDF7';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(parts.head.position.x, parts.head.position.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Simple smiling/curious face dot eyes
      ctx.fillStyle = this.PALETTE.mechanicalGraphite;
      ctx.beginPath();
      ctx.arc(parts.head.position.x - 4, parts.head.position.y - 2, 1.8, 0, Math.PI * 2);
      ctx.arc(parts.head.position.x + 4, parts.head.position.y - 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    // Default: Crash Dummy Experimental or Blueprint
    const dummyColor = isBlueprint ? '#38BDF8' : '#F4F1EA';
    const dummyJointColor = isBlueprint ? '#0369A1' : this.PALETTE.mechanicalGraphite;
    const dummyBorderColor = isBlueprint ? '#E0F2FE' : this.PALETTE.mechanicalGraphite;

    // Helper to render individual ragdoll limb
    const drawLimb = (
      body: Matter.Body,
      w: number,
      h: number,
      cornerRadius: number = 5,
      hasMark: boolean = false,
      markType?: 'target' | 'x' | 'stripes'
    ) => {
      ctx.save();
      ctx.translate(body.position.x, body.position.y);
      ctx.rotate(body.angle);

      // Rounded rectangle for organic soft dummy appearance
      ctx.fillStyle = dummyColor;
      ctx.strokeStyle = dummyBorderColor;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';

      ctx.beginPath();
      const hw = w / 2;
      const hh = h / 2;
      ctx.roundRect(-hw, -hh, w, h, cornerRadius);
      ctx.fill();
      ctx.stroke();

      // Dummy test target markings (Section 13.6)
      if (hasMark) {
        if (markType === 'target') {
          // Yellow and black quadrant test target (Crash Dummy iconic symbol!)
          const r = Math.min(w, h) * 0.38;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fillStyle = this.PALETTE.alertYellow;
          ctx.fill();
          ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Black quadrants
          ctx.fillStyle = this.PALETTE.mechanicalGraphite;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, r, 0, Math.PI / 2);
          ctx.lineTo(0, 0);
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, r, Math.PI, Math.PI * 1.5);
          ctx.lineTo(0, 0);
          ctx.fill();
        } else if (markType === 'x') {
          // Central test X
          ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-6, -6);
          ctx.lineTo(6, 6);
          ctx.moveTo(6, -6);
          ctx.lineTo(-6, 6);
          ctx.stroke();
        } else if (markType === 'stripes') {
          // Black warning ticks
          ctx.fillStyle = this.PALETTE.mechanicalGraphite;
          ctx.fillRect(-w * 0.35, -2, w * 0.7, 4);
        }
      }

      ctx.restore();
    };

    // Draw limbs in z-order: Forearms -> Upper Arms -> Shins -> Thighs -> Pelvis -> Chest -> Head
    drawLimb(parts.leftForearm, 9, 26, 4, true, 'stripes');
    drawLimb(parts.rightForearm, 9, 26, 4, true, 'stripes');
    drawLimb(parts.leftUpperArm, 10, 30, 4);
    drawLimb(parts.rightUpperArm, 10, 30, 4);

    drawLimb(parts.leftFoot, 18, 10, 3);
    drawLimb(parts.rightFoot, 18, 10, 3);
    drawLimb(parts.leftShin, 11, 30, 4, true, 'stripes');
    drawLimb(parts.rightShin, 11, 30, 4, true, 'stripes');
    drawLimb(parts.leftThigh, 13, 34, 5);
    drawLimb(parts.rightThigh, 13, 34, 5);

    drawLimb(parts.pelvis, 22, 24, 6, true, 'x');
    drawLimb(parts.chest, 24, 44, 7, true, 'target');

    // Head (Circle with Crash Test Target)
    ctx.save();
    ctx.translate(parts.head.position.x, parts.head.position.y);
    ctx.rotate(parts.head.angle);

    ctx.fillStyle = dummyColor;
    ctx.strokeStyle = dummyBorderColor;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head Crash Test Target emblem
    const tr = 8.5;
    ctx.beginPath();
    ctx.arc(0, 0, tr, 0, Math.PI * 2);
    ctx.fillStyle = this.PALETTE.alertYellow;
    ctx.fill();
    ctx.strokeStyle = this.PALETTE.mechanicalGraphite;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = this.PALETTE.mechanicalGraphite;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, tr, 0, Math.PI / 2);
    ctx.lineTo(0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, tr, Math.PI, Math.PI * 1.5);
    ctx.lineTo(0, 0);
    ctx.fill();

    ctx.restore();

    // Dark articulation joint pins (shoulders, elbows, knees)
    ragdoll.constraints.forEach((c: Matter.Constraint) => {
      if (c.bodyA && c.bodyB) {
        const pA = Matter.Vector.add(c.bodyA.position, c.pointA);
        ctx.fillStyle = dummyJointColor;
        ctx.beginPath();
        ctx.arc(pA.x, pA.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12; // Gravity on particles
      p.rotation += p.rotSpeed;
      p.alpha = 1.0 - p.life / p.maxLife;

      if (p.life >= p.maxLife || p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * (1 + (p.life / p.maxLife) * 0.8), 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dust / debris
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      }

      ctx.restore();
    }
  }

  private drawShockwaves(ctx: CanvasRenderingContext2D) {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.life++;
      const progress = s.life / s.maxLife;
      s.currentRadius += (s.maxRadius - s.currentRadius) * 0.22;
      const alpha = (1.0 - progress);

      if (s.life >= s.maxLife || alpha <= 0.01) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = s.lineWidth * (1 - progress * 0.5);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawDragInteraction(ctx: CanvasRenderingContext2D) {
    const drag = this.world.dragState;
    if (!drag.isDragging || !drag.body) return;

    const mousePos = drag.currentMousePos;
    // Calculate global position of grabbed anchor
    const angle = drag.body.angle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const b = drag.constraint?.pointB || { x: 0, y: 0 };
    const anchorGlobal = {
      x: drag.body.position.x + (b.x * cos - b.y * sin),
      y: drag.body.position.y + (b.x * sin + b.y * cos),
    };

    const dist = Math.hypot(mousePos.x - anchorGlobal.x, mousePos.y - anchorGlobal.y);

    // Elastic tension line (Blue -> Yellow when stretched, as in GDD Section 13.7 & 13.20)
    ctx.save();
    ctx.strokeStyle = dist > 80 ? this.PALETTE.alertYellow : this.PALETTE.experimentBlue;
    ctx.lineWidth = Math.max(1.5, 4 - dist * 0.015);
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(mousePos.x, mousePos.y);
    ctx.lineTo(anchorGlobal.x, anchorGlobal.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Grab highlight ring on body
    ctx.fillStyle = 'rgba(76, 141, 255, 0.35)';
    ctx.strokeStyle = this.PALETTE.experimentBlue;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(anchorGlobal.x, anchorGlobal.y, 8 + Math.min(dist * 0.05, 8), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mouse cursor grip indicator
    ctx.fillStyle = this.PALETTE.mechanicalGraphite;
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawDebug(ctx: CanvasRenderingContext2D) {
    ctx.save();
    const allBodies = Matter.Composite.allBodies(this.world.engine.world);

    allBodies.forEach((body) => {
      // Hitbox boundary
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1;
      this.renderBodyVertices(ctx, body);
      ctx.stroke();

      // Center of mass
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(body.position.x, body.position.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Velocity vectors
      if (this.showForceVectors) {
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(body.position.x, body.position.y);
        ctx.lineTo(body.position.x + body.velocity.x * 6, body.position.y + body.velocity.y * 6);
        ctx.stroke();
      }
    });

    ctx.restore();
  }
}
