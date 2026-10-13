/**
 * scenePresets.ts
 * Implements the 5 canonical scenes from GDD Section 8
 */

import Matter from 'matter-js';
import { SceneConfig, SceneId } from '../types';

const { Bodies, Body, Constraint, Composite } = Matter;

export const SCENE_CONFIGS: Record<SceneId, SceneConfig> = {
  arena: {
    id: 'arena',
    name: 'Arena de Impacto',
    tagline: 'Laboratório de testes com pirâmide de caixas',
    gravity: { x: 0, y: 1.5 },
    description: 'Sala fechada com caixas empilhadas. Teste o arremesso do boneco contra as estruturas.',
    ragdollStartPos: { x: 260, y: 350 },
  },
  tower: {
    id: 'tower',
    name: 'Torre de Queda',
    tagline: 'Experimento de altura com plataformas escalonadas',
    gravity: { x: 0, y: 2.0 },
    description: 'Plataformas em múltiplos andares. O ragdoll despenca do topo colidindo em cadeia.',
    ragdollStartPos: { x: 220, y: 120 },
  },
  domino: {
    id: 'domino',
    name: 'Dominó em Cadeia',
    tagline: '15 peças alinhadas esperando o gatilho',
    gravity: { x: 0, y: 1.5 },
    description: 'Fileira de dominós verticais. Empurre o ragdoll ou uma peça para iniciar a reação.',
    ragdollStartPos: { x: 180, y: 460 },
  },
  seesaw: {
    id: 'seesaw',
    name: 'Gangorra Dinâmica',
    tagline: 'Equilíbrio instável e efeito catapulta',
    gravity: { x: 0, y: 1.5 },
    description: 'Plataforma rotativa sobre pino central com pesos e esferas.',
    ragdollStartPos: { x: 380, y: 440 },
  },
  free: {
    id: 'free',
    name: 'Sandbox Livre',
    tagline: 'Bancada vazia com total liberdade',
    gravity: { x: 0, y: 1.5 },
    description: 'Apenas piso e paredes. Adicione formas, explosivos e pêndulos pela toolbar.',
    ragdollStartPos: { x: 450, y: 380 },
  },
};

export interface BuiltScene {
  worldBodies: Matter.Body[];
  worldConstraints: Matter.Constraint[];
  ragdollStart: { x: number; y: number };
}

/**
 * Creates static boundary walls around canvas dimensions
 */
export function createBoundaries(width: number, height: number): Matter.Body[] {
  const wallThickness = 60;
  const boundaryColor = '#25262A';

  const floor = Bodies.rectangle(width / 2, height + wallThickness / 2 - 12, width * 2, wallThickness, {
    isStatic: true,
    label: 'boundary:floor',
    render: { fillStyle: boundaryColor },
    friction: 0.8,
  });

  const ceiling = Bodies.rectangle(width / 2, -wallThickness / 2 + 10, width * 2, wallThickness, {
    isStatic: true,
    label: 'boundary:ceiling',
    render: { fillStyle: boundaryColor },
  });

  const leftWall = Bodies.rectangle(-wallThickness / 2 + 12, height / 2, wallThickness, height * 2, {
    isStatic: true,
    label: 'boundary:left',
    render: { fillStyle: boundaryColor },
  });

  const rightWall = Bodies.rectangle(width + wallThickness / 2 - 12, height / 2, wallThickness, height * 2, {
    isStatic: true,
    label: 'boundary:right',
    render: { fillStyle: boundaryColor },
  });

  return [floor, ceiling, leftWall, rightWall];
}

/**
 * Builds specific scene objects based on sceneId
 */
