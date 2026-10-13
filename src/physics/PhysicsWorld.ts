/**
 * PhysicsWorld.ts
 * Manages Matter.js Engine, collisions, explosions, dragging, and spawning
 */

import Matter from 'matter-js';
import { createRagdoll, applyRagdollMotor, RagdollInstance } from './RagdollBuilder';
import { buildScene, BuiltScene } from '../scenes/scenePresets';
import { SceneId, PhysicsParams, SpawnableObjectType, PropLifespanData } from '../types';
import { soundEngine } from '../audio/SoundEngine';

const { Engine, Bodies, Body, Composite, Constraint, Vector } = Matter;

export interface DragState {
  isDragging: boolean;
  body: Matter.Body | null;
  constraint: Matter.Constraint | null;
  dragPoint: { x: number; y: number };
  dragStartPos: { x: number; y: number };
  currentMousePos: { x: number; y: number };
  recentVelocities: { x: number; y: number }[];
}

export interface ImpactEvent {
  x: number;
  y: number;
  intensity: number;
  bodyA: Matter.Body;
  bodyB: Matter.Body;
}

export class PhysicsWorld {
  public engine: Matter.Engine;
  public activeSceneId: SceneId = 'arena';
  public width: number;
  public height: number;
  public ragdolls: RagdollInstance[] = [];
  public userBodies: Matter.Body[] = [];
  public userConstraints: Matter.Constraint[] = [];
  public currentSceneData: BuiltScene | null = null;
  public userPropMetadata = new Map<number, PropLifespanData>();
  public evictedCount: number = 0;

  public dragState: DragState = {
    isDragging: false,
    body: null,
    constraint: null,
    dragPoint: { x: 0, y: 0 },
    dragStartPos: { x: 0, y: 0 },
    currentMousePos: { x: 0, y: 0 },
    recentVelocities: [],
  };

  public params: PhysicsParams = {
    gravityY: 1.5,
    gravityX: 0,
    jointStiffness: 0.6,
    ragdollMassScale: 1.0,
    explosionRadius: 220,
    explosionMagnitude: 0.12,
    timeScale: 1.0,
    airResistance: 0.015,
    maxUserObjects: 60, // Smart FIFO cap protects low-end PCs
    objectLifespanSec: 30, // 30s TTL default, dissolves older items
  };

  public onImpactCallback?: (event: ImpactEvent) => void;
  public onExplosionCallback?: (x: number, y: number, radius: number) => void;
  public onEvictCallback?: (x: number, y: number, color?: string) => void;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    this.engine = Engine.create({
      gravity: { x: 0, y: 1.5 },
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 4,
    });

