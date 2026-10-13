/**
 * RagdollBuilder.ts
 * Builds an articulated 14-part physical ragdoll according to GDD Section 6
 */

import Matter from 'matter-js';

const { Bodies, Body, Constraint, Composite } = Matter;

export interface RagdollParts {
  head: Matter.Body;
  chest: Matter.Body;
  pelvis: Matter.Body;
  leftUpperArm: Matter.Body;
  leftForearm: Matter.Body;
  rightUpperArm: Matter.Body;
  rightForearm: Matter.Body;
  leftThigh: Matter.Body;
  leftShin: Matter.Body;
  leftFoot: Matter.Body;
  rightThigh: Matter.Body;
  rightShin: Matter.Body;
  rightFoot: Matter.Body;
}

export interface RagdollInstance {
  composite: Matter.Composite;
  parts: RagdollParts;
  constraints: Matter.Constraint[];
  id: string;
  groupId: number;
}

let ragdollCount = 0;

export function createRagdoll(
  startX: number,
  startY: number,
  scale: number = 1.0,
  globalStiffness: number = 0.6
): RagdollInstance {
  ragdollCount++;
  const ragdollId = `ragdoll_${ragdollCount}`;
  const groupId = Body.nextGroup(true); // Negative group ID ensures non-colliding within this ragdoll instance

  const commonOptions = {
    collisionFilter: { group: groupId },
    restitution: 0.25,
    friction: 0.75,
    frictionAir: 0.015,
    density: 0.003,
  };

  // 1. Head & Neck
  const headRadius = 14 * scale;
  const head = Bodies.circle(startX, startY - 60 * scale, headRadius, {
    ...commonOptions,
    density: 0.0025,
    label: 'ragdoll:head',
  });

  // 2. Chest (Upper Torso)
  const chestW = 24 * scale;
  const chestH = 44 * scale;
  const chest = Bodies.rectangle(startX, startY - 26 * scale, chestW, chestH, {
    ...commonOptions,
    density: 0.004,
    label: 'ragdoll:chest',
  });

  // 3. Pelvis (Lower Torso)
  const pelvisW = 22 * scale;
  const pelvisH = 24 * scale;
  const pelvis = Bodies.rectangle(startX, startY + 10 * scale, pelvisW, pelvisH, {
    ...commonOptions,
    density: 0.004,
    label: 'ragdoll:pelvis',
  });

  // Arms
  const armW = 10 * scale;
  const armH = 30 * scale;
  const forearmW = 9 * scale;
  const forearmH = 26 * scale;

  // Left Arm
  const leftUpperArm = Bodies.rectangle(startX - 20 * scale, startY - 30 * scale, armW, armH, {
    ...commonOptions,
    label: 'ragdoll:leftUpperArm',
  });
  const leftForearm = Bodies.rectangle(startX - 20 * scale, startY - 2 * scale, forearmW, forearmH, {
    ...commonOptions,
    label: 'ragdoll:leftForearm',
  });

  // Right Arm
  const rightUpperArm = Bodies.rectangle(startX + 20 * scale, startY - 30 * scale, armW, armH, {
    ...commonOptions,
    label: 'ragdoll:rightUpperArm',
  });
  const rightForearm = Bodies.rectangle(startX + 20 * scale, startY - 2 * scale, forearmW, forearmH, {
    ...commonOptions,
    label: 'ragdoll:rightForearm',
  });

  // Legs
  const thighW = 13 * scale;
  const thighH = 34 * scale;
  const shinW = 11 * scale;
  const shinH = 30 * scale;
  const footW = 18 * scale;
  const footH = 10 * scale;

  // Left Leg
  const leftThigh = Bodies.rectangle(startX - 9 * scale, startY + 40 * scale, thighW, thighH, {
    ...commonOptions,
    label: 'ragdoll:leftThigh',
  });
  const leftShin = Bodies.rectangle(startX - 9 * scale, startY + 72 * scale, shinW, shinH, {
    ...commonOptions,
    label: 'ragdoll:leftShin',
  });
  const leftFoot = Bodies.rectangle(startX - 6 * scale, startY + 92 * scale, footW, footH, {
    ...commonOptions,
    friction: 0.9,
    label: 'ragdoll:leftFoot',
  });

  // Right Leg
  const rightThigh = Bodies.rectangle(startX + 9 * scale, startY + 40 * scale, thighW, thighH, {
    ...commonOptions,
    label: 'ragdoll:rightThigh',
  });
  const rightShin = Bodies.rectangle(startX + 9 * scale, startY + 72 * scale, shinW, shinH, {
    ...commonOptions,
    label: 'ragdoll:rightShin',
  });
  const rightFoot = Bodies.rectangle(startX + 12 * scale, startY + 92 * scale, footW, footH, {
    ...commonOptions,
    friction: 0.9,
    label: 'ragdoll:rightFoot',
  });

  // Constraints / Joints
  const constraints: Matter.Constraint[] = [];

  const addJoint = (
    bodyA: Matter.Body,
    bodyB: Matter.Body,
    pointA: { x: number; y: number },
    pointB: { x: number; y: number },
    stiffness: number,
    damping: number = 0.08,
    label: string = 'joint'
  ) => {
    const c = Constraint.create({
      bodyA,
      bodyB,
      pointA,
      pointB,
      stiffness: stiffness * globalStiffness,
      damping,
      length: 0,
      render: { visible: false },
      label,
    });
    constraints.push(c);
  };

  // 1. Neck Joint (head <-> chest)
  addJoint(head, chest, { x: 0, y: headRadius * 0.9 }, { x: 0, y: -chestH * 0.48 }, 0.85, 0.1, 'neck');

  // 2. Spine Joint (chest <-> pelvis)
  addJoint(chest, pelvis, { x: 0, y: chestH * 0.48 }, { x: 0, y: -pelvisH * 0.48 }, 0.65, 0.12, 'spine');

  // 3. Shoulders
  addJoint(chest, leftUpperArm, { x: -chestW * 0.45, y: -chestH * 0.4 }, { x: 0, y: -armH * 0.42 }, 0.55, 0.06, 'shoulder_l');
  addJoint(chest, rightUpperArm, { x: chestW * 0.45, y: -chestH * 0.4 }, { x: 0, y: -armH * 0.42 }, 0.55, 0.06, 'shoulder_r');

  // 4. Elbows
  addJoint(leftUpperArm, leftForearm, { x: 0, y: armH * 0.45 }, { x: 0, y: -forearmH * 0.45 }, 0.45, 0.05, 'elbow_l');
  addJoint(rightUpperArm, rightForearm, { x: 0, y: armH * 0.45 }, { x: 0, y: -forearmH * 0.45 }, 0.45, 0.05, 'elbow_r');

  // 5. Hips
  addJoint(pelvis, leftThigh, { x: -pelvisW * 0.35, y: pelvisH * 0.45 }, { x: 0, y: -thighH * 0.45 }, 0.6, 0.08, 'hip_l');
  addJoint(pelvis, rightThigh, { x: pelvisW * 0.35, y: pelvisH * 0.45 }, { x: 0, y: -thighH * 0.45 }, 0.6, 0.08, 'hip_r');

  // 6. Knees
  addJoint(leftThigh, leftShin, { x: 0, y: thighH * 0.45 }, { x: 0, y: -shinH * 0.45 }, 0.55, 0.06, 'knee_l');
  addJoint(rightThigh, rightShin, { x: 0, y: thighH * 0.45 }, { x: 0, y: -shinH * 0.45 }, 0.55, 0.06, 'knee_r');

  // 7. Ankles
  addJoint(leftShin, leftFoot, { x: 0, y: shinH * 0.45 }, { x: -footW * 0.15, y: -footH * 0.3 }, 0.7, 0.05, 'ankle_l');
  addJoint(rightShin, rightFoot, { x: 0, y: shinH * 0.45 }, { x: -footW * 0.15, y: -footH * 0.3 }, 0.7, 0.05, 'ankle_r');

  const composite = Composite.create({ label: ragdollId });
  const allPartsList = [
    head,
    chest,
    pelvis,
    leftUpperArm,
    leftForearm,
    rightUpperArm,
    rightForearm,
    leftThigh,
    leftShin,
    leftFoot,
    rightThigh,
    rightShin,
    rightFoot,
  ];

  Composite.add(composite, allPartsList);
  constraints.forEach((c) => Composite.add(composite, c));

  return {
    composite,
    parts: {
      head,
      chest,
      pelvis,
      leftUpperArm,
      leftForearm,
      rightUpperArm,
      rightForearm,
      leftThigh,
      leftShin,
      leftFoot,
      rightThigh,
      rightShin,
      rightFoot,
    },
    constraints,
    id: ragdollId,
    groupId,
  };
}