export function buildScene(sceneId: SceneId, width: number, height: number): BuiltScene {
  const bodies: Matter.Body[] = [...createBoundaries(width, height)];
  const constraints: Matter.Constraint[] = [];
  const groundY = height - 12;

  let ragdollStart = { x: width * 0.25, y: height * 0.5 };

  switch (sceneId) {
    case 'arena': {
      ragdollStart = { x: width * 0.22, y: groundY - 140 };

      // Stack of boxes in the center
      const boxSize = Math.min(width * 0.05, 52);
      const startBoxX = width * 0.62;
      const rows = 4;

      for (let row = 0; row < rows; row++) {
        const count = rows - row;
        const rowY = groundY - (boxSize / 2) - (row * (boxSize + 2));
        const rowStartX = startBoxX - ((count - 1) * (boxSize + 4)) / 2;

        for (let col = 0; col < count; col++) {
          const boxX = rowStartX + col * (boxSize + 4);
          const box = Bodies.rectangle(boxX, rowY, boxSize, boxSize, {
            density: 0.003,
            friction: 0.7,
            restitution: 0.15,
            label: 'prop:box_wood',
          });
          bodies.push(box);
        }
      }

      // Add a couple of floating small platforms to rebound off
      const platformL = Bodies.rectangle(width * 0.28, groundY - 260, 140, 16, {
        isStatic: true,
        label: 'platform:steel',
      });
      const platformR = Bodies.rectangle(width * 0.82, groundY - 220, 160, 16, {
        isStatic: true,
        label: 'platform:steel',
      });
      bodies.push(platformL, platformR);

      // Add one suspended pendulum ball above
      const pendX = width * 0.46;
      const pendY = groundY - 360;
      const ball = Bodies.circle(pendX, pendY + 120, 24, {
        density: 0.008,
        restitution: 0.8,
        label: 'prop:pendulum_ball',
      });
      const anchor = Constraint.create({
        pointA: { x: pendX, y: pendY },
        bodyB: ball,
        stiffness: 0.95,
        length: 120,
        render: { strokeStyle: '#25262A', lineWidth: 3 },
      });
      bodies.push(ball);
      constraints.push(anchor);
      break;
    }

    case 'tower': {
      ragdollStart = { x: width * 0.22, y: 120 };

      // Multiple staggered floating platforms
      const platformHeights = [
        { x: width * 0.24, y: 180, w: 200, angle: 0.08 },
        { x: width * 0.65, y: 280, w: 240, angle: -0.1 },
        { x: width * 0.32, y: 390, w: 220, angle: 0.12 },
        { x: width * 0.72, y: 490, w: 230, angle: -0.08 },
        { x: width * 0.40, y: 590, w: 220, angle: 0.05 },
      ];

      platformHeights.forEach((p, idx) => {
        const plat = Bodies.rectangle(p.x, p.y, p.w, 16, {
          isStatic: true,
          angle: p.angle,
          friction: 0.6,
          label: `platform:tier_${idx + 1}`,
        });
        bodies.push(plat);

        // Put a rollable heavy sphere on platform 2
        if (idx === 1) {
          const ball = Bodies.circle(p.x - 40, p.y - 30, 20, {
            density: 0.007,
            restitution: 0.3,
            label: 'prop:steel_ball',
          });
          bodies.push(ball);
        }
      });

      // Bottom rebound bumper
      const bumper = Bodies.polygon(width * 0.82, groundY - 40, 3, 45, {
        isStatic: true,
        angle: -Math.PI / 6,
        label: 'prop:bumper_spike',
      });
      bodies.push(bumper);
      break;
    }

    case 'domino': {
      ragdollStart = { x: width * 0.14, y: groundY - 140 };

      const dominoCount = 16;
      const dominoW = 12;
      const dominoH = 75;
      const spacing = 38;
      const startX = width * 0.25;

      for (let i = 0; i < dominoCount; i++) {
        const dX = startX + i * spacing;
        const domino = Bodies.rectangle(dX, groundY - dominoH / 2, dominoW, dominoH, {
          density: 0.004,
          friction: 0.8,
          restitution: 0.1,
          label: 'prop:domino',
        });
        bodies.push(domino);
      }

      // Elevated starter ramp on the left
      const ramp = Bodies.rectangle(width * 0.14, groundY - 90, 140, 14, {
        isStatic: true,
        angle: 0.35,
        friction: 0.2,
        label: 'platform:ramp',
      });
      bodies.push(ramp);

      // Heavy ball at the end for an explosive finale
      const finaleBarrel = Bodies.rectangle(startX + (dominoCount - 0.5) * spacing + 60, groundY - 32, 44, 60, {
        density: 0.005,
        restitution: 0.2,
        label: 'prop:explosive_barrel',
      });
      bodies.push(finaleBarrel);
      break;
    }

    case 'seesaw': {
      ragdollStart = { x: width * 0.35, y: groundY - 240 };

      // Central fulcrum triangle
      const fulcrumX = width * 0.5;
      const fulcrumY = groundY - 35;
      const fulcrum = Bodies.polygon(fulcrumX, fulcrumY, 3, 40, {
        isStatic: true,
        label: 'platform:fulcrum',
      });

      // Long balance beam
      const beamW = Math.min(width * 0.55, 520);
      const beamH = 18;
      const beamY = fulcrumY - 28;
      const beam = Bodies.rectangle(fulcrumX, beamY, beamW, beamH, {
        density: 0.004,
        friction: 0.8,
        frictionAir: 0.005,
        label: 'prop:seesaw_beam',
      });

      // Pin constraint attaching beam center to fulcrum tip
      const pivot = Constraint.create({
        pointA: { x: fulcrumX, y: beamY },
        bodyB: beam,
        stiffness: 1.0,
        length: 0,
        render: { strokeStyle: '#25262A', lineWidth: 4 },
      });

      bodies.push(fulcrum, beam);
      constraints.push(pivot);

      // Spheres on the right side
      const ballR1 = Bodies.circle(fulcrumX + beamW * 0.35, beamY - 40, 24, {
        density: 0.009,
        restitution: 0.4,
        label: 'prop:steel_ball',
      });
      const ballR2 = Bodies.circle(fulcrumX + beamW * 0.44, beamY - 40, 28, {
        density: 0.012,
        restitution: 0.4,
        label: 'prop:heavy_bowling_ball',
      });
      bodies.push(ballR1, ballR2);

      // Elevated launch ledge on the left
      const launchPlat = Bodies.rectangle(width * 0.2, groundY - 280, 160, 16, {
        isStatic: true,
        label: 'platform:steel',
      });
      bodies.push(launchPlat);
      break;
    }

    case 'free':
    default: {
      ragdollStart = { x: width * 0.5, y: groundY - 180 };
      // Blank laboratory floor with high clearance
      break;
    }
  }

  return {
    worldBodies: bodies,
    worldConstraints: constraints,
    ragdollStart,
  };
}
