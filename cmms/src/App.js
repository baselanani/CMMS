//import logo from './logo.svg';
import {useState, useEffect} from "react";
import './App.css';
import MainDisplay from './MainDisplay.js'
import Login from './Login.js';

function App() {
  const [page, setPage] = useState("login");
  
  const pages = {"login": <Login setPage={setPage}/>, "CMMS": <MainDisplay setPage={setPage}/>};
	
  return (
  <div>
	{pages[page]}
  </div>
  );
}


export default App;
