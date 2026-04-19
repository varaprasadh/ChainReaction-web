import { useSpring } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Position } from '../game/types';

const CELL = 3;
const ROT_SPEED = 2.2;

export const cellToWorld = (p: Position): [number, number, number] => [
  p.col * CELL,
  p.row * CELL,
  0,
];

export const OFFSETS: Record<number, Array<[number, number, number]>> = {
  1: [[0, 0, 0]],
  2: [
    [-0.2, 0, 0],
    [0.2, 0, 0],
  ],
  3: [
    [-0.22, -0.13, 0],
    [0.22, -0.13, 0],
    [0, 0.26, 0],
  ],
  4: [
    [-0.22, -0.22, 0.1],
    [0.22, -0.22, -0.1],
    [0.22, 0.22, 0.1],
    [-0.22, 0.22, -0.1],
  ],
};

interface Props {
  color: string;
  from: Position;
  to: Position;
  offset: [number, number, number];
  exploding: boolean;
  spin: boolean;
  axis: [number, number, number];
}

function rotateAroundAxis(
  v: [number, number, number],
  k: [number, number, number],
  a: number,
): [number, number, number] {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const dot = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const crossX = k[1] * v[2] - k[2] * v[1];
  const crossY = k[2] * v[0] - k[0] * v[2];
  const crossZ = k[0] * v[1] - k[1] * v[0];
  const ocos = 1 - cos;
  return [
    v[0] * cos + crossX * sin + k[0] * dot * ocos,
    v[1] * cos + crossY * sin + k[1] * dot * ocos,
    v[2] * cos + crossZ * sin + k[2] * dot * ocos,
  ];
}

export function Atom({ color, from, to, offset, exploding, spin, axis }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  const [{ alpha, scale, emissive }, api] = useSpring(() => ({
    alpha: 0,
    scale: 0.6,
    emissive: 0.45,
  }));

  useEffect(() => {
    api.start({
      from: { alpha: 0 },
      to: {
        alpha: 1,
        scale: exploding ? 1.5 : 1,
        emissive: exploding ? 1.6 : 0.08,
      },
      reset: true,
      config: { tension: 260, friction: 22 },
    });
  }, [from.row, from.col, to.row, to.col, exploding, api]);

  useFrame((state) => {
    if (!ref.current) return;
    const fx = from.col * CELL;
    const fy = from.row * CELL;
    const tx = to.col * CELL;
    const ty = to.row * CELL;
    let rx = offset[0];
    let ry = offset[1];
    let rz = offset[2];
    if (spin) {
      const a = state.clock.elapsedTime * ROT_SPEED;
      const r = rotateAroundAxis(offset, axis, a);
      rx = r[0];
      ry = r[1];
      rz = r[2];
    }
    const targetX = tx + rx;
    const targetY = ty + ry;
    const targetZ = rz;
    const tv = alpha.get();
    ref.current.position.set(
      fx + (targetX - fx) * tv,
      fy + (targetY - fy) * tv,
      targetZ * tv,
    );
    const s = scale.get();
    ref.current.scale.setScalar(s);
    if (matRef.current) matRef.current.emissiveIntensity = emissive.get();
  });

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.36, 40, 40]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={color}
        roughness={0.35}
        metalness={0.25}
      />
    </mesh>
  );
}
