import  { useState, useEffect } from "react";

import { getStroke } from "perfect-freehand";

const pointDistance = (a, b) =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  
  // if cursor pointer is near to the coordinate withing some range i.e here 10 then it return corresponding position ie. "tl" , "br"
  const nearPoint = (x, y, x1, y1, pos, maxOffset = 10) => {
    return Math.abs(x - x1) < maxOffset && Math.abs(y - y1) < maxOffset
      ? pos
      : null;
  };
  
  // function for checking particular points is on the line or near two line depend on maxOffset
  const onLine = (x1, y1, x2, y2, x, y, maxOffset = 1) => {
    const a = { x: x1, y: y1 };
    const b = { x: x2, y: y2 };
    const c = { x, y };
    const offset =
      pointDistance(a, b) - (pointDistance(a, c) + pointDistance(b, c));
    return Math.abs(offset) < maxOffset ? "inside" : null;
  };
  
  // for checking position of cursor with respect to element
  const positionOfElement = (x, y, element) => {
    const { type, x1, y1, x2, y2 } = element;
    switch (type) {
      case "rectangle":
        const topLeft = nearPoint(x, y, x1, y1, "tl");
        const topRight = nearPoint(x, y, x2, y1, "tr");
        const botLeft = nearPoint(x, y, x1, y2, "bl");
        const botRight = nearPoint(x, y, x2, y2, "br");
        const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
        return topLeft || topRight || botLeft || botRight || inside;
  
      case "line":
        const on = onLine(x1, y1, x2, y2, x, y);
        const start = nearPoint(x, y, x1, y1, "start");
        const end = nearPoint(x, y, x2, y2, "end");
        return on || start || end;
      case "pencil":
        // try to check Is point is between any two consecutive point of element(pencil element) ?
        const betweenAnyPoint = element.points.some((point, index) => {
          const nextPoint = element.points[index + 1];
          if (!nextPoint) return false;
          return (
            onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null
          );
        });
        const onPath = betweenAnyPoint ? "inside" : null;
        return onPath;
      case "text":
        return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
      case "circle":
        const { height, width } = element;
        const t = nearPoint(x, y, x1, y1 - height, "t", 10);
        const b = nearPoint(x, y, x1, y1 + height, "b", 10);
        const r = nearPoint(x, y, x1 + width, y1, "r", 10);
        const l = nearPoint(x, y, x1 - width, y1, "l", 10);
  
        if (t || b || l || r) return t || b || r || l;
  
        // copied code from chatgpt
        for (let i = 0; i < 100; i++) {
          const angle = (i / 100) * 2 * Math.PI;
          const cx = x1 + element.width * Math.cos(angle);
          const cy = y1 + element.height * Math.sin(angle);
          if (Math.abs(cx - x) < 8 && Math.abs(cy - y) < 8) return "inside";
        }
        return null;
      case "triangle":
        const X1 = x1;
        const Y1 = y2;
        const X2 = x2;
        const Y2 = y2;
        const X3 = (x1 + x2) / 2;
        const Y3 = y1;
  
        const fPoint = nearPoint(x, y, X1, Y1, "bl");
        const sPoint = nearPoint(x, y, X2, Y2, "br");
        const tPoint = nearPoint(x, y, X3, Y3, "top");
  
        if (fPoint || sPoint || tPoint) return fPoint || sPoint || tPoint;
  
        const onAnyThree =
          onLine(X1, Y1, X2, Y2, x, y, 5) ||
          onLine(X1, Y1, X3, Y3, x, y, 5) ||
          onLine(X3, Y3, X2, Y2, x, y, 5);
        return onAnyThree ? "inside" : null;
      default:
        throw new Error(`type not recognized ${type}`);
    }
  };
  
  // check Is there is any element within the cursor position? (use for move and resize)
  const getElementAtPosition = (x, y, elements) => {
    return elements
      .map((ele) => ({ ...ele, position: positionOfElement(x, y, ele) }))
      .find((curr) => curr.position !== null);
  };
  
  // give style for cursor depends upon position of cursor with respect to element
  const getCursorStyle = (position) => {
    switch (position) {
      case "tl":
      case "br":
      case "start":
      case "end":
        return "nwse-resize";
      case "tr":
      case "bl":
        return "nesw-resize";
      case "t":
      case "top":
        return "n-resize";
      case "b":
        return "s-resize";
      case "r":
        return "e-resize";
      case "l":
        return "w-resize";
      default:
        return "move";
    }
  };
  
  // resizing logic for rectangle and line
  const resizedCoordinates = (x, y, position, coordinates) => {
    const { x1, y1, x2, y2 } = coordinates;
    switch (position) {
      case "tl":
      case "start":
        return { x1: x, y1: y, x2, y2 };
      case "tr":
        return { x1, y1: y, x2: x, y2 };
      case "bl":
        return { x1: x, y1, x2, y2: y };
      case "br":
      case "end":
        return { x1, y1, x2: x, y2: y };
      case "top":
        return { x1, y1: y, x2, y2 };
      case "t":
      case "b":
        return { x1, y1, x2, y2: y };
      case "r":
        return { x1, y1, x2: x, y2 };
      case "l":
        return { x1, y1, x2: x, y2 };
  
      default:
        return null;
    }
  };
  
  // when we draw or resize element such as line and rectangle then x1,y1 can be top left also or it can be bottom right also so for maintaining
  // consistency we use this function for adjusting coordinate
  const adjustElementCoordinate = (element) => {
    const { x1, y1, x2, y2, type } = element;
  
    if (type === "rectangle") {
      const miniX = Math.min(x1, x2);
      const miniY = Math.min(y1, y2);
      const maxiX = Math.max(x1, x2);
      const maxiY = Math.max(y1, y2);
      return { x1: miniX, y1: miniY, x2: maxiX, y2: maxiY };
    } else {
      if (x1 < x2 || (x1 === x2 && y1 < y2)) {
        return { x1, y1, x2, y2 };
      } else {
        return { x1: x2, y1: y2, x2: x1, y2: y1 };
      }
    }
  };
  
  // copied code from perfect freehand for drawing
