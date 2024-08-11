import { useState } from "react";

// for undo and redo functionality I use this custom hook useHistory which return current snapshot of element depend upon undo and redo operation
const useHistory = (initialState) => {
    // index used for accessing snapshot of elements using undo and redo
    const [index, setIndex] = useState(0);
    // this state maintain array of [array of element] and according to index it return particular history[index]
    const [history, setHistory] = useState([initialState]);
  
    // this function used as setElement inside Component (Home) and I use overWrite(which don't add new state into history)
    // because when we are drawing or resizing then we dont need to insert newState(array of elements) to history
    const setState = (action, overWrite = false) => {
      const newState =
        typeof action === "function" ? action(history[index]) : action;
      if (overWrite) {
        const copyOfHistory = [...history];
        copyOfHistory[index] = newState;
        setHistory(copyOfHistory);
      } else {
        const updatedHistory = history.slice(0, index + 1);
        setHistory([...updatedHistory, newState]);
        setIndex((prevState) => prevState + 1);
      }
    };
  
    const undo = () => index > 0 && setIndex((prev) => prev - 1);
    const redo = () => index < history.length - 1 && setIndex((prev) => prev + 1);
  
    const clearCanvas = () => {
      setIndex(0);
  
      // setHistory([]);
    };
    return [history[index], setState, undo, redo, clearCanvas];
  };

  export default useHistory;