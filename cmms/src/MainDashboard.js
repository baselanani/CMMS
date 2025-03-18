import { useState, useRef } from "react";

//////////////////////////////////////////////
function DashboardButton(props) {
	const [color, setColor]= useState(props.tasksLeft == 0? "green":"red");
	function handler(e){
		//setColor("green");
	}
  return (
  <div onClick={handler} className="flex-col button1 inherit">
	<div style={{width:"2vw", height:"calc(2vw + 1vw)", backgroundColor:color}}></div>
	<div> {props.loc}</div>
	<div>{props.tasksLeft + " Open Tasks"}</div>
  </div>
  );
}
//////////////////////////////////////////////

//////////////////////////////////////////////
function DashboardSection(props) {
	const [locationsList, setLocationsList] = useState(["Factory", "Home", "Office"]);
	function handler(e){
		e.preventDefault();
		setLocationsList([...locationsList.reverse()]);
	}
  return (
  <div onClick={handler} className="flex-col border-5 dash-section padding-bottom-15">
	<div className="padding-left-15" style={{paddingLeft:"25px"}}>
	{props.section}
	</div>
	<div id="locationsDash" className="flex-row border-5 gap-20 padding-left-right-15 flex-wrap">
	   {locationsList.map((it, index)=>
			<DashboardButton key={index} loc={it} tasksLeft={index} /> 
	   )}
	</div>
  </div>
  );
}
//////////////////////////////////////////////


export function MainDashboard(props) {
	
  return (
   <div className="flex-col span-4 padding-left-right-15 border-5 flex-grow main-view" style={{paddingLeft:"30px"}}>
		    <div className="flex-row align-baseline justify-between">
				Main Dashboard
				<div className="flex-row gap-20">
					<button className="top-menu-button inherit">Calender</button>
					<button className="top-menu-button inherit">List View</button>
				</div>
			</div>
			<DashboardSection section="Locations" />
			<DashboardSection section="Open Maintenance"/>
			<DashboardSection section="Total Cost"/>
			<DashboardSection section="Open Maintenance"/>
	</div>
  );
}

