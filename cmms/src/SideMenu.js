import { useState, useEffect, useRef, useContext } from "react";
import {MainDashboard} from './MainDashboard.js';
import {WorkOrderRequest, WorkOrderRequestForm} from './WorkOrderRequest.js';
import WorkOrders from './WorkOrders.js';
import {SetMainView} from './MainDisplay.js';

let lastTarget;
function MenuLocation({location}) {
	const setView = useContext(SetMainView);
	const x = useRef(null);
	function showLocationMenu(){
		x.current.className.includes("hidden")?x.current.classList.remove("hidden"):x.current.classList.add("hidden");;
	}
	function handler(e){
		//e.target.innerText;
		if(lastTarget != undefined){
			lastTarget.style.backgroundColor = "unset";
			lastTarget.style.color = "#000000";
		}
		e.target.style.backgroundColor = "#008800";
		e.target.style.color = "#ffffff";		
		lastTarget = e.target;
		switch(e.target.innerText.toLowerCase()){
			case "work orders":
				setView(<WorkOrders location={location} />);
				break;
			default:
				setView(<p> Coming Soon... </p>);
				break;
		}
	}
  return (
				<div className="flex-col">
					<button onClick={showLocationMenu} className="location-name inherit">
						{location}
					</button>
					<div ref={x} className="flex-col hidden location">
						<div onClick={handler}>
						Work Orders
						</div>
						<div onClick={handler}>
						Maintenance
						</div>
						<div onClick={handler}>
						Assets
						</div>
						<div onClick={handler}>
						Parts
						</div>
						<div onClick={handler}>
						Teams
						</div>
						<div onClick={handler}>
						Vendor
						</div>
						<div onClick={handler}>
						Purchases
						</div>
					</div>
				</div>
  );
}
/////////////////////////////////////////////////////////
function showLocations(){
	let l = document.querySelector("#locations");
	l.style.display = l.style.display == "flex"?"none":"flex";
}

function SideMenu({setPage}) {
	const setView = useContext(SetMainView);
	
	const x = useRef(null);
	function showLocationMenu(){
		x.current.className.includes("hidden")?x.current.classList.remove("hidden"):x.current.classList.add("hidden");;
	}
	function logout(){			
			setPage("login");
	}
	function mainDashboard(){
		setView(<MainDashboard />);
	}
	function workOrderSubmit(){
		setView(<WorkOrderRequestForm location="Office" />);
	}
  return (
  <div className="flex-row span-1">
			<div className="flex-col gap-25 padding-left-right-15">
				Menu1
				<img src="./svgs.png" className="inherit" style={{width:"30px"}} onClick={mainDashboard}/>
				<button onClick={showLocations} className="inherit">Locations</button>
				<button onClick={showLocations} className="inherit">Manage Users</button>
				<button onClick={workOrderSubmit} className="inherit">Submit Work Request</button>
				<button onClick={logout} className="inherit">Logout</button>
			</div>
			<div className="flex-col span-2 hidden"  id="locations">
				Locations
				<div className="border-top-with-padding">
					<MenuLocation location="Home" />
					<MenuLocation location="Office" />
					<MenuLocation location="Zoo" />
				</div>
			</div>
	</div>
  );
}

export default SideMenu;
