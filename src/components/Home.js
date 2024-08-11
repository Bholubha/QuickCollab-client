import React, { useState, useLayoutEffect, useEffect, useRef } from "react";
import { Route, useParams, useNavigate } from "react-router-dom";
import style from "./CSS/home.module.css";
import rough from "roughjs";
import { getStroke } from "perfect-freehand";
import createElement from "./CreateElement";

import { 
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
} from './DrawingUtility'; // Replace 'yourFileName' with the actual file name

import useHistory from "./History";


const Home = ({ socket, clientId ,userName}) => {
  const [elements, setElements, undo, redo, clearCanvas] = useHistory([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("text");
  const [selectedElement, setSelectedElement] = useState(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [startPanMousePosition, setStartPanMousePosition] = useState({
    x: 0,
    y: 0,
  });
  const [scale, setScale] = useState(1);
  const [scaleOffset, setScaleOffset] = useState({ x: 0, y: 0 });
  const textRef = useRef();
  const [otherElements, setOtherElements] = useState({});
  const pressedKeys = usePressedKeys();
  const { code } = useParams();

  
  const [selectedColor, setSelectedColor] = useState("black");
  const [strokeWidth, setStrokeWidth] = useState(0.5);
  const [fillColor, setFillColor] = useState("black")
  const [fillOption, setFillOption] = useState("empty")

  const [members, setMembers] = useState(new Set([userName]));

  const addMember = (newMember) => {
    setMembers((prevMembers) => {
      const updatedMembers = new Set(prevMembers);
      updatedMembers.add(newMember);
      return updatedMembers;
    });
  };
  
 
  // console.log(members)

  useEffect(() => {
    socket.on("getCollab", (data) => {
      const { id, CODE, foreignElements,memberName } = data;
     console.log(
      memberName
     )
      addMember(memberName)
      
      if (!clientId) clientId = localStorage.getItem("clientId");
     
        
        setOtherElements((prevState) => ({
          ...prevState,
          [id]: foreignElements,
        }));
      
    });
  }, []);

  // It is important effect it get re-render many time and it is responsible for rendering all elements
  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const scaledWidth = canvas.width * scale;
    const scaledHeight = canvas.height * scale;

    // without offset it just scalling and viewport goes to the bottom right side for maintaining focus on the middle area use offset
    const scaleOffsetX = (scaledWidth - canvas.width) / 2;
    const scaledOffsetY = (scaledHeight - canvas.height) / 2;

    setScaleOffset({ x: scaleOffsetX, y: scaledOffsetY });

    // every time of re-rendering context translate and continuously tranlating so for preventing this we store the
    // context and again restore it after drawing all element
    // Inshort if we assume context coordinate x = 10 and panOffsetx = 5 then after every render it become 15 20 25 30 ...
    // But if we use save and restore then it like 10(save) 15 10(restore) 15 10 ...

    ctx.save();
    if (scale - 0.1 < 0.001) {
      ctx.translate(-scaleOffsetX, -scaledOffsetY);
    } else {
      ctx.translate(
        panOffset.x * scale - scaleOffsetX,
        panOffset.y * scale - scaledOffsetY
      );
    }

    ctx.scale(scale, scale);
    // ctx.scale(3,3)

    const RoughCanvas = rough.canvas(canvas);

    elements.forEach((element) => {
      // while editing of text we have two overlapping text one of textarea and one of context so we have to ommit that context's text
      if (action === "writing" && selectedElement.id === element.id) return;
      drawElement(RoughCanvas, ctx, element);
    });

    for (let key in otherElements) {
      const foreignElements = otherElements[key];
      foreignElements &&
        foreignElements.forEach((element) => {
          drawElement(RoughCanvas, ctx, element);
        });
    }

    ctx.restore();
  }, [elements, action, selectedElement, panOffset, scale, otherElements]);

  useEffect(() => {
    if(userName==="unknown") userName = localStorage.getItem("userName");
    socket.emit("sendCollab", {
      id: clientId,
      CODE: code,
      foreignElements: elements,
      memberName:userName
    });
  }, [elements,userName]);

  // function for updating element depend upon type
  const updateElement = (id, x1, y1, x2, y2, type, textOptions = null,options) => {
    const elementsCopy = [...elements];

    switch (type) {
      case "line":
      case "rectangle":
      case "circle":
      case "triangle":
        const currelement = createElement(id, x1, y1, x2, y2, type,options);
        elementsCopy[id] = currelement;
        break;
      case "pencil":
        elementsCopy[id].points = [
          ...elementsCopy[id].points,
          { x: x2, y: y2 },
        ];
        break;
      case "text":
        // required width of the text because it used for defining four coordinate of rectangle correspond to text element becuase it require while selection
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        
        ctx.font = `${10+10*options.strokeWidth}px sans-serif`;
        const textWidth = ctx.measureText(textOptions.text).width;
        const textHeight = 10+10*options.strokeWidth;

        elementsCopy[id] = {
          ...createElement(id, x1, y1, x1 + textWidth, y1 + textHeight, type,options),
          text: textOptions.text,
        };
        break;
      default:
        throw new Error(`type is not recognized type = ${type}`);
    }
    // pass overWrite as true because we dont want that it add new array of element while resizing,moving or creating
    setElements(elementsCopy, true);
  };

  // while writing or editing text this get render
  useEffect(() => {
    const textArea = textRef.current;

    if (action === "writing") {
      setTimeout(() => {
        textArea.focus();
        // while editing text it firstly creat empty textarea so we have to set it to older text
        textArea.value = selectedElement.text;
      }, 0);
    }
  }, [action, selectedElement]);

  // Ctrl + z and Ctrl + y key binding for undo and redo
  useEffect(() => {
    const undoRedoFunction = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        undo();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "y") {
        redo();
      }
    };

    document.addEventListener("keydown", undoRedoFunction);
    return () => {
      document.removeEventListener("keydown", undoRedoFunction);
    };
  }, [undo, redo]);

  // Binding pan movement with scrolling of mouse and zooming when Shift + scrolling
  useEffect(() => {
    const panOrZoomFunction = (event) => {
      if (pressedKeys.has("Meta") || pressedKeys.has("Control")) {
        
        event.preventDefault();
        onZoom(event.deltaY * -0.001);
      } else {
        setPanOffset((prevState) => ({
          // x: Math.max(Math.min(prevState.x - event.deltaX,1000-(1000*(1.1-scale))),-1000+(1000*(1.1-scale))),
          // y: Math.max(Math.min(prevState.y - event.deltaY,2000-(2000*(1-scale))-200),-2000+(2000*(1-scale))+200)
          x: Math.max(
            Math.min(prevState.x - event.deltaX, 960 * scale),
            -960 * scale
          ),
          y: Math.max(
            Math.min(prevState.y - event.deltaY, 540 * scale),
            -540 * scale
          ),
        }));
      }
    };


    document.addEventListener("wheel", panOrZoomFunction, { passive: false });
    return () => {
      document.removeEventListener("wheel", panOrZoomFunction);
    };
  }, [pressedKeys, scale]);

  // get Mouse coordinate accordint to pan-position and scalling
  const getMouseCoordinates = (event) => {
    const clientX =
      (event.clientX - panOffset.x * scale + scaleOffset.x) / scale;
    const clientY =
      (event.clientY - panOffset.y * scale + scaleOffset.y) / scale;

    return { clientX, clientY };
  };

  const clearFullCanvas = ()=>{
    clearCanvas();
    setOtherElements({});
  }

  const handleMouseDown = (event) => {
    // after writing text in textarea if user click mousekey then we dont want any new creation of text and want that it handle by function handleBlur
    if (action === "writing") return;

    const { clientX, clientY } = getMouseCoordinates(event);

    // for applyint space plus left key for movint all elemnts (or move pan)
    if (event.button === 1 || pressedKeys.has(" ")) {
      setAction("panning");
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }

    if (tool === "selection") {
      // get element within cursor position if any
      const element = getElementAtPosition(clientX, clientY, elements);

      if (element) {
        //  we required offset as difference between cursor coordinte and element coordinat for smooth moving
        if (element.type === "pencil") {
          // create array of offsets correspond to all point of doodle
          const xOffsets = element.points.map((point) => clientX - point.x);
          const yOffsets = element.points.map((point) => clientY - point.y);

          setSelectedElement({ ...element, xOffsets, yOffsets });
        } else {
          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;
          setSelectedElement({ ...element, offsetX, offsetY });
        }

        if (element.position === "inside") {
          setAction("move");
        } else {
          setAction("resize");
        }

        // this is required because we have to store snapshot of current elements becaus after move or resize it get changed
        // this generally make copy of current array of elements and store it in history
        setElements((prev) => prev);
      }
    } else {
      const id = elements.length;

      const element = createElement(
        id,
        clientX,
        clientY,
        clientX,
        clientY,
        tool,
        {selectedColor,strokeWidth,fillColor,fillOption}
      );

      // required to set newly created element as selectedElement because it need in hanldeMouseUp while adjusting coordinates
      setSelectedElement(element);
      // insert new element
      setElements((prevState) => [...prevState, element]);

      setAction(tool === "text" ? "writing" : "drawing");
    }
  };

  const handleMouseMove = (event) => {
    const { clientX, clientY } = getMouseCoordinates(event);

    // set panOffset
    if (action === "panning") {
      const deltaX = clientX - startPanMousePosition.x;
      const deltaY = clientY - startPanMousePosition.y;

      setPanOffset((prevState) => ({
        x: Math.max(
          Math.min(prevState.x + deltaX, 1000 * scale),
          -1000 * scale
        ),
        y: Math.max(
          Math.min(prevState.y + deltaY, 2000 * scale),
          -2000 * scale
        ),
      }));
      return;
    }

    // styling cursor based on cursor position
    if (tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements);

      event.target.style.cursor = element
        ? getCursorStyle(element.position)
        : "default";
    } else {
      event.target.style.cursor = "crosshair";
    }

    if (action === "drawing") {
      // console.log(clientX,clientY)

      // while mouseDown new element is created now just update it according to moving
      let index = elements.length - 1;
      const { x1, y1 } = elements[index];

      updateElement(index, x1, y1, clientX, clientY, tool,null,{selectedColor,strokeWidth,fillColor,fillOption});
    } else if (action === "move") {
      if (selectedElement.type === "pencil") {
        // shift all points according to mouse position and offsets
        const newPoints = selectedElement.points.map((_, index) => ({
          x: clientX - selectedElement.xOffsets[index],
          y: clientY - selectedElement.yOffsets[index],
        }));

        // firstly i used elementsCopy[selectedElement.id].points = newPoints; but This dont worked as .points is pointed to
        // the all points of all level of history so it changes all the points, all points throughout the whole history so undo not
        // worked so we have to make copy instead of direct modifying points

        // elementsCopy[selectedElement.id] = { ...selectedElement, points : newPoints} this syntax make swallow copy of selectedElement
        //  and we overwrite the points by explicitly mention it as points : newPoints

        const elementsCopy = [...elements];
        elementsCopy[selectedElement.id] = {
          ...selectedElement,
          points: newPoints,
        };

        setElements(elementsCopy, true);
      } else {
        const { id, x1, y1, x2, y2, type, offsetX, offsetY ,options} = selectedElement;
        const w = x2 - x1;
        const h = y2 - y1;
        const newX = clientX - offsetX;
        const newY = clientY - offsetY;
        const textOptions = type === "text" ? { text: selectedElement.text } : null;
        updateElement(id, newX, newY, newX + w, newY + h, type, textOptions,options);
      }
    } else if (action === "resize") {
      const { id, type, position,options, ...coordinates } = selectedElement;

      const { x1, y1, x2, y2 } = resizedCoordinates(
        clientX,
        clientY,
        position,
        coordinates
      );
      // console.log(options)
      updateElement(id, x1, y1, x2, y2, type,null,options);
    }
  };

  const handleMouseUp = (event) => {
    const { clientX, clientY } = getMouseCoordinates(event);

    if (selectedElement) {
      let id = selectedElement.id;
      const { type } = elements[id];
      // console.log(type)

      // FOR edinting while tool == selection
      if (
        selectedElement.type === "text" &&
        clientX - selectedElement.offsetX === selectedElement.x1 &&
        clientY - selectedElement.offsetY === selectedElement.y1
      ) {
        setAction("writing");
        return;
      }

      // Apply Adjustment to rectangle and line only
      if (
        (action === "drawing" && adjustmentRequired(type)) ||
        (action === "resize" && selectedElement.type !== "circle")
      ) {
        const { x1, y1, x2, y2 } = adjustElementCoordinate(elements[id]);
        updateElement(id, x1, y1, x2, y2, type,null,selectedElement.options);
      }
    }

    // Because want that text area remain selected so we have to prevent setSelectedElement(null)
    if (action === "writing") return;

    setAction("none");
    setSelectedElement(null);
  };

  // For updating text element when we click mouse button and remove focus from textArea
  const handleBlur = (event) => {
    const { id, x1, y1, type } = selectedElement;
    setAction("none");
    setSelectedElement(null);
    // socket.emit('sendCollab', { id: clientId,foreignElements: elements });
    updateElement(id, x1, y1, null, null, type, { text: event.target.value },{selectedColor,strokeWidth,fillColor,fillOption});
  };

  // when click Enter then also want that text get rendered
  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevents the default action of Enter key (which is to insert a newline)
      handleBlur(event); // Call handleBlur function
    }
  };

  // setting scale accroding to delta
  const onZoom = (delta) => {
    setScale((prev) => Math.min(Math.max(prev + delta, 0.1), 20));
  };

  const colors = {
    red: "#FF0000",
    green: "#00FF00",
    blue: "#0000FF",
    yellow: "#FFFF00",
    black: "#000000",
  };

  const fillOptions = {
    hachure : {style:"hachure" , imgPath:"../hachure.png"},
    solid : {style:"solid" , imgPath:"../solid.png"},
    empty : {style:"empty" , imgPath:"../empty.png"}
  }


  const handleColorChange = (color) => {
    setSelectedColor(color);
  };

 const handleHummberg=()=>{
  
   const menu = document.getElementById("Menu");
   const currDisplay = menu.style.display;
  
   const imgElement = document.getElementById("MenuImage");
   if(currDisplay==="flex"){
     menu.style.display = "none";
    imgElement.src = "../hummeberg.png"
   }else{
   menu.style.display = "flex";
    imgElement.src = "../close.png"
   }
 }

 const handleShowMember =()=>{
  const members = document.getElementById("members");
  const currDisplay = members.style.display;
  members.style.display = currDisplay==="flex"?"none":"flex";
 }

  return (
    <div className={style.container}>
      <div className={style.logo}>
        Q<span>C</span>
      </div>
      <div className={style.toolSelector}>
        <input
          type="radio"
          id="selection"
          className={style.radioHidden}
          checked={tool === "selection"}
          onChange={() => setTool("selection")}
        />
        <label htmlFor="selection" className={style.radioLabel}>
          <img src="../mouse.png" alt="Selection" />
        </label>

        <input
          type="radio"
          id="line"
          className={style.radioHidden}
          checked={tool === "line"}
          onChange={() => setTool("line")}
        />
        <label htmlFor="line" className={style.radioLabel}>
          <img src="../line.png" alt="Line" />
        </label>

        <input
          type="radio"
          id="rectangle"
          className={style.radioHidden}
          checked={tool === "rectangle"}
          onChange={() => setTool("rectangle")}
        />
        <label htmlFor="rectangle" className={style.radioLabel}>
          <img src="../square.png" alt="Rectangle" />
        </label>

        <input
          type="radio"
          id="circle"
          className={style.radioHidden}
          checked={tool === "circle"}
          onChange={() => setTool("circle")}
        />
        <label htmlFor="circle" className={style.radioLabel}>
          <img src="../circle.png" alt="Circle" />
        </label>

        <input
          type="radio"
          id="triangle"
          className={style.radioHidden}
          checked={tool === "triangle"}
          onChange={() => setTool("triangle")}
        />
        <label htmlFor="triangle" className={style.radioLabel}>
          <img src="../triangle.png" alt="triangle" />
        </label>

        <input
          type="radio"
          id="pencil"
          className={style.radioHidden}
          checked={tool === "pencil"}
          onChange={() => setTool("pencil")}
        />
        <label htmlFor="pencil" className={style.radioLabel}>
          <img src="../pencil.png" alt="Pencil" />
        </label>

        <input
          type="radio"
          id="text"
          className={style.radioHidden}
          checked={tool === "text"}
          onChange={() => setTool("text")}
        />
        <label htmlFor="text" className={style.radioLabel}>
          <img src="../text.png" alt="Text" />
        </label>
      </div>

    <div className={style.hummeburg} onClick={handleHummberg}>
       <img id="MenuImage" src="../hummeberg.png" alt="" />
    </div>

      <div className={style.customeBar} id="Menu">
        <div className={style.color}>
          <div className={style.custom}>stroke color</div>
          {Object.entries(colors).map(([colorName, colorValue]) => (
            <label key={colorName} className={style.colorLabel}>
              <input
                type="radio"
                value={colorName}
                checked={selectedColor === colorName}
                onChange={() => handleColorChange(colorName)}
                className={style.colorInput}
              />
              <div className={style.colorBox}>
                <div
                  className={style.colorBoxInner}
                  style={{ backgroundColor: colorValue }}
                ></div>
              </div>
            </label>
          ))}
        </div>

        <div className={style.strokeWidth}>
          <div className={style.custom}>width</div>
        <label className={style.widthLabel}>
         
        <input
          type="range"
          min="1"
          max="10"
          
          value={strokeWidth}
          onChange={(event)=>{setStrokeWidth(parseFloat(event.target.value));}}
          className={style.slider}
        />
      </label>
        </div>

        <div className={style.fillColor}>
          <div className={style.custom}>fill color</div>
          {Object.entries(colors).map(([colorName, colorValue]) => (
            <label key={colorName} className={style.colorLabel}>
              <input
                type="radio"
                value={colorName}
                checked={fillColor === colorName}
                onChange={() => setFillColor(colorName)}
                className={style.colorInput}
              />
              <div className={style.colorBox}>
                <div
                  className={style.colorBoxInner}
                  style={{ backgroundColor: colorValue }}
                ></div>
              </div>
            </label>
          ))}
        </div>

        <div className={style.fillStyle}>
        <div className={style.custom} style={{"bottom":"2.4vw"}}>fill Options</div>
        {Object.entries(fillOptions).map(([entity, parameter]) => (
            <label key={entity} className={style.fillStyleLabel}>
              <input
                type="radio"
                value={entity}
                checked={fillOption === entity}
                onChange={() => setFillOption(entity)}
                className={style.colorInput}
              />
              <div className={style.fillOptionBox}>
                <div
                  className={style.fillOptionBoxInner}
                  >
                    <img src={parameter.imgPath} alt="" />
                  </div>
              </div>
            </label>
          ))}
        </div>

      </div>

      <div className={style.bottomBar}>
        <button onClick={() => onZoom(-0.1)}>
          <img src="../zoom-out.png" alt="" />
        </button>
        <span
          onClick={() => {
            setScale(1);
          }}
        >
          {new Intl.NumberFormat("en-GB", { style: "percent" }).format(scale)}
        </span>
        <button onClick={() => onZoom(0.1)}>
          <img src="../zoom-in.png" alt="" />
        </button>

        <button onClick={undo}>
          <img src="../undo.png" alt="" />
        </button>
        <button onClick={redo}>
          <img src="../redo.png" alt="" />
        </button>
        <button onClick={clearFullCanvas}>
          <img src="../binclose.png" alt="" />
        </button>
      </div>

      <div className={style.memberIcon} onClick={handleShowMember}>
      
       <img id="" src="../peoples.png" alt="" />
  
      </div>

      <div className={style.Members} id="members">
      {[...members].map((member, index) => (
        <div key={index} className={style.member}>{member}</div>
      ))}
      </div>

      {action === "writing" ? (
        <textarea
          onBlur={handleBlur}
          ref={textRef}
          onKeyDown={handleKeyDown}
          style={{
            position: "fixed",
        
            top:
              (selectedElement.y1-strokeWidth-1) * scale +
              panOffset.y * scale -
              scaleOffset.y,
            left:
              selectedElement.x1 * scale + panOffset.x * scale - scaleOffset.x,
            font: `${(10+10*strokeWidth) * scale}px sans-serif`,
            color:selectedColor,
            margin: 0,
            padding: 0,
            border: 0,
            outline: 0,

            resize: "none",
            overflow: "hidden",
            whiteSpace: "pre",
            background: "transparent",
            zIndex: 2,
          }}
          name=""
          id=""
          cols="40"
        />
      ) : null}
      <canvas
        id="canvas"
        height={window.innerHeight}
        width={window.innerWidth}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ position: "absolute", zIndex: 1 }}
      ></canvas>
    </div>
  );
};

export default Home;
