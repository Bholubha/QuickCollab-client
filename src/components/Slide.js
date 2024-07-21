import React, { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import { Canvas, Circle, Triangle, IText, Path } from 'fabric';

const Slide = () => {
  const { code } = useParams();
  const canvasRef = useRef(null);
  const socketRef = useRef(null);
  const canvasInstanceRef = useRef(null);
//   const ctx = CanvasRenderingContext2D;
  // Utility function to get random position within canvas dimensions
  const getRandomPosition = (canvas) => {
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    return {
      left: Math.random() * (width - 100), // 100 is an arbitrary margin
      top: Math.random() * (height - 100), // 100 is an arbitrary margin
    };
  };

  useEffect(() => {
    socketRef.current = io.connect('/');
    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
    });
    canvasInstanceRef.current = canvas;

    canvas.on('path:created', (event) => {
      const path = event.path;
      socketRef.current.emit('drawing', { path: path.toObject(), code });
    });

    socketRef.current.on('drawing', ({ path }) => {
      if (canvas) {
        canvas.add(new Path(path.path, path));
      }
    });

    socketRef.current.on('shape', ({ shape }) => {
      if (canvas) {
        let fabricShape;
        if (shape.type === 'circle') {
          fabricShape = new Circle(shape);
        } else if (shape.type === 'triangle') {
          fabricShape = new Triangle(shape);
        } else if (shape.type === 'i-text') {
          fabricShape = new IText(shape.text, shape);
        }
        canvas.add(fabricShape);
      }
    });

    return () => {
      canvas.dispose();
      socketRef.current.disconnect();
    };
  }, [code]);

  const addCircle = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    const { left, top } = getRandomPosition(canvas);
    const circle = new Circle({
      radius: 50,
    //   fill: 'red',
      left,
      top,
    });
    canvas.add(circle);
    socketRef.current.emit('shape', { shape: circle.toObject(), code });
  }, [code]);

  const addTriangle = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    const { left, top } = getRandomPosition(canvas);
    const triangle = new Triangle({
      width: 100,
      height: 100,
      fill: 'blue',
      left,
      top,
    });
    canvas.add(triangle);
    socketRef.current.emit('shape', { shape: triangle.toObject(), code });
  }, [code]);

  const addText = useCallback(() => {
    const canvas = canvasInstanceRef.current;
    const { left, top } = getRandomPosition(canvas);
    const text = new IText('Hello!', {
      left,
      top,
    });
    canvas.add(text);
    socketRef.current.emit('shape', { shape: text.toObject(), code });
  }, [code]);

  return (
    <div>
      <button onClick={addCircle}>Add Circle</button>
      <button onClick={addTriangle}>Add Triangle</button>
      <button onClick={addText}>Add Text</button>
      <canvas ref={canvasRef} width={800} height={600}></canvas>
    </div>
  );
};

export default Slide;
