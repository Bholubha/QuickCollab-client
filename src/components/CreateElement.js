import rough from "roughjs";
const generator = rough.generator();

const createElement = (id, x1, y1, x2, y2, type,options) => {

    switch (type) {
      case "line":
      case "rectangle":
        const roughElement =
          type === "line"
            ? generator.line(x1, y1, x2, y2)
            : options.fillOption!=="empty" ? generator.rectangle(x1, y1, x2 - x1, y2 - y1, {
                stroke: options.selectedColor,
                strokeWidth: options.strokeWidth,
                fill : options.fillColor,
                fillStyle : options.fillOption
              }) : generator.rectangle(x1, y1, x2 - x1, y2 - y1, {
                stroke: options.selectedColor,
                strokeWidth: options.strokeWidth,              
              });
        return { id, x1, y1, x2, y2, type, roughElement ,options};
      case "pencil":
        // here points is array of object with value x and y initially we put two coordinate from where it start
        return { id, type, points: [{ x: x1, y: y1 }] ,options};
      case "text":
        return { id, type, x1, y1, x2, y2, text: "",options };
      case "circle":
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        return {
          id,
          x1,
          y1,
          x2,
          y2,
          height,
          width,
          type,
          options,
          roughElement: options.fillOption !== "empty" ? generator.ellipse(x1, y1, width * 2, height * 2,{
            stroke: options.selectedColor,
            strokeWidth: options.strokeWidth,
            fill : options.fillColor,
            fillStyle : options.fillOption
          }) : generator.ellipse(x1, y1, width * 2, height * 2,{
            stroke: options.selectedColor,
            strokeWidth: options.strokeWidth,          
          }),
        };
      case "triangle":
        const trianglePoints = [
          [x1, y2],
          [x2, y2],
          [(x1 + x2) / 2, y1],
        ];
  
        return {
          id,
          x1,
          y1,
          x2,
          y2,
          type,
          options,
          roughElement: options.fillOption !== "empty" ? generator.polygon(trianglePoints,{
            stroke: options.selectedColor,
            strokeWidth: options.strokeWidth,
            fill : options.fillColor,
            fillStyle : options.fillOption
          }): generator.polygon(trianglePoints,{
            stroke: options.selectedColor,
            strokeWidth: options.strokeWidth,
          })
        };
      default:
        throw new Error(`type is not recognized type = ${type}`);
    }
  
  };

  export default createElement;