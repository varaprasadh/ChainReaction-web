// @ts-nocheck

import React, { useEffect, useRef, useState, useMemo } from "react";
//R3F
import { Canvas, useFrame, extend, useThree } from "@react-three/fiber";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

import { Stars } from "@react-three/drei";


import * as THREE from "three";

import "./components/three/ColorMaterial";
import { Grid as BoxGrid } from "./components/Grid";

import bubbleAudio from "./assets/audio/bubble.mp3";


//Components

// React Spring
import { useSpring, a } from "@react-spring/three";

// Styles
import './App.css';

import ChainReaction from "./utils/ChainReaction";


// Extend will make OrbitControls available as a JSX element called orbitControls for us to use.
extend({ OrbitControls });


const CameraControls = () => {
  // Get a reference to the Three.js Camera, and the canvas html element.
  // We need these to setup the OrbitControls component.
  // https://threejs.org/docs/#examples/en/controls/OrbitControls
  const {
    camera,
    gl: { domElement },
  } = useThree();
  // Ref to the controls, so that we can update them on every frame using useFrame
  const controls = useRef();
  useFrame((state) => controls.current.update());
  return <orbitControls ref={controls} args={[camera, domElement]} />;
};

const SpinningMesh = ({ position, color, speed, args }) => {
  //ref to target the mesh
  const mesh = useRef();

  //useFrame allows us to re-render/update rotation on each frame
  useFrame(() => (mesh.current.rotation.x = mesh.current.rotation.y += 0.01));

  //Basic expand state
  const [expand, setExpand] = useState(false);
  // React spring expand animation
  const props = useSpring({
    scale: expand ? [1.4, 1.4, 1.4] : [1, 1, 1],
  });

  return (
    <a.mesh
      position={position}
      ref={mesh}
      onClick={() => setExpand(!expand)}
      scale={props.scale}
      castShadow>
      <boxBufferGeometry attach='geometry' args={args} />
      <meshStandardMaterial
        color={color}
        attach='material'
      />
    </a.mesh>
  );
};

