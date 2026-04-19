import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { cellToWorld } from './Atom';

const CELL = 3;

interface Props {
  rows: number;
  cols: number;
  color: string;
  disabled?: boolean;
  onCellClick: (row: number, col: number) => void;
}

function Cell({
  r,
  c,
  pos,
  color,
  disabled,
  onClick,
}: {
  r: number;
  c: number;
  pos: [number, number, number];
  color: string;
  disabled: boolean;
  onClick: (r: number, c: number) => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <mesh
      position={pos}
      onPointerOver={(e) => {
        if (disabled) return;
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHover(false);
        if (!disabled) document.body.style.cursor = '';
      }}
      onPointerDown={(e) => {
        if (disabled) return;
        e.stopPropagation();
        onClick(r, c);
      }}
    >
      <planeGeometry args={[CELL * 0.96, CELL * 0.96]} />
      <meshBasicMaterial
        transparent
        opacity={disabled ? 0 : hover ? 0.18 : 0.03}
        color={color}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Board({ rows, cols, color, disabled = false, onCellClick }: Props) {
  const lineGeom = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const totalW = cols * CELL;
    const totalH = rows * CELL;
    const ox = -CELL / 2;
    const oy = -CELL / 2;
    for (let r = 0; r <= rows; r++) {
      points.push(new THREE.Vector3(ox, oy + r * CELL, 0));
      points.push(new THREE.Vector3(ox + totalW, oy + r * CELL, 0));
    }
    for (let c = 0; c <= cols; c++) {
      points.push(new THREE.Vector3(ox + c * CELL, oy, 0));
      points.push(new THREE.Vector3(ox + c * CELL, oy + totalH, 0));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [rows, cols]);

  const cells: Array<{ r: number; c: number; pos: [number, number, number] }> = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push({ r, c, pos: cellToWorld({ row: r, col: c }) });
    }
  }

  return (
    <group>
      <lineSegments geometry={lineGeom}>
        <lineBasicMaterial color={color} transparent opacity={0.45} />
      </lineSegments>
      {cells.map((cell) => (
        <Cell
          key={`${cell.r}-${cell.c}`}
          r={cell.r}
          c={cell.c}
          pos={cell.pos}
          color={color}
          disabled={disabled}
          onClick={onCellClick}
        />
      ))}
    </group>
  );
}