    this.setupCollisionHandlers();
    this.loadScene('arena');
  }

  public resize(width: number, height: number) {
    if (Math.abs(this.width - width) < 5 && Math.abs(this.height - height) < 5) return;
    this.width = width;
    this.height = height;
    this.loadScene(this.activeSceneId);
  }

  private setupCollisionHandlers() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB, collision } = pair;
        const relativeVelX = (bodyA.velocity?.x || 0) - (bodyB.velocity?.x || 0);
        const relativeVelY = (bodyA.velocity?.y || 0) - (bodyB.velocity?.y || 0);
        const speed = Math.sqrt(relativeVelX * relativeVelX + relativeVelY * relativeVelY);
        const depth = collision.depth || 0;
        const impactForce = speed + depth * 0.8;

        if (impactForce > 1.2) {
          const contactX = collision.supports?.[0]?.x ?? (bodyA.position.x + bodyB.position.x) / 2;
          const contactY = collision.supports?.[0]?.y ?? (bodyA.position.y + bodyB.position.y) / 2;

          soundEngine.playImpact(impactForce);

          if (this.onImpactCallback) {
            this.onImpactCallback({
              x: contactX,
              y: contactY,
              intensity: impactForce,
              bodyA,
              bodyB,
            });
          }

          // Check if explosive barrel suffered heavy hit
          const isBarrelA = bodyA.label?.includes('explosive_barrel');
          const isBarrelB = bodyB.label?.includes('explosive_barrel');
          if ((isBarrelA || isBarrelB) && impactForce > 6.5) {
            const barrel = isBarrelA ? bodyA : bodyB;
            // Detonate barrel in next tick to avoid mutating during collision iteration
            setTimeout(() => {
              this.applyExplosion(barrel.position.x, barrel.position.y, 260, 0.18);
              this.removeBody(barrel);
            }, 10);
          }
        }
      }
    });
  }

  public loadScene(sceneId: SceneId) {
    this.activeSceneId = sceneId;
    this.dragEnd();

    // Clear world
    Composite.clear(this.engine.world, false);
    this.ragdolls = [];
    this.userBodies = [];
    this.userConstraints = [];

    // Build scene objects
    this.currentSceneData = buildScene(sceneId, this.width, this.height);

    // Apply scene gravity
    this.engine.gravity.x = this.params.gravityX;
    this.engine.gravity.y = this.params.gravityY;

    // Add boundaries and obstacles
    Composite.add(this.engine.world, this.currentSceneData.worldBodies);
    this.currentSceneData.worldConstraints.forEach((c) => {
      Composite.add(this.engine.world, c);
    });

    // Spawn primary ragdoll
    const { x, y } = this.currentSceneData.ragdollStart;
    this.spawnRagdoll(x, y);
  }

  public resetCurrentScene() {
    this.loadScene(this.activeSceneId);
  }

  public resetRagdollPosition() {
    if (this.currentSceneData && this.ragdolls.length > 0) {
      // Remove current ragdolls
      this.ragdolls.forEach((r) => Composite.remove(this.engine.world, r.composite));
      this.ragdolls = [];
      const { x, y } = this.currentSceneData.ragdollStart;
      this.spawnRagdoll(x, y);
    }
  }

  public clearUserObjects() {
    this.userBodies.forEach((b) => Composite.remove(this.engine.world, b));
    this.userConstraints.forEach((c) => Composite.remove(this.engine.world, c));
    this.userBodies = [];
    this.userConstraints = [];
    this.userPropMetadata.clear();
  }

  public spawnRagdoll(x: number, y: number) {
    // Cap extra ragdolls to max 3 (1 primary + 2 extras) to protect low-end PCs
    if (this.ragdolls.length >= 3) {
      const oldestExtra = this.ragdolls.splice(1, 1)[0];
      if (oldestExtra) {
        oldestExtra.constraints.forEach((c) => Composite.remove(this.engine.world, c));
        Object.values(oldestExtra.parts).forEach((part) => {
          this.onEvictCallback?.(part.position.x, part.position.y, '#F5C84B');
          Composite.remove(this.engine.world, part);
        });
        Composite.remove(this.engine.world, oldestExtra.composite);
        soundEngine.playDissolve();
        this.evictedCount++;
      }
    }

    const ragdoll = createRagdoll(x, y, 1.0, this.params.jointStiffness);
    this.ragdolls.push(ragdoll);
    Composite.add(this.engine.world, ragdoll.composite);
  }

  private getColorForObjectType(type: SpawnableObjectType): string {
    switch (type) {
      case 'small_box':
        return '#C49A6C';
      case 'heavy_box':
        return '#5A6270';
      case 'bouncy_ball':
        return '#48BB78';
      case 'bowling_ball':
        return '#2D3037';
      case 'triangle_spike':
        return '#777A80';
      case 'explosive_barrel':
        return '#D64545';
      case 'seesaw_plank':
        return '#8B6B48';
      case 'pendulum':
        return '#4C8DFF';
      default:
        return '#B0B3B8';
    }
  }

  public enforceFifoCapacity() {
    if (this.params.maxUserObjects <= 0) return;
    const activeBodies = this.userBodies.filter((b) => {
      const meta = this.userPropMetadata.get(b.id);
      return !meta || !meta.isEvicting;
    });

    const overflow = activeBodies.length - (this.params.maxUserObjects - 1);
    if (overflow > 0) {
      for (let i = 0; i < overflow && i < activeBodies.length; i++) {
        this.startEviction(activeBodies[i]);
      }
    }
  }

  public startEviction(body: Matter.Body) {
    let meta = this.userPropMetadata.get(body.id);
    if (!meta) {
      meta = {
        bodyId: body.id,
        createdAt: performance.now(),
        ttlMs: 0,
        isEvicting: true,
        evictionProgress: 0,
        evictionDurationMs: 380,
        color: '#B0B3B8',
      };
      this.userPropMetadata.set(body.id, meta);
    } else {
      meta.isEvicting = true;
    }
  }

  public finalizeEviction(body: Matter.Body) {
    const meta = this.userPropMetadata.get(body.id);
    const posX = body.position.x;
    const posY = body.position.y;
    const color = meta?.color || '#B0B3B8';

    // If currently dragged, release drag
    if (this.dragState.isDragging && this.dragState.body?.id === body.id) {
      this.dragEnd();
    }

    // Remove any constraints attached to this body
    const connectedConstraints = Composite.allConstraints(this.engine.world).filter(
      (c) => c.bodyA?.id === body.id || c.bodyB?.id === body.id
    );
    connectedConstraints.forEach((c) => {
      Composite.remove(this.engine.world, c);
      this.userConstraints = this.userConstraints.filter((uc) => uc.id !== c.id);
    });

    Composite.remove(this.engine.world, body);
    this.userBodies = this.userBodies.filter((b) => b.id !== body.id);
    this.userPropMetadata.delete(body.id);
    this.evictedCount++;

    soundEngine.playDissolve();
    this.onEvictCallback?.(posX, posY, color);
  }

  public spawnObject(
    type: SpawnableObjectType,
    x: number,
    y: number,
    impulseVector?: { x: number; y: number }
  ): Matter.Body | null {
    // Check FIFO capacity before spawning
    this.enforceFifoCapacity();

    let body: Matter.Body | null = null;

    switch (type) {
      case 'small_box': {
        body = Bodies.rectangle(x, y, 38, 38, {
          density: 0.0035,
          friction: 0.7,
          restitution: 0.2,
          label: 'prop:user_small_box',
        });
        break;
      }

      case 'heavy_box': {
        body = Bodies.rectangle(x, y, 68, 68, {
          density: 0.012,
          friction: 0.85,
          restitution: 0.1,
          label: 'prop:user_heavy_box',
        });
        break;
      }

      case 'bouncy_ball': {
        body = Bodies.circle(x, y, 22, {
          density: 0.0025,
          friction: 0.3,
          restitution: 0.88,
          label: 'prop:user_bouncy_ball',
        });
        break;
      }

      case 'bowling_ball': {
        body = Bodies.circle(x, y, 30, {
          density: 0.02,
          friction: 0.6,
          restitution: 0.15,
          label: 'prop:user_bowling_ball',
        });
        break;
      }

      case 'triangle_spike': {
        body = Bodies.polygon(x, y, 3, 36, {
          density: 0.005,
          friction: 0.8,
          restitution: 0.25,
          label: 'prop:user_triangle',
        });
        break;
      }

      case 'explosive_barrel': {
        body = Bodies.rectangle(x, y, 42, 58, {
          density: 0.004,
          friction: 0.7,
          restitution: 0.2,
          label: 'prop:explosive_barrel',
        });
        break;
      }

      case 'seesaw_plank': {
        body = Bodies.rectangle(x, y, 220, 16, {
          density: 0.004,
          friction: 0.8,
          label: 'prop:user_plank',
        });
        break;
      }

      case 'pendulum': {
        const ball = Bodies.circle(x, y + 100, 24, {
          density: 0.01,
          restitution: 0.75,
          label: 'prop:user_pendulum_ball',
        });
        const constraint = Constraint.create({
          pointA: { x, y },
          bodyB: ball,
          stiffness: 0.95,
          length: 100,
          render: { strokeStyle: '#25262A', lineWidth: 3 },
        });
        this.userBodies.push(ball);
        this.userConstraints.push(constraint);
        this.userPropMetadata.set(ball.id, {
          bodyId: ball.id,
          createdAt: performance.now(),
          ttlMs: this.params.objectLifespanSec > 0 ? this.params.objectLifespanSec * 1000 : 0,
          isEvicting: false,
          evictionProgress: 0,
          evictionDurationMs: 380,
          color: '#4C8DFF',
        });
        Composite.add(this.engine.world, [ball, constraint]);
        return ball;
      }

      case 'ragdoll': {
        this.spawnRagdoll(x, y);
        return null;
      }
    }

    if (body) {
      if (impulseVector) {
        Body.setVelocity(body, {
          x: impulseVector.x * 0.14,
          y: impulseVector.y * 0.14,
        });
      }
      this.userBodies.push(body);
      this.userPropMetadata.set(body.id, {
        bodyId: body.id,
        createdAt: performance.now(),
        ttlMs: this.params.objectLifespanSec > 0 ? this.params.objectLifespanSec * 1000 : 0,
        isEvicting: false,
        evictionProgress: 0,
        evictionDurationMs: 380,
        color: this.getColorForObjectType(type),
      });
      Composite.add(this.engine.world, body);
    }

    return body;
  }

  public removeBody(body: Matter.Body) {
    this.userPropMetadata.delete(body.id);
    Composite.remove(this.engine.world, body);
    this.userBodies = this.userBodies.filter((b) => b.id !== body.id);
  }

  public applyExplosion(
    x: number,
    y: number,
    radius: number = this.params.explosionRadius,
    magnitude: number = this.params.explosionMagnitude
  ) {
    soundEngine.playExplosion();

    if (this.onExplosionCallback) {
      this.onExplosionCallback(x, y, radius);
    }

    const allBodies = Composite.allBodies(this.engine.world);

    allBodies.forEach((body) => {
      if (body.isStatic) return;

      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < radius && dist > 0.001) {
        const factor = (1 - dist / radius);
        // Inverse square falloff feeling with soft cap
        const forceMagnitude = factor * factor * magnitude * (body.mass * 0.45);
        const normX = dx / dist;
        const normY = dy / dist;

        Body.applyForce(body, body.position, {
          x: normX * forceMagnitude,
          y: normY * forceMagnitude - forceMagnitude * 0.3, // Slight upward blast bias
        });

        // Add random rotational torque
        Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.25);
      }
    });
  }

  // Mouse drag handlers with low stiffness (0.2) as per GDD Section 5.1
  public dragStart(x: number, y: number): boolean {
    const bodies = Composite.allBodies(this.engine.world);
    const hitBodies = Matter.Query.point(bodies, { x, y });

    // Filter out static world boundaries
    const draggable = hitBodies.find((b) => !b.isStatic);

    if (draggable) {
      soundEngine.playGrab();

      // Convert global coordinate to body-local offset
      const localPoint = Vector.sub({ x, y }, draggable.position);
      const angle = -draggable.angle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotatedLocalPoint = {
        x: localPoint.x * cos - localPoint.y * sin,
        y: localPoint.x * sin + localPoint.y * cos,
      };

      const dragConstraint = Constraint.create({
        pointA: { x, y },
        bodyB: draggable,
        pointB: rotatedLocalPoint,
        stiffness: 0.2, // low stiffness = rubbery organic pull feeling
        damping: 0.08,
        length: 0,
        render: { visible: false },
      });

      Composite.add(this.engine.world, dragConstraint);

      this.dragState = {
        isDragging: true,
        body: draggable,
        constraint: dragConstraint,
        dragPoint: { x, y },
        dragStartPos: { x, y },
        currentMousePos: { x, y },
        recentVelocities: [],
      };

      return true;
    }

    return false;
  }

  public dragMove(x: number, y: number) {
    if (!this.dragState.isDragging || !this.dragState.constraint) return;

    const prevPos = this.dragState.currentMousePos;
    const vx = x - prevPos.x;
    const vy = y - prevPos.y;

    this.dragState.currentMousePos = { x, y };
    this.dragState.constraint.pointA = { x, y };

    // Record last few velocity frames for momentum throw
    this.dragState.recentVelocities.push({ x: vx, y: vy });
    if (this.dragState.recentVelocities.length > 5) {
      this.dragState.recentVelocities.shift();
    }
  }

  public dragEnd() {
    if (!this.dragState.isDragging) return;

    if (this.dragState.constraint) {
      Composite.remove(this.engine.world, this.dragState.constraint);
    }

    // Apply throw impulse if released with momentum
    if (this.dragState.body && this.dragState.recentVelocities.length > 0) {
      let avgVx = 0;
      let avgVy = 0;
      for (const v of this.dragState.recentVelocities) {
        avgVx += v.x;
        avgVy += v.y;
      }
      avgVx /= this.dragState.recentVelocities.length;
      avgVy /= this.dragState.recentVelocities.length;

      const throwSpeed = Math.sqrt(avgVx * avgVx + avgVy * avgVy);
      if (throwSpeed > 2.0) {
        Body.setVelocity(this.dragState.body, {
          x: this.dragState.body.velocity.x + avgVx * 0.8,
          y: this.dragState.body.velocity.y + avgVy * 0.8,
        });
        soundEngine.playRelease(throwSpeed * 0.15);
      } else {
        soundEngine.playRelease(1.0);
      }
    }

    this.dragState = {
      isDragging: false,
      body: null,
      constraint: null,
      dragPoint: { x: 0, y: 0 },
      dragStartPos: { x: 0, y: 0 },
      currentMousePos: { x: 0, y: 0 },
      recentVelocities: [],
    };
  }

  public updateParameters(newParams: Partial<PhysicsParams>) {
    this.params = { ...this.params, ...newParams };

    this.engine.gravity.x = this.params.gravityX;
    this.engine.gravity.y = this.params.gravityY;

    // Update joint stiffness in all ragdoll constraints
    this.ragdolls.forEach((r) => {
      r.constraints.forEach((c) => {
        c.stiffness = 0.6 * this.params.jointStiffness;
      });
    });
  }

  public triggerDirectControl(action: 'up' | 'left' | 'right' | 'jump') {
    if (this.ragdolls.length > 0) {
      soundEngine.playMotorEffort();
      applyRagdollMotor(this.ragdolls[0].parts, action);
    }
  }

  public update(deltaMs: number) {
    // Fixed timestep execution
    Engine.update(this.engine, deltaMs * this.params.timeScale);

    const now = performance.now();
    const ttlMs = this.params.objectLifespanSec > 0 ? this.params.objectLifespanSec * 1000 : 0;
    const bodiesToFinalize: Matter.Body[] = [];

    // Evaluate all user-spawned bodies for eviction & out-of-bounds
    for (const body of this.userBodies) {
      let meta = this.userPropMetadata.get(body.id);
      if (!meta) {
        meta = {
          bodyId: body.id,
          createdAt: now,
          ttlMs,
          isEvicting: false,
          evictionProgress: 0,
          evictionDurationMs: 380,
          color: '#B0B3B8',
        };
        this.userPropMetadata.set(body.id, meta);
      }

      // 1. Check Out-of-Bounds (Void Killer)
      const isOutOfBounds =
        body.position.y > this.height + 350 ||
        body.position.y < -900 ||
        body.position.x < -450 ||
        body.position.x > this.width + 450;

      if (isOutOfBounds) {
        bodiesToFinalize.push(body);
        continue;
      }

      // 2. Check TTL expiration
      if (ttlMs > 0 && !meta.isEvicting && (now - meta.createdAt) >= ttlMs) {
        meta.isEvicting = true;
      }

      // 3. Advance eviction progress
      if (meta.isEvicting) {
        meta.evictionProgress += (deltaMs * this.params.timeScale) / meta.evictionDurationMs;
        if (meta.evictionProgress >= 1.0) {
          bodiesToFinalize.push(body);
        }
      }
    }

    // Finalize evictions cleanly
    for (const body of bodiesToFinalize) {
      this.finalizeEviction(body);
    }
  }
}