/**
 * Apply procedural balance or direct muscle impulse (Euphoria active motors)
 */
export function applyRagdollMotor(
  parts: RagdollParts,
  action: 'up' | 'left' | 'right' | 'jump'
) {
  const { chest, pelvis, leftFoot, rightFoot, head } = parts;

  if (action === 'up') {
    // Torque chest upwards and apply upward lift
    Body.applyForce(chest, chest.position, { x: 0, y: -0.015 });
    Body.applyForce(head, head.position, { x: 0, y: -0.01 });
    Body.setAngularVelocity(chest, chest.angularVelocity * 0.5);
  } else if (action === 'left') {
    Body.applyForce(chest, chest.position, { x: -0.014, y: -0.005 });
    Body.setAngularVelocity(chest, -0.08);
  } else if (action === 'right') {
    Body.applyForce(chest, chest.position, { x: 0.014, y: -0.005 });
    Body.setAngularVelocity(chest, 0.08);
  } else if (action === 'jump') {
    // Kick legs downwards to jump up
    Body.applyForce(leftFoot, leftFoot.position, { x: -0.003, y: -0.035 });
    Body.applyForce(rightFoot, rightFoot.position, { x: 0.003, y: -0.035 });
    Body.applyForce(pelvis, pelvis.position, { x: 0, y: -0.04 });
  }
}
