import React from 'react';
import { Stage, Layer, Line } from 'react-konva';


function Konva() {
  return (
    <div className="App">
      <Stage width={window.innerWidth} height={window.innerHeight}>
        <Layer>
          <Line
            points={[50, 50, 200, 200]} // Starting and ending points of the line
            stroke="black" // Line color
            strokeWidth={2} // Line width
            lineCap="round" // Line end style
            lineJoin="round" // Line join style
          />
        </Layer>
      </Stage>
    </div>
  );
}

export default Konva;
