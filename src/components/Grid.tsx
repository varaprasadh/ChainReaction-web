// @ts-nocheck

import React, { useEffect, useRef, useState } from "react";
//R3F
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import * as THREE from "three";

import "./three/ColorMaterial";

// React Spring
import { useSpring, a } from "@react-spring/three";


export const Grid = ({ args, rows = 5, columns = 5, color, onGridCellClick, position = [0,0,0]}) => {


  const GridCell = ({ position, args, color }) => {
    return (
      <a.mesh
        position={position}
        onClick={onGridCellClick}
        >
        <boxGeometry attach='geometry' args={args}/>
        <meshPhongMaterial visible={false} attach="material" transparent={true} color={"white"} reflectivity={1}/>
        {/* <colorMaterial  wireframe={true} attachArray="material" color="#A2CCB6" />
        <colorMaterial wireframe={true} attachArray="material" color="#A2CCB6" />
        <colorMaterial wireframe={true} attachArray="material" color="#A2CCB6" />
        <colorMaterial wireframe={true} attachArray="material" color="#A2CCB6" />
        <colorMaterial attachArray="material" color=""  />
        <colorMaterial attachArray="material" color="rgba(0,0,0,0)" />  */}
      </a.mesh>
    )
  }
  const CELL_WIDTH = 3;
  const CELL_HEIGHT = 3;

  const cells = [];

  for (let y = 0, h = 0; y < rows; h += CELL_HEIGHT,y++){
    for (let x = 0, w = 0; x < columns; w +=CELL_WIDTH,x++){
      const position = [x* CELL_WIDTH,y* CELL_HEIGHT,0]
      cells.push({
        position,
        args: [CELL_WIDTH, CELL_HEIGHT, 0]
      });
    }
  };

  return (
    <group
      position={position}
      castShadow
    >
      {
        cells.map(({ position, args },index)=>(
          <GridCell key={index}  position={position} args={args}/>
        ))
      }
    </group>
  )

}