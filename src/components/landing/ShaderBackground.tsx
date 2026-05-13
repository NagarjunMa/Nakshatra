"use client";

import {
  Shader,
  ChromaFlow,
  FilmGrain,
  FlutedGlass,
  Swirl,
} from "shaders/react";

export function ShaderBackground() {
  return (
    <Shader
      aria-hidden
      className="fixed inset-0 w-screen h-screen -z-10 pointer-events-none"
    >
      <Swirl colorA="#000000" colorB="#0a0a0a" detail={1.7} />
      <ChromaFlow
        baseColor="#18181a"
        downColor="#6600ff"
        leftColor="#aa00ee"
        momentum={13}
        rightColor="#ff0066"
        upColor="#ff00aa"
      />
      <FlutedGlass
        aberration={0.61}
        frequency={8}
        highlight={0.12}
        highlightSoftness={0}
        lightAngle={-90}
        refraction={4}
        shape="rounded"
        softness={1}
        speed={0.15}
      />
      <FilmGrain strength={0.05} />
    </Shader>
  );
}