const getSvgPathFromStroke = (stroke) => {
    if (!stroke.length) return "";
  
    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length];
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ["M", ...stroke[0], "Q"]
    );
  
    d.push("Z");
    return d.join(" ");
  };
  
  // function for rendering element on canvas depends upon type of element
  const drawElement = (RoughCanvas, ctx, element) => {
    const { type ,options} = element;
    
    switch (type) {
      case "line":
      case "circle":
      case "rectangle":
      case "triangle":
        RoughCanvas.draw(element.roughElement);
        break;
      case "pencil":
        const stroke = getStroke(element.points, { size: options.strokeWidth+5 });
        const pathData = getSvgPathFromStroke(stroke);
      
        ctx.fillStyle = options.selectedColor
        ctx.fill(new Path2D(pathData));
  
        break;
      case "text":
        
        ctx.textBaseline = "top";
        ctx.font = `${10+10*options.strokeWidth}px sans-serif`;
        ctx.fillStyle = options.selectedColor
        ctx.fillText(element.text, element.x1, element.y1);
        break;
      default:
        throw new Error(`type is not recognized type = ${type}`);
    }
  };
  
  // we need to check that there is requirenment of coordinate adjusting because it only need for rectangel and line not for text or pencil tool
  const adjustmentRequired = (type) => ["line", "rectangle"].includes(type);
  
  // copied code for accessing pressed keys
  const usePressedKeys = () => {
    const [pressedKeys, setPressedKeys] = useState(new Set());
  
    useEffect(() => {
      const handleKeyDown = (event) => {
        setPressedKeys((prevKeys) => new Set(prevKeys).add(event.key));
      };
  
      const handleKeyUp = (event) => {
        setPressedKeys((prevKeys) => {
          const updatedKeys = new Set(prevKeys);
          updatedKeys.delete(event.key);
          return updatedKeys;
        });
      };
  
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, []);
  
    return pressedKeys;
  };

  export { 
    pointDistance, 
    nearPoint, 
    onLine, 
    positionOfElement, 
    getElementAtPosition, 
    getCursorStyle, 
    resizedCoordinates, 
    adjustElementCoordinate, 
    getSvgPathFromStroke, 
    drawElement, 
    adjustmentRequired, 
    usePressedKeys 
  };
  