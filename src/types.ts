/**
 * Ragdoll Sandbox Types & Interfaces
 */

export type SkinStyle = 'dummy' | 'stickman' | 'blueprint' | 'debug';

export type ToolMode = 'drag' | 'spawn' | 'explode' | 'throw';

export type SpawnableObjectType = 
  | 'small_box'
  | 'heavy_box'
  | 'bouncy_ball'
  | 'bowling_ball'
  | 'triangle_spike'
  | 'seesaw_plank'
  | 'pendulum'
  | 'explosive_barrel'
  | 'ragdoll';

export type SceneId = 'arena' | 'tower' | 'domino' | 'seesaw' | 'free';

export interface SceneConfig {
  id: SceneId;
  name: string;
  tagline: string;
  gravity: { x: number; y: number };
  description: string;
  ragdollStartPos: { x: number; y: number };
}

export interface PhysicsParams {
  gravityY: number;
  gravityX: number;
  jointStiffness: number;
  ragdollMassScale: number;
  explosionRadius: number;
  explosionMagnitude: number;
  timeScale: number;
  airResistance: number;
  maxUserObjects: number; // 0 = unlimited, otherwise FIFO cap (e.g. 60)
  objectLifespanSec: number; // 0 = permanent until manual clear, e.g. 30 = 30s TTL
}

export interface PropLifespanData {
  bodyId: number;
  createdAt: number;
  ttlMs: number;
  isEvicting: boolean;
  evictionProgress: number; // 0 to 1
  evictionDurationMs: number;
  color?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  maxLife: number;
  life: number;
  type: 'dust' | 'spark' | 'smoke' | 'debris';
  rotation: number;
  rotSpeed: number;
}

export interface Shockwave {
  x: number;
  y: number;
  currentRadius: number;
  maxRadius: number;
  maxLife: number;
  life: number;
  color: string;
  lineWidth: number;
}

export interface ScreenFlash {
  alpha: number;
  color: string;
  decay: number;
}

export interface DebugStats {
  fps: number;
  bodyCount: number;
  constraintCount: number;
  ragdollSpeed: number;
  ragdollCenterY: number;
  collisionEventsLastSec: number;
  userObjectCount: number;
  maxUserObjects: number;
  evictedCount: number;
  objectLifespanSec: number;
}
