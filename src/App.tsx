import { useState } from "react";
function App() {
  const [count, setCount] = useState(0);

  const handleAdd = () => {
    setCount(count + 2);
  };

  return (
    <div>
      <p>{count}</p>
      <button onClick={handleAdd}>+1</button>
    </div>
  );
}

export default App;
