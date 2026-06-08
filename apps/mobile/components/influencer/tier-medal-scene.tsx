import type { TierBadgeVisual } from '@/lib/influencer/home-tier';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

type TierMedalSceneProps = {
  visual: TierBadgeVisual;
  active: boolean;
  locked: boolean;
  useFrame: typeof import('@react-three/fiber/native').useFrame;
};

function RimStuds({ color, locked }: { color: string; locked: boolean }) {
  const studs = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2;
        return {
          key: `stud-${index}`,
          x: Math.cos(angle) * 1.15,
          y: Math.sin(angle) * 1.15,
        };
      }),
    [],
  );

  return studs.map((stud) => (
    <mesh key={stud.key} position={[stud.x, stud.y, 0.19]}>
      <sphereGeometry args={[0.035, 16, 12]} />
      <meshStandardMaterial
        color={color}
        metalness={1}
        roughness={0.18}
        transparent={locked}
        opacity={locked ? 0.44 : 1}
      />
    </mesh>
  ));
}

export function TierMedalScene({ visual, active, locked, useFrame }: TierMedalSceneProps) {
  const medal = useRef<THREE.Group>(null);
  const shine = useRef<THREE.Mesh>(null);
  const opacity = locked ? 0.62 : 1;

  useFrame(({ clock }, delta) => {
    if (!medal.current) return;

    const targetY = active ? Math.sin(clock.elapsedTime * 0.9) * 0.18 : -0.18;
    const targetX = active ? Math.sin(clock.elapsedTime * 0.7) * 0.04 : -0.04;
    medal.current.rotation.y += (targetY - medal.current.rotation.y) * Math.min(delta * 5, 1);
    medal.current.rotation.x += (targetX - medal.current.rotation.x) * Math.min(delta * 4, 1);

    if (shine.current) {
      shine.current.rotation.z = clock.elapsedTime * 0.35;
    }
  });

  return (
    <>
      <ambientLight intensity={locked ? 0.72 : 0.9} />
      <directionalLight position={[2.8, 3.2, 4.8]} intensity={locked ? 1.15 : 1.75} />
      <pointLight position={[-2.4, -1.4, 3]} intensity={locked ? 4 : 8} color={visual.glow} />
      <pointLight position={[1.5, 1.4, 2.5]} intensity={locked ? 3 : 6} color={visual.accent} />

      <group ref={medal} scale={locked ? 0.9 : 1}>
        <mesh position={[0, 0, -0.16]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.44, 1.42, 0.34, 128]} />
          <meshStandardMaterial
            color={visual.shadow}
            metalness={0.96}
            roughness={0.24}
            transparent
            opacity={opacity}
          />
        </mesh>

        <mesh position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1.29, 1.24, 0.2, 128]} />
          <meshStandardMaterial
            color={visual.face}
            metalness={0.92}
            roughness={0.18}
            emissive={visual.shadow}
            emissiveIntensity={locked ? 0.02 : 0.1}
            transparent
            opacity={opacity}
          />
        </mesh>

        <mesh position={[0, 0, 0.15]}>
          <torusGeometry args={[1.19, 0.14, 32, 180]} />
          <meshStandardMaterial
            color={visual.rim}
            metalness={1}
            roughness={0.12}
            emissive={visual.glow}
            emissiveIntensity={locked ? 0.04 : 0.16}
            transparent
            opacity={opacity}
          />
        </mesh>

        <mesh position={[0, 0, 0.24]}>
          <torusGeometry args={[0.86, 0.04, 20, 144]} />
          <meshStandardMaterial
            color={visual.accent}
            metalness={0.96}
            roughness={0.15}
            transparent
            opacity={locked ? 0.48 : 0.9}
          />
        </mesh>

        <mesh position={[0, 0, 0.29]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.58, 0.5, 0.12, 96]} />
          <meshStandardMaterial
            color={visual.face}
            metalness={0.94}
            roughness={0.14}
            emissive={visual.glow}
            emissiveIntensity={locked ? 0.03 : 0.12}
            transparent
            opacity={opacity}
          />
        </mesh>

        <mesh position={[0, 0, 0.38]}>
          <torusGeometry args={[0.54, 0.026, 16, 112]} />
          <meshStandardMaterial
            color={visual.rim}
            metalness={1}
            roughness={0.1}
            transparent
            opacity={locked ? 0.42 : 0.86}
          />
        </mesh>

        <mesh position={[0, 0, 0.4]}>
          <torusGeometry args={[0.31, 0.015, 12, 96]} />
          <meshStandardMaterial
            color={visual.accent}
            metalness={1}
            roughness={0.12}
            transparent
            opacity={locked ? 0.28 : 0.64}
          />
        </mesh>

        <RimStuds color={visual.accent} locked={locked} />

        <mesh
          ref={shine}
          position={[-0.34, 0.42, 0.34]}
          rotation={[0, 0, -0.6]}
          scale={[0.18, 0.72, 0.02]}
        >
          <sphereGeometry args={[0.64, 32, 16]} />
          <meshStandardMaterial
            color="#FFFFFF"
            metalness={0.1}
            roughness={0.02}
            transparent
            opacity={locked ? 0.12 : 0.26}
          />
        </mesh>
      </group>
    </>
  );
}
