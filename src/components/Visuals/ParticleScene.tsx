import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSceneProps {
  audioData: Float32Array;
  interactionPoint: THREE.Vector3 | null;
  mode: 'idle' | 'interaction' | 'flow' | 'climax';
  intensity: number;
  isStarted?: boolean;
  isPaused?: boolean;
  sourcePositions?: THREE.Vector3[];
  isExploding?: boolean;
}

export const ParticleScene: React.FC<ParticleSceneProps> = ({
  audioData,
  interactionPoint,
  mode,
  intensity,
  isStarted,
  isPaused,
  sourcePositions,
  isExploding,
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Group>(null);
  const count = 14000;
  const shardCount = 180;
  const { size } = useThree();
  const opacityRef = useRef(0);
  const colorRef = useRef(new THREE.Color('#22d3ee'));

  const [positions, initialPositions] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const init = new Float32Array(count * 3);
    const sourceCount = sourcePositions
      ? Math.min(sourcePositions.length, Math.floor(count * 0.4))
      : 0;

    for (let i = 0; i < count; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      if (i < sourceCount && sourcePositions) {
        const source = sourcePositions[i];
        const jitter = 0.2;
        pos[ix] = init[ix] = source.x + (Math.random() - 0.5) * jitter;
        pos[iy] = init[iy] = source.y + (Math.random() - 0.5) * jitter;
        pos[iz] = init[iz] = source.z + (Math.random() - 0.5) * jitter * 0.5;
        continue;
      }

      const type = Math.random();
      let r, theta, phi;

      if (type > 0.6) {
        r = 10 + Math.random() * 5;
        theta = Math.random() * Math.PI * 2;
        phi = Math.acos(2 * Math.random() - 1);
      } else if (type > 0.2) {
        r = Math.random() * 20;
        theta = Math.random() * Math.PI * 2;
        phi = Math.acos(2 * Math.random() - 1);
      } else {
        r = Math.random() * 3;
        theta = Math.random() * Math.PI * 2;
        phi = Math.acos(2 * Math.random() - 1);
      }

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      pos[ix] = init[ix] = x;
      pos[iy] = init[iy] = y;
      pos[iz] = init[iz] = z;
    }

    return [pos, init];
  }, [count, sourcePositions]);

  const shardData = useMemo(
    () =>
      Array.from({ length: shardCount }).map(() => ({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 10,
        ),
        rotation: new THREE.Euler(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ),
        scale: 0.05 + Math.random() * 0.1,
        speed: 0.1 + Math.random() * 0.5,
      })),
    [shardCount],
  );

  useFrame((state) => {
    if (isPaused) return;

    const time = state.clock.getElapsedTime();

    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      const targetOpacity = isExploding
        ? 0.55 + intensity * 0.25
        : 0;
      opacityRef.current = THREE.MathUtils.lerp(opacityRef.current, targetOpacity, 0.08);
      mat.opacity = opacityRef.current;
      mat.visible = opacityRef.current > 0.01;

      const c1 = new THREE.Color('#22d3ee');
      const c2 = new THREE.Color('#8b5cf6');
      const c3 = new THREE.Color('#ec4899');
      const c4 = new THREE.Color('#ffffff');

      if (intensity < 0.4) {
        colorRef.current.copy(c1).lerp(c2, intensity / 0.4);
      } else if (intensity < 0.8) {
        colorRef.current.copy(c2).lerp(c3, (intensity - 0.4) / 0.4);
      } else {
        colorRef.current.copy(c3).lerp(c4, (intensity - 0.8) / 0.2);
      }
      mat.color.copy(colorRef.current);

      if (meshRef.current) {
        meshRef.current.visible = opacityRef.current > 0.01;
        meshRef.current.children.forEach((child) => {
          const mesh = child as THREE.Mesh;
          const meshMat = mesh.material as THREE.MeshStandardMaterial;
          meshMat.color.copy(colorRef.current);
          meshMat.emissive.copy(colorRef.current);
          meshMat.emissiveIntensity = 0.5 + intensity * 4;
          meshMat.opacity = opacityRef.current * 0.25;
        });
      }
    }

    if (pointsRef.current) {
      const posAttr = pointsRef.current.geometry.attributes.position;
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      const activeCount = isExploding
        ? Math.floor((0.1 + intensity * 0.75) * count)
        : 0;
      pointsRef.current.geometry.setDrawRange(0, Math.max(0, activeCount));
      mat.size = 0.02 + intensity * 0.05 + (isExploding ? 0.01 : 0);

      for (let i = 0; i < count; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;
        const audioIdx = i % audioData.length;
        const audioValue = Math.abs(audioData[audioIdx]) * 3.0;

        if (interactionPoint && (mode === 'interaction' || mode === 'climax')) {
          const dx = posAttr.array[ix] - interactionPoint.x;
          const dy = posAttr.array[iy] - interactionPoint.y;
          const dz = posAttr.array[iz] - (interactionPoint.z || 0);
          const distSq = dx * dx + dy * dy + dz * dz;
          const dist = Math.sqrt(distSq);

          if (dist < 12) {
            const force = (12 - dist) * (0.8 + intensity * 1.2);
            posAttr.array[ix] += (dx / dist) * force;
            posAttr.array[iy] += (dy / dist) * force;
            posAttr.array[iz] += (dz / dist) * force;
          }
        }

        const returnFactor = isExploding ? 0.01 : 0.03;
        posAttr.array[ix] += (initialPositions[ix] - posAttr.array[ix]) * returnFactor;
        posAttr.array[iy] += (initialPositions[iy] - posAttr.array[iy]) * returnFactor;
        posAttr.array[iz] += (initialPositions[iz] - posAttr.array[iz]) * returnFactor;

        posAttr.array[ix] += Math.sin(time * 0.2 + initialPositions[iz]) * 0.001;
        posAttr.array[iy] += Math.cos(time * 0.2 + initialPositions[ix]) * 0.001;
      }

      posAttr.needsUpdate = true;
      pointsRef.current.rotation.y += 0.0003;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y = time * 0.04;
      meshRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        mesh.rotation.x += 0.008 * (1 + intensity);
        mesh.rotation.z += 0.004 * (1 + intensity);
        mesh.position.y += Math.sin(time + i) * 0.002;
      });
    }
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          size={0.03}
          color="#22d3ee"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      <group ref={meshRef}>
        {shardData.map((data, i) => (
          <mesh key={i} position={data.position} rotation={data.rotation} scale={data.scale}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
              color="#22d3ee"
              emissive="#22d3ee"
              emissiveIntensity={1}
              transparent
              opacity={0}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