const Sphere = ({ position, from, color, args = [0.2, 32, 32] }) => {
  const mesh = useRef();

  useEffect(() => {
    if (from) {

      const [x1, y1, z1] = from;
      const [x2, y2, z2] = position;

      const diffX = (x2 - x1);
      const diffY = (y2 - y1);
      const dx = diffX / 10;
      const dy = diffY / 10;

      console.log(mesh.current);

      


      mesh.current.position.set(x1, y1, z1 );
      let step = 0;
      // if(steps === 0) return;
      const timer = setInterval(() => {
        mesh.current.position.x += dx;
        mesh.current.position.y += dy;
        step++;
        if (step === 10) {
          clearInterval(timer);
        }
      }, 20)
      return () => clearInterval(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  // const [expand, setExpand] = useState(false);

  // const props = useSpring({
  //   scale: expand ? [5, 5, 5] : [2, 2, 2],
  // });

  return (
    <a.mesh
      position={position}
      castShadow
      ref={mesh}
    >
      <sphereBufferGeometry attach="geometry" args={args} />
      <meshPhongMaterial
        attach='material'
        color={color}
        specular={0x050505}
        shininess={80}
      />
    </a.mesh>
  )
};

// compound  : group of atoms 
// based on count arrange placement 

const explodeSound = new Audio(bubbleAudio);

const Compound = ({ cell }) => {

  const compound = useRef();
  
  if (cell.items.length > cell.capacity) {
    explodeSound.currentTime = 0;
    explodeSound.play();
  }

  const atom = cell.items.length && cell.items[0];

  const [_x, _y, _z] = atom ? [atom.currentPosition.column*3, atom.currentPosition.row*3 , 0] : [0, 0, 0];

  const atoms = cell.items.map(info => {
    const prow = info.prevPosition.row;
    const pcol = info.prevPosition.column;

    return ({
      ...info,
      prevPosition: [pcol * 3 - _x, prow * 3 - _y, 0],
      currentPosition: [0, 0, 0]
    })
  });



  switch (atoms.length) {
    case 2:
      {
        const [x, y, z] = atoms[0].currentPosition;
        atoms[0].currentPosition = [x - 0.2, y, z];
      }
      {
        const [x, y, z] = atoms[1].currentPosition;
        atoms[1].currentPosition = [x + 0.1, y, z];
      }
      break;
    case 3:
      {
        const [x, y, z] = atoms[0].currentPosition;
        atoms[0].currentPosition = [x - 0.1, y - 0.25, z];
      }
      {
        const [x, y, z] = atoms[1].currentPosition;
        atoms[1].currentPosition = [x + 0.1, y - 0.25, z];
      }
      {
        const [x, y, z] = atoms[1].currentPosition;
        atoms[2].currentPosition = [x, y + 0.2, z];
      }
      break;
  }

  const [revolve, setRevolve] = useState(false);
  useFrame(state => {
    if (revolve) {
      compound.current.rotation.x += 0.01;
      compound.current.rotation.z += 0.05;
    }
  });

  // useEffect(() => {
  //   console.log("only running once"); 
  //   const timer = setTimeout(() => {
  //     console.log("tureing timer");
  //     setRevolve(true);
  //   }, 600);
  //   return () => {
  //     console.log("falsing timer");
  //     setRevolve(false);
  //     clearTimeout(timer);
  //   };
  // }, [cell.items]);
  
  return (
    <group ref={compound} position={[_x, _y, _z]}>
      {
        atoms.map((atom, index) => (
          <Sphere
            key={atom.id}
            color={cell.owner ? cell.owner.color: 'pink'}
            position={atom.currentPosition}
            from={atom.prevPosition}
          />
        ))
      }
    </group>
  )
}



const Grid = ({ args, rows = 5, columns = 5, color, position = [0, 0, 0], onGridCellClick }) => {


  const GridCell = ({ position, args, color , onClick}) => {
    const [cx, cy, cz] = position;
    const [CELL_WIDTH, CELL_HEIGHT, depth] = args;

    const points = [];
    points.push(
      new THREE.Vector3(cx - CELL_WIDTH / 2, cy - CELL_HEIGHT / 2, -1),
      new THREE.Vector3(cx + CELL_WIDTH / 2, cy - CELL_HEIGHT / 2, -1),
      new THREE.Vector3(cx + CELL_WIDTH / 2, cy + CELL_HEIGHT / 2, -1),
      new THREE.Vector3(cx - CELL_WIDTH / 2, cy + CELL_HEIGHT / 2, -1),
      new THREE.Vector3(cx - CELL_WIDTH / 2, cy - CELL_HEIGHT / 2, -1),
    );

    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

    return (
      <group>
      <line geometry={lineGeometry} >
        <lineBasicMaterial attach="material" color={color} linewidth={2} linecap={'round'} linejoin={'round'} />
      </line>
      </group>
    )
  }
  const CELL_WIDTH = 3;
  const CELL_HEIGHT = 3;

  const cells = [];

  for (let y = 0, h = 0; y < rows; h += CELL_HEIGHT, y++) {
    for (let x = 0, w = 0; x < columns; w += CELL_WIDTH, x++) {
      const position = [x * CELL_WIDTH, y * CELL_HEIGHT, 0]
      cells.push({
        position,
        args: [CELL_WIDTH, CELL_HEIGHT, 1]
      });
    }
  };

  return (
      <group
        position={position}
        castShadow
      >
        {
          cells.map(({ position, args }, index) => (
            <GridCell 
              key={index}
              position={position} 
              args={args} 
              color={color}
              onClick={onGridCellClick}
            />
          ))
        }
      </group>
  )

}

const AtomContainer = () => {
  const [state, setState] = useState([]);
  const [player, setPlayer] = useState({}); // first player of the board 
  const [animationQueue, setAnimationQueue] = useState([]);

  const chainReaction = useRef(new ChainReaction({}, 2));

  useEffect(()=>{
    setPlayer(chainReaction.current.getCurrentPlayer());
  }, []);

  useEffect(()=>{
      let timer = null;
      if (animationQueue.length) {
        const animationState = animationQueue.shift();
        let transitionDuration = 1000;
        const explodableCells = animationState.filter(row => row.filter(cell => cell.items.length > cell.capacity).length).length > 0;
        if (explodableCells){
          transitionDuration = 600;
          console.log("play audio");
        };

        setTimeout(() => {
          setState(animationState);
          setAnimationQueue([...animationQueue]);
        }, transitionDuration) 
      }
      return () => clearTimeout(timer);

  }, [animationQueue])




  const resetGame = () => {
    console.log("is it happening")
    chainReaction.current.reset();
    setState([...chainReaction.current.board]);
  }

  const addAtom = ( event) => {
    const { eventObject: { position } } = event;

    try{
      const result = chainReaction.current.nextState(chainReaction.current.board, { row: position.y / 3, column: position.x / 3 });

      const {
        states,   // transitions between first state to last state
        board,    // final state of the board,ignore for now
        gameOver, // name itself telling what it is,
        player,    // the player who changed this current state of board
        nextPlayer // next player 
      } = result;

      const nextFrame = states.shift();
      console.log({
        states,
        nextFrame
      });

      const explodableCells = nextFrame.filter(row => row.filter(cell => cell.items.length > cell.capacity).length).length > 0;
      if(explodableCells){
        console.log("play audio, main fram");

      }
      setState(nextFrame);
      setAnimationQueue(states);
      setPlayer(nextPlayer);
  
      if (gameOver) {
        console.log(player.id, player.name);
        const Message = `"game over buddy winner is",${player.id}`
        // setTimeout(() => {
        //   // resetGame();
        //   // alert(Message);
        //   console.log("game is over");

        // }, 1000)
      }
    }catch(error){
      console.error(error);
    }

  }

  useFrame(()=>{
      
  });



  return (
   <>
      {
        state.map((row, r) => row.map((cell, c) => (
          <Compound key={cell.id} cell={cell} />
        )))
      }
      <Grid
        color={player.color || "#aef7fc"}
        rows={4}
        columns={4}
      />
      <BoxGrid
        rows={4}
        columns={4}
        onGridCellClick={e =>addAtom(e)}
        position={[0, 0, -2]}
      />
   </>
  )
} 


const Game = () => {

  return (
    <Canvas
      camera={{ position: [10, -20, 30], fov: 60 }}>
      <axesHelper position={[0, 0, 0]} />
      {/* <gridHelper/> */}
      <CameraControls />
      {/* This light makes things look pretty */}
      <ambientLight intensity={1} color="white" />
      {/* Our main source of light, also casting our shadow */}
      <directionalLight
        castShadow
        position={[0, 10, 0]}
        intensity={1.5}
      />
      {/* A light to help illuminate the spinning boxes */}
      <pointLight position={[0, -10, 0]} intensity={1.5} color="red"/>
      <AtomContainer/>
      <Stars/>
    </Canvas>
  )


}
function App() {
  return (
    <Game />
  )
}

export default App;
